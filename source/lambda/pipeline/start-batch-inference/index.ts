// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Handler } from 'aws-lambda';
import { SageMakerClient, CreateTransformJobCommand } from '@aws-sdk/client-sagemaker';

interface StartBatchInferenceInput {
  modelName: string;
  priceTag?: string;
}

interface StartBatchInferenceOutput {
  transformJobName: string;
  modelName: string;
  priceTag: string | null | undefined;
}

const sagemaker = new SageMakerClient({});
const RAW_DATA_BUCKET = process.env.RAW_DATA_BUCKET || '';
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

export const handler: Handler<StartBatchInferenceInput, StartBatchInferenceOutput> = async (
  event,
) => {
  const { modelName, priceTag } = event;
  const tag = priceTag || 'base';
  const shortId = Date.now().toString(36);
  const transformJobName = `rf-${tag}-${shortId}`.slice(0, 63);
  const inputPrefix = priceTag ? `data/price-scenarios/${priceTag}` : 'data/sales';

  await sagemaker.send(
    new CreateTransformJobCommand({
      TransformJobName: transformJobName,
      ModelName: modelName,
      MaxPayloadInMB: 0,
      ModelClientConfig: { InvocationsTimeoutInSeconds: 3600 },
      TransformInput: {
        DataSource: {
          S3DataSource: {
            S3DataType: 'S3Prefix',
            S3Uri: `s3://${RAW_DATA_BUCKET}/${inputPrefix}/`,
          },
        },
        ContentType: 'text/csv',
        SplitType: 'None',
      },
      TransformOutput: {
        S3OutputPath: `s3://${OUTPUTS_BUCKET}/batch-output/${transformJobName}/`,
        AssembleWith: 'Line',
      },
      TransformResources: {
        InstanceType: 'ml.m5.xlarge',
        InstanceCount: 1,
      },
    }),
  );

  return { transformJobName, modelName, priceTag: priceTag || null };
};
