'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTrainingJobs } from '@/hooks/useTrainingJobs';
import { useTraining } from '@/hooks/useTraining';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Play,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DatasetUpload } from '@/components/admin/DatasetUpload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type StepStatus = 'pending' | 'active' | 'completed' | 'failed';

interface PipelineStep {
  label: string;
  status: StepStatus;
}

export function RegenerateForecasts() {
  const { jobs, isLoadingJobs, fetchJobs, fetchPipelineStatus } = useTrainingJobs();
  const {
    startTransform,
    pollTransformStatus,
    processOutput,
    isStartingTransform,
    isProcessingOutput,
    reset,
  } = useTraining();

  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>([
    { label: 'Find Model', status: 'pending' },
    { label: 'Run Inference', status: 'pending' },
    { label: 'Process Results', status: 'pending' },
    { label: 'Complete', status: 'pending' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    filesWritten: number;
    jobName: string;
  } | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  const updateStep = useCallback((index: number, status: StepStatus) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, status } : step)));
  }, []);

  const resetPipeline = useCallback(() => {
    setSteps([
      { label: 'Find Model', status: 'pending' },
      { label: 'Run Inference', status: 'pending' },
      { label: 'Process Results', status: 'pending' },
      { label: 'Complete', status: 'pending' },
    ]);
    setError(null);
    setSuccessResult(null);
    reset();
  }, [reset]);

  const completedJobs = jobs.filter((j) => j.status === 'Completed');
  const latestCompletedJob = completedJobs.length > 0 ? completedJobs[0] : null;

  const handleRegenerate = useCallback(async () => {
    if (!latestCompletedJob) return;

    setIsRunning(true);
    setError(null);
    setSuccessResult(null);
    resetPipeline();

    updateStep(0, 'active');
    const pipeline = await fetchPipelineStatus(latestCompletedJob.jobName);

    if (!isMountedRef.current) return;

    if (!pipeline || pipeline.models.length === 0) {
      updateStep(0, 'failed');
      setError(
        'No model found for the latest training job. Please ensure the training pipeline completed successfully.',
      );
      setIsRunning(false);
      return;
    }

    const modelName = pipeline.models[0].modelName;
    updateStep(0, 'completed');

    updateStep(1, 'active');
    const transformResponse = await startTransform({ modelName });

    if (!isMountedRef.current) return;

    if (!transformResponse) {
      updateStep(1, 'failed');
      setError('Failed to start batch transform job. Check that the model is still available.');
      setIsRunning(false);
      return;
    }

    const transformJobName = transformResponse.jobName;

    const pollResult = await new Promise<'Completed' | 'Failed'>((resolve) => {
      pollingRef.current = setInterval(async () => {
        if (!isMountedRef.current) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          resolve('Failed');
          return;
        }

        const status = await pollTransformStatus(transformJobName);

        if (!status) return;

        if (status.status === 'Completed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          resolve('Completed');
        } else if (status.status === 'Failed' || status.status === 'Stopped') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          resolve('Failed');
        }
      }, 10000);
    });

    if (!isMountedRef.current) return;

    if (pollResult === 'Failed') {
      updateStep(1, 'failed');
      setError('Batch transform job failed or was stopped. Check CloudWatch logs for details.');
      setIsRunning(false);
      return;
    }

    updateStep(1, 'completed');

    updateStep(2, 'active');
    const outputResult = await processOutput(transformJobName);

    if (!isMountedRef.current) return;

    if (!outputResult) {
      updateStep(2, 'failed');
      setError(
        'Failed to process batch transform output. The transform job completed but output processing encountered an error.',
      );
      setIsRunning(false);
      return;
    }

    updateStep(2, 'completed');

    updateStep(3, 'completed');
    setSuccessResult({
      filesWritten: outputResult.filesWritten,
      jobName: transformJobName,
    });
    setIsRunning(false);

    fetchJobs();
  }, [
    latestCompletedJob,
    resetPipeline,
    updateStep,
    fetchPipelineStatus,
    startTransform,
    pollTransformStatus,
    processOutput,
    fetchJobs,
  ]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeVariant = (
    status: string,
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'InProgress':
        return 'secondary';
      case 'Failed':
      case 'Stopped':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold">Regenerate Forecasts</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Re-run batch inference using the latest trained model to update all SKU forecasts
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload New Dataset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Upload Sales Dataset</DialogTitle>
                </DialogHeader>
                <DatasetUpload />
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchJobs}
              disabled={isLoadingJobs}
              className="shrink-0"
            >
              <RefreshCw className={cn('h-4 w-4', isLoadingJobs && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Training Jobs</h3>
          {isLoadingJobs ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading jobs...
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No training jobs found. Train a model first.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                      Job Name
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                      Status
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.slice(0, 5).map((job) => (
                    <tr key={job.jobName} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-mono text-xs truncate max-w-[240px]">
                        {job.jobName}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={getStatusBadgeVariant(job.status)}>{job.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatDate(job.creationTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {latestCompletedJob && (
          <div className="mb-6 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Latest completed training job</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {latestCompletedJob.jobName}
            </p>
            {latestCompletedJob.endTime && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Completed: {formatDate(latestCompletedJob.endTime)}
              </p>
            )}
          </div>
        )}

        {(isRunning || successResult || error) && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Regeneration Progress
            </h3>
            <div className="flex items-center gap-2">
              {steps.map((step, index) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <StepIndicator status={step.status} />
                    <span
                      className={cn(
                        'text-xs font-medium whitespace-nowrap',
                        step.status === 'pending' && 'text-muted-foreground',
                        step.status === 'active' && 'text-blue-600',
                        step.status === 'completed' && 'text-green-600',
                        step.status === 'failed' && 'text-red-600',
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'h-px w-6 sm:w-10',
                        step.status === 'completed' ? 'bg-green-300' : 'bg-border',
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Regeneration Failed
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {successResult && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Forecasts Regenerated Successfully
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  {successResult.filesWritten} forecast file
                  {successResult.filesWritten !== 1 ? 's' : ''} written from job{' '}
                  {successResult.jobName}
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleRegenerate}
          disabled={!latestCompletedJob || isRunning || isStartingTransform || isProcessingOutput}
          className="w-full sm:w-auto"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Regenerate All Forecasts
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function StepIndicator({ status }: { status: StepStatus }) {
  switch (status) {
    case 'pending':
      return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />;
    case 'active':
      return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-600" />;
  }
}
