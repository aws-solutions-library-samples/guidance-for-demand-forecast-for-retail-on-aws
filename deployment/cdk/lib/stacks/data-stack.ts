import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as athena from 'aws-cdk-lib/aws-athena';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

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

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const account = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    // S3 Bucket for raw sales data
    this.rawDataBucket = new s3.Bucket(this, 'RawDataBucket', {
      bucketName: `retail-forecast-raw-${account}-${region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // S3 Bucket for forecast outputs and model artifacts
    this.outputsBucket = new s3.Bucket(this, 'OutputsBucket', {
      bucketName: `retail-forecast-outputs-${account}-${region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
    });

    // S3 Bucket for Athena query results
    this.athenaResultsBucket = new s3.Bucket(this, 'AthenaResultsBucket', {
      bucketName: `retail-forecast-athena-${account}-${region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(7),
          enabled: true,
        },
      ],
    });

    // Deploy sample data from assets/s3-data-raw/
    new s3deploy.BucketDeployment(this, 'DeploySampleData', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../../../assets/s3-data-raw'))],
      destinationBucket: this.rawDataBucket,
      destinationKeyPrefix: 'data/',
    });

    // Glue Database for data catalog
    this.glueDatabase = new glue.CfnDatabase(this, 'GlueDatabase', {
      catalogId: account,
      databaseInput: {
        name: 'retail_forecast_db',
        description: 'Retail demand forecast data catalog',
      },
    });

    // Glue Table for sales data (consumer_electronics.csv)
    const salesTable = new glue.CfnTable(this, 'SalesDataTable', {
      catalogId: account,
      databaseName: 'retail_forecast_db',
      tableInput: {
        name: 'sales_data',
        description: 'Historical sales data with demand and price',
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          'skip.header.line.count': '1',
          'classification': 'csv',
        },
        storageDescriptor: {
          location: `s3://${this.rawDataBucket.bucketName}/data/`,
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

    // Glue Table for item metadata (food-forecast-items.csv)
    const itemsTable = new glue.CfnTable(this, 'ItemMetadataTable', {
      catalogId: account,
      databaseName: 'retail_forecast_db',
      tableInput: {
        name: 'item_metadata',
        description: 'Product catalog with item details',
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          'skip.header.line.count': '1',
          'classification': 'csv',
        },
        storageDescriptor: {
          location: `s3://${this.rawDataBucket.bucketName}/data/`,
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
            { name: 'item_type', type: 'string' },
            { name: 'item_description', type: 'string' },
          ],
        },
      },
    });
    itemsTable.addDependency(this.glueDatabase);

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
      name: 'retail-forecast-crawler',
      role: glueRole.roleArn,
      databaseName: 'retail_forecast_db',
      targets: {
        s3Targets: [
          {
            path: `s3://${this.rawDataBucket.bucketName}/data/`,
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
      name: 'retail-forecast-workgroup',
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
    this.glueDatabaseName = 'retail_forecast_db';
    this.athenaWorkgroupName = 'retail-forecast-workgroup';

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
