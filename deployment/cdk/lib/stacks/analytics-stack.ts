import * as cdk from 'aws-cdk-lib';
import * as quicksight from 'aws-cdk-lib/aws-quicksight';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface AnalyticsStackProps extends cdk.StackProps {
  glueDatabaseName: string;
  athenaWorkgroupName: string;
  athenaResultsBucket: s3.IBucket;
  rawDataBucket: s3.IBucket;
}

export class AnalyticsStack extends cdk.Stack {
  public readonly quickSightServiceRole: iam.Role;

  constructor(scope: Construct, id: string, props: AnalyticsStackProps) {
    super(scope, id, props);

    const account = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    // IAM Role for QuickSight to access Athena and S3
    this.quickSightServiceRole = new iam.Role(this, 'QuickSightServiceRole', {
      roleName: 'retail-forecast-quicksight-role',
      assumedBy: new iam.ServicePrincipal('quicksight.amazonaws.com'),
      description: 'Role for QuickSight to access Athena and S3',
    });

    // S3 permissions for QuickSight
    this.quickSightServiceRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'S3Access',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:GetObjectVersion',
          's3:ListBucket',
          's3:ListBucketVersions',
          's3:PutObject',
        ],
        resources: [
          props.athenaResultsBucket.bucketArn,
          `${props.athenaResultsBucket.bucketArn}/*`,
          props.rawDataBucket.bucketArn,
          `${props.rawDataBucket.bucketArn}/*`,
        ],
      })
    );

    // Athena permissions for QuickSight
    this.quickSightServiceRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'AthenaAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'athena:BatchGetQueryExecution',
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
          'athena:GetQueryResultsStream',
          'athena:ListQueryExecutions',
          'athena:StartQueryExecution',
          'athena:StopQueryExecution',
          'athena:GetWorkGroup',
        ],
        resources: [
          `arn:aws:athena:${region}:${account}:workgroup/${props.athenaWorkgroupName}`,
        ],
      })
    );

    // Glue permissions for QuickSight
    this.quickSightServiceRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'GlueAccess',
        effect: iam.Effect.ALLOW,
        actions: [
          'glue:GetDatabase',
          'glue:GetDatabases',
          'glue:GetTable',
          'glue:GetTables',
          'glue:GetPartition',
          'glue:GetPartitions',
          'glue:BatchGetPartition',
        ],
        resources: [
          `arn:aws:glue:${region}:${account}:catalog`,
          `arn:aws:glue:${region}:${account}:database/${props.glueDatabaseName}`,
          `arn:aws:glue:${region}:${account}:table/${props.glueDatabaseName}/*`,
        ],
      })
    );

    // Note: QuickSight data source and dataset creation requires manual setup
    // or the QuickSight service must be enabled in the account first.
    // The following resources are created as CloudFormation resources
    // and may require the QuickSight namespace to exist.

    // QuickSight Data Source (Athena)
    // Note: This will fail if QuickSight is not set up in the account
    // Uncomment after QuickSight is configured
    /*
    const dataSource = new quicksight.CfnDataSource(this, 'AthenaDataSource', {
      awsAccountId: account,
      dataSourceId: 'retail-forecast-athena-source',
      name: 'RetailForecastAthenaSource',
      type: 'ATHENA',
      dataSourceParameters: {
        athenaParameters: {
          workGroup: props.athenaWorkgroupName,
        },
      },
      permissions: [
        {
          principal: `arn:aws:quicksight:${region}:${account}:user/default/admin`,
          actions: [
            'quicksight:DescribeDataSource',
            'quicksight:DescribeDataSourcePermissions',
            'quicksight:PassDataSource',
            'quicksight:UpdateDataSource',
            'quicksight:DeleteDataSource',
            'quicksight:UpdateDataSourcePermissions',
          ],
        },
      ],
    });
    */

    // Stack Outputs
    new cdk.CfnOutput(this, 'QuickSightRoleArnOutput', {
      value: this.quickSightServiceRole.roleArn,
      description: 'IAM Role ARN for QuickSight',
      exportName: 'QuickSightRoleArn',
    });

    new cdk.CfnOutput(this, 'QuickSightSetupInstructionsOutput', {
      value: `
QuickSight Setup Instructions:
1. Enable QuickSight Enterprise in your AWS account
2. Create a QuickSight user or admin
3. Add a new Athena data source:
   - Name: RetailForecastAthena
   - Workgroup: ${props.athenaWorkgroupName}
4. Create a dataset from the sales_data table
5. Create a dashboard for demand forecasting visualization
6. Note the Dashboard ID for embedding configuration
      `,
      description: 'Instructions for setting up QuickSight',
    });
  }
}
