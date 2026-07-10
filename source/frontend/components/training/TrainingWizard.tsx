// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { StatusBadge } from '@/components/training/StatusBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Play,
  RefreshCw,
  CheckCircle,
  Loader2,
  Database,
  Brain,
  Zap,
  AlertCircle,
  FileOutput,
  ArrowLeft,
  DollarSign,
} from 'lucide-react';
import type { UseTrainingReturn } from '@/hooks/useTraining';

type ForecastFrequency = 'D' | 'W' | 'M';

interface TrainingWizardProps {
  training: UseTrainingReturn;
  jobName: string;
  onJobNameChange: (value: string) => void;
  forecastFrequency: ForecastFrequency;
  onForecastFrequencyChange: (value: ForecastFrequency) => void;
  forecastHorizon: number;
  onForecastHorizonChange: (value: number) => void;
  modelName: string;
  onModelNameChange: (value: string) => void;
  onStartTraining: () => void;
  onCreateModel: () => void;
  onStartTransform: () => void;
  onProcessOutput: () => void;
  onGenerateScenarios: () => void;
  onRetryScenarios: () => void;
  onProcessScenarios: () => void;
  onBackToList: () => void;
  onReset: () => void;
}

export function TrainingWizard({
  training,
  jobName,
  onJobNameChange,
  forecastFrequency,
  onForecastFrequencyChange,
  forecastHorizon,
  onForecastHorizonChange,
  modelName,
  onModelNameChange,
  onStartTraining,
  onCreateModel,
  onStartTransform,
  onProcessOutput,
  onGenerateScenarios,
  onRetryScenarios,
  onProcessScenarios,
  onBackToList,
  onReset,
}: TrainingWizardProps) {
  const {
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
    endpointError,
    priceScenarioJobs,
    failedPriceScenarios,
    isGeneratingScenarios,
    isPollingScenarios,
    isProcessingScenarios,
    isPriceScenariosComplete,
    priceScenarioError,
    pollTrainingStatus,
    pollTransformStatus,
    pollScenarioStatus,
  } = training;

  const canCreateModel = trainingStatus?.status === 'Completed' && !model;
  const canStartTransform = model && !transformJob;
  const canProcessOutput = transformStatus?.status === 'Completed' && !processOutputResult;
  const canGenerateScenarios = processOutputResult && model && priceScenarioJobs.length === 0;
  const canRetryScenarios = model && failedPriceScenarios.length > 0 && !isGeneratingScenarios;

  return (
    <>
      <div className="mb-6 lg:mb-8 xl:mb-10 2xl:mb-12">
        <Button variant="ghost" onClick={onBackToList} className="mb-4 -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Button>
        <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-foreground">
          Model Training
        </h1>
        <p className="mt-2 text-muted-foreground text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">
          Train a demand forecasting model using SageMaker AutoML
        </p>
      </div>

      {(trainingError ||
        modelError ||
        transformError ||
        processOutputError ||
        endpointError ||
        priceScenarioError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {trainingError?.message ||
              modelError?.message ||
              transformError?.message ||
              processOutputError?.message ||
              endpointError?.message ||
              priceScenarioError?.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-6 lg:gap-8 xl:gap-10 2xl:gap-12">
        {/* Step 1: Start Training */}
        <Card className="relative">
          <div className="absolute -top-3 -left-3 w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm lg:text-base xl:text-lg">
            1
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg lg:text-xl xl:text-2xl 2xl:text-3xl">
              <Database className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7" />
              Start Training
            </CardTitle>
            <CardDescription className="text-sm lg:text-base xl:text-lg">
              Launch a SageMaker AutoML training job
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobName" className="text-sm lg:text-base xl:text-lg">
                Job Name (optional)
              </Label>
              <Input
                id="jobName"
                placeholder="e.g., retail-forecast-2024"
                value={jobName}
                onChange={(e) => onJobNameChange(e.target.value)}
                disabled={!!trainingJob}
                className="h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency" className="text-sm lg:text-base xl:text-lg">
                Forecast Frequency
              </Label>
              <Select
                value={forecastFrequency}
                onValueChange={(v) => onForecastFrequencyChange(v as ForecastFrequency)}
                disabled={!!trainingJob}
              >
                <SelectTrigger className="h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="D">Daily</SelectItem>
                  <SelectItem value="W">Weekly</SelectItem>
                  <SelectItem value="M">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horizon" className="text-sm lg:text-base xl:text-lg">
                Forecast Horizon (days)
              </Label>
              <Input
                id="horizon"
                type="number"
                min={1}
                max={365}
                value={forecastHorizon}
                onChange={(e) => onForecastHorizonChange(parseInt(e.target.value) || 14)}
                disabled={!!trainingJob}
                className="h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg"
              />
            </div>

            {!trainingJob ? (
              <Button
                onClick={onStartTraining}
                disabled={isStartingTraining}
                className="w-full h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg"
              >
                {isStartingTraining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Training Job
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Job: {trainingJob.jobName}</p>
                  {trainingStatus && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <StatusBadge status={trainingStatus.status} />
                    </div>
                  )}
                  {trainingStatus?.secondaryStatus && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {trainingStatus.secondaryStatus}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => pollTrainingStatus(trainingJob.jobName)}
                  disabled={isPollingTraining}
                  className="w-full h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg"
                >
                  {isPollingTraining ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh Status
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Create Model */}
        <Card className={`relative ${!canCreateModel && !model ? 'opacity-60' : ''}`}>
          <div className="absolute -top-3 -left-3 w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm lg:text-base xl:text-lg">
            2
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg lg:text-xl xl:text-2xl 2xl:text-3xl">
              <Brain className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7" />
              Create Model
            </CardTitle>
            <CardDescription className="text-sm lg:text-base xl:text-lg">
              Deploy the best model from training
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modelName" className="text-sm lg:text-base xl:text-lg">
                Model Name (optional)
              </Label>
              <Input
                id="modelName"
                placeholder="e.g., forecast-model-v1"
                value={modelName}
                onChange={(e) => onModelNameChange(e.target.value)}
                disabled={!canCreateModel || !!model}
                className="h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg"
              />
            </div>

            {trainingStatus?.bestCandidate && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Best Candidate:</p>
                <p className="text-sm text-muted-foreground">
                  {trainingStatus.bestCandidate.candidateName}
                </p>
                {trainingStatus.bestCandidate.finalMetricValue && (
                  <p className="text-sm text-muted-foreground">
                    {trainingStatus.bestCandidate.finalMetricValue.metricName}:{' '}
                    {trainingStatus.bestCandidate.finalMetricValue.value.toFixed(4)}
                  </p>
                )}
              </div>
            )}

            {!model ? (
              <Button
                onClick={onCreateModel}
                disabled={!canCreateModel || isCreatingModel}
                className="w-full h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg"
              >
                {isCreatingModel ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Create Model
                  </>
                )}
              </Button>
            ) : (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-800">Model Created</p>
                </div>
                <p className="mt-1 text-sm text-green-700">{model.modelName}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Run Inference */}
        <Card className={`relative ${!canStartTransform && !transformJob ? 'opacity-60' : ''}`}>
          <div className="absolute -top-3 -left-3 w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm lg:text-base xl:text-lg">
            3
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg lg:text-xl xl:text-2xl 2xl:text-3xl">
              <Zap className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7" />
              Run Inference
            </CardTitle>
            <CardDescription className="text-sm lg:text-base xl:text-lg">
              Generate forecasts with batch transform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!transformJob ? (
              <Button
                onClick={onStartTransform}
                disabled={!canStartTransform || isStartingTransform}
                className="w-full h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg"
              >
                {isStartingTransform ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Start Batch Transform
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Job: {transformJob.jobName}</p>
                  {transformStatus && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <StatusBadge status={transformStatus.status} />
                    </div>
                  )}
                  {transformStatus?.outputPath && (
                    <p className="mt-1 text-sm text-muted-foreground truncate">
                      Output: {transformStatus.outputPath}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => pollTransformStatus(transformJob.jobName)}
                  disabled={isPollingTransform}
                  className="w-full h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg"
                >
                  {isPollingTransform ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh Status
                </Button>
              </div>
            )}

            {transformStatus?.status === 'Completed' && !processOutputResult && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Transform Complete</AlertTitle>
                <AlertDescription className="text-blue-700">
                  Proceed to Step 4 to process the results into forecast files.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Process Results */}
        <Card
          className={`relative ${!canProcessOutput && !processOutputResult ? 'opacity-60' : ''}`}
        >
          <div className="absolute -top-3 -left-3 w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm lg:text-base xl:text-lg">
            4
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg lg:text-xl xl:text-2xl 2xl:text-3xl">
              <FileOutput className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7" />
              Process Results
            </CardTitle>
            <CardDescription className="text-sm lg:text-base xl:text-lg">
              Convert batch output to forecast files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!processOutputResult ? (
              <Button
                onClick={onProcessOutput}
                disabled={!canProcessOutput || isProcessingOutput}
                className="w-full h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg"
              >
                {isProcessingOutput ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileOutput className="mr-2 h-4 w-4" />
                    Process Results
                  </>
                )}
              </Button>
            ) : (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-800">Results Processed</p>
                </div>
                <p className="mt-1 text-sm text-green-700">
                  {processOutputResult.filesWritten} forecast files written for{' '}
                  {processOutputResult.forecastGroups} item groups
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 5: Generate Price Scenarios */}
        <Card
          className={`relative ${!canGenerateScenarios && priceScenarioJobs.length === 0 ? 'opacity-60' : ''}`}
        >
          <div className="absolute -top-3 -left-3 w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm lg:text-base xl:text-lg">
            5
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg lg:text-xl xl:text-2xl 2xl:text-3xl">
              <DollarSign className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7" />
              Price Scenarios
            </CardTitle>
            <CardDescription className="text-sm lg:text-base xl:text-lg">
              Generate pre-computed price what-if scenarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {priceScenarioJobs.length === 0 ? (
              <Button
                onClick={onGenerateScenarios}
                disabled={!canGenerateScenarios || isGeneratingScenarios}
                className="w-full h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg"
              >
                {isGeneratingScenarios ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Generate Price Scenarios
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  {priceScenarioJobs.map((job) => (
                    <div
                      key={job.jobName}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <span className="text-sm font-mono">${job.price}</span>
                      <StatusBadge status={job.status || 'Unknown'} />
                    </div>
                  ))}
                  {failedPriceScenarios.map((f) => (
                    <div
                      key={`failed-${f.price}`}
                      className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <span className="text-sm font-mono">${f.price}</span>
                      <span className="text-xs text-red-600 font-medium">Quota limit</span>
                    </div>
                  ))}
                </div>

                {canRetryScenarios && (
                  <Button
                    onClick={onRetryScenarios}
                    disabled={isGeneratingScenarios}
                    className="w-full h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg bg-amber-600 hover:bg-amber-700"
                  >
                    {isGeneratingScenarios ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry Failed ({failedPriceScenarios.length} remaining)
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => pollScenarioStatus()}
                  disabled={isPollingScenarios}
                  className="w-full h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg"
                >
                  {isPollingScenarios ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh Status
                </Button>

                {isPriceScenariosComplete && failedPriceScenarios.length === 0 && (
                  <Button
                    onClick={onProcessScenarios}
                    disabled={isProcessingScenarios}
                    className="w-full h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg bg-purple-600 hover:bg-purple-700"
                  >
                    {isProcessingScenarios ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileOutput className="mr-2 h-4 w-4" />
                        Process Price Scenarios
                      </>
                    )}
                  </Button>
                )}

                {isPriceScenariosComplete && !isProcessingScenarios && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Scenarios Ready</AlertTitle>
                    <AlertDescription className="text-green-700">
                      Price what-if is now available on the Forecast page.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(trainingJob || model || transformJob) && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={onReset}
            className="h-10 lg:h-11 xl:h-12 text-sm lg:text-base xl:text-lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Start Over
          </Button>
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg lg:text-xl xl:text-2xl">About Model Training</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm lg:text-base xl:text-lg text-muted-foreground">
          <p>
            This page allows you to train a demand forecasting model using AWS SageMaker AutoML
            (Autopilot). The process involves three steps:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>
              <strong>Start Training:</strong> Launch an AutoML job that automatically trains and
              tunes multiple time series forecasting models on your sales data.
            </li>
            <li>
              <strong>Create Model:</strong> Once training completes, deploy the best performing
              model for inference.
            </li>
            <li>
              <strong>Run Inference:</strong> Use batch transform to generate forecasts for all
              products.
            </li>
            <li>
              <strong>Process Results:</strong> Convert batch transform output into per-product
              forecast files used by the Forecast page.
            </li>
            <li>
              <strong>Generate Price Scenarios:</strong> Run batch transforms at different price
              points ($80-$120) to pre-compute price what-if scenarios. Results are instantly
              available on the Forecast page without needing a real-time endpoint.
            </li>
          </ol>
          <p className="text-amber-600">
            Note: Training typically takes 1-3 hours. You can navigate away and return later - your
            jobs will appear in the job list.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
