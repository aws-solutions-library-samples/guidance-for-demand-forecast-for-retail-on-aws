// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  SageMakerClient,
  CreateEndpointConfigCommand,
  CreateEndpointCommand,
  ProductionVariantInstanceType,
} from '@aws-sdk/client-sagemaker';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';

const sagemaker = new SageMakerClient({});
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

interface DeployEndpointRequest {
  modelName: string;
  endpointName?: string;
  instanceType?: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Deploy endpoint request:', JSON.stringify(event, null, 2));

  let body: DeployEndpointRequest;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const { modelName, instanceType = 'ml.m5.4xlarge' } = body;

  if (!modelName) {
    return badRequestResponse('modelName is required');
  }

  const endpointName = body.endpointName || `ep-${modelName}-${Date.now()}`;
  const endpointConfigName = `${endpointName}-config`;

  try {
    // Create endpoint configuration
    await sagemaker.send(
      new CreateEndpointConfigCommand({
        EndpointConfigName: endpointConfigName,
        ProductionVariants: [
          {
            VariantName: 'AllTraffic',
            ModelName: modelName,
            InstanceType: instanceType as ProductionVariantInstanceType,
            InitialInstanceCount: 1,
            ContainerStartupHealthCheckTimeoutInSeconds: 600,
          },
        ],
        AsyncInferenceConfig: {
          OutputConfig: {
            S3OutputPath: `s3://${OUTPUTS_BUCKET}/async-inference-output/`,
            S3FailurePath: `s3://${OUTPUTS_BUCKET}/async-inference-errors/`,
          },
        },
      }),
    );

    // Create endpoint
    await sagemaker.send(
      new CreateEndpointCommand({
        EndpointName: endpointName,
        EndpointConfigName: endpointConfigName,
      }),
    );

    return successResponse(
      {
        endpointName,
        message: 'Endpoint deployment started. It will be InService in a few minutes.',
      },
      201,
    );
  } catch (error) {
    console.error('Error deploying endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to deploy endpoint: ${errorMessage}`);
  }
};
