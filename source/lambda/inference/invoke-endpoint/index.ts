// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';

const s3 = new S3Client({});
const smRuntime = new SageMakerRuntimeClient({});
const RAW_DATA_BUCKET = process.env.RAW_DATA_BUCKET || '';

interface PriceWhatIfRequest {
  endpointName: string;
  itemId: string;
  storeId?: string;
  futurePrices: { timestamp: string; price: number }[];
}

export const handler: APIGatewayProxyHandler = async (event) => {
  let body: PriceWhatIfRequest;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const { endpointName, itemId, storeId = 'store_001', futurePrices } = body;

  if (!endpointName) return badRequestResponse('endpointName is required');
  if (!itemId) return badRequestResponse('itemId is required');
  if (!futurePrices || futurePrices.length === 0) {
    return badRequestResponse('futurePrices array is required');
  }

  try {
    const csvContent = await getDatasetFromS3();
    const allLines = csvContent.trim().split('\n');
    const header = allLines[0];
    const csvLines: string[] = [header];

    for (let i = 1; i < allLines.length; i++) {
      const cols = allLines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
      if (cols.length < 5) continue;
      if (cols[0] !== itemId || cols[1] !== storeId) continue;

      if (cols[3] && cols[3] !== '') {
        csvLines.push(allLines[i]);
      }
    }

    for (const fp of futurePrices) {
      csvLines.push(`${itemId},${storeId},${fp.timestamp},,${fp.price}`);
    }

    const payload = csvLines.join('\n');

    const response = await smRuntime.send(
      new InvokeEndpointCommand({
        EndpointName: endpointName,
        ContentType: 'text/csv',
        Accept: 'text/csv',
        Body: Buffer.from(payload),
      }),
    );

    const responseBody = new TextDecoder().decode(response.Body);
    const forecasts = parseResponseCsv(responseBody, itemId, storeId);

    return successResponse({
      itemId,
      storeId,
      forecasts,
      status: 'COMPLETED',
    });
  } catch (error) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Inference failed: ${msg}`);
  }
};

function parseResponseCsv(csv: string, targetItemId: string, targetStoreId: string) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
  const idx = {
    itemId: header.indexOf('item_id'),
    storeId: header.indexOf('store_id'),
    ts: header.indexOf('ts'),
    demand: header.indexOf('demand'),
    p50: header.indexOf('p50'),
    p60: header.indexOf('p60'),
    p70: header.indexOf('p70'),
    p80: header.indexOf('p80'),
    p90: header.indexOf('p90'),
    mean: header.indexOf('mean'),
  };

  const forecasts = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));

    if (idx.itemId >= 0 && cols[idx.itemId] !== targetItemId) continue;
    if (idx.storeId >= 0 && cols[idx.storeId] !== targetStoreId) continue;

    const demandVal = idx.demand >= 0 ? cols[idx.demand] : '';
    if (demandVal && demandVal !== '' && demandVal !== 'NaN') continue;

    const safe = (j: number) => (j >= 0 && cols[j] ? parseFloat(cols[j]) : NaN);
    const p50 = !isNaN(safe(idx.p50)) ? safe(idx.p50) : safe(idx.mean);

    if (isNaN(p50)) continue;

    forecasts.push({
      timestamp: idx.ts >= 0 ? cols[idx.ts] : '',
      p50,
      p60: !isNaN(safe(idx.p60)) ? safe(idx.p60) : p50,
      p70: !isNaN(safe(idx.p70)) ? safe(idx.p70) : p50,
      p80: !isNaN(safe(idx.p80)) ? safe(idx.p80) : p50,
      p90: !isNaN(safe(idx.p90)) ? safe(idx.p90) : p50,
    });
  }

  return forecasts;
}

async function getDatasetFromS3(): Promise<string> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: RAW_DATA_BUCKET,
      Key: 'data/sales/consumer_electronics.csv',
    }),
  );
  const content = await response.Body?.transformToString();
  if (!content) throw new Error('Empty dataset');
  return content;
}
