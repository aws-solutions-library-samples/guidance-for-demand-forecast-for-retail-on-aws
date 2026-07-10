'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useCallback, useRef } from 'react';
import {
  startTrainingJob,
  getTrainingJobStatus,
  createModel,
  startBatchTransform,
  getTransformJobStatus,
  processBatchOutput,
  deployEndpoint,
  getEndpointStatus,
  deleteEndpoint,
  generatePriceScenarios,
  getPriceScenarioStatus,
} from '@/lib/api-client';
import type {
  StartTrainingRequest,
  TrainingJobResponse,
  TrainingJobStatus,
  CreateModelRequest,
  CreateModelResponse,
  BatchTransformRequest,
  BatchTransformResponse,
  TransformJobStatus,
  ProcessBatchOutputResponse,
  DeployEndpointResponse,
  EndpointStatusResponse,
  PipelineStatusResponse,
  PriceScenarioJob,
  FailedPriceScenarioJob,
} from '@/types';

export interface UseTrainingReturn {
  trainingJob: TrainingJobResponse | null;
  trainingStatus: TrainingJobStatus | null;
  isStartingTraining: boolean;
  isPollingTraining: boolean;
  trainingError: Error | null;

  model: CreateModelResponse | null;
  isCreatingModel: boolean;
  modelError: Error | null;

  transformJob: BatchTransformResponse | null;
  transformStatus: TransformJobStatus | null;
  isStartingTransform: boolean;
  isPollingTransform: boolean;
  transformError: Error | null;

  processOutputResult: ProcessBatchOutputResponse | null;
  isProcessingOutput: boolean;
  processOutputError: Error | null;

  endpointDeployment: DeployEndpointResponse | null;
  endpointStatus: EndpointStatusResponse | null;
  isDeployingEndpoint: boolean;
  isPollingEndpoint: boolean;
  isDeletingEndpoint: boolean;
  endpointError: Error | null;

  priceScenarioJobs: PriceScenarioJob[];
  failedPriceScenarios: FailedPriceScenarioJob[];
  isGeneratingScenarios: boolean;
  isPollingScenarios: boolean;
  isProcessingScenarios: boolean;
  isPriceScenariosComplete: boolean;
  priceScenarioError: Error | null;

  startTraining: (request?: StartTrainingRequest) => Promise<TrainingJobResponse | null>;
  pollTrainingStatus: (jobName: string) => Promise<TrainingJobStatus | null>;
  createModelFromJob: (request: CreateModelRequest) => Promise<CreateModelResponse | null>;
  startTransform: (request: BatchTransformRequest) => Promise<BatchTransformResponse | null>;
  pollTransformStatus: (jobName: string) => Promise<TransformJobStatus | null>;
  processOutput: (jobName: string) => Promise<ProcessBatchOutputResponse | null>;
  deployNewEndpoint: (modelName: string) => Promise<DeployEndpointResponse | null>;
  pollEndpointStatus: (endpointName: string) => Promise<EndpointStatusResponse | null>;
  deleteExistingEndpoint: (endpointName: string) => Promise<void>;
  generateScenarios: (modelName: string, prices?: number[]) => Promise<PriceScenarioJob[] | null>;
  retryFailedScenarios: (modelName: string) => Promise<PriceScenarioJob[] | null>;
  pollScenarioStatus: () => Promise<boolean>;
  processScenarios: () => Promise<void>;
  resumeFromPipeline: (pipeline: PipelineStatusResponse) => void;
  reset: () => void;
}

