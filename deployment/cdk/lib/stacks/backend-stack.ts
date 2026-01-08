import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
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

    const lambdaDir = path.join(__dirname, '../../../../source/lambda');

    // Common Lambda role with permissions
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // S3 permissions
    lambdaRole.addToPolicy(
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
      })
    );

    // Athena permissions
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'athena:StartQueryExecution',
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
          'athena:StopQueryExecution',
        ],
        resources: [
          `arn:aws:athena:${region}:${account}:workgroup/${props.athenaWorkgroupName}`,
        ],
      })
    );

    // Glue permissions
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['glue:GetTable', 'glue:GetTables', 'glue:GetDatabase', 'glue:GetPartitions'],
        resources: [
          `arn:aws:glue:${region}:${account}:catalog`,
          `arn:aws:glue:${region}:${account}:database/${props.glueDatabaseName}`,
          `arn:aws:glue:${region}:${account}:table/${props.glueDatabaseName}/*`,
        ],
      })
    );

    // SageMaker permissions
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'sagemaker:CreateAutoMLJobV2',
          'sagemaker:DescribeAutoMLJobV2',
          'sagemaker:CreateModel',
          'sagemaker:CreateTransformJob',
          'sagemaker:DescribeTransformJob',
          'sagemaker:StopTransformJob',
        ],
        resources: ['*'],
      })
    );

    // IAM PassRole for SageMaker
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [props.sagemakerRoleArn],
        conditions: {
          StringEquals: {
            'iam:PassedToService': 'sagemaker.amazonaws.com',
          },
        },
      })
    );

    // QuickSight permissions
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'quicksight:GenerateEmbedUrlForRegisteredUser',
          'quicksight:GetDashboardEmbedUrl',
        ],
        resources: ['*'],
      })
    );

    // Helper function to create Lambda
    const createLambda = (name: string, entry: string, handler = 'handler'): NodejsFunction => {
      return new NodejsFunction(this, name, {
        entry: path.join(lambdaDir, entry),
        handler,
        runtime: lambda.Runtime.NODEJS_20_X,
        timeout: cdk.Duration.seconds(60),
        memorySize: 256,
        role: lambdaRole,
        environment: lambdaEnvironment,
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: ['@aws-sdk/*'],
        },
      });
    };

    // Create Lambda functions
    const getProductsLambda = createLambda('GetProductsFunction', 'products/get-products/index.ts');
    const getProductByIdLambda = createLambda('GetProductByIdFunction', 'products/get-product-by-id/index.ts');
    const getForecastLambda = createLambda('GetForecastFunction', 'forecasts/get-forecast/index.ts');
    const getStockProjectionLambda = createLambda('GetStockProjectionFunction', 'forecasts/get-stock-projection/index.ts');
    const runWhatIfLambda = createLambda('RunWhatIfFunction', 'forecasts/run-what-if/index.ts');
    const startTrainingJobLambda = createLambda('StartTrainingJobFunction', 'training/start-training-job/index.ts');
    const getTrainingStatusLambda = createLambda('GetTrainingStatusFunction', 'training/get-training-status/index.ts');
    const createModelLambda = createLambda('CreateModelFunction', 'training/create-model/index.ts');
    const runBatchTransformLambda = createLambda('RunBatchTransformFunction', 'inference/run-batch-transform/index.ts');
    const getTransformStatusLambda = createLambda('GetTransformStatusFunction', 'inference/get-transform-status/index.ts');
    const getEmbedUrlLambda = createLambda('GetEmbedUrlFunction', 'analytics/get-embed-url/index.ts');

    // API Gateway
    this.api = new apigateway.RestApi(this, 'RetailForecastApi', {
      restApiName: 'retail-forecast-api',
      description: 'API for Retail Demand Forecasting PoC',
      deployOptions: {
        stageName: 'v1',
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
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

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: 'CognitoAuthorizer',
    });

    const authorizationOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // Products API
    const productsResource = this.api.root.addResource('products');
    productsResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsLambda), authorizationOptions);

    const productByIdResource = productsResource.addResource('{id}');
    productByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getProductByIdLambda), authorizationOptions);

    // Forecasts API
    const forecastsResource = this.api.root.addResource('forecasts');
    const forecastByItemResource = forecastsResource.addResource('{itemId}');
    forecastByItemResource.addMethod('GET', new apigateway.LambdaIntegration(getForecastLambda), authorizationOptions);

    const stockProjectionResource = forecastsResource.addResource('stock-projection');
    stockProjectionResource.addMethod('POST', new apigateway.LambdaIntegration(getStockProjectionLambda), authorizationOptions);

    const whatIfResource = forecastsResource.addResource('what-if');
    whatIfResource.addMethod('POST', new apigateway.LambdaIntegration(runWhatIfLambda), authorizationOptions);

    // Training API
    const trainingResource = this.api.root.addResource('training');
    const startTrainingResource = trainingResource.addResource('start');
    startTrainingResource.addMethod('POST', new apigateway.LambdaIntegration(startTrainingJobLambda), authorizationOptions);

    const trainingStatusResource = trainingResource.addResource('{jobName}');
    trainingStatusResource.addMethod('GET', new apigateway.LambdaIntegration(getTrainingStatusLambda), authorizationOptions);

    const createModelResource = trainingResource.addResource('create-model');
    createModelResource.addMethod('POST', new apigateway.LambdaIntegration(createModelLambda), authorizationOptions);

    // Inference API
    const inferenceResource = this.api.root.addResource('inference');
    const batchResource = inferenceResource.addResource('batch');
    batchResource.addMethod('POST', new apigateway.LambdaIntegration(runBatchTransformLambda), authorizationOptions);

    const transformStatusResource = inferenceResource.addResource('{jobName}');
    transformStatusResource.addMethod('GET', new apigateway.LambdaIntegration(getTransformStatusLambda), authorizationOptions);

    // Analytics API
    const analyticsResource = this.api.root.addResource('analytics');
    const embedUrlResource = analyticsResource.addResource('embed-url');
    embedUrlResource.addMethod('GET', new apigateway.LambdaIntegration(getEmbedUrlLambda), authorizationOptions);

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
