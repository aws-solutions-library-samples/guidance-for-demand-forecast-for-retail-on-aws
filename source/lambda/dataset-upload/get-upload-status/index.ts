// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { successResponse, errorResponse } from '../../shared/response';

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.UPLOAD_STATUS_TABLE || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get upload status request:', JSON.stringify(event, null, 2));

  // Extract username from Cognito authorizer claims
  const claims = event.requestContext.authorizer?.claims;
  const username = claims?.email || claims?.['cognito:username'] || 'unknown';

  try {
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: {
          ':pk': { S: username },
        },
        ScanIndexForward: false, // Most recent first
        Limit: 50,
      }),
    );

    const uploads = (result.Items || []).map((item) => ({
      user: item.user?.S || '',
      fileName: item.fileName?.S || '',
      status: item.status?.S || '',
      message: item.message?.S || '',
      s3Key: item.s3Key?.S || '',
      timestamp: item.timestamp?.S || '',
    }));

    return successResponse({ uploads, count: uploads.length });
  } catch (err) {
    console.error('Error querying upload status:', err);
    return errorResponse('Failed to retrieve upload status');
  }
};
