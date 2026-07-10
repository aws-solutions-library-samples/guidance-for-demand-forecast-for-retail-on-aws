// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';

const s3 = new S3Client({});
const BUCKET = process.env.RAW_DATA_BUCKET || '';
const UPLOAD_PREFIX = 'uploads/zip/';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get upload URL request:', JSON.stringify(event, null, 2));

  let body: { fileName: string };

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const { fileName } = body;

  if (!fileName) {
    return badRequestResponse('fileName is required');
  }

  if (!fileName.endsWith('.zip')) {
    return badRequestResponse('File must be a .zip file');
  }

  // Extract username from Cognito authorizer claims
  const claims = event.requestContext.authorizer?.claims;
  const username = claims?.email || claims?.['cognito:username'] || 'unknown';

  const key = `${UPLOAD_PREFIX}${username}/${Date.now()}-${fileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: 'application/zip',
      Metadata: {
        'uploaded-by': username,
        'original-filename': fileName,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadUrl = await getSignedUrl(s3 as any, command as any, { expiresIn: 300 });

    return successResponse({
      uploadUrl,
      key,
      expiresIn: 300,
    });
  } catch (err) {
    console.error('Error generating presigned URL:', err);
    return errorResponse('Failed to generate upload URL');
  }
};
