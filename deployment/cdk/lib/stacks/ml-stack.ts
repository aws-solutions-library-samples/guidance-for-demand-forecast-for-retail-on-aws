// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface MLStackProps extends cdk.StackProps {
  rawDataBucket: s3.IBucket;
  outputsBucket: s3.IBucket;
}

export class MLStack extends cdk.Stack {
  public readonly sagemakerRole: iam.Role;
  public readonly sagemakerRoleArn: string;

  constructor(scope: Construct, id: string, props: MLStackProps) {
    super(scope, id, props);

    // SageMaker Execution Role
    this.sagemakerRole = new iam.Role(this, 'SageMakerExecutionRole', {
      // Name omitted so CloudFormation generates a unique role name, allowing
      // multiple Guidance instances to coexist in the same account/Region.
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Execution role for SageMaker Autopilot training and inference jobs',
    });

    // S3 access for raw data and outputs buckets
    this.sagemakerRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'S3BucketAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
          's3:GetBucketLocation',
        ],
        resources: [
          props.rawDataBucket.bucketArn,
          `${props.rawDataBucket.bucketArn}/*`,
          props.outputsBucket.bucketArn,
          `${props.outputsBucket.bucketArn}/*`,
        ],
      }),
    );

    // CloudWatch Logs access
    this.sagemakerRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudWatchLogsAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams',
        ],
        resources: [
          `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/sagemaker/*`,
        ],
      }),
    );

    // ECR access for pulling container images
    this.sagemakerRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ECRAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
        ],
        resources: ['*'],
      }),
    );

    // KMS access for encryption (if needed)
    this.sagemakerRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'KMSAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'kms:Encrypt',
          'kms:Decrypt',
          'kms:ReEncrypt*',
          'kms:GenerateDataKey*',
          'kms:DescribeKey',
        ],
        resources: ['*'],
        conditions: {
          StringLike: {
            'kms:ViaService': `s3.${cdk.Stack.of(this).region}.amazonaws.com`,
          },
        },
      }),
    );

    // IAM PassRole for SageMaker to pass its own role
    this.sagemakerRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'PassRoleAccess',
        effect: iam.Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [this.sagemakerRole.roleArn],
        conditions: {
          StringEquals: {
            'iam:PassedToService': 'sagemaker.amazonaws.com',
          },
        },
      }),
    );

    // Store role ARN for exports
    this.sagemakerRoleArn = this.sagemakerRole.roleArn;

    // Stack Outputs
    new cdk.CfnOutput(this, 'SageMakerRoleArnOutput', {
      value: this.sagemakerRoleArn,
      description: 'SageMaker execution role ARN',
      exportName: 'SageMakerRoleArn',
    });

    new cdk.CfnOutput(this, 'SageMakerRoleNameOutput', {
      value: this.sagemakerRole.roleName,
      description: 'SageMaker execution role name',
      exportName: 'SageMakerRoleName',
    });
  }
}
