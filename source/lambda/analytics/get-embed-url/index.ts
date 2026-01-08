import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  QuickSightClient,
  GenerateEmbedUrlForRegisteredUserCommand,
} from '@aws-sdk/client-quicksight';
import { successResponse, errorResponse, unauthorizedResponse } from '../../shared/response';
import { EmbedUrlResponse } from '../../shared/types';

const quicksight = new QuickSightClient({});
const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID || '';
const AWS_REGION = process.env.AWS_REGION || '';
const QUICKSIGHT_DASHBOARD_ID = process.env.QUICKSIGHT_DASHBOARD_ID || '';
const QUICKSIGHT_NAMESPACE = process.env.QUICKSIGHT_NAMESPACE || 'default';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get embed URL request:', JSON.stringify(event, null, 2));

  // Get user identity from Cognito claims
  const claims = event.requestContext.authorizer?.claims;
  const userId = claims?.sub || claims?.['cognito:username'];

  if (!userId) {
    return unauthorizedResponse('User identity not found');
  }

  if (!AWS_ACCOUNT_ID || !QUICKSIGHT_DASHBOARD_ID) {
    return errorResponse('QuickSight configuration not set. Please configure AWS_ACCOUNT_ID and QUICKSIGHT_DASHBOARD_ID.');
  }

  try {
    // Construct the QuickSight user ARN
    // Note: QuickSight users must be registered before embedding
    const userArn = `arn:aws:quicksight:${AWS_REGION}:${AWS_ACCOUNT_ID}:user/${QUICKSIGHT_NAMESPACE}/${userId}`;

    const command = new GenerateEmbedUrlForRegisteredUserCommand({
      AwsAccountId: AWS_ACCOUNT_ID,
      UserArn: userArn,
      SessionLifetimeInMinutes: 600, // 10 hours
      ExperienceConfiguration: {
        Dashboard: {
          InitialDashboardId: QUICKSIGHT_DASHBOARD_ID,
        },
      },
    });

    const response = await quicksight.send(command);

    if (!response.EmbedUrl) {
      return errorResponse('Failed to generate embed URL');
    }

    const result: EmbedUrlResponse = {
      embedUrl: response.EmbedUrl,
    };

    return successResponse(result);
  } catch (error: unknown) {
    console.error('Error generating embed URL:', error);

    // Provide helpful error messages for common QuickSight issues
    if (error instanceof Error) {
      if (error.name === 'ResourceNotFoundException') {
        return errorResponse(
          'QuickSight user or dashboard not found. Ensure QuickSight is configured and the user is registered.'
        );
      }
      if (error.name === 'AccessDeniedException') {
        return errorResponse(
          'Access denied to QuickSight. Ensure IAM permissions are configured correctly.'
        );
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to generate QuickSight embed URL: ${errorMessage}`);
  }
};
