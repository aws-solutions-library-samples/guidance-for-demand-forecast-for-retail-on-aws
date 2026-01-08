#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/stacks/data-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { MLStack } from '../lib/stacks/ml-stack';
import { BackendStack } from '../lib/stacks/backend-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';
import { AnalyticsStack } from '../lib/stacks/analytics-stack';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
};

// Stack naming prefix (optional)
const stackPrefix = app.node.tryGetContext('stackPrefix') || 'RetailForecast';

// ============================================================================
// Independent Stacks (no dependencies)
// ============================================================================

// DataStack: S3 buckets, Glue database, Athena workgroup
const dataStack = new DataStack(app, `${stackPrefix}-DataStack`, {
  env,
  description: 'Data infrastructure: S3 buckets, Glue catalog, Athena workgroup',
});

// AuthStack: Cognito User Pool, Identity Pool
const authStack = new AuthStack(app, `${stackPrefix}-AuthStack`, {
  env,
  description: 'Authentication: Cognito User Pool and Identity Pool',
});

// ============================================================================
// Dependent Stacks
// ============================================================================

// MLStack: SageMaker IAM role (depends on DataStack for bucket ARNs)
const mlStack = new MLStack(app, `${stackPrefix}-MLStack`, {
  env,
  description: 'ML infrastructure: SageMaker execution role',
  rawDataBucket: dataStack.rawDataBucket,
  outputsBucket: dataStack.outputsBucket,
});
mlStack.addDependency(dataStack);

// AnalyticsStack: QuickSight resources (depends on DataStack)
const analyticsStack = new AnalyticsStack(app, `${stackPrefix}-AnalyticsStack`, {
  env,
  description: 'Analytics: QuickSight IAM role and configuration',
  glueDatabaseName: dataStack.glueDatabaseName,
  athenaWorkgroupName: dataStack.athenaWorkgroupName,
  athenaResultsBucket: dataStack.athenaResultsBucket,
  rawDataBucket: dataStack.rawDataBucket,
});
analyticsStack.addDependency(dataStack);

// BackendStack: API Gateway + Lambda (depends on Data, Auth, ML)
const backendStack = new BackendStack(app, `${stackPrefix}-BackendStack`, {
  env,
  description: 'Backend API: API Gateway and Lambda functions',
  userPool: authStack.userPool,
  rawDataBucket: dataStack.rawDataBucket,
  outputsBucket: dataStack.outputsBucket,
  athenaResultsBucket: dataStack.athenaResultsBucket,
  glueDatabaseName: dataStack.glueDatabaseName,
  athenaWorkgroupName: dataStack.athenaWorkgroupName,
  sagemakerRoleArn: mlStack.sagemakerRoleArn,
});
backendStack.addDependency(dataStack);
backendStack.addDependency(authStack);
backendStack.addDependency(mlStack);

// FrontendStack: CloudFront + S3 (depends on Backend, Auth)
const frontendStack = new FrontendStack(app, `${stackPrefix}-FrontendStack`, {
  env,
  description: 'Frontend hosting: CloudFront distribution and S3 bucket',
  apiUrl: backendStack.apiUrl,
  userPoolId: authStack.userPoolId,
  userPoolClientId: authStack.userPoolClientId,
  identityPoolId: authStack.identityPoolId,
});
frontendStack.addDependency(backendStack);
frontendStack.addDependency(authStack);

// ============================================================================
// Tags
// ============================================================================

cdk.Tags.of(app).add('Project', 'RetailDemandForecast');
cdk.Tags.of(app).add('Environment', 'PoC');
cdk.Tags.of(app).add('ManagedBy', 'CDK');

app.synth();
