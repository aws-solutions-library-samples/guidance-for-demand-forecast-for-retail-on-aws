import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';
import {
  WhatIfRequest,
  WhatIfResponse,
  WhatIfProjection,
  ForecastDataPoint,
} from '../../shared/types';

const s3 = new S3Client({});
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Run what-if scenario request:', JSON.stringify(event, null, 2));

  let body: WhatIfRequest;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const {
    itemId,
    storeId = 'store_001',
    currentStock,
    purchaseQuantity,
    purchaseDate,
    leadTimeDays,
  } = body;

  // Validate required fields
  if (!itemId) {
    return badRequestResponse('itemId is required');
  }

  if (currentStock === undefined || currentStock < 0) {
    return badRequestResponse('currentStock must be a non-negative number');
  }

  if (!purchaseQuantity || purchaseQuantity <= 0) {
    return badRequestResponse('purchaseQuantity must be a positive number');
  }

  if (!purchaseDate) {
    return badRequestResponse('purchaseDate is required');
  }

  if (leadTimeDays === undefined || leadTimeDays < 0) {
    return badRequestResponse('leadTimeDays must be a non-negative number');
  }

  try {
    // Fetch forecast data
    const forecasts = await getForecastData(itemId, storeId);

    // Calculate arrival date
    const orderDate = new Date(purchaseDate);
    const arrivalDate = new Date(orderDate);
    arrivalDate.setDate(arrivalDate.getDate() + leadTimeDays);
    const arrivalDateStr = arrivalDate.toISOString().split('T')[0];

    // Simulate stock with purchase order
    const projections: WhatIfProjection[] = [];
    let runningStock = currentStock;
    let shortageDate: string | undefined;

    const today = new Date();
    const forecastDays = 30;

    for (let day = 0; day < forecastDays; day++) {
      const currentDate = new Date(today);
      currentDate.setDate(currentDate.getDate() + day);
      const currentDateStr = currentDate.toISOString().split('T')[0];

      // Check if purchase arrives on this day
      const purchaseArrival = isSameDay(currentDate, arrivalDate) ? purchaseQuantity : 0;

      // Add purchase to stock when it arrives
      if (purchaseArrival > 0) {
        runningStock += purchaseArrival;
      }

      // Get forecasted demand for this day
      const dailyDemand = forecasts[day]?.p50 || 0;

      // Subtract demand from stock
      runningStock = Math.max(0, runningStock - dailyDemand);
      const stockShortage = runningStock <= 0;

      // Record first shortage date
      if (stockShortage && !shortageDate) {
        shortageDate = currentDateStr;
      }

      projections.push({
        date: currentDateStr,
        availableStock: Math.round(runningStock),
        forecastedDemand: Math.round(dailyDemand),
        purchaseArrival,
        stockShortage,
      });
    }

    const response: WhatIfResponse = {
      itemId,
      scenario: {
        purchaseQuantity,
        purchaseDate,
        leadTimeDays,
        arrivalDate: arrivalDateStr,
      },
      projections,
      shortageDate,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Error running what-if scenario:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to run what-if scenario: ${errorMessage}`);
  }
};

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

async function getForecastData(itemId: string, storeId: string): Promise<ForecastDataPoint[]> {
  const key = `forecasts/${itemId}/${storeId}/forecast.json`;

  try {
    const command = new GetObjectCommand({
      Bucket: OUTPUTS_BUCKET,
      Key: key,
    });

    const response = await s3.send(command);
    const bodyString = await response.Body?.transformToString();

    if (bodyString) {
      return JSON.parse(bodyString);
    }
  } catch (error) {
    console.log('Forecast file not found, using mock data');
  }

  // Return mock forecast data if real data not available
  return generateMockForecast(30);
}

function generateMockForecast(days: number): ForecastDataPoint[] {
  const forecasts: ForecastDataPoint[] = [];
  const today = new Date();
  const baseDemand = 8 + Math.random() * 4;

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const trend = i * 0.5;
    const noise = (Math.random() - 0.5) * 4;
    const p50 = Math.max(0, baseDemand + trend + noise);

    forecasts.push({
      timestamp: date.toISOString().split('T')[0],
      p50: Math.round(p50),
      p60: Math.round(p50 * 1.1),
      p70: Math.round(p50 * 1.2),
      p80: Math.round(p50 * 1.35),
      p90: Math.round(p50 * 1.5),
    });
  }

  return forecasts;
}
