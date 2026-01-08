import { APIGatewayProxyHandler } from 'aws-lambda';
import { SageMakerClient, CreateTransformJobCommand } from '@aws-sdk/client-sagemaker';
import { successResponse, errorResponse, badRequestResponse } from '../../shared/response';
import { BatchTransformRequest, BatchTransformResponse } from '../../shared/types';

const sagemaker = new SageMakerClient({});
const RAW_DATA_BUCKET = process.env.RAW_DATA_BUCKET || '';
const OUTPUTS_BUCKET = process.env.OUTPUTS_BUCKET || '';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Run batch transform request:', JSON.stringify(event, null, 2));

  let body: BatchTransformRequest;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const { modelName, inputPrefix = 'batch-input', jobName } = body;

  if (!modelName) {
    return badRequestResponse('modelName is required');
  }

  // Generate unique job name if not provided
  const transformJobName = jobName || `${modelName}-transform-${Date.now()}`;

  try {
    const command = new CreateTransformJobCommand({
      TransformJobName: transformJobName,
      ModelName: modelName,
      MaxPayloadInMB: 0, // Use default
      ModelClientConfig: {
        InvocationsTimeoutInSeconds: 3600, // 1 hour timeout for long inference
      },
      TransformInput: {
        DataSource: {
          S3DataSource: {
            S3DataType: 'S3Prefix',
            S3Uri: `s3://${RAW_DATA_BUCKET}/${inputPrefix}/`,
          },
        },
        ContentType: 'text/csv',
        SplitType: 'None', // Process entire file at once for time series
      },
      TransformOutput: {
        S3OutputPath: `s3://${OUTPUTS_BUCKET}/batch-output/${transformJobName}/`,
        AssembleWith: 'Line',
      },
      TransformResources: {
        InstanceType: 'ml.m5.4xlarge',
        InstanceCount: 1,
      },
    });

    await sagemaker.send(command);

    const result: BatchTransformResponse = {
      jobName: transformJobName,
      message: 'Batch transform job started successfully',
    };

    return successResponse(result, 201);
  } catch (error) {
    console.error('Error starting batch transform:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to start batch transform: ${errorMessage}`);
  }
};
