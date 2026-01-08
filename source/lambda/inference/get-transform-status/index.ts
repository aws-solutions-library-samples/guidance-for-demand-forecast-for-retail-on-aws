import { APIGatewayProxyHandler } from 'aws-lambda';
import { SageMakerClient, DescribeTransformJobCommand } from '@aws-sdk/client-sagemaker';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '../../shared/response';
import { TransformJobStatus } from '../../shared/types';

const sagemaker = new SageMakerClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get transform status request:', JSON.stringify(event, null, 2));

  const jobName = event.pathParameters?.jobName;

  if (!jobName) {
    return badRequestResponse('Job name is required');
  }

  try {
    const command = new DescribeTransformJobCommand({
      TransformJobName: jobName,
    });

    const response = await sagemaker.send(command);

    const status: TransformJobStatus = {
      jobName: response.TransformJobName || jobName,
      status: (response.TransformJobStatus as TransformJobStatus['status']) || 'InProgress',
      creationTime: response.CreationTime?.toISOString(),
      endTime: response.TransformEndTime?.toISOString(),
      outputPath: response.TransformOutput?.S3OutputPath,
    };

    return successResponse(status);
  } catch (error: unknown) {
    console.error('Error getting transform status:', error);

    if (error instanceof Error && error.name === 'ResourceNotFound') {
      return notFoundResponse(`Transform job '${jobName}' not found`);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to get transform status: ${errorMessage}`);
  }
};
