import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { successResponse, errorResponse, notFoundResponse, badRequestResponse } from '../../shared/response';
import { ForecastResponse, ForecastDataPoint } from '../../shared/types';

const s3 = new S3Client({});
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get forecast request:', JSON.stringify(event, null, 2));

  const itemId = event.pathParameters?.itemId;
  const storeId = event.queryStringParameters?.storeId || 'store_001';

  if (!itemId) {
    return badRequestResponse('Item ID is required');
  }

  try {
    // Try to fetch forecast output from S3
    // Forecast outputs are stored in: forecasts/{itemId}/{storeId}/forecast.json
    const key = `forecasts/${itemId}/${storeId}/forecast.json`;

    try {
      const command = new GetObjectCommand({
        Bucket: OUTPUTS_BUCKET,
        Key: key,
      });

      const response = await s3.send(command);
      const bodyString = await response.Body?.transformToString();

      if (bodyString) {
        const forecasts: ForecastDataPoint[] = JSON.parse(bodyString);

        const forecastResponse: ForecastResponse = {
          itemId,
          storeId,
          forecasts,
        };

        return successResponse(forecastResponse);
      }
    } catch (s3Error: unknown) {
      // If forecast file doesn't exist, generate mock forecast data
      // This allows the API to work before training is complete
      console.log('Forecast file not found, generating mock data');
    }

    // Generate mock forecast data for demonstration
    const mockForecasts = generateMockForecast(14);

    const forecastResponse: ForecastResponse = {
      itemId,
      storeId,
      forecasts: mockForecasts,
    };

    return successResponse({
      ...forecastResponse,
      _mock: true,
      _message: 'Using mock forecast data. Run training and batch inference to get real predictions.',
    });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to fetch forecast: ${errorMessage}`);
  }
};

function generateMockForecast(days: number): ForecastDataPoint[] {
  const forecasts: ForecastDataPoint[] = [];
  const today = new Date();
  const baseDemand = 50 + Math.random() * 50; // Random base between 50-100

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    // Add some variation with a slight upward trend
    const trend = i * 2;
    const noise = (Math.random() - 0.5) * 20;
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
