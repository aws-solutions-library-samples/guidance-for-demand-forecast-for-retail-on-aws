// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  notFoundResponse,
} from '../../shared/response';
import { ForecastDataPoint } from '../../shared/types';

const s3 = new S3Client({});
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

const KNOWN_PRICES = [80, 90, 100, 110, 120];

async function readForecastFile(
  bucket: string,
  itemId: string,
  storeId: string,
  price: number,
): Promise<ForecastDataPoint[] | null> {
  try {
    const key = `forecasts/${itemId}/${storeId}/price-${price}.json`;
    const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = await response.Body?.transformToString();
    if (body) {
      return JSON.parse(body) as ForecastDataPoint[];
    }
    return null;
  } catch {
    return null;
  }
}

function interpolateForecasts(
  lower: ForecastDataPoint[],
  upper: ForecastDataPoint[],
  lowerPrice: number,
  upperPrice: number,
  targetPrice: number,
): ForecastDataPoint[] {
  const ratio = (targetPrice - lowerPrice) / (upperPrice - lowerPrice);
  const minLen = Math.min(lower.length, upper.length);
  const result: ForecastDataPoint[] = [];

  for (let i = 0; i < minLen; i++) {
    const lerp = (a: number, b: number) => Math.round((a + (b - a) * ratio) * 100) / 100;
    result.push({
      timestamp: lower[i].timestamp,
      p50: lerp(lower[i].p50, upper[i].p50),
      p60: lerp(lower[i].p60, upper[i].p60),
      p70: lerp(lower[i].p70, upper[i].p70),
      p80: lerp(lower[i].p80, upper[i].p80),
      p90: lerp(lower[i].p90, upper[i].p90),
    });
  }

  return result;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get price scenario request:', JSON.stringify(event, null, 2));

  const itemId = event.pathParameters?.itemId;
  const storeId = event.queryStringParameters?.storeId || 'store_001';
  const priceParam = event.queryStringParameters?.price;

  if (!itemId) {
    return badRequestResponse('itemId is required');
  }

  if (!priceParam) {
    return badRequestResponse('price query parameter is required');
  }

  const price = parseFloat(priceParam);
  if (isNaN(price) || price <= 0) {
    return badRequestResponse('price must be a positive number');
  }

  try {
    // Try exact price match first
    const exactForecasts = await readForecastFile(OUTPUTS_BUCKET, itemId, storeId, price);
    if (exactForecasts) {
      return successResponse({
        itemId,
        storeId,
        price,
        interpolated: false,
        forecasts: exactForecasts,
      });
    }

    // Find available prices by checking known prices
    const availablePrices: number[] = [];
    const availableForecasts: Map<number, ForecastDataPoint[]> = new Map();

    // Also check S3 listing for any price files
    try {
      const prefix = `forecasts/${itemId}/${storeId}/price-`;
      const listResponse = await s3.send(
        new ListObjectsV2Command({ Bucket: OUTPUTS_BUCKET, Prefix: prefix }),
      );
      for (const obj of listResponse.Contents || []) {
        if (!obj.Key) continue;
        const match = obj.Key.match(/price-(\d+(?:\.\d+)?)\.json$/);
        if (match) {
          const p = parseFloat(match[1]);
          if (!availablePrices.includes(p)) {
            availablePrices.push(p);
          }
        }
      }
    } catch {
      // Fall back to known prices
    }

    // If no prices found from listing, try known prices
    if (availablePrices.length === 0) {
      for (const kp of KNOWN_PRICES) {
        const forecasts = await readForecastFile(OUTPUTS_BUCKET, itemId, storeId, kp);
        if (forecasts) {
          availablePrices.push(kp);
          availableForecasts.set(kp, forecasts);
        }
      }
    }

    if (availablePrices.length === 0) {
      return notFoundResponse(
        `No price scenario data available for item ${itemId} in store ${storeId}`,
      );
    }

    availablePrices.sort((a, b) => a - b);

    // Find two nearest prices for interpolation
    let lowerPrice: number | null = null;
    let upperPrice: number | null = null;

    for (const p of availablePrices) {
      if (p <= price) lowerPrice = p;
    }
    for (const p of availablePrices) {
      if (p >= price) {
        upperPrice = p;
        break;
      }
    }

    // Edge cases: price is below or above all available prices
    if (lowerPrice === null) lowerPrice = availablePrices[0];
    if (upperPrice === null) upperPrice = availablePrices[availablePrices.length - 1];

    // If both are the same, return that one
    if (lowerPrice === upperPrice) {
      const forecasts =
        availableForecasts.get(lowerPrice) ||
        (await readForecastFile(OUTPUTS_BUCKET, itemId, storeId, lowerPrice));
      if (!forecasts) {
        return notFoundResponse('Failed to read nearest price scenario data');
      }
      return successResponse({
        itemId,
        storeId,
        price,
        interpolated: true,
        forecasts,
      });
    }

    // Read both nearest price files
    const lowerForecasts =
      availableForecasts.get(lowerPrice) ||
      (await readForecastFile(OUTPUTS_BUCKET, itemId, storeId, lowerPrice));
    const upperForecasts =
      availableForecasts.get(upperPrice) ||
      (await readForecastFile(OUTPUTS_BUCKET, itemId, storeId, upperPrice));

    if (!lowerForecasts || !upperForecasts) {
      return notFoundResponse('Failed to read price scenario data for interpolation');
    }

    const interpolated = interpolateForecasts(
      lowerForecasts,
      upperForecasts,
      lowerPrice,
      upperPrice,
      price,
    );

    return successResponse({
      itemId,
      storeId,
      price,
      interpolated: true,
      forecasts: interpolated,
    });
  } catch (error) {
    console.error('Error getting price scenario:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to get price scenario: ${errorMessage}`);
  }
};
