// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { SageMakerClient, ListAutoMLJobsCommand } from '@aws-sdk/client-sagemaker';
import { successResponse, errorResponse } from '../../shared/response';
import { ListTrainingJobsResponse, TrainingJobSummary } from '../../shared/types';

const sagemaker = new SageMakerClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('List training jobs request:', JSON.stringify(event, null, 2));

  const maxResults = parseInt(event.queryStringParameters?.maxResults || '20', 10);

  try {
    const command = new ListAutoMLJobsCommand({
      SortBy: 'CreationTime',
      SortOrder: 'Descending',
      MaxResults: Math.min(maxResults, 100),
    });

    const response = await sagemaker.send(command);

    const jobs: TrainingJobSummary[] = (response.AutoMLJobSummaries || []).map((job) => ({
      jobName: job.AutoMLJobName || '',
      status: job.AutoMLJobStatus || 'Unknown',
      creationTime: job.CreationTime?.toISOString(),
      endTime: job.EndTime?.toISOString(),
    }));

    const result: ListTrainingJobsResponse = {
      jobs,
      count: jobs.length,
    };

    return successResponse(result);
  } catch (error) {
    console.error('Error listing training jobs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to list training jobs: ${errorMessage}`);
  }
};
