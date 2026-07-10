// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';
import { ForecastDataPoint } from '../../shared/types';

const s3 = new S3Client({});
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

interface ProcessBatchOutputRequest {
  jobName: string;
  priceTag?: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Process batch output request:', JSON.stringify(event, null, 2));

  let body: ProcessBatchOutputRequest;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const { jobName, priceTag } = body;

  if (!jobName) {
    return badRequestResponse('jobName is required');
  }

  try {
    // List .csv.out files from batch output
    const prefix = `batch-output/${jobName}/`;
    const listCommand = new ListObjectsV2Command({
      Bucket: OUTPUTS_BUCKET,
      Prefix: prefix,
    });

    const listResponse = await s3.send(listCommand);
    const outputFiles = (listResponse.Contents || []).filter(
      (obj) => obj.Key && obj.Key.endsWith('.out'),
    );

    if (outputFiles.length === 0) {
      return errorResponse(`No output files found at s3://${OUTPUTS_BUCKET}/${prefix}`, 404);
    }

    // Read and parse all output files
    const allForecasts: Map<string, ForecastDataPoint[]> = new Map();

    // Read all output files in parallel
    const fileContents = await Promise.all(
      outputFiles
        .filter((file) => file.Key)
        .map(async (file) => {
          const getResponse = await s3.send(
            new GetObjectCommand({ Bucket: OUTPUTS_BUCKET, Key: file.Key! }),
          );
          return getResponse.Body?.transformToString() ?? '';
        }),
    );

    // Parse all file contents
    for (const csvContent of fileContents) {
      if (!csvContent) continue;

      const lines = csvContent.trim().split('\n');
      if (lines.length === 0) continue;

      // Auto-detect delimiter: tab-separated or comma-separated
      const delimiter = lines[0].includes('\t') ? '\t' : ',';

      const header = lines[0].split(delimiter).map((h) => h.trim().replace(/"/g, ''));
      const itemIdIdx = header.indexOf('item_id');
      const storeIdIdx = header.indexOf('store_id');
      const tsIdx = header.indexOf('ts');
      const demandIdx = header.indexOf('demand');
      const meanIdx = header.indexOf('mean');
      const p50Idx = header.indexOf('p50');
      const p60Idx = header.indexOf('p60');
      const p70Idx = header.indexOf('p70');
      const p80Idx = header.indexOf('p80');
      const p90Idx = header.indexOf('p90');

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/"/g, ''));

        // Filter to future rows where demand was empty (forecast rows)
        const demandValue = demandIdx >= 0 ? cols[demandIdx] : '';
        const isForecastRow = !demandValue || demandValue === '' || demandValue === 'NaN';

        const hasQuantiles =
          (p50Idx >= 0 && cols[p50Idx] && cols[p50Idx] !== '') ||
          (meanIdx >= 0 && cols[meanIdx] && cols[meanIdx] !== '');

        if (!hasQuantiles) continue;
        if (demandIdx >= 0 && !isForecastRow) continue;

        const itemId = itemIdIdx >= 0 ? cols[itemIdIdx] : 'unknown';
        const storeId = storeIdIdx >= 0 ? cols[storeIdIdx] : 'store_001';
        const ts = tsIdx >= 0 ? cols[tsIdx] : '';

        const key = `${itemId}/${storeId}`;

        const parseSafe = (idx: number): number => {
          if (idx < 0 || !cols[idx] || cols[idx] === '') return NaN;
          return parseFloat(cols[idx]);
        };

        const p50Raw = parseSafe(p50Idx);
        const meanRaw = parseSafe(meanIdx);
        const p50Val = !isNaN(p50Raw) ? p50Raw : !isNaN(meanRaw) ? meanRaw : 0;

        const point: ForecastDataPoint = {
          timestamp: ts,
          p50: p50Val,
          p60: !isNaN(parseSafe(p60Idx)) ? parseSafe(p60Idx) : p50Val,
          p70: !isNaN(parseSafe(p70Idx)) ? parseSafe(p70Idx) : p50Val,
          p80: !isNaN(parseSafe(p80Idx)) ? parseSafe(p80Idx) : p50Val,
          p90: !isNaN(parseSafe(p90Idx)) ? parseSafe(p90Idx) : p50Val,
        };

        if (!allForecasts.has(key)) {
          allForecasts.set(key, []);
        }
        allForecasts.get(key)!.push(point);
      }
    }

    // Write per-item forecast JSON files
    let filesWritten = 0;

    const entries = Array.from(allForecasts.entries());
    const BATCH_SIZE = 50;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ([key, forecasts]) => {
          const [itemId, storeId] = key.split('/');
          forecasts.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          await s3.send(
            new PutObjectCommand({
              Bucket: OUTPUTS_BUCKET,
              Key: priceTag
                ? `forecasts/${itemId}/${storeId}/price-${priceTag}.json`
                : `forecasts/${itemId}/${storeId}/forecast.json`,
              Body: JSON.stringify(forecasts),
              ContentType: 'application/json',
            }),
          );
        }),
      );
      filesWritten += batch.length;
    }

    return successResponse({
      message: `Processed batch output successfully`,
      jobName,
      outputFiles: outputFiles.length,
      forecastGroups: allForecasts.size,
      filesWritten,
    });
  } catch (error) {
    console.error('Error processing batch output:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to process batch output: ${errorMessage}`);
  }
};
