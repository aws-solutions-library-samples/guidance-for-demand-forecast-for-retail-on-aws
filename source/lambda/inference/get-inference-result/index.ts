// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';

const s3 = new S3Client({});
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  const jobId = event.pathParameters?.jobId;

  if (!jobId) {
    return badRequestResponse('jobId path parameter is required');
  }

  console.log(`[get-inference-result] Checking job ${jobId}`);

  try {
    // Check for result.json first
    try {
      const resultResponse = await s3.send(
        new GetObjectCommand({
          Bucket: OUTPUTS_BUCKET,
          Key: `inference-jobs/${jobId}/result.json`,
        }),
      );
      const resultBody = await resultResponse.Body?.transformToString();
      if (resultBody) {
        const result = JSON.parse(resultBody);
        console.log(`[get-inference-result] Job ${jobId} completed`);
        return successResponse(result);
      }
    } catch (err: unknown) {
      const s3Err = err as { name?: string };
      if (s3Err.name !== 'NoSuchKey') {
        throw err;
      }
    }

    // Check for error.json
    try {
      const errorResp = await s3.send(
        new GetObjectCommand({
          Bucket: OUTPUTS_BUCKET,
          Key: `inference-jobs/${jobId}/error.json`,
        }),
      );
      const errorBody = await errorResp.Body?.transformToString();
      if (errorBody) {
        const errorResult = JSON.parse(errorBody);
        console.log(`[get-inference-result] Job ${jobId} failed: ${errorResult.error}`);
        return successResponse(errorResult);
      }
    } catch (err: unknown) {
      const s3Err = err as { name?: string };
      if (s3Err.name !== 'NoSuchKey') {
        throw err;
      }
    }

    // Neither exists — still running
    console.log(`[get-inference-result] Job ${jobId} still running`);
    return successResponse({ status: 'RUNNING' });
  } catch (error) {
    console.error('Error checking inference result:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to check inference result: ${errorMessage}`);
  }
};
