// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ForecastDataPoint } from './types';

export async function getForecastData(
  s3Client: S3Client,
  bucketName: string,
  itemId: string,
  storeId: string,
): Promise<ForecastDataPoint[] | null> {
  const key = `forecasts/${itemId}/${storeId}/forecast.json`;

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);
    const bodyString = await response.Body?.transformToString();

    if (bodyString) {
      return JSON.parse(bodyString);
    }
  } catch (error) {
    console.log('Forecast file not found');
  }

  return null;
}
