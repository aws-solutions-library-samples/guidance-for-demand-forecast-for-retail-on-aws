import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export interface FrontendStackProps extends cdk.StackProps {
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  identityPoolId: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly websiteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const account = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    // S3 bucket for static website hosting
    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `retail-forecast-frontend-${account}-${region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront distribution with OAC
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
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

    // Create placeholder index.html with configuration info
    const placeholderHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Retail Demand Forecasting - Setup Required</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #232f3e; }
        h2 { color: #ff9900; margin-top: 30px; }
        code {
            background: #f0f0f0;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 14px;
        }
        pre {
            background: #232f3e;
            color: #f0f0f0;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
        }
        .config {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Retail Demand Forecasting PoC</h1>
        <p>Infrastructure deployed successfully! The frontend application needs to be built and deployed.</p>

        <h2>Configuration</h2>
        <div class="config">
            <p><strong>API URL:</strong> <code>${props.apiUrl}</code></p>
            <p><strong>User Pool ID:</strong> <code>${props.userPoolId}</code></p>
            <p><strong>User Pool Client ID:</strong> <code>${props.userPoolClientId}</code></p>
            <p><strong>Identity Pool ID:</strong> <code>${props.identityPoolId}</code></p>
            <p><strong>Region:</strong> <code>${region}</code></p>
        </div>

        <h2>Next Steps</h2>
        <ol>
            <li>Build your Next.js frontend application</li>
            <li>Configure the application with the above values</li>
            <li>Deploy the build output to this S3 bucket</li>
        </ol>

        <h2>Deploy Frontend</h2>
        <pre>
# Build your Next.js app
cd source/frontend
npm run build

# Deploy to S3
aws s3 sync out/ s3://${this.websiteBucket.bucketName}/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \\
  --distribution-id ${this.distribution.distributionId} \\
  --paths "/*"
        </pre>
    </div>
</body>
</html>
`;

    // Deploy placeholder HTML
    new s3deploy.BucketDeployment(this, 'DeployPlaceholder', {
      sources: [s3deploy.Source.data('index.html', placeholderHtml)],
      destinationBucket: this.websiteBucket,
    });

    // Store distribution domain name
    this.distributionDomainName = this.distribution.distributionDomainName;

    // Stack Outputs
    new cdk.CfnOutput(this, 'WebsiteBucketNameOutput', {
      value: this.websiteBucket.bucketName,
      description: 'S3 bucket for frontend hosting',
      exportName: 'WebsiteBucketName',
    });

    new cdk.CfnOutput(this, 'DistributionDomainNameOutput', {
      value: this.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: 'DistributionDomainName',
    });

    new cdk.CfnOutput(this, 'DistributionIdOutput', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: 'DistributionId',
    });

    new cdk.CfnOutput(this, 'WebsiteUrlOutput', {
      value: `https://${this.distributionDomainName}`,
      description: 'Website URL',
      exportName: 'WebsiteUrl',
    });
  }
}
