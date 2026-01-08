import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  SageMakerClient,
  DescribeAutoMLJobV2Command,
  CreateModelCommand,
} from '@aws-sdk/client-sagemaker';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '../../shared/response';
import { CreateModelRequest, CreateModelResponse } from '../../shared/types';

const sagemaker = new SageMakerClient({});
const SAGEMAKER_ROLE_ARN = process.env.SAGEMAKER_ROLE_ARN || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Create model request:', JSON.stringify(event, null, 2));

  let body: CreateModelRequest;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const { jobName, modelName } = body;

  if (!jobName) {
    return badRequestResponse('jobName is required');
  }

  if (!SAGEMAKER_ROLE_ARN) {
    return errorResponse('SageMaker role ARN not configured');
  }

  try {
    // Get best candidate from completed training job
    const describeCommand = new DescribeAutoMLJobV2Command({
      AutoMLJobName: jobName,
    });

    const jobResponse = await sagemaker.send(describeCommand);

    // Verify job is completed
    if (jobResponse.AutoMLJobStatus !== 'Completed') {
      return badRequestResponse(
        `Training job is not completed. Current status: ${jobResponse.AutoMLJobStatus}`
      );
    }

    const bestCandidate = jobResponse.BestCandidate;

    if (!bestCandidate) {
      return errorResponse('No best candidate found in completed training job');
    }

    // Use provided model name or candidate name
    const finalModelName = modelName || bestCandidate.CandidateName || `model-${Date.now()}`;

    // Create model from best candidate's inference containers
    const createModelCommand = new CreateModelCommand({
      ModelName: finalModelName,
      ExecutionRoleArn: SAGEMAKER_ROLE_ARN,
      Containers: bestCandidate.InferenceContainers?.map((container) => ({
        Image: container.Image,
        ModelDataUrl: container.ModelDataUrl,
        Environment: container.Environment,
      })),
    });

    await sagemaker.send(createModelCommand);

    const result: CreateModelResponse = {
      modelName: finalModelName,
      message: 'Model created successfully from best training candidate',
    };

    return successResponse(result, 201);
  } catch (error: unknown) {
    console.error('Error creating model:', error);

    if (error instanceof Error && error.name === 'ResourceNotFound') {
      return notFoundResponse(`Training job '${jobName}' not found`);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to create model: ${errorMessage}`);
  }
};
