// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Handler } from 'aws-lambda';
import { SageMakerClient, DescribeAutoMLJobV2Command } from '@aws-sdk/client-sagemaker';

interface CheckTrainingInput {
  jobName: string;
}

interface CheckTrainingOutput {
  jobName: string;
  status: 'InProgress' | 'Completed' | 'Failed';
  bestCandidate?: {
    candidateName: string;
  };
}

const sagemaker = new SageMakerClient({});

export const handler: Handler<CheckTrainingInput, CheckTrainingOutput> = async (event) => {
  const { jobName } = event;

  const response = await sagemaker.send(new DescribeAutoMLJobV2Command({ AutoMLJobName: jobName }));

  const rawStatus = response.AutoMLJobStatus || 'Unknown';
  let status: CheckTrainingOutput['status'];

  if (rawStatus === 'Completed') {
    status = 'Completed';
  } else if (rawStatus === 'Failed' || rawStatus === 'Stopped') {
    status = 'Failed';
  } else {
    status = 'InProgress';
  }

  const result: CheckTrainingOutput = { jobName, status };

  if (status === 'Completed' && response.BestCandidate?.CandidateName) {
    result.bestCandidate = {
      candidateName: response.BestCandidate.CandidateName,
    };
  }

  return result;
};
