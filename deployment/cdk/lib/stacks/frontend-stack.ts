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

    // CFR3 + S1: dedicated bucket for CloudFront access logs and S3 server
    // access logs (website bucket), kept under separate prefixes. Bucket names
    // are omitted so CloudFormation generates unique physical names, allowing
    // multiple Guidance instances to coexist in the same account/Region.
    const accessLogsBucket = new s3.Bucket(this, 'CloudFrontLogsBucket', {
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
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      // S1: S3 server access logging
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: 'website-bucket/',
    });

    // The frontend is a Next.js static export (output: 'export') with no trailing
    // slash, so routes are emitted as files like `admin.html`, not `admin/index.html`.
    // The S3 origin (via OAC / REST endpoint) does not resolve extensionless paths
    // or folder index documents, so a hard reload of `/admin` would 403 and fall
    // through to the SPA error handler (serving the landing page). This viewer-request
    // function rewrites the URI to the matching static file so deep-link reloads work:
    //   `/`        -> `/index.html`
    //   `/admin`   -> `/admin.html`
    //   `/admin/`  -> `/admin/index.html`
    //   (paths that already have an extension, e.g. `/_next/...js`, pass through)
    const rewriteFunction = new cloudfront.Function(this, 'RewriteToHtmlFunction', {
      comment: 'Rewrite extensionless routes to their static .html file for Next export',
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    request.uri = uri + '.html';
  }
  return request;
}
      `),
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
        functionAssociations: [
          {
            function: rewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
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
      // BucketDeployment's custom-resource Lambda defaults to 1024 MB, which
      // fails in accounts that cap Lambda MemorySize (commonly 512 MB). These
      // assets are small, so 512 MB is ample.
      memoryLimit: 512,
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
