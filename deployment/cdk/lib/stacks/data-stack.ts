// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as athena from 'aws-cdk-lib/aws-athena';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface DataStackProps extends cdk.StackProps {
  allowedOrigins: string[];
}

export class DataStack extends cdk.Stack {
  public readonly rawDataBucket: s3.Bucket;
  public readonly outputsBucket: s3.Bucket;
  public readonly athenaResultsBucket: s3.Bucket;
  public readonly glueDatabase: glue.CfnDatabase;
  public readonly athenaWorkgroup: athena.CfnWorkGroup;

  // Export values for other stacks
  public readonly rawDataBucketName: string;
  public readonly rawDataBucketArn: string;
  public readonly outputsBucketName: string;
  public readonly outputsBucketArn: string;
  public readonly athenaResultsBucketName: string;
  public readonly glueDatabaseName: string;
  public readonly athenaWorkgroupName: string;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const account = cdk.Stack.of(this).account;

    // Deterministic, stack-unique suffix so resources that REQUIRE an explicit
    // name (Glue database, Glue crawler, Athena workgroup) don't collide when the
    // Guidance is deployed as multiple instances in the same account/Region.
    // node.addr is a lowercase-hex hash of the construct path, so it is stable per
    // stack instance and safe for Glue's [a-z0-9_] naming rules.
    const uniqueSuffix = this.node.addr.slice(0, 8);
    const glueDatabaseName = `retail_forecast_db_${uniqueSuffix}`;
    const athenaWorkgroupName = `retail-forecast-workgroup-${uniqueSuffix}`;

