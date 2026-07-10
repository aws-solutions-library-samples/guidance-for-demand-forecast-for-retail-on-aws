// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';
import {
  StockProjectionRequest,
  StockProjectionResponse,
  StockProjection,
} from '../../shared/types';
import { getForecastData } from '../../shared/forecast-data';

const s3 = new S3Client({});
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get stock projection request:', JSON.stringify(event, null, 2));

  let body: StockProjectionRequest;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const { itemId, storeId = 'store_001', currentStock, forecastDays = 14 } = body;

  if (!itemId) {
    return badRequestResponse('itemId is required');
  }

  if (currentStock === undefined || currentStock < 0) {
    return badRequestResponse('currentStock must be a non-negative number');
  }

  try {
    // Fetch forecast data
    const forecasts = await getForecastData(s3, OUTPUTS_BUCKET, itemId, storeId);

    // If no forecast data available, return empty projections
    if (!forecasts) {
      const response: StockProjectionResponse = {
        itemId,
        storeId,
        projections: [],
        forecastAvailable: false,
      };
      return successResponse(response);
    }

    // Calculate stock projection
    const projections: StockProjection[] = [];
    let runningStock = currentStock;
    let shortageDate: string | undefined;

    const startDate =
      forecasts.length > 0 && forecasts[0].timestamp
        ? new Date(forecasts[0].timestamp.split(' ')[0])
        : new Date();

    for (let day = 0; day < Math.min(forecastDays, forecasts.length); day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      // Use p50 (median) forecast as expected demand
      const dailyDemand = forecasts[day]?.p50 || 0;

      // Subtract demand from stock
      runningStock = Math.max(0, runningStock - dailyDemand);
      const stockShortage = runningStock <= 0;

      // Record first shortage date
      if (stockShortage && !shortageDate) {
        shortageDate = dateStr;
      }

      projections.push({
        date: dateStr,
        availableStock: Math.round(runningStock + dailyDemand),
        forecastedDemand: Math.round(dailyDemand),
        projectedStock: Math.round(runningStock),
        stockShortage,
      });
    }

    const response: StockProjectionResponse = {
      itemId,
      storeId,
      projections,
      shortageDate,
      forecastAvailable: true,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Error calculating stock projection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to calculate stock projection: ${errorMessage}`);
  }
};
