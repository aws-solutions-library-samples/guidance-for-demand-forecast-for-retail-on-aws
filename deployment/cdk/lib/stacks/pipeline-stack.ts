// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface PipelineStackProps extends cdk.StackProps {
  rawDataBucket: s3.IBucket;
  outputsBucket: s3.IBucket;
  sagemakerRoleArn: string;
}

export class PipelineStack extends cdk.Stack {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const lambdaDir = path.join(__dirname, '..', '..', '..', '..', 'source', 'lambda', 'pipeline');

    const account = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    const commonLambdaProps: Partial<lambda.FunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
    };

    const pipelinePolicy = new iam.PolicyStatement({
      actions: [
        'sagemaker:CreateAutoMLJobV2',
        'sagemaker:DescribeAutoMLJobV2',
        'sagemaker:CreateModel',
        'sagemaker:CreateTransformJob',
        'sagemaker:DescribeTransformJob',
        'sagemaker:ListCandidatesForAutoMLJob',
        'sagemaker:CreateEndpointConfig',
        'sagemaker:CreateEndpoint',
        'sagemaker:DescribeEndpoint',
      ],
      // Scoped to this account/Region's SageMaker resources by type.
      resources: [
        `arn:aws:sagemaker:${region}:${account}:automl-job/*`,
        `arn:aws:sagemaker:${region}:${account}:model/*`,
        `arn:aws:sagemaker:${region}:${account}:transform-job/*`,
        `arn:aws:sagemaker:${region}:${account}:endpoint/*`,
        `arn:aws:sagemaker:${region}:${account}:endpoint-config/*`,
      ],
    });

    const s3Policy = new iam.PolicyStatement({
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:ListBucket',
        's3:DeleteObject',
        's3:GetBucketLocation',
      ],
      resources: [
        props.rawDataBucket.bucketArn,
        `${props.rawDataBucket.bucketArn}/*`,
        props.outputsBucket.bucketArn,
        `${props.outputsBucket.bucketArn}/*`,
      ],
    });

    const passRolePolicy = new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: [props.sagemakerRoleArn],
      conditions: { StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' } },
    });

    const pipelineEnv = {
      RAW_DATA_BUCKET: props.rawDataBucket.bucketName,
      OUTPUTS_BUCKET: props.outputsBucket.bucketName,
      SAGEMAKER_ROLE_ARN: props.sagemakerRoleArn,
    };

    const createLambda = (name: string, dir: string): NodejsFunction => {
      const fn = new NodejsFunction(this, name, {
        ...commonLambdaProps,
        entry: path.join(lambdaDir, dir, 'index.ts'),
        handler: 'handler',
        functionName: `retail-forecast-pipeline-${dir}`,
        environment: pipelineEnv,
        bundling: { minify: true, sourceMap: true, externalModules: ['@aws-sdk/*'] },
      });
      fn.addToRolePolicy(pipelinePolicy);
      fn.addToRolePolicy(s3Policy);
      fn.addToRolePolicy(passRolePolicy);
      return fn;
    };

    const startTrainingFn = createLambda('StartTrainingFn', 'start-training');
    const checkTrainingStatusFn = createLambda('CheckTrainingStatusFn', 'check-training-status');
    const createModelFn = createLambda('CreateModelFn', 'create-model');
    const startBatchInferenceFn = createLambda('StartBatchInferenceFn', 'start-batch-inference');
    const checkInferenceStatusFn = createLambda('CheckInferenceStatusFn', 'check-inference-status');
    const processOutputFn = createLambda('ProcessOutputFn', 'process-output');
    const deployEndpointFn = createLambda('DeployEndpointFn', 'deploy-endpoint');

    const failState = new sfn.Fail(this, 'PipelineFailed');
    const successState = new sfn.Succeed(this, 'PipelineSucceeded');

    const deployEndpoint = new tasks.LambdaInvoke(this, 'DeployEndpoint', {
      lambdaFunction: deployEndpointFn,
      outputPath: '$.Payload',
    });
    deployEndpoint.next(successState);

    const processOutput = new tasks.LambdaInvoke(this, 'ProcessBatchOutput', {
      lambdaFunction: processOutputFn,
      outputPath: '$.Payload',
    });
    processOutput.next(deployEndpoint);

    const waitForInference = new sfn.Wait(this, 'WaitForInference', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
    });

    const checkInference = new tasks.LambdaInvoke(this, 'CheckInferenceStatus', {
      lambdaFunction: checkInferenceStatusFn,
      outputPath: '$.Payload',
    });

    const inferenceChoice = new sfn.Choice(this, 'InferenceComplete?')
      .when(sfn.Condition.stringEquals('$.status', 'Completed'), processOutput)
      .when(sfn.Condition.stringEquals('$.status', 'Failed'), failState)
      .otherwise(waitForInference);

    waitForInference.next(checkInference).next(inferenceChoice);

    // Start base inference
    const startInference = new tasks.LambdaInvoke(this, 'StartBaseInference', {
      lambdaFunction: startBatchInferenceFn,
      outputPath: '$.Payload',
    });
    startInference.next(waitForInference);

    // Create model
    const createModel = new tasks.LambdaInvoke(this, 'CreateModel', {
      lambdaFunction: createModelFn,
      outputPath: '$.Payload',
    });
    createModel.next(startInference);

    // Training polling loop
    const waitForTraining = new sfn.Wait(this, 'WaitForTraining', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(60)),
    });

    const checkTraining = new tasks.LambdaInvoke(this, 'CheckTrainingStatus', {
      lambdaFunction: checkTrainingStatusFn,
      outputPath: '$.Payload',
    });

    const trainingChoice = new sfn.Choice(this, 'TrainingComplete?')
      .when(sfn.Condition.stringEquals('$.status', 'Completed'), createModel)
      .when(sfn.Condition.stringEquals('$.status', 'Failed'), failState)
      .otherwise(waitForTraining);

    waitForTraining.next(checkTraining).next(trainingChoice);

    // Start training
    const startTraining = new tasks.LambdaInvoke(this, 'StartTraining', {
      lambdaFunction: startTrainingFn,
      outputPath: '$.Payload',
    });

    const definition = startTraining.next(waitForTraining);

    this.stateMachine = new sfn.StateMachine(this, 'ForecastPipeline', {
      stateMachineName: 'retail-forecast-pipeline',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.hours(6),
      // SF2 / SC7: enable AWS X-Ray tracing for the pipeline
      tracingEnabled: true,
    });

    // CW2: alarm on failed pipeline executions.
    new cloudwatch.Alarm(this, 'PipelineFailedAlarm', {
      alarmDescription: 'Retail forecast Step Functions pipeline execution failed',
      metric: this.stateMachine.metricFailed({ period: cdk.Duration.minutes(5) }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // ========================================================================
    // S3 Event Trigger: Start pipeline when consumer_electronics.csv is uploaded
    // ========================================================================

    const triggerPipelineFn = new lambda.Function(this, 'TriggerPipelineFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        STATE_MACHINE_ARN: this.stateMachine.stateMachineArn,
      },
      code: lambda.Code.fromInline(`
const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');
const sfn = new SFNClient({});
exports.handler = async (event) => {
  console.log('S3 trigger event:', JSON.stringify(event));
  const record = event.Records[0];
  const etag = (record.s3.object.eTag || '').replace(/[^a-zA-Z0-9]/g, '');
  const execName = 'auto-' + etag.slice(0, 40) + '-' + record.s3.object.size;
  try {
    await sfn.send(new StartExecutionCommand({
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      name: execName,
      input: '{}',
    }));
    console.log('Started execution:', execName);
  } catch (e) {
    if (e.name === 'ExecutionAlreadyExists') {
      console.log('Duplicate event, execution already exists:', execName);
    } else { throw e; }
  }
};
      `),
    });

    this.stateMachine.grantStartExecution(triggerPipelineFn);

    triggerPipelineFn.addPermission('S3InvokePermission', {
      principal: new iam.ServicePrincipal('s3.amazonaws.com'),
      sourceArn: props.rawDataBucket.bucketArn,
      sourceAccount: cdk.Stack.of(this).account,
    });

    // Custom resource to configure S3 bucket notification for data/sales/consumer_electronics.csv
    const pipelineNotifRole = new iam.Role(this, 'PipelineS3NotifRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        s3Notification: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['s3:PutBucketNotification', 's3:GetBucketNotification'],
              resources: [props.rawDataBucket.bucketArn],
            }),
          ],
        }),
      },
    });

    const pipelineNotifHandler = new lambda.Function(this, 'PipelineS3NotifHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      role: pipelineNotifRole,
      timeout: cdk.Duration.seconds(60),
      code: lambda.Code.fromInline(`
const { S3Client, PutBucketNotificationConfigurationCommand, GetBucketNotificationConfigurationCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({});
exports.handler = async (event) => {
  console.log(JSON.stringify(event));
  const bucket = event.ResourceProperties.BucketName;
  const lambdaArn = event.ResourceProperties.LambdaArn;
  const prefix = event.ResourceProperties.Prefix;
  const suffix = event.ResourceProperties.Suffix;
  if (event.RequestType === 'Delete') {
    const existing = await s3.send(new GetBucketNotificationConfigurationCommand({ Bucket: bucket }));
    const filtered = (existing.LambdaFunctionConfigurations || []).filter(c => c.LambdaFunctionArn !== lambdaArn);
    await s3.send(new PutBucketNotificationConfigurationCommand({
      Bucket: bucket,
      NotificationConfiguration: { ...existing, LambdaFunctionConfigurations: filtered },
    }));
  } else {
    const existing = await s3.send(new GetBucketNotificationConfigurationCommand({ Bucket: bucket }));
    const lambdaConfigs = (existing.LambdaFunctionConfigurations || []).filter(c => c.LambdaFunctionArn !== lambdaArn);
    lambdaConfigs.push({
      LambdaFunctionArn: lambdaArn,
      Events: ['s3:ObjectCreated:*'],
      Filter: { Key: { FilterRules: [
        { Name: 'prefix', Value: prefix },
        { Name: 'suffix', Value: suffix },
      ]}},
    });
    await s3.send(new PutBucketNotificationConfigurationCommand({
      Bucket: bucket,
      NotificationConfiguration: { ...existing, LambdaFunctionConfigurations: lambdaConfigs },
    }));
  }
  const https = require('https');
  const url = require('url');
  const responseBody = JSON.stringify({
    Status: 'SUCCESS',
    PhysicalResourceId: bucket + '-pipeline-notification',
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
  });
  const parsedUrl = url.parse(event.ResponseURL);
  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsedUrl.hostname, port: 443, path: parsedUrl.path, method: 'PUT',
      headers: { 'Content-Type': '', 'Content-Length': responseBody.length },
    }, resolve);
    req.on('error', reject);
    req.write(responseBody);
    req.end();
  });
};
      `),
    });

    new cdk.CustomResource(this, 'PipelineS3Notification', {
      serviceToken: pipelineNotifHandler.functionArn,
      properties: {
        BucketName: props.rawDataBucket.bucketName,
        LambdaArn: triggerPipelineFn.functionArn,
        Prefix: 'data/sales/consumer_electronics.csv',
        Suffix: '.csv',
      },
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: this.stateMachine.stateMachineArn,
    });
  }
}
