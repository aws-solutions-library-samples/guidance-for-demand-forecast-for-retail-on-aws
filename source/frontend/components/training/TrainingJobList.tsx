// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { StatusBadge } from '@/components/training/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, RefreshCw, Loader2, Database, Server, Trash2, Eye, RotateCcw } from 'lucide-react';
import type { TrainingJobSummary, EndpointSummary } from '@/types';

interface TrainingJobListProps {
  jobs: TrainingJobSummary[];
  endpoints: EndpointSummary[];
  isLoadingJobs: boolean;
  isLoadingEndpoints: boolean;
  isLoadingPipeline: boolean;
  deletingEndpoints: Set<string>;
  onRefreshJobs: () => void;
  onRefreshEndpoints: () => void;
  onNewTraining: () => void;
  onResumeJob: (jobName: string) => void;
  onDeleteEndpoint: (endpointName: string) => void;
}

export function TrainingJobList({
  jobs,
  endpoints,
  isLoadingJobs,
  isLoadingEndpoints,
  isLoadingPipeline,
  deletingEndpoints,
  onRefreshJobs,
  onRefreshEndpoints,
  onNewTraining,
  onResumeJob,
  onDeleteEndpoint,
}: TrainingJobListProps) {
  return (
    <>
      <div className="mb-6 lg:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Model Training
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base lg:text-lg">
            Train demand forecasting models using SageMaker AutoML
          </p>
        </div>
        <Button onClick={onNewTraining} className="h-10 lg:h-11">
          <Play className="mr-2 h-4 w-4" />
          New Training Job
        </Button>
      </div>

      {/* Training Jobs Table */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
              <Database className="w-5 h-5" />
              Training Jobs
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onRefreshJobs} disabled={isLoadingJobs}>
              {isLoadingJobs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingJobs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading jobs...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No training jobs found. Start a new training job to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.jobName} className="border-b last:border-b-0 hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono text-sm">{job.jobName}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {job.creationTime ? new Date(job.creationTime).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onResumeJob(job.jobName)}
                          disabled={isLoadingPipeline}
                        >
                          {isLoadingPipeline ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : job.status === 'Completed' ? (
                            <RotateCcw className="mr-1 h-3 w-3" />
                          ) : (
                            <Eye className="mr-1 h-3 w-3" />
                          )}
                          {job.status === 'Completed' ? 'Resume' : 'View'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Endpoints Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
              <Server className="w-5 h-5" />
              Endpoints
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshEndpoints}
              disabled={isLoadingEndpoints}
            >
              {isLoadingEndpoints ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingEndpoints ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading endpoints...</span>
            </div>
          ) : endpoints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No endpoints found. Deploy an endpoint from a completed training pipeline.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map((ep) => (
                    <tr
                      key={ep.endpointName}
                      className="border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <td className="py-3 px-4 font-mono text-sm">{ep.endpointName}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={ep.status} />
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {ep.creationTime ? new Date(ep.creationTime).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeleteEndpoint(ep.endpointName)}
                          disabled={deletingEndpoints.has(ep.endpointName)}
                        >
                          {deletingEndpoints.has(ep.endpointName) ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="mr-1 h-3 w-3" />
                          )}
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
