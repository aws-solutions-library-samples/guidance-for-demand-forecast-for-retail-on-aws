// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  SageMakerClient,
  CreateTransformJobCommand,
  ListTransformJobsCommand,
} from '@aws-sdk/client-sagemaker';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';

const sagemaker = new SageMakerClient({});
const s3 = new S3Client({});
const RAW_DATA_BUCKET = process.env.RAW_DATA_BUCKET || '';
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

interface GeneratePriceScenariosRequest {
  modelName: string;
  prices?: number[];
}

interface PriceScenarioJob {
  price: number;
  jobName: string;
}

interface FailedPriceScenarioJob {
  price: number;
  error: string;
}

const DEFAULT_PRICES = [80, 90, 100, 110, 120];

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Generate price scenarios request:', JSON.stringify(event, null, 2));

  let body: GeneratePriceScenariosRequest;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const { modelName, prices = DEFAULT_PRICES } = body;

  if (!modelName) {
    return badRequestResponse('modelName is required');
  }

  if (prices.length === 0) {
    return badRequestResponse('At least one price is required');
  }

  try {
    // Step 1: Read the source CSV from data/sales/
    const listCommand = new ListObjectsV2Command({
      Bucket: RAW_DATA_BUCKET,
      Prefix: 'data/sales/',
    });
    const listResponse = await s3.send(listCommand);
    const csvFiles = (listResponse.Contents || []).filter(
      (obj) => obj.Key && obj.Key.endsWith('.csv'),
    );

    if (csvFiles.length === 0) {
      return errorResponse('No CSV files found in data/sales/', 404);
    }

    // Read all CSV files
    const csvContents: { key: string; content: string }[] = [];
    for (const file of csvFiles) {
      if (!file.Key) continue;
      const getResponse = await s3.send(
        new GetObjectCommand({ Bucket: RAW_DATA_BUCKET, Key: file.Key }),
      );
      const content = await getResponse.Body?.transformToString();
      if (content) {
        const fileName = file.Key.split('/').pop() || 'data.csv';
        csvContents.push({ key: fileName, content });
      }
    }

    if (csvContents.length === 0) {
      return errorResponse('Failed to read CSV files from data/sales/', 500);
    }

    const timestamp = Date.now();
    const jobs: PriceScenarioJob[] = [];
    const failed: FailedPriceScenarioJob[] = [];

    // Step 2: For each price point, modify CSV and start batch transform
    for (const price of prices) {
      try {
        // Check for existing InProgress or Completed job for this price+model
        const listResponse = await sagemaker.send(
          new ListTransformJobsCommand({
            NameContains: `price-${price}-${modelName}`,
            SortBy: 'CreationTime',
            SortOrder: 'Descending',
            MaxResults: 1,
          }),
        );
        const existingJob = listResponse.TransformJobSummaries?.[0];
        if (
          existingJob &&
          (existingJob.TransformJobStatus === 'InProgress' ||
            existingJob.TransformJobStatus === 'Completed')
        ) {
          console.log(
            `Skipping price ${price}: existing job ${existingJob.TransformJobName} is ${existingJob.TransformJobStatus}`,
          );
          jobs.push({ price, jobName: existingJob.TransformJobName! });
          continue;
        }

        // For each CSV file, modify future rows (where demand is empty) to use the target price
        for (const { key: fileName, content: csvContent } of csvContents) {
          const lines = csvContent.split('\n');
          if (lines.length === 0) continue;

          const header = lines[0];
          const delimiter = header.includes('\t') ? '\t' : ',';
          const columns = header.split(delimiter).map((h) => h.trim().replace(/"/g, ''));
          const demandIdx = columns.indexOf('demand');
          const priceIdx = columns.indexOf('price');

          if (priceIdx < 0) {
            console.warn(`No price column found in ${fileName}, skipping`);
            continue;
          }

          const modifiedLines = [lines[0]]; // Keep header as-is
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) {
              modifiedLines.push(line);
              continue;
            }

            const cols = line.split(delimiter);
            // Check if this is a future row (demand is empty)
            const demandValue = demandIdx >= 0 ? cols[demandIdx]?.trim().replace(/"/g, '') : '';
            const isFutureRow = !demandValue || demandValue === '' || demandValue === 'NaN';

            if (isFutureRow && priceIdx < cols.length) {
              // Replace price with target price
              cols[priceIdx] = String(price);
            }

            modifiedLines.push(cols.join(delimiter));
          }

          const modifiedCsv = modifiedLines.join('\n');

          // Upload modified CSV to S3
          const scenarioKey = `data/price-scenarios/price-${price}/${fileName}`;
          await s3.send(
            new PutObjectCommand({
              Bucket: RAW_DATA_BUCKET,
              Key: scenarioKey,
              Body: modifiedCsv,
              ContentType: 'text/csv',
            }),
          );
        }

        // Start batch transform job for this price point
        const jobName = `price-${price}-${modelName}-${timestamp}`;

        const command = new CreateTransformJobCommand({
          TransformJobName: jobName,
          ModelName: modelName,
          MaxPayloadInMB: 0,
          ModelClientConfig: {
            InvocationsTimeoutInSeconds: 3600,
          },
          TransformInput: {
            DataSource: {
              S3DataSource: {
                S3DataType: 'S3Prefix',
                S3Uri: `s3://${RAW_DATA_BUCKET}/data/price-scenarios/price-${price}/`,
              },
            },
            ContentType: 'text/csv',
            SplitType: 'None',
          },
          TransformOutput: {
            S3OutputPath: `s3://${OUTPUTS_BUCKET}/batch-output/price-${price}-${modelName}-${timestamp}/`,
            AssembleWith: 'Line',
          },
          TransformResources: {
            InstanceType: 'ml.m5.4xlarge',
            InstanceCount: 1,
          },
        });

        await sagemaker.send(command);
        jobs.push({ price, jobName });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.warn(`Failed to start transform for price ${price}: ${errorMessage}`);
        failed.push({ price, error: errorMessage });
      }
    }

    if (jobs.length === 0 && failed.length > 0) {
      return errorResponse(
        `All ${failed.length} price scenario jobs failed to start. First error: ${failed[0].error}`,
      );
    }

    const parts: string[] = [];
    if (jobs.length > 0) parts.push(`Started ${jobs.length}`);
    if (failed.length > 0) parts.push(`${failed.length} failed`);

    return successResponse(
      {
        jobs,
        failed,
        message: `${parts.join(', ')} of ${prices.length} price scenario batch transforms`,
      },
      201,
    );
  } catch (error) {
    console.error('Error generating price scenarios:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to generate price scenarios: ${errorMessage}`);
  }
};
