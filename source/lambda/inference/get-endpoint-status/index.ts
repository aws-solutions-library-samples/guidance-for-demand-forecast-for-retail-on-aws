// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { SageMakerClient, DescribeEndpointCommand } from '@aws-sdk/client-sagemaker';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';

const sagemaker = new SageMakerClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get endpoint status request:', JSON.stringify(event, null, 2));

  const endpointName = event.pathParameters?.endpointName;

  if (!endpointName) {
    return badRequestResponse('endpointName is required');
  }

  try {
    const response = await sagemaker.send(
      new DescribeEndpointCommand({
        EndpointName: endpointName,
      }),
    );

    return successResponse({
      endpointName,
      status: response.EndpointStatus || 'Unknown',
      message: response.FailureReason || undefined,
    });
  } catch (error) {
    console.error('Error getting endpoint status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // If endpoint not found, return a clear status
    if (errorMessage.includes('Could not find endpoint')) {
      return successResponse({
        endpointName,
        status: 'Unknown',
        message: 'Endpoint not found',
      });
    }

    return errorResponse(`Failed to get endpoint status: ${errorMessage}`);
  }
};
