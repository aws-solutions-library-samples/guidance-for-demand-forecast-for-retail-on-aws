// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Handler } from 'aws-lambda';
import {
  SageMakerClient,
  CreateEndpointConfigCommand,
  CreateEndpointCommand,
} from '@aws-sdk/client-sagemaker';

const sagemaker = new SageMakerClient({});
const SAGEMAKER_ROLE_ARN = process.env.SAGEMAKER_ROLE_ARN || '';

interface DeployEndpointInput {
  modelName: string;
}

interface DeployEndpointOutput {
  endpointName: string;
  modelName: string;
}

export const handler: Handler<DeployEndpointInput, DeployEndpointOutput> = async (event) => {
  const { modelName } = event;
  const shortId = Date.now().toString(36);
  const endpointName = `rf-ep-${shortId}`.slice(0, 63);
  const endpointConfigName = `${endpointName}-config`;

  await sagemaker.send(
    new CreateEndpointConfigCommand({
      EndpointConfigName: endpointConfigName,
      ProductionVariants: [
        {
          VariantName: 'AllTraffic',
          ModelName: modelName,
          InstanceType: 'ml.m5.xlarge',
          InitialInstanceCount: 1,
          ContainerStartupHealthCheckTimeoutInSeconds: 600,
          RoutingConfig: {
            RoutingStrategy: 'LEAST_OUTSTANDING_REQUESTS',
          },
        },
      ],
    }),
  );

  await sagemaker.send(
    new CreateEndpointCommand({
      EndpointName: endpointName,
      EndpointConfigName: endpointConfigName,
    }),
  );

  return { endpointName, modelName };
};
