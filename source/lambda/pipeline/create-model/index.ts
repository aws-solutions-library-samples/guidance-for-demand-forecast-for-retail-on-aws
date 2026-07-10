// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Handler } from 'aws-lambda';
import {
  SageMakerClient,
  DescribeAutoMLJobV2Command,
  CreateModelCommand,
} from '@aws-sdk/client-sagemaker';

interface CreateModelInput {
  jobName: string;
}

interface CreateModelOutput {
  modelName: string;
  jobName: string;
}

const sagemaker = new SageMakerClient({});
const SAGEMAKER_ROLE_ARN = process.env.SAGEMAKER_ROLE_ARN || '';

export const handler: Handler<CreateModelInput, CreateModelOutput> = async (event) => {
  const { jobName } = event;
  const modelName = `retail-forecast-model-${Date.now()}`;

  if (!SAGEMAKER_ROLE_ARN) {
    throw new Error('SAGEMAKER_ROLE_ARN environment variable not set');
  }

  const describeResponse = await sagemaker.send(
    new DescribeAutoMLJobV2Command({ AutoMLJobName: jobName }),
  );

  const bestCandidate = describeResponse.BestCandidate;
  if (!bestCandidate) {
    throw new Error(`No best candidate found for job ${jobName}`);
  }

  await sagemaker.send(
    new CreateModelCommand({
      ModelName: modelName,
      ExecutionRoleArn: SAGEMAKER_ROLE_ARN,
      Containers: bestCandidate.InferenceContainers?.map((container) => ({
        Image: container.Image,
        ModelDataUrl: container.ModelDataUrl,
        Environment: container.Environment,
      })),
    }),
  );

  return { modelName, jobName };
};