export function useTraining(): UseTrainingReturn {
  const [trainingJob, setTrainingJob] = useState<TrainingJobResponse | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<TrainingJobStatus | null>(null);
  const [isStartingTraining, setIsStartingTraining] = useState(false);
  const [isPollingTraining, setIsPollingTraining] = useState(false);
  const [trainingError, setTrainingError] = useState<Error | null>(null);

  const [model, setModel] = useState<CreateModelResponse | null>(null);
  const [isCreatingModel, setIsCreatingModel] = useState(false);
  const [modelError, setModelError] = useState<Error | null>(null);

  const [transformJob, setTransformJob] = useState<BatchTransformResponse | null>(null);
  const [transformStatus, setTransformStatus] = useState<TransformJobStatus | null>(null);
  const [isStartingTransform, setIsStartingTransform] = useState(false);
  const [isPollingTransform, setIsPollingTransform] = useState(false);
  const [transformError, setTransformError] = useState<Error | null>(null);

  const [processOutputResult, setProcessOutputResult] = useState<ProcessBatchOutputResponse | null>(
    null,
  );
  const [isProcessingOutput, setIsProcessingOutput] = useState(false);
  const [processOutputError, setProcessOutputError] = useState<Error | null>(null);

  const [endpointDeployment, setEndpointDeployment] = useState<DeployEndpointResponse | null>(null);
  const [endpointStatus, setEndpointStatus] = useState<EndpointStatusResponse | null>(null);
  const [isDeployingEndpoint, setIsDeployingEndpoint] = useState(false);
  const [isPollingEndpoint, setIsPollingEndpoint] = useState(false);
  const [isDeletingEndpoint, setIsDeletingEndpoint] = useState(false);
  const [endpointError, setEndpointError] = useState<Error | null>(null);

  const [priceScenarioJobs, _setPriceScenarioJobs] = useState<PriceScenarioJob[]>([]);
  const priceScenarioJobsRef = useRef<PriceScenarioJob[]>([]);
  const setPriceScenarioJobs = useCallback(
    (updater: PriceScenarioJob[] | ((prev: PriceScenarioJob[]) => PriceScenarioJob[])) => {
      _setPriceScenarioJobs((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        priceScenarioJobsRef.current = next;
        return next;
      });
    },
    [],
  );
  const [failedPriceScenarios, setFailedPriceScenarios] = useState<FailedPriceScenarioJob[]>([]);
  const [isGeneratingScenarios, setIsGeneratingScenarios] = useState(false);
  const [isPollingScenarios, setIsPollingScenarios] = useState(false);
  const [isProcessingScenarios, setIsProcessingScenarios] = useState(false);
  const [isPriceScenariosComplete, setIsPriceScenariosComplete] = useState(false);
  const [priceScenarioError, setPriceScenarioError] = useState<Error | null>(null);

  const startTraining = useCallback(
    async (request?: StartTrainingRequest): Promise<TrainingJobResponse | null> => {
      setIsStartingTraining(true);
      setTrainingError(null);
      try {
        const response = await startTrainingJob(request || {});
        setTrainingJob(response);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to start training job');
        setTrainingError(error);
        return null;
      } finally {
        setIsStartingTraining(false);
      }
    },
    [],
  );

  const pollTrainingStatus = useCallback(
    async (jobName: string): Promise<TrainingJobStatus | null> => {
      setIsPollingTraining(true);
      setTrainingError(null);
      try {
        const status = await getTrainingJobStatus(jobName);
        setTrainingStatus(status);
        return status;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to get training status');
        setTrainingError(error);
        return null;
      } finally {
        setIsPollingTraining(false);
      }
    },
    [],
  );

  const createModelFromJob = useCallback(
    async (request: CreateModelRequest): Promise<CreateModelResponse | null> => {
      setIsCreatingModel(true);
      setModelError(null);
      try {
        const response = await createModel(request);
        setModel(response);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create model');
        setModelError(error);
        return null;
      } finally {
        setIsCreatingModel(false);
      }
    },
    [],
  );

  const startTransform = useCallback(
    async (request: BatchTransformRequest): Promise<BatchTransformResponse | null> => {
      setIsStartingTransform(true);
      setTransformError(null);
      try {
        const response = await startBatchTransform(request);
        setTransformJob(response);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to start batch transform');
        setTransformError(error);
        return null;
      } finally {
        setIsStartingTransform(false);
      }
    },
    [],
  );

  const pollTransformStatus = useCallback(
    async (jobName: string): Promise<TransformJobStatus | null> => {
      setIsPollingTransform(true);
      setTransformError(null);
      try {
        const status = await getTransformJobStatus(jobName);
        setTransformStatus(status);
        return status;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to get transform status');
        setTransformError(error);
        return null;
      } finally {
        setIsPollingTransform(false);
      }
    },
    [],
  );

  const processOutput = useCallback(
    async (jobName: string): Promise<ProcessBatchOutputResponse | null> => {
      setIsProcessingOutput(true);
      setProcessOutputError(null);
      try {
        const response = await processBatchOutput({ jobName });
        setProcessOutputResult(response);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to process batch output');
        setProcessOutputError(error);
        return null;
      } finally {
        setIsProcessingOutput(false);
      }
    },
    [],
  );

  const deployNewEndpoint = useCallback(
    async (modelName: string): Promise<DeployEndpointResponse | null> => {
      setIsDeployingEndpoint(true);
      setEndpointError(null);
      try {
        const response = await deployEndpoint({ modelName });
        setEndpointDeployment(response);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to deploy endpoint');
        setEndpointError(error);
        return null;
      } finally {
        setIsDeployingEndpoint(false);
      }
    },
    [],
  );

  const pollEndpointStatus = useCallback(
    async (endpointName: string): Promise<EndpointStatusResponse | null> => {
      setIsPollingEndpoint(true);
      setEndpointError(null);
      try {
        const status = await getEndpointStatus(endpointName);
        setEndpointStatus(status);
        return status;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to get endpoint status');
        setEndpointError(error);
        return null;
      } finally {
        setIsPollingEndpoint(false);
      }
    },
    [],
  );

  const deleteExistingEndpoint = useCallback(async (endpointName: string): Promise<void> => {
    setIsDeletingEndpoint(true);
    setEndpointError(null);
    try {
      await deleteEndpoint(endpointName);
      setEndpointDeployment(null);
      setEndpointStatus(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete endpoint');
      setEndpointError(error);
    } finally {
      setIsDeletingEndpoint(false);
    }
  }, []);

  const generateScenarios = useCallback(
    async (modelName: string, prices?: number[]): Promise<PriceScenarioJob[] | null> => {
      setIsGeneratingScenarios(true);
      setPriceScenarioError(null);
      setIsPriceScenariosComplete(false);
      try {
        const request = prices ? { modelName, prices } : { modelName };
        const response = await generatePriceScenarios(request);
        // Merge new started jobs with any existing ones (from previous partial runs)
        setPriceScenarioJobs((prev) => {
          const existingPrices = new Set(prev.map((j) => j.price));
          const newJobs = response.jobs.filter((j) => !existingPrices.has(j.price));
          return [...prev, ...newJobs];
        });
        setFailedPriceScenarios(response.failed || []);
        return response.jobs;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to generate price scenarios');
        setPriceScenarioError(error);
        return null;
      } finally {
        setIsGeneratingScenarios(false);
      }
    },
    [],
  );

  const retryFailedScenarios = useCallback(
    async (modelName: string): Promise<PriceScenarioJob[] | null> => {
      const pricesToRetry = failedPriceScenarios.map((f) => f.price);
      if (pricesToRetry.length === 0) return null;
      return generateScenarios(modelName, pricesToRetry);
    },
    [failedPriceScenarios, generateScenarios],
  );

  const pollScenarioStatus = useCallback(async (): Promise<boolean> => {
    const currentJobs = priceScenarioJobsRef.current;
    if (currentJobs.length === 0) return false;
    setIsPollingScenarios(true);
    setPriceScenarioError(null);
    try {
      const jobNames = currentJobs.map((j) => j.jobName);
      const response = await getPriceScenarioStatus(jobNames);
      const statusMap = new Map(response.jobs.map((j) => [j.jobName, j]));
      setPriceScenarioJobs((prev) => prev.map((job) => statusMap.get(job.jobName) || job));
      if (response.allComplete) {
        setIsPriceScenariosComplete(true);
      }
      return response.allComplete;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to poll scenario status');
      setPriceScenarioError(error);
      return false;
    } finally {
      setIsPollingScenarios(false);
    }
  }, [setPriceScenarioJobs]);

  const processScenarios = useCallback(async (): Promise<void> => {
    const currentJobs = priceScenarioJobsRef.current;
    if (currentJobs.length === 0) return;
    setIsProcessingScenarios(true);
    setPriceScenarioError(null);
    try {
      for (const job of currentJobs) {
        if (job.status === 'Failed' || job.status === 'Stopped') continue;
        await processBatchOutput({
          jobName: job.jobName,
          priceTag: String(job.price),
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to process price scenarios');
      setPriceScenarioError(error);
    } finally {
      setIsProcessingScenarios(false);
    }
  }, []);

  const resumeFromPipeline = useCallback((pipeline: PipelineStatusResponse) => {
    setTrainingJob({ jobName: pipeline.jobName, message: 'Resumed from pipeline' });
    setTrainingStatus({
      jobName: pipeline.jobName,
      status: pipeline.trainingStatus as TrainingJobStatus['status'],
      bestCandidate: pipeline.bestCandidate,
    });

    if (pipeline.models.length > 0) {
      setModel({ modelName: pipeline.models[0].modelName, message: 'Resumed from pipeline' });
    }

    if (pipeline.transformJobs.length > 0) {
      const tj = pipeline.transformJobs[0];
      setTransformJob({ jobName: tj.jobName, message: 'Resumed from pipeline' });
      setTransformStatus({
        jobName: tj.jobName,
        status: tj.status as TransformJobStatus['status'],
      });
    }

    if (pipeline.resumeStep > 4) {
      setProcessOutputResult({
        message: 'Forecasts available',
        jobName: pipeline.transformJobs[0]?.jobName || '',
        outputFiles: 0,
        forecastGroups: 0,
        filesWritten: 0,
      });
    }

    if (pipeline.endpoints.length > 0) {
      const ep = pipeline.endpoints[0];
      setEndpointDeployment({ endpointName: ep.endpointName, message: 'Resumed from pipeline' });
      setEndpointStatus({
        endpointName: ep.endpointName,
        status: ep.status as EndpointStatusResponse['status'],
      });
    }
  }, []);

  const reset = useCallback(() => {
    setTrainingJob(null);
    setTrainingStatus(null);
    setTrainingError(null);
    setModel(null);
    setModelError(null);
    setTransformJob(null);
    setTransformStatus(null);
    setTransformError(null);
    setProcessOutputResult(null);
    setProcessOutputError(null);
    setEndpointDeployment(null);
    setEndpointStatus(null);
    setEndpointError(null);
    setPriceScenarioJobs([]);
    priceScenarioJobsRef.current = [];
    setFailedPriceScenarios([]);
    setPriceScenarioError(null);
    setIsPriceScenariosComplete(false);
  }, []);

  return {
    trainingJob,
    trainingStatus,
    isStartingTraining,
    isPollingTraining,
    trainingError,
    model,
    isCreatingModel,
    modelError,
    transformJob,
    transformStatus,
    isStartingTransform,
    isPollingTransform,
    transformError,
    processOutputResult,
    isProcessingOutput,
    processOutputError,
    endpointDeployment,
    endpointStatus,
    isDeployingEndpoint,
    isPollingEndpoint,
    isDeletingEndpoint,
    endpointError,
    priceScenarioJobs,
    failedPriceScenarios,
    isGeneratingScenarios,
    isPollingScenarios,
    isProcessingScenarios,
    isPriceScenariosComplete,
    priceScenarioError,
    startTraining,
    pollTrainingStatus,
    createModelFromJob,
    startTransform,
    pollTransformStatus,
    processOutput,
    deployNewEndpoint,
    pollEndpointStatus,
    deleteExistingEndpoint,
    generateScenarios,
    retryFailedScenarios,
    pollScenarioStatus,
    processScenarios,
    resumeFromPipeline,
    reset,
  };
}
