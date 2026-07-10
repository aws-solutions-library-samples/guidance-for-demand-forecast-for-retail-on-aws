// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';
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
          forecastAvailable: true,
        };

        return successResponse(forecastResponse);
      }
    } catch (s3Error: unknown) {
      // Forecast file doesn't exist - training has not been run
      console.log('Forecast file not found, returning empty response');
    }

    // No forecast data available
    const forecastResponse: ForecastResponse = {
      itemId,
      storeId,
      forecasts: [],
      forecastAvailable: false,
    };

    return successResponse(forecastResponse);
  } catch (error) {
    console.error('Error fetching forecast:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to fetch forecast: ${errorMessage}`);
  }
};
