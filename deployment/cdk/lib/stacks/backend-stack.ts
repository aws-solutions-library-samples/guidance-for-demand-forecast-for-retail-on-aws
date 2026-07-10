// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface BackendStackProps extends cdk.StackProps {
  userPool: cognito.IUserPool;
  rawDataBucket: s3.IBucket;
  outputsBucket: s3.IBucket;
  athenaResultsBucket: s3.IBucket;
  glueDatabaseName: string;
  athenaWorkgroupName: string;
  sagemakerRoleArn: string;
  allowedOrigins: string[];
}

export class BackendStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const account = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    // Common Lambda configuration
    const lambdaEnvironment = {
      RAW_DATA_BUCKET: props.rawDataBucket.bucketName,
      OUTPUTS_BUCKET: props.outputsBucket.bucketName,
      ATHENA_OUTPUT_BUCKET: props.athenaResultsBucket.bucketName,
      GLUE_DATABASE: props.glueDatabaseName,
      ATHENA_WORKGROUP: props.athenaWorkgroupName,
      SAGEMAKER_ROLE_ARN: props.sagemakerRoleArn,
      AWS_ACCOUNT_ID: account,
    };

    const lambdaPolicyStatements = [
      new iam.PolicyStatement({
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
          props.athenaResultsBucket.bucketArn,
          `${props.athenaResultsBucket.bucketArn}/*`,
        ],
      }),
      new iam.PolicyStatement({
        actions: [
          'athena:StartQueryExecution',
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
          'athena:StopQueryExecution',
        ],
        resources: [`arn:aws:athena:${region}:${account}:workgroup/${props.athenaWorkgroupName}`],
      }),
      new iam.PolicyStatement({
        actions: ['glue:GetTable', 'glue:GetTables', 'glue:GetDatabase', 'glue:GetPartitions'],
        resources: [
          `arn:aws:glue:${region}:${account}:catalog`,
          `arn:aws:glue:${region}:${account}:database/${props.glueDatabaseName}`,
          `arn:aws:glue:${region}:${account}:table/${props.glueDatabaseName}/*`,
        ],
      }),
      new iam.PolicyStatement({
        sid: 'SageMakerResourceScoped',
        actions: [
          'sagemaker:CreateAutoMLJobV2',
          'sagemaker:DescribeAutoMLJobV2',
          'sagemaker:CreateModel',
          'sagemaker:CreateTransformJob',
          'sagemaker:DescribeTransformJob',
          'sagemaker:StopTransformJob',
          'sagemaker:CreateEndpointConfig',
          'sagemaker:CreateEndpoint',
          'sagemaker:DescribeEndpoint',
          'sagemaker:DeleteEndpoint',
          'sagemaker:DeleteEndpointConfig',
          'sagemaker:InvokeEndpoint',
          'sagemaker:InvokeEndpointAsync',
        ],
        // Scoped to this account/Region's SageMaker resources by type. List
        // actions (below) do not support resource-level permissions.
        resources: [
          `arn:aws:sagemaker:${region}:${account}:automl-job/*`,
          `arn:aws:sagemaker:${region}:${account}:model/*`,
          `arn:aws:sagemaker:${region}:${account}:transform-job/*`,
          `arn:aws:sagemaker:${region}:${account}:endpoint/*`,
          `arn:aws:sagemaker:${region}:${account}:endpoint-config/*`,
        ],
      }),
      new iam.PolicyStatement({
        sid: 'SageMakerListActions',
        actions: [
          'sagemaker:ListAutoMLJobs',
          'sagemaker:ListModels',
          'sagemaker:ListTransformJobs',
          'sagemaker:ListEndpoints',
        ],
        resources: ['*'],
      }),
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [props.sagemakerRoleArn],
        conditions: {
          StringEquals: {
            'iam:PassedToService': 'sagemaker.amazonaws.com',
          },
        },
      }),
    ];

    const lambdaDir = path.join(__dirname, '../../../../source/lambda');

    // Each Lambda gets its own role to avoid CloudFormation circular dependency
    // when many Lambdas share a single role with API Gateway permissions.
    const createLambda = (
      name: string,
      entry: string,
      handler = 'handler',
      timeoutSeconds = 60,
    ): NodejsFunction => {
      const fn = new NodejsFunction(this, name, {
        entry: path.join(lambdaDir, entry),
        handler,
        runtime: lambda.Runtime.NODEJS_20_X,
        timeout: cdk.Duration.seconds(timeoutSeconds),
        memorySize: 256,
        // SC7: AWS X-Ray active tracing
        tracing: lambda.Tracing.ACTIVE,
        environment: lambdaEnvironment,
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: ['@aws-sdk/*'],
        },
      });
      lambdaPolicyStatements.forEach((stmt) => fn.addToRolePolicy(stmt));
      return fn;
    };

    // Create Lambda functions
    const getProductsLambda = createLambda('GetProductsFunction', 'products/get-products/index.ts');
    const getProductByIdLambda = createLambda(
      'GetProductByIdFunction',
      'products/get-product-by-id/index.ts',
    );
    const getForecastLambda = createLambda(
      'GetForecastFunction',
      'forecasts/get-forecast/index.ts',
    );
    const getStockProjectionLambda = createLambda(
      'GetStockProjectionFunction',
      'forecasts/get-stock-projection/index.ts',
    );
    const runWhatIfLambda = createLambda('RunWhatIfFunction', 'forecasts/run-what-if/index.ts');
    const startTrainingJobLambda = createLambda(
      'StartTrainingJobFunction',
      'training/start-training-job/index.ts',
    );
    const getTrainingStatusLambda = createLambda(
      'GetTrainingStatusFunction',
      'training/get-training-status/index.ts',
    );
    const createModelLambda = createLambda('CreateModelFunction', 'training/create-model/index.ts');
    const runBatchTransformLambda = createLambda(
      'RunBatchTransformFunction',
      'inference/run-batch-transform/index.ts',
    );
    const getTransformStatusLambda = createLambda(
      'GetTransformStatusFunction',
      'inference/get-transform-status/index.ts',
    );
    const processBatchOutputLambda = createLambda(
      'ProcessBatchOutputFunction',
      'inference/process-batch-output/index.ts',
      'handler',
      300,
    );
    const deployEndpointLambda = createLambda(
      'DeployEndpointFunction',
      'inference/deploy-endpoint/index.ts',
    );
    const getEndpointStatusLambda = createLambda(
      'GetEndpointStatusFunction',
      'inference/get-endpoint-status/index.ts',
    );
    const deleteEndpointLambda = createLambda(
      'DeleteEndpointFunction',
      'inference/delete-endpoint/index.ts',
    );
    const invokeEndpointWorkerLambda = createLambda(
      'InvokeEndpointWorkerFunction',
      'inference/invoke-endpoint-worker/index.ts',
      'handler',
      600,
    );
    const invokeEndpointLambda = createLambda(
      'InvokeEndpointFunction',
      'inference/invoke-endpoint/index.ts',
      'handler',
      120,
    );
    const getInferenceResultLambda = createLambda(
      'GetInferenceResultFunction',
      'inference/get-inference-result/index.ts',
    );
    const listTrainingJobsLambda = createLambda(
      'ListTrainingJobsFunction',
      'training/list-training-jobs/index.ts',
    );
    const getPipelineStatusLambda = createLambda(
      'GetPipelineStatusFunction',
      'training/get-pipeline-status/index.ts',
    );
    const listEndpointsLambda = createLambda(
      'ListEndpointsFunction',
      'inference/list-endpoints/index.ts',
    );
    const generatePriceScenariosLambda = createLambda(
      'GeneratePriceScenariosFunction',
      'inference/generate-price-scenarios/index.ts',
      'handler',
      120,
    );
    const getPriceScenarioStatusLambda = createLambda(
      'GetPriceScenarioStatusFunction',
      'inference/get-price-scenario-status/index.ts',
    );
    const getPriceScenarioLambda = createLambda(
      'GetPriceScenarioFunction',
      'forecasts/get-price-scenario/index.ts',
    );

    // ========================================================================
    // Dataset Upload Feature: DynamoDB table + Lambdas + S3 trigger
    // ========================================================================

    // DynamoDB table for tracking upload status
    const uploadStatusTable = new dynamodb.Table(this, 'UploadStatusTable', {
      tableName: 'retail-forecast-upload-status',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      // DDB3: continuous backups / point-in-time recovery
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    // Lambda: Generate presigned upload URL
    const getUploadUrlLambda = createLambda(
      'GetUploadUrlFunction',
      'dataset-upload/get-upload-url/index.ts',
    );

    // Lambda: Get upload status history
    const getUploadStatusLambda = createLambda(
      'GetUploadStatusFunction',
      'dataset-upload/get-upload-status/index.ts',
    );
    getUploadStatusLambda.addEnvironment('UPLOAD_STATUS_TABLE', uploadStatusTable.tableName);
    uploadStatusTable.grantReadData(getUploadStatusLambda);

    // Lambda: Process uploaded zip (triggered by S3)
    const processUploadLambda = new NodejsFunction(this, 'ProcessUploadFunction', {
      entry: path.join(lambdaDir, 'dataset-upload/process-upload/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(300),
      memorySize: 512,
      ephemeralStorageSize: cdk.Size.mebibytes(1024),
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        ...lambdaEnvironment,
        UPLOAD_STATUS_TABLE: uploadStatusTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });
    lambdaPolicyStatements.forEach((stmt) => processUploadLambda.addToRolePolicy(stmt));
    uploadStatusTable.grantWriteData(processUploadLambda);

    // S3 event notification: trigger processUploadLambda when zip is uploaded
    // Grant S3 permission to invoke the Lambda
    processUploadLambda.addPermission('S3InvokePermission', {
      principal: new iam.ServicePrincipal('s3.amazonaws.com'),
      sourceArn: props.rawDataBucket.bucketArn,
      sourceAccount: account,
    });

    // Use a CfnCustomResource to configure S3 bucket notifications without circular dependency
    const notificationHandlerRole = new iam.Role(this, 'S3NotificationHandlerRole', {
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

    const notificationHandler = new lambda.Function(this, 'S3NotificationHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      role: notificationHandlerRole,
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
    await s3.send(new PutBucketNotificationConfigurationCommand({
      Bucket: bucket,
      NotificationConfiguration: {},
    }));
  } else {
    // Get existing config and merge
    const existing = await s3.send(new GetBucketNotificationConfigurationCommand({ Bucket: bucket }));
    const lambdaConfigs = existing.LambdaFunctionConfigurations || [];
    // Remove any existing config for this Lambda
    const filtered = lambdaConfigs.filter(c => c.LambdaFunctionArn !== lambdaArn);
    filtered.push({
      LambdaFunctionArn: lambdaArn,
      Events: ['s3:ObjectCreated:*'],
      Filter: { Key: { FilterRules: [
        { Name: 'prefix', Value: prefix },
        { Name: 'suffix', Value: suffix },
      ]}},
    });
    await s3.send(new PutBucketNotificationConfigurationCommand({
      Bucket: bucket,
      NotificationConfiguration: {
        ...existing,
        LambdaFunctionConfigurations: filtered,
      },
    }));
  }
  
  // Send CloudFormation response
  const https = require('https');
  const url = require('url');
  const responseBody = JSON.stringify({
    Status: 'SUCCESS',
    PhysicalResourceId: bucket + '-notification',
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
  });
  const parsedUrl = url.parse(event.ResponseURL);
  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.path,
      method: 'PUT',
      headers: { 'Content-Type': '', 'Content-Length': responseBody.length },
    }, resolve);
    req.on('error', reject);
    req.write(responseBody);
    req.end();
  });
};
      `),
    });

    new cdk.CustomResource(this, 'UploadS3Notification', {
      serviceToken: notificationHandler.functionArn,
      properties: {
        BucketName: props.rawDataBucket.bucketName,
        LambdaArn: processUploadLambda.functionArn,
        Prefix: 'uploads/zip/',
        Suffix: '.zip',
      },
    });

    // Wire dispatcher → worker: pass worker function name
    invokeEndpointLambda.addEnvironment(
      'WORKER_FUNCTION_NAME',
      invokeEndpointWorkerLambda.functionName,
    );

    invokeEndpointLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: [invokeEndpointWorkerLambda.functionArn],
      }),
    );

    // API Gateway
    // Access logs (APIG1) and execution logs (APIG6) are sent to CloudWatch Logs.
    // cloudWatchRole provisions the account-level role API Gateway needs to write logs.
    const apiAccessLogGroup = new logs.LogGroup(this, 'ApiAccessLogGroup', {
      logGroupName: '/aws/apigateway/retail-forecast-api/access',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.api = new apigateway.RestApi(this, 'RetailForecastApi', {
      restApiName: 'retail-forecast-api',
      description: 'API for Retail Demand Forecasting PoC',
      cloudWatchRole: true,
      deployOptions: {
        stageName: 'v1',
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
        // SC7: enable AWS X-Ray active tracing on the API stage
        tracingEnabled: true,
        // APIG6: execution logging + metrics to CloudWatch
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
        // APIG10: do not log full request/response bodies (avoid logging sensitive data)
        dataTraceEnabled: false,
        // APIG1: structured access logging with standard fields only (no auth tokens)
        accessLogDestination: new apigateway.LogGroupLogDestination(apiAccessLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: false,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: false,
        }),
      },
      defaultCorsPreflightOptions: {
        // Restrict CORS to the deployed application origin (CloudFront) instead of '*'.
        allowOrigins: props.allowedOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Single allowed origin echoed on API Gateway-generated error responses.
    const corsOrigin = `'${props.allowedOrigins[0]}'`;

    // Ensure CORS headers on API Gateway-generated error responses (502, 504, etc.)
    this.api.addGatewayResponse('Default4XX', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Headers':
          "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    this.api.addGatewayResponse('Default5XX', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Headers':
          "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'CognitoAuthorizer',
    });

    // APIG2: activate request validation for first-pass input validation.
    // Parameter validation is applied to every method; POST methods additionally
    // validate that the request body is a JSON object (the Lambdas still perform
    // their own detailed validation).
    const paramsValidator = new apigateway.RequestValidator(this, 'ParamsValidator', {
      restApi: this.api,
      requestValidatorName: 'validate-request-parameters',
      validateRequestParameters: true,
      validateRequestBody: false,
    });

    const bodyValidator = new apigateway.RequestValidator(this, 'BodyValidator', {
      restApi: this.api,
      requestValidatorName: 'validate-body-and-parameters',
      validateRequestParameters: true,
      validateRequestBody: true,
    });

    // Permissive first-pass model: ensures a JSON object body without rejecting
    // legitimate payloads (handlers validate specific fields).
    const jsonBodyModel = this.api.addModel('JsonBodyModel', {
      contentType: 'application/json',
      modelName: 'JsonBody',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'JsonBody',
        type: apigateway.JsonSchemaType.OBJECT,
      },
    });

    const authorizationOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestValidator: paramsValidator,
    };

    // Method options for POST endpoints that accept a JSON request body.
    const bodyMethodOptions: apigateway.MethodOptions = {
      ...authorizationOptions,
      requestValidator: bodyValidator,
      requestModels: { 'application/json': jsonBodyModel },
    };

    // Products API
    const productsResource = this.api.root.addResource('products');
    productsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductsLambda),
      authorizationOptions,
    );

    const productByIdResource = productsResource.addResource('{id}');
    productByIdResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductByIdLambda),
      authorizationOptions,
    );

    // Forecasts API
    const forecastsResource = this.api.root.addResource('forecasts');
    const forecastByItemResource = forecastsResource.addResource('{itemId}');
    forecastByItemResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getForecastLambda),
      authorizationOptions,
    );

    const priceScenarioResource = forecastByItemResource.addResource('price-scenario');
    priceScenarioResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getPriceScenarioLambda),
      authorizationOptions,
    );

    const stockProjectionResource = forecastsResource.addResource('stock-projection');
    stockProjectionResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(getStockProjectionLambda),
      bodyMethodOptions,
    );

    const whatIfResource = forecastsResource.addResource('what-if');
    whatIfResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(runWhatIfLambda),
      bodyMethodOptions,
    );

    // Training API
    const trainingResource = this.api.root.addResource('training');
    trainingResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(listTrainingJobsLambda),
      authorizationOptions,
    );

    const startTrainingResource = trainingResource.addResource('start');
    startTrainingResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(startTrainingJobLambda),
      bodyMethodOptions,
    );

    const trainingStatusResource = trainingResource.addResource('{jobName}');
    trainingStatusResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getTrainingStatusLambda),
      authorizationOptions,
    );

    const pipelineStatusResource = trainingStatusResource.addResource('pipeline');
    pipelineStatusResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getPipelineStatusLambda),
      authorizationOptions,
    );

    const createModelResource = trainingResource.addResource('create-model');
    createModelResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createModelLambda),
      bodyMethodOptions,
    );

    // Inference API
    const inferenceResource = this.api.root.addResource('inference');
    const batchResource = inferenceResource.addResource('batch');
    batchResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(runBatchTransformLambda),
      bodyMethodOptions,
    );

    const transformStatusResource = inferenceResource.addResource('{jobName}');
    transformStatusResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getTransformStatusLambda),
      authorizationOptions,
    );

    const processOutputResource = inferenceResource.addResource('process-output');
    processOutputResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(processBatchOutputLambda),
      bodyMethodOptions,
    );

    const endpointResource = inferenceResource.addResource('endpoint');
    endpointResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(listEndpointsLambda),
      authorizationOptions,
    );
    endpointResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(deployEndpointLambda),
      bodyMethodOptions,
    );

    const endpointByNameResource = endpointResource.addResource('{endpointName}');
    endpointByNameResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getEndpointStatusLambda),
      authorizationOptions,
    );
    endpointByNameResource.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(deleteEndpointLambda),
      authorizationOptions,
    );

    const invokeResource = inferenceResource.addResource('invoke');
    invokeResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(invokeEndpointLambda),
      bodyMethodOptions,
    );

    const invokeResultResource = invokeResource.addResource('{jobId}');
    invokeResultResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getInferenceResultLambda),
      authorizationOptions,
    );

    const priceScenariosResource = inferenceResource.addResource('price-scenarios');
    priceScenariosResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(generatePriceScenariosLambda),
      bodyMethodOptions,
    );
    const priceScenarioStatusResource = priceScenariosResource.addResource('status');
    priceScenarioStatusResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getPriceScenarioStatusLambda),
      authorizationOptions,
    );

    // Dataset Upload API (Admin)
    const datasetResource = this.api.root.addResource('dataset');
    const uploadUrlResource = datasetResource.addResource('upload-url');
    uploadUrlResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(getUploadUrlLambda),
      bodyMethodOptions,
    );

    const uploadStatusResource = datasetResource.addResource('status');
    uploadStatusResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getUploadStatusLambda),
      authorizationOptions,
    );

    // ========================================================================
    // CW2 / L5: CloudWatch alarms on the API and critical Lambda error metrics.
    // Attach an SNS topic to these alarms (addAlarmAction) to receive
    // notifications; the alarms themselves provide the monitoring signal.
    // ========================================================================
    new cloudwatch.Alarm(this, 'ApiServerErrorAlarm', {
      alarmDescription: 'API Gateway 5XX server errors detected',
      metric: this.api.metricServerError({ period: cdk.Duration.minutes(5) }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const criticalFunctions: Array<[string, NodejsFunction]> = [
      ['ProcessUpload', processUploadLambda],
      ['InvokeEndpointWorker', invokeEndpointWorkerLambda],
      ['RunBatchTransform', runBatchTransformLambda],
      ['ProcessBatchOutput', processBatchOutputLambda],
      ['StartTrainingJob', startTrainingJobLambda],
    ];
    criticalFunctions.forEach(([label, fn]) => {
      new cloudwatch.Alarm(this, `${label}ErrorAlarm`, {
        alarmDescription: `Errors detected in the ${label} Lambda function`,
        metric: fn.metricErrors({ period: cdk.Duration.minutes(5) }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    });

    // Store API URL
    this.apiUrl = this.api.url;

    // Stack Outputs
    new cdk.CfnOutput(this, 'ApiUrlOutput', {
      value: this.apiUrl,
      description: 'API Gateway URL',
      exportName: 'ApiUrl',
    });

    new cdk.CfnOutput(this, 'ApiIdOutput', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
      exportName: 'ApiId',
    });
  }
}
