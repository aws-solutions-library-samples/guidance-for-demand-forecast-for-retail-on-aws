// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class FrontendStack extends cdk.Stack {
  public readonly websiteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly distributionDomainName: string;
  public readonly urls: string[];

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const account = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    // CFR3 + S1: dedicated bucket for CloudFront access logs and S3 server
    // access logs (website bucket), kept under separate prefixes.
    const accessLogsBucket = new s3.Bucket(this, 'CloudFrontLogsBucket', {
      bucketName: `retail-forecast-cf-logs-${account}-${region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(90),
          enabled: true,
        },
      ],
    });

    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `retail-forecast-frontend-${account}-${region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      // S1: S3 server access logging
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: 'website-bucket/',
    });

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      // CFR3: enable access logging with an explicit 90-day retention (lifecycle rule above)
      enableLogging: true,
      logBucket: accessLogsBucket,
      logFilePrefix: 'cloudfront-access-logs/',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    this.distributionDomainName = this.distribution.distributionDomainName;
    this.urls = [`https://${this.distributionDomainName}/`, 'http://localhost:3000/'];

    new s3deploy.BucketDeployment(this, 'DeployPlaceholder', {
      sources: [
        s3deploy.Source.data(
          'index.html',
          '<html><body><h1>Retail Forecast</h1><p>Deploy the frontend to see the app.</p></body></html>',
        ),
      ],
      destinationBucket: this.websiteBucket,
    });

    new cdk.CfnOutput(this, 'WebsiteBucketNameOutput', {
      value: this.websiteBucket.bucketName,
      exportName: 'WebsiteBucketName',
    });

    new cdk.CfnOutput(this, 'DistributionDomainNameOutput', {
      value: this.distributionDomainName,
      exportName: 'DistributionDomainName',
    });

    new cdk.CfnOutput(this, 'DistributionIdOutput', {
      value: this.distribution.distributionId,
      exportName: 'DistributionId',
    });

    new cdk.CfnOutput(this, 'WebsiteUrlOutput', {
      value: `https://${this.distributionDomainName}`,
      exportName: 'WebsiteUrl',
    });
  }
}
