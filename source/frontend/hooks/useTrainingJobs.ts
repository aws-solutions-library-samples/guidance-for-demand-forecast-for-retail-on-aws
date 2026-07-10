'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useCallback, useEffect } from 'react';
import { listTrainingJobs, listEndpoints, getPipelineStatus } from '@/lib/api-client';
import type { TrainingJobSummary, EndpointSummary, PipelineStatusResponse } from '@/types';

export interface UseTrainingJobsReturn {
  jobs: TrainingJobSummary[];
  endpoints: EndpointSummary[];
  isLoadingJobs: boolean;
  isLoadingEndpoints: boolean;
  selectedPipeline: PipelineStatusResponse | null;
  isLoadingPipeline: boolean;
  fetchJobs: () => Promise<void>;
  fetchEndpoints: () => Promise<void>;
  fetchPipelineStatus: (jobName: string) => Promise<PipelineStatusResponse | null>;
  clearPipeline: () => void;
}

export function useTrainingJobs(): UseTrainingJobsReturn {
  const [jobs, setJobs] = useState<TrainingJobSummary[]>([]);
  const [endpoints, setEndpoints] = useState<EndpointSummary[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineStatusResponse | null>(null);
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(false);

  const fetchJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const response = await listTrainingJobs();
      setJobs(response.jobs);
    } catch (err) {
      console.error('Failed to fetch training jobs:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  const fetchEndpoints = useCallback(async () => {
    setIsLoadingEndpoints(true);
    try {
      const response = await listEndpoints();
      setEndpoints(response.endpoints);
    } catch (err) {
      console.error('Failed to fetch endpoints:', err);
    } finally {
      setIsLoadingEndpoints(false);
    }
  }, []);

  const fetchPipelineStatus = useCallback(
    async (jobName: string): Promise<PipelineStatusResponse | null> => {
      setIsLoadingPipeline(true);
      try {
        const pipeline = await getPipelineStatus(jobName);
        setSelectedPipeline(pipeline);
        return pipeline;
      } catch (err) {
        console.error('Failed to fetch pipeline status:', err);
        return null;
      } finally {
        setIsLoadingPipeline(false);
      }
    },
    [],
  );

  const clearPipeline = useCallback(() => {
    setSelectedPipeline(null);
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchJobs();
    fetchEndpoints();
  }, [fetchJobs, fetchEndpoints]);

  return {
    jobs,
    endpoints,
    isLoadingJobs,
    isLoadingEndpoints,
    selectedPipeline,
    isLoadingPipeline,
    fetchJobs,
    fetchEndpoints,
    fetchPipelineStatus,
    clearPipeline,
  };
}