    // S1: dedicated bucket for S3 server access logs.
    // Bucket names are intentionally omitted so CloudFormation generates unique
    // physical names (avoids cross-instance collisions in one account/Region).
    const accessLogsBucket = new s3.Bucket(this, 'AccessLogsBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(90),
          enabled: true,
        },
      ],
    });

    // S3 Bucket for raw sales data
    this.rawDataBucket = new s3.Bucket(this, 'RawDataBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: 'raw-data-bucket/',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: props.allowedOrigins,
          allowedHeaders: ['*'],
        },
      ],
    });

    // S3 Bucket for forecast outputs and model artifacts
    this.outputsBucket = new s3.Bucket(this, 'OutputsBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: 'outputs-bucket/',
    });

    // S3 Bucket for Athena query results
    this.athenaResultsBucket = new s3.Bucket(this, 'AthenaResultsBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: 'athena-results-bucket/',
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(7),
          enabled: true,
        },
      ],
    });

    // Deploy sales time-series data
    new s3deploy.BucketDeployment(this, 'DeploySalesData', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '../../../../assets/data'), {
          exclude: ['products_metadata.csv'],
        }),
      ],
      destinationBucket: this.rawDataBucket,
      destinationKeyPrefix: 'data/sales/',
    });

    new s3deploy.BucketDeployment(this, 'DeployProductMetadata', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '../../../../assets/data'), {
          exclude: ['consumer_electronics.csv'],
        }),
      ],
      destinationBucket: this.rawDataBucket,
      destinationKeyPrefix: 'data/metadata/',
    });

    // Glue Database for data catalog
    this.glueDatabase = new glue.CfnDatabase(this, 'GlueDatabase', {
      catalogId: account,
      databaseInput: {
        name: glueDatabaseName,
        description: 'Retail demand forecast data catalog',
      },
    });

    // Glue Table for sales data (consumer_electronics.csv)
    const salesTable = new glue.CfnTable(this, 'SalesDataTable', {
      catalogId: account,
      databaseName: glueDatabaseName,
      tableInput: {
        name: 'sales_data',
        description: 'Historical sales data with demand and price',
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          'skip.header.line.count': '1',
          classification: 'csv',
        },
        storageDescriptor: {
          location: `s3://${this.rawDataBucket.bucketName}/data/sales/`,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe',
            parameters: {
              'field.delim': ',',
              'serialization.format': ',',
            },
          },
          columns: [
            { name: 'item_id', type: 'string' },
            { name: 'store_id', type: 'string' },
            { name: 'ts', type: 'string' },
            { name: 'demand', type: 'double' },
            { name: 'price', type: 'double' },
          ],
        },
      },
    });
    salesTable.addDependency(this.glueDatabase);

    const metadataTable = new glue.CfnTable(this, 'ProductMetadataTable', {
      catalogId: account,
      databaseName: glueDatabaseName,
      tableInput: {
        name: 'products_metadata',
        description: 'Product catalog with descriptions, types, and image keys',
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          'skip.header.line.count': '1',
          classification: 'csv',
        },
        storageDescriptor: {
          location: `s3://${this.rawDataBucket.bucketName}/data/metadata/`,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe',
            parameters: {
              'field.delim': ',',
              'serialization.format': ',',
            },
          },
          columns: [
            { name: 'item_id', type: 'string' },
            { name: 'item_description', type: 'string' },
            { name: 'item_type', type: 'string' },
            { name: 'base_price', type: 'double' },
            { name: 'image_key', type: 'string' },
          ],
        },
      },
    });
    metadataTable.addDependency(this.glueDatabase);

    // IAM Role for Glue Crawler
    const glueRole = new iam.Role(this, 'GlueCrawlerRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'),
      ],
    });

    this.rawDataBucket.grantRead(glueRole);

    // Glue Crawler for auto-discovering schema changes
    const crawler = new glue.CfnCrawler(this, 'DataCrawler', {
      name: `retail-forecast-crawler-${uniqueSuffix}`,
      role: glueRole.roleArn,
      databaseName: glueDatabaseName,
      targets: {
        s3Targets: [
          {
            path: `s3://${this.rawDataBucket.bucketName}/data/sales/`,
          },
        ],
      },
      schemaChangePolicy: {
        updateBehavior: 'UPDATE_IN_DATABASE',
        deleteBehavior: 'LOG',
      },
      configuration: JSON.stringify({
        Version: 1.0,
        CrawlerOutput: {
          Partitions: { AddOrUpdateBehavior: 'InheritFromTable' },
        },
      }),
    });
    crawler.addDependency(this.glueDatabase);

    // Athena Workgroup
    this.athenaWorkgroup = new athena.CfnWorkGroup(this, 'AthenaWorkgroup', {
      name: athenaWorkgroupName,
      description: 'Workgroup for retail forecast queries',
      state: 'ENABLED',
      workGroupConfiguration: {
        enforceWorkGroupConfiguration: true,
        publishCloudWatchMetricsEnabled: true,
        resultConfiguration: {
          outputLocation: `s3://${this.athenaResultsBucket.bucketName}/query-results/`,
          encryptionConfiguration: {
            encryptionOption: 'SSE_S3',
          },
        },
        engineVersion: {
          selectedEngineVersion: 'Athena engine version 3',
        },
      },
    });

    // Store values for exports
    this.rawDataBucketName = this.rawDataBucket.bucketName;
    this.rawDataBucketArn = this.rawDataBucket.bucketArn;
    this.outputsBucketName = this.outputsBucket.bucketName;
    this.outputsBucketArn = this.outputsBucket.bucketArn;
    this.athenaResultsBucketName = this.athenaResultsBucket.bucketName;
    this.glueDatabaseName = glueDatabaseName;
    this.athenaWorkgroupName = athenaWorkgroupName;

    // Stack Outputs
    new cdk.CfnOutput(this, 'RawDataBucketNameOutput', {
      value: this.rawDataBucketName,
      description: 'S3 bucket for raw sales data',
      exportName: 'RawDataBucketName',
    });

    new cdk.CfnOutput(this, 'OutputsBucketNameOutput', {
      value: this.outputsBucketName,
      description: 'S3 bucket for forecast outputs',
      exportName: 'OutputsBucketName',
    });

    new cdk.CfnOutput(this, 'AthenaResultsBucketNameOutput', {
      value: this.athenaResultsBucketName,
      description: 'S3 bucket for Athena query results',
      exportName: 'AthenaResultsBucketName',
    });

    new cdk.CfnOutput(this, 'GlueDatabaseNameOutput', {
      value: this.glueDatabaseName,
      description: 'Glue database name',
      exportName: 'GlueDatabaseName',
    });

    new cdk.CfnOutput(this, 'AthenaWorkgroupNameOutput', {
      value: this.athenaWorkgroupName,
      description: 'Athena workgroup name',
      exportName: 'AthenaWorkgroupName',
    });
  }
}
