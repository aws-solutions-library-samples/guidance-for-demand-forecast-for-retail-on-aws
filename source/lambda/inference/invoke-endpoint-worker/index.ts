// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  SageMakerRuntimeClient,
  InvokeEndpointAsyncCommand,
} from '@aws-sdk/client-sagemaker-runtime';
import { ForecastDataPoint } from '../../shared/types';

const s3 = new S3Client({});
const sagemakerRuntime = new SageMakerRuntimeClient({});
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 110; // ~550s, within Lambda's 600s timeout

interface WorkerEvent {
  jobId: string;
  endpointName: string;
  itemId: string;
  storeId: string;
  inputKey: string;
}

export const handler = async (event: WorkerEvent): Promise<void> => {
  const { jobId, endpointName, itemId, storeId, inputKey } = event;

  console.log(
    `[worker] Starting job ${jobId} for ${itemId}/${storeId} on endpoint ${endpointName}`,
  );

  try {
    const inputLocation = `s3://${OUTPUTS_BUCKET}/${inputKey}`;
    console.log(`[worker] Invoking async endpoint with input: ${inputLocation}`);

    const asyncResponse = await sagemakerRuntime.send(
      new InvokeEndpointAsyncCommand({
        EndpointName: endpointName,
        InputLocation: inputLocation,
        ContentType: 'text/csv',
        Accept: 'text/csv',
      }),
    );

    const outputLocation = asyncResponse.OutputLocation;
    const failureLocation = asyncResponse.FailureLocation;

    console.log(
      `[worker] Async invocation submitted. Output: ${outputLocation}, Failure: ${failureLocation}`,
    );

    if (!outputLocation) {
      throw new Error('No OutputLocation returned from async invocation');
    }

    const { bucket: outputBucket, key: outputKey } = parseS3Uri(outputLocation);
    const failureParsed = failureLocation ? parseS3Uri(failureLocation) : null;

    let responseBody: string | undefined;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      try {
        const output = await s3.send(
          new GetObjectCommand({
            Bucket: outputBucket,
            Key: outputKey,
          }),
        );
        responseBody = await output.Body?.transformToString();
        if (responseBody) {
          console.log(
            `[worker] Got async output after ${((attempt + 1) * POLL_INTERVAL_MS) / 1000}s`,
          );
          break;
        }
      } catch (err: unknown) {
        const s3Err = err as { name?: string };
        if (s3Err.name !== 'NoSuchKey') throw err;
      }

      if (failureParsed) {
        try {
          const failure = await s3.send(
            new GetObjectCommand({
              Bucket: failureParsed.bucket,
              Key: failureParsed.key,
            }),
          );
          const failureBody = await failure.Body?.transformToString();
          throw new Error(`SageMaker async inference failed: ${failureBody}`);
        } catch (err: unknown) {
          const s3Err = err as { name?: string };
          if (s3Err.name !== 'NoSuchKey') throw err;
        }
      }

      if (attempt % 6 === 5) {
        console.log(
          `[worker] Still waiting for async output... (${((attempt + 1) * POLL_INTERVAL_MS) / 1000}s)`,
        );
      }
    }

    if (!responseBody) {
      throw new Error(
        `Async inference timed out after ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s`,
      );
    }

    console.log(`[worker] SageMaker response size: ${responseBody.length} bytes`);
    console.log(`[worker] Raw response (first 500 chars): ${responseBody.substring(0, 500)}`);

    const forecasts = parseResponseCsv(responseBody, itemId, storeId);

    const result = { itemId, storeId, forecasts, status: 'COMPLETED' as const };
    await s3.send(
      new PutObjectCommand({
        Bucket: OUTPUTS_BUCKET,
        Key: `inference-jobs/${jobId}/result.json`,
        Body: JSON.stringify(result),
        ContentType: 'application/json',
      }),
    );

    console.log(`[worker] Job ${jobId} completed with ${forecasts.length} forecast points`);
  } catch (error) {
    console.error(`[worker] Job ${jobId} failed:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await s3.send(
      new PutObjectCommand({
        Bucket: OUTPUTS_BUCKET,
        Key: `inference-jobs/${jobId}/error.json`,
        Body: JSON.stringify({ error: errorMessage, status: 'FAILED' }),
        ContentType: 'application/json',
      }),
    );
  }
};

function parseS3Uri(uri: string): { bucket: string; key: string } {
  const withoutProtocol = uri.replace('s3://', '');
  const slashIdx = withoutProtocol.indexOf('/');
  return {
    bucket: withoutProtocol.substring(0, slashIdx),
    key: withoutProtocol.substring(slashIdx + 1),
  };
}

function parseResponseCsv(
  csvContent: string,
  targetItemId: string,
  targetStoreId: string,
): ForecastDataPoint[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';

  const header = lines[0].split(delimiter).map((h) => h.trim().replace(/"/g, ''));
  const itemIdIdx = header.indexOf('item_id');
  const storeIdIdx = header.indexOf('store_id');
  const tsIdx = header.findIndex((h) => h === 'ts' || h === 'timestamp');
  const demandIdx = header.indexOf('demand');
  const meanIdx = header.indexOf('mean');
  const p50Idx = header.indexOf('p50');
  const p60Idx = header.indexOf('p60');
  const p70Idx = header.indexOf('p70');
  const p80Idx = header.indexOf('p80');
  const p90Idx = header.indexOf('p90');

  console.log(`[parseResponseCsv] Total response lines: ${lines.length}`);
  console.log(`[parseResponseCsv] Detected header: ${JSON.stringify(header)}`);
  console.log(
    `[parseResponseCsv] Column indices — itemId:${itemIdIdx} storeId:${storeIdIdx} ts:${tsIdx} demand:${demandIdx} mean:${meanIdx} p50:${p50Idx} p60:${p60Idx} p70:${p70Idx} p80:${p80Idx} p90:${p90Idx}`,
  );

  const forecasts: ForecastDataPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/"/g, ''));

    const rowItemId = itemIdIdx >= 0 ? cols[itemIdIdx] : '';
    const rowStoreId = storeIdIdx >= 0 ? cols[storeIdIdx] : '';
    if (rowItemId !== targetItemId || rowStoreId !== targetStoreId) continue;

    const demandValue = demandIdx >= 0 ? cols[demandIdx] : '';
    const isForecastRow = !demandValue || demandValue === '' || demandValue === 'NaN';
    if (demandIdx >= 0 && !isForecastRow) continue;

    const hasQuantiles =
      (p50Idx >= 0 && cols[p50Idx] && cols[p50Idx] !== '') ||
      (meanIdx >= 0 && cols[meanIdx] && cols[meanIdx] !== '');
    if (!hasQuantiles) continue;

    const parseSafe = (idx: number): number => {
      if (idx < 0 || !cols[idx] || cols[idx] === '') return NaN;
      return parseFloat(cols[idx]);
    };

    const p50Raw = parseSafe(p50Idx);
    const meanRaw = parseSafe(meanIdx);
    const p50Val = !isNaN(p50Raw) ? p50Raw : !isNaN(meanRaw) ? meanRaw : 0;

    forecasts.push({
      timestamp: tsIdx >= 0 ? cols[tsIdx] : '',
      p50: p50Val,
      p60: !isNaN(parseSafe(p60Idx)) ? parseSafe(p60Idx) : p50Val,
      p70: !isNaN(parseSafe(p70Idx)) ? parseSafe(p70Idx) : p50Val,
      p80: !isNaN(parseSafe(p80Idx)) ? parseSafe(p80Idx) : p50Val,
      p90: !isNaN(parseSafe(p90Idx)) ? parseSafe(p90Idx) : p50Val,
    });
  }

  forecasts.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  console.log(
    `[parseResponseCsv] Extracted ${forecasts.length} forecast rows for ${targetItemId}/${targetStoreId}`,
  );

  return forecasts;
}
