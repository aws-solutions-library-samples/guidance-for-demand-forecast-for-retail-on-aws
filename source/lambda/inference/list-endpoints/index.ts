// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { SageMakerClient, ListEndpointsCommand } from '@aws-sdk/client-sagemaker';
import { successResponse, errorResponse } from '../../shared/response';
import { ListEndpointsResponse, EndpointSummary } from '../../shared/types';

const sagemaker = new SageMakerClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('List endpoints request:', JSON.stringify(event, null, 2));

  const maxResults = parseInt(event.queryStringParameters?.maxResults || '20', 10);

  try {
    const command = new ListEndpointsCommand({
      SortBy: 'CreationTime',
      SortOrder: 'Descending',
      MaxResults: Math.min(maxResults, 100),
    });

    const response = await sagemaker.send(command);

    const endpoints: EndpointSummary[] = (response.Endpoints || []).map((ep) => ({
      endpointName: ep.EndpointName || '',
      status: ep.EndpointStatus || 'Unknown',
      creationTime: ep.CreationTime?.toISOString(),
    }));

    const result: ListEndpointsResponse = {
      endpoints,
      count: endpoints.length,
    };

    return successResponse(result);
  } catch (error) {
    console.error('Error listing endpoints:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to list endpoints: ${errorMessage}`);
  }
};
