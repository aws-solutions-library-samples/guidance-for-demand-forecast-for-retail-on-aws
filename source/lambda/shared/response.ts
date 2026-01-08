import { APIGatewayProxyResult } from 'aws-lambda';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export const successResponse = <T>(body: T, statusCode = 200): APIGatewayProxyResult => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

export const errorResponse = (message: string, statusCode = 500): APIGatewayProxyResult => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({ error: message }),
});

export const notFoundResponse = (message = 'Resource not found'): APIGatewayProxyResult =>
  errorResponse(message, 404);

export const badRequestResponse = (message = 'Bad request'): APIGatewayProxyResult =>
  errorResponse(message, 400);

export const unauthorizedResponse = (message = 'Unauthorized'): APIGatewayProxyResult =>
  errorResponse(message, 401);
