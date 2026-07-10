// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Handler } from 'aws-lambda';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

const s3 = new S3Client({});
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

interface ProcessOutputInput {
  transformJobName: string;
  modelName: string;
}

interface ForecastPoint {
  timestamp: string;
  p50: number;
  p60: number;
  p70: number;
  p80: number;
  p90: number;
}

export const handler: Handler<ProcessOutputInput, ProcessOutputInput> = async (event) => {
  const { transformJobName, modelName } = event;

  const prefix = `batch-output/${transformJobName}/`;
  const listResponse = await s3.send(
    new ListObjectsV2Command({ Bucket: OUTPUTS_BUCKET, Prefix: prefix }),
  );

  const outputFiles = (listResponse.Contents || []).filter(
    (obj) => obj.Key && obj.Key.endsWith('.out'),
  );

  if (outputFiles.length === 0) {
    throw new Error(`No output files found at s3://${OUTPUTS_BUCKET}/${prefix}`);
  }

  const fileContents = await Promise.all(
    outputFiles
      .filter((f) => f.Key)
      .map(async (f) => {
        const res = await s3.send(new GetObjectCommand({ Bucket: OUTPUTS_BUCKET, Key: f.Key! }));
        return res.Body?.transformToString() ?? '';
      }),
  );

  const allForecasts = new Map<string, ForecastPoint[]>();

  for (const csv of fileContents) {
    if (!csv) continue;
    const lines = csv.trim().split('\n');
    if (lines.length === 0) continue;

    const delim = lines[0].includes('\t') ? '\t' : ',';
    const header = lines[0].split(delim).map((h) => h.trim().replace(/"/g, ''));

    const idx = {
      itemId: header.indexOf('item_id'),
      storeId: header.indexOf('store_id'),
      ts: header.indexOf('ts'),
      demand: header.indexOf('demand'),
      mean: header.indexOf('mean'),
      p50: header.indexOf('p50'),
      p60: header.indexOf('p60'),
      p70: header.indexOf('p70'),
      p80: header.indexOf('p80'),
      p90: header.indexOf('p90'),
    };

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delim).map((c) => c.trim().replace(/"/g, ''));

      const demandVal = idx.demand >= 0 ? cols[idx.demand] : '';
      const isForecast = !demandVal || demandVal === '' || demandVal === 'NaN';
      if (idx.demand >= 0 && !isForecast) continue;

      const safe = (j: number) => {
        if (j < 0 || !cols[j] || cols[j] === '') return NaN;
        return parseFloat(cols[j]);
      };

      const p50Raw = safe(idx.p50);
      const meanRaw = safe(idx.mean);
      const p50 = !isNaN(p50Raw) ? p50Raw : !isNaN(meanRaw) ? meanRaw : 0;

      if (p50 === 0 && isNaN(p50Raw) && isNaN(meanRaw)) continue;

      const itemId = idx.itemId >= 0 ? cols[idx.itemId] : 'unknown';
      const storeId = idx.storeId >= 0 ? cols[idx.storeId] : 'store_001';
      const key = `${itemId}/${storeId}`;

      if (!allForecasts.has(key)) allForecasts.set(key, []);
      allForecasts.get(key)!.push({
        timestamp: idx.ts >= 0 ? cols[idx.ts] : '',
        p50,
        p60: !isNaN(safe(idx.p60)) ? safe(idx.p60) : p50,
        p70: !isNaN(safe(idx.p70)) ? safe(idx.p70) : p50,
        p80: !isNaN(safe(idx.p80)) ? safe(idx.p80) : p50,
        p90: !isNaN(safe(idx.p90)) ? safe(idx.p90) : p50,
      });
    }
  }

  await Promise.all(
    Array.from(allForecasts.entries()).map(async ([key, forecasts]) => {
      const [itemId, storeId] = key.split('/');
      forecasts.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      await s3.send(
        new PutObjectCommand({
          Bucket: OUTPUTS_BUCKET,
          Key: `forecasts/${itemId}/${storeId}/forecast.json`,
          Body: JSON.stringify(forecasts),
          ContentType: 'application/json',
        }),
      );
    }),
  );

  return { transformJobName, modelName };
};
