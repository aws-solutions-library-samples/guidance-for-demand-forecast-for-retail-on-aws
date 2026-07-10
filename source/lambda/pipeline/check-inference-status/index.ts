// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Handler } from 'aws-lambda';
import { SageMakerClient, DescribeTransformJobCommand } from '@aws-sdk/client-sagemaker';

interface CheckInferenceInput {
  transformJobName: string;
  modelName?: string;
}

interface CheckInferenceOutput {
  transformJobName: string;
  modelName?: string;
  status: 'InProgress' | 'Completed' | 'Failed';
  outputPath?: string;
}

const sagemaker = new SageMakerClient({});

export const handler: Handler<CheckInferenceInput, CheckInferenceOutput> = async (event) => {
  const { transformJobName, modelName } = event;

  const response = await sagemaker.send(
    new DescribeTransformJobCommand({ TransformJobName: transformJobName }),
  );

  const rawStatus = response.TransformJobStatus || 'Unknown';
  let status: CheckInferenceOutput['status'];

  if (rawStatus === 'Completed') {
    status = 'Completed';
  } else if (rawStatus === 'Failed' || rawStatus === 'Stopped') {
    status = 'Failed';
  } else {
    status = 'InProgress';
  }

  const result: CheckInferenceOutput = { transformJobName, modelName, status };

  if (status === 'Completed' && response.TransformOutput?.S3OutputPath) {
    result.outputPath = response.TransformOutput.S3OutputPath;
  }

  return result;
};
