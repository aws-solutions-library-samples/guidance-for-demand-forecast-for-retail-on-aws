// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Handler } from 'aws-lambda';
import { SageMakerClient, CreateAutoMLJobV2Command } from '@aws-sdk/client-sagemaker';

const sagemaker = new SageMakerClient({});
const RAW_DATA_BUCKET = process.env.RAW_DATA_BUCKET || '';
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';
const SAGEMAKER_ROLE_ARN = process.env.SAGEMAKER_ROLE_ARN || '';

export const handler: Handler<
  Record<string, never>,
  { jobName: string; jobArn: string | undefined }
> = async () => {
  const jobName = `retail-forecast-${Date.now()}`;

  const response = await sagemaker.send(
    new CreateAutoMLJobV2Command({
      AutoMLJobName: jobName,
      AutoMLJobInputDataConfig: [
        {
          ChannelType: 'training',
          ContentType: 'text/csv;header=present',
          CompressionType: 'None',
          DataSource: {
            S3DataSource: {
              S3DataType: 'S3Prefix',
              S3Uri: `s3://${RAW_DATA_BUCKET}/data/sales/`,
            },
          },
        },
      ],
      OutputDataConfig: {
        S3OutputPath: `s3://${OUTPUTS_BUCKET}/training-output`,
      },
      AutoMLProblemTypeConfig: {
        TimeSeriesForecastingJobConfig: {
          ForecastFrequency: 'D',
          ForecastHorizon: 14,
          ForecastQuantiles: ['p50', 'p60', 'p70', 'p80', 'p90'],
          Transformations: {
            Filling: {
              demand: { middlefill: 'zero', backfill: 'zero' },
              price: { middlefill: 'zero', backfill: 'zero', futurefill: 'zero' },
            },
          },
          TimeSeriesConfig: {
            TargetAttributeName: 'demand',
            TimestampAttributeName: 'ts',
            ItemIdentifierAttributeName: 'item_id',
            GroupingAttributeNames: ['store_id'],
          },
        },
      },
      AutoMLJobObjective: {
        MetricName: 'AverageWeightedQuantileLoss',
      },
      RoleArn: SAGEMAKER_ROLE_ARN,
    }),
  );

  return { jobName, jobArn: response.AutoMLJobArn };
};
