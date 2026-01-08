import { APIGatewayProxyHandler } from 'aws-lambda';
import { SageMakerClient, DescribeAutoMLJobV2Command } from '@aws-sdk/client-sagemaker';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '../../shared/response';
import { TrainingJobStatus } from '../../shared/types';

const sagemaker = new SageMakerClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Get training status request:', JSON.stringify(event, null, 2));

  const jobName = event.pathParameters?.jobName;

  if (!jobName) {
    return badRequestResponse('Job name is required');
  }

  try {
    const command = new DescribeAutoMLJobV2Command({
      AutoMLJobName: jobName,
    });

    const response = await sagemaker.send(command);

    const status: TrainingJobStatus = {
      jobName: response.AutoMLJobName || jobName,
      status: (response.AutoMLJobStatus as TrainingJobStatus['status']) || 'InProgress',
      secondaryStatus: response.AutoMLJobSecondaryStatus,
      creationTime: response.CreationTime?.toISOString(),
      endTime: response.EndTime?.toISOString(),
    };

    // Include best candidate info if available
    if (response.BestCandidate) {
      status.bestCandidate = {
        candidateName: response.BestCandidate.CandidateName || '',
        finalMetricValue: response.BestCandidate.FinalAutoMLJobObjectiveMetric
          ? {
              metricName: response.BestCandidate.FinalAutoMLJobObjectiveMetric.MetricName || '',
              value: response.BestCandidate.FinalAutoMLJobObjectiveMetric.Value || 0,
            }
          : undefined,
      };
    }

    return successResponse(status);
  } catch (error: unknown) {
    console.error('Error getting training status:', error);

    // Check if job not found
    if (error instanceof Error && error.name === 'ResourceNotFound') {
      return notFoundResponse(`Training job '${jobName}' not found`);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to get training status: ${errorMessage}`);
  }
};
