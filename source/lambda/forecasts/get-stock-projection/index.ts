import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';
import {
  StockProjectionRequest,
  StockProjectionResponse,
  StockProjection,
  ForecastDataPoint,
} from '../../shared/types';

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
    const forecasts = await getForecastData(itemId, storeId);

    // Calculate stock projection
    const projections: StockProjection[] = [];
    let runningStock = currentStock;
    let shortageDate: string | undefined;

    const today = new Date();

    for (let day = 0; day < Math.min(forecastDays, forecasts.length); day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];

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
        availableStock: Math.round(runningStock),
        forecastedDemand: Math.round(dailyDemand),
        stockShortage,
      });
    }

    const response: StockProjectionResponse = {
      itemId,
      storeId,
      projections,
      shortageDate,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Error calculating stock projection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to calculate stock projection: ${errorMessage}`);
  }
};

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
  return generateMockForecast(14);
}

function generateMockForecast(days: number): ForecastDataPoint[] {
  const forecasts: ForecastDataPoint[] = [];
  const today = new Date();
  const baseDemand = 8 + Math.random() * 4; // Random base between 8-12 units/day

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    // Add some variation with a slight upward trend
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
