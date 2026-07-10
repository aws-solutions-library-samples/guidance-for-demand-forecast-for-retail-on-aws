// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  SageMakerClient,
  DescribeAutoMLJobV2Command,
  ListModelsCommand,
  ListTransformJobsCommand,
  ListEndpointsCommand,
} from '@aws-sdk/client-sagemaker';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  notFoundResponse,
} from '../../shared/response';
import { PipelineStatusResponse } from '../../shared/types';

const sagemaker = new SageMakerClient({});
const s3 = new S3Client({});
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get pipeline status request:', JSON.stringify(event, null, 2));

  const jobName = event.pathParameters?.jobName;

  if (!jobName) {
    return badRequestResponse('Job name is required');
  }

  try {
    // Step 1: Get training job status and best candidate
    const describeCommand = new DescribeAutoMLJobV2Command({
      AutoMLJobName: jobName,
    });

    const jobResponse = await sagemaker.send(describeCommand);
    const trainingStatus = jobResponse.AutoMLJobStatus || 'Unknown';
    const candidateName = jobResponse.BestCandidate?.CandidateName;

    let bestCandidate: PipelineStatusResponse['bestCandidate'];
    if (jobResponse.BestCandidate) {
      bestCandidate = {
        candidateName: jobResponse.BestCandidate.CandidateName || '',
        finalMetricValue: jobResponse.BestCandidate.FinalAutoMLJobObjectiveMetric
          ? {
              metricName: jobResponse.BestCandidate.FinalAutoMLJobObjectiveMetric.MetricName || '',
              value: jobResponse.BestCandidate.FinalAutoMLJobObjectiveMetric.Value || 0,
            }
          : undefined,
      };
    }

    // Steps 2-4: Run in parallel - find models, transforms, and endpoints
    const [modelsResult, transformsResult, endpointsResult] = await Promise.all([
      candidateName
        ? sagemaker.send(
            new ListModelsCommand({
              NameContains: candidateName,
              SortBy: 'CreationTime',
              SortOrder: 'Descending',
            }),
          )
        : Promise.resolve({ Models: [] }),

      candidateName
        ? sagemaker.send(
            new ListTransformJobsCommand({
              NameContains: candidateName,
              SortBy: 'CreationTime',
              SortOrder: 'Descending',
            }),
          )
        : Promise.resolve({ TransformJobSummaries: [] }),

      candidateName
        ? sagemaker.send(
            new ListEndpointsCommand({
              NameContains: candidateName,
              SortBy: 'CreationTime',
              SortOrder: 'Descending',
            }),
          )
        : Promise.resolve({ Endpoints: [] }),
    ]);

    const models = (modelsResult.Models || []).map((m) => ({
      modelName: m.ModelName || '',
    }));

    const transformJobs = (transformsResult.TransformJobSummaries || []).map((t) => ({
      jobName: t.TransformJobName || '',
      status: t.TransformJobStatus || 'Unknown',
    }));

    const endpoints = (endpointsResult.Endpoints || []).map((e) => ({
      endpointName: e.EndpointName || '',
      status: e.EndpointStatus || 'Unknown',
    }));

    // Step 5: Check if forecast files exist in S3
    let hasForecastFiles = false;
    if (transformJobs.some((t) => t.status === 'Completed')) {
      try {
        const listResult = await s3.send(
          new ListObjectsV2Command({
            Bucket: OUTPUTS_BUCKET,
            Prefix: 'forecasts/',
            MaxKeys: 1,
          }),
        );
        hasForecastFiles = (listResult.KeyCount || 0) > 0;
      } catch {
        // Ignore S3 errors for this check
      }
    }

    // Calculate resumeStep
    let resumeStep: number;
    const hasInServiceEndpoint = endpoints.some((e) => e.status === 'InService');

    if (trainingStatus !== 'Completed') {
      resumeStep = 1;
    } else if (models.length === 0) {
      resumeStep = 2;
    } else if (!transformJobs.some((t) => t.status === 'Completed')) {
      resumeStep = 3;
    } else if (!hasForecastFiles) {
      resumeStep = 4;
    } else if (!hasInServiceEndpoint) {
      resumeStep = 5;
    } else {
      resumeStep = 6;
    }

    const result: PipelineStatusResponse = {
      jobName,
      trainingStatus,
      bestCandidate,
      models,
      transformJobs,
      endpoints,
      resumeStep,
      pipelineComplete: resumeStep === 6,
    };

    return successResponse(result);
  } catch (error: unknown) {
    console.error('Error getting pipeline status:', error);

    if (error instanceof Error && error.name === 'ResourceNotFound') {
      return notFoundResponse(`Training job '${jobName}' not found`);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to get pipeline status: ${errorMessage}`);
  }
};
