// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  SageMakerClient,
  DeleteEndpointCommand,
  DeleteEndpointConfigCommand,
} from '@aws-sdk/client-sagemaker';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';

const sagemaker = new SageMakerClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Delete endpoint request:', JSON.stringify(event, null, 2));

  const endpointName = event.pathParameters?.endpointName;

  if (!endpointName) {
    return badRequestResponse('endpointName is required');
  }

  try {
    // Delete the endpoint
    await sagemaker.send(
      new DeleteEndpointCommand({
        EndpointName: endpointName,
      }),
    );

    // Also delete the endpoint config (convention: same name with -config suffix)
    try {
      await sagemaker.send(
        new DeleteEndpointConfigCommand({
          EndpointConfigName: `${endpointName}-config`,
        }),
      );
    } catch {
      // Endpoint config may have a different name or already be deleted
      console.log('Could not delete endpoint config, may already be removed');
    }

    return successResponse({
      message: `Endpoint '${endpointName}' deletion initiated`,
    });
  } catch (error) {
    console.error('Error deleting endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to delete endpoint: ${errorMessage}`);
  }
};
