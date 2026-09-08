// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayProxyResult } from 'aws-lambda';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export const successResponse = <T>(body: T, statusCode = 200): APIGatewayProxyResult => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

// Generic message returned to clients for server-side (5xx) failures so that
// internal exception details are never exposed over the API.
const GENERIC_SERVER_ERROR = 'Internal server error. Please try again later.';

export const errorResponse = (message: string, statusCode = 500): APIGatewayProxyResult => {
  // For server-side errors, keep the detailed message in CloudWatch logs only and
  // return a generic message to the client. 4xx messages are intentional,
  // client-safe validation text and are returned as-is.
  const isServerError = statusCode >= 500;
  if (isServerError) {
    console.error(`Server error (${statusCode}):`, message);
  }
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: isServerError ? GENERIC_SERVER_ERROR : message }),
  };
};

export const notFoundResponse = (message = 'Resource not found'): APIGatewayProxyResult =>
  errorResponse(message, 404);

export const badRequestResponse = (message = 'Bad request'): APIGatewayProxyResult =>
  errorResponse(message, 400);

export const unauthorizedResponse = (message = 'Unauthorized'): APIGatewayProxyResult =>
  errorResponse(message, 401);
