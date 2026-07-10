// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { SageMakerClient, CreateAutoMLJobV2Command } from '@aws-sdk/client-sagemaker';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';
import { StartTrainingRequest, TrainingJobResponse } from '../../shared/types';

const sagemaker = new SageMakerClient({});
const RAW_DATA_BUCKET = process.env.RAW_DATA_BUCKET || '';
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';
const SAGEMAKER_ROLE_ARN = process.env.SAGEMAKER_ROLE_ARN || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Start training job request:', JSON.stringify(event, null, 2));

  let body: StartTrainingRequest;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const {
    jobName,
    inputPrefix = 'data/sales',
    forecastFrequency = 'D',
    forecastHorizon = 14,
  } = body;

  // Generate unique job name if not provided
  const autoMLJobName = jobName || `retail-forecast-${Date.now()}`;

  if (!SAGEMAKER_ROLE_ARN) {
    return errorResponse('SageMaker role ARN not configured');
  }

  try {
    const command = new CreateAutoMLJobV2Command({
      AutoMLJobName: autoMLJobName,
      AutoMLJobInputDataConfig: [
        {
          ChannelType: 'training',
          ContentType: 'text/csv;header=present',
          CompressionType: 'None',
          DataSource: {
            S3DataSource: {
              S3DataType: 'S3Prefix',
              S3Uri: `s3://${RAW_DATA_BUCKET}/${inputPrefix}/`,
            },
          },
        },
      ],
      OutputDataConfig: {
        S3OutputPath: `s3://${OUTPUTS_BUCKET}/training-output`,
      },
      AutoMLProblemTypeConfig: {
        TimeSeriesForecastingJobConfig: {
          ForecastFrequency: forecastFrequency,
          ForecastHorizon: forecastHorizon,
          ForecastQuantiles: ['p50', 'p60', 'p70', 'p80', 'p90'],
          Transformations: {
            Filling: {
              demand: {
                middlefill: 'zero',
                backfill: 'zero',
              },
              price: {
                middlefill: 'zero',
                backfill: 'zero',
                futurefill: 'zero',
              },
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
    });

    const response = await sagemaker.send(command);

    const result: TrainingJobResponse = {
      jobName: autoMLJobName,
      jobArn: response.AutoMLJobArn,
      message:
        'Training job started successfully. The SageMaker Autopilot time-series job typically takes 1-3 hours.',
    };

    return successResponse(result, 201);
  } catch (error) {
    console.error('Error starting training job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to start training job: ${errorMessage}`);
  }
};
