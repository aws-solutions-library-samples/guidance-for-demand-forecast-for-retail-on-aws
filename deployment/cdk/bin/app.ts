#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/stacks/data-stack';
import { AuthStack } from '../lib/stacks/auth-stack';
import { MLStack } from '../lib/stacks/ml-stack';
import { BackendStack } from '../lib/stacks/backend-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';
import { PipelineStack } from '../lib/stacks/pipeline-stack';

const app = new cdk.App();

// Region resolution order: cdk.json context (accounts.dev.region) is the single
// source of truth, falling back to the CLI/credentials Region, then us-east-1.
// The account always comes from the active AWS credentials.
const accountsCtx = app.node.tryGetContext('accounts');
const contextRegion = accountsCtx?.dev?.region;

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: contextRegion || process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
};

const stackPrefix = app.node.tryGetContext('stackPrefix') || 'RetailForecast';

// FrontendStack first — produces the CloudFront distribution that other stacks
// reference for CORS allow-listing and for auth callback URLs.
const frontendStack = new FrontendStack(app, `${stackPrefix}-FrontendStack`, {
  env,
  description: 'Frontend hosting: CloudFront distribution and S3 bucket',
});

// The single browser origin allowed to call the API and upload to S3 (the
// deployed app served by CloudFront). Local development uses mock mode.
const appOrigins = [`https://${frontendStack.distributionDomainName}`];

const dataStack = new DataStack(app, `${stackPrefix}-DataStack`, {
  env,
  description: 'Data infrastructure: S3 buckets, Glue catalog, Athena workgroup',
  allowedOrigins: appOrigins,
});
dataStack.addDependency(frontendStack);

// AuthStack receives CloudFront + localhost URLs for OAuth callbacks
const authStack = new AuthStack(app, `${stackPrefix}-AuthStack`, {
  env,
  description: 'Authentication: Cognito User Pool and Identity Pool',
  callbackUrls: frontendStack.urls,
});
authStack.addDependency(frontendStack);

const mlStack = new MLStack(app, `${stackPrefix}-MLStack`, {
  env,
  description: 'ML infrastructure: SageMaker execution role',
  rawDataBucket: dataStack.rawDataBucket,
  outputsBucket: dataStack.outputsBucket,
});
mlStack.addDependency(dataStack);

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
  allowedOrigins: appOrigins,
});
backendStack.addDependency(dataStack);
backendStack.addDependency(authStack);
backendStack.addDependency(mlStack);
backendStack.addDependency(frontendStack);

const pipelineStack = new PipelineStack(app, `${stackPrefix}-PipelineStack`, {
  env,
  description: 'ML pipeline: auto-training and batch inference via Step Functions',
  rawDataBucket: dataStack.rawDataBucket,
  outputsBucket: dataStack.outputsBucket,
  sagemakerRoleArn: mlStack.sagemakerRoleArn,
});
pipelineStack.addDependency(dataStack);
pipelineStack.addDependency(mlStack);

cdk.Tags.of(app).add('Project', 'RetailDemandForecast');
cdk.Tags.of(app).add('Environment', 'PoC');
cdk.Tags.of(app).add('ManagedBy', 'CDK');

app.synth();
