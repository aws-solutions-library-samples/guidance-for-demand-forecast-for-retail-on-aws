// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { SageMakerClient, DescribeTransformJobCommand } from '@aws-sdk/client-sagemaker';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';

const sagemaker = new SageMakerClient({});

interface PriceScenarioJobStatus {
  price: number;
  jobName: string;
  status: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get price scenario status request:', JSON.stringify(event, null, 2));

  const jobsParam = event.queryStringParameters?.jobs;

  if (!jobsParam) {
    return badRequestResponse('jobs query parameter is required');
  }

  const jobNames = jobsParam
    .split(',')
    .map((j) => j.trim())
    .filter(Boolean);

  if (jobNames.length === 0) {
    return badRequestResponse('At least one job name is required');
  }

  try {
    const jobStatuses: PriceScenarioJobStatus[] = await Promise.all(
      jobNames.map(async (jobName) => {
        const priceMatch = jobName.match(/^price-(\d+)-/);
        const price = priceMatch ? parseInt(priceMatch[1], 10) : 0;

        try {
          const command = new DescribeTransformJobCommand({
            TransformJobName: jobName,
          });
          const response = await sagemaker.send(command);

          return {
            price,
            jobName,
            status: response.TransformJobStatus || 'Unknown',
          };
        } catch (err) {
          console.error(`Error describing transform job ${jobName}:`, err);
          return {
            price,
            jobName,
            status: 'Unknown',
          };
        }
      }),
    );

    const allComplete = jobStatuses.every(
      (j) => j.status === 'Completed' || j.status === 'Failed' || j.status === 'Stopped',
    );

    return successResponse({ jobs: jobStatuses, allComplete });
  } catch (error) {
    console.error('Error getting price scenario status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to get price scenario status: ${errorMessage}`);
  }
};
