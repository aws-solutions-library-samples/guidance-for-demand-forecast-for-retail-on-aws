// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Product/Item types
export interface Product {
  itemId: string;
  itemType: string;
  itemDescription: string;
  basePrice?: number;
  imageKey?: string;
}

// Sales data types
export interface SalesRecord {
  itemId: string;
  storeId: string;
  timestamp: string;
  demand: number;
  price: number;
}

// Forecast types
export interface ForecastDataPoint {
  timestamp: string;
  p50: number;
  p60: number;
  p70: number;
  p80: number;
  p90: number;
}

export interface ForecastResponse {
  itemId: string;
  storeId: string;
  forecasts: ForecastDataPoint[];
  forecastAvailable?: boolean;
}

// Stock projection types
export interface StockProjectionRequest {
  itemId: string;
  storeId: string;
  currentStock: number;
  forecastDays?: number;
}

export interface StockProjection {
  date: string;
  availableStock: number;
  forecastedDemand: number;
  projectedStock: number;
  stockShortage: boolean;
}

export interface StockProjectionResponse {
  itemId: string;
  storeId: string;
  projections: StockProjection[];
  shortageDate?: string;
  forecastAvailable?: boolean;
}

// What-if scenario types
export interface PurchaseOrder {
  quantity: number;
  orderDate: string;
  leadTimeDays: number;
  arrivalDate: string;
}

export interface WhatIfRequest {
  itemId: string;
  storeId: string;
  currentStock: number;
  purchaseOrders: PurchaseOrder[];
  // Legacy flat fields (backward compat)
  purchaseQuantity?: number;
  purchaseDate?: string;
  leadTimeDays?: number;
}

export interface WhatIfProjection {
  date: string;
  availableStock: number;
  forecastedDemand: number;
  projectedStock: number;
  purchaseArrival: number;
  stockShortage: boolean;
}

export interface WhatIfResponse {
  itemId: string;
  scenario: {
    purchaseQuantity: number;
    purchaseDate: string;
    leadTimeDays: number;
    arrivalDate: string;
  };
  projections: WhatIfProjection[];
  shortageDate?: string;
}

// Training job types
export interface StartTrainingRequest {
  jobName?: string;
  inputPrefix?: string;
  forecastFrequency?: 'D' | 'W' | 'M';
  forecastHorizon?: number;
}

export interface TrainingJobResponse {
  jobName: string;
  jobArn?: string;
  message: string;
}

export interface TrainingJobStatus {
  jobName: string;
  status: 'InProgress' | 'Completed' | 'Failed' | 'Stopped';
  secondaryStatus?: string;
  bestCandidate?: {
    candidateName: string;
    finalMetricValue?: {
      metricName: string;
      value: number;
    };
  };
  creationTime?: string;
  endTime?: string;
}

// Create model types
export interface CreateModelRequest {
  jobName: string;
  modelName?: string;
}

export interface CreateModelResponse {
  modelName: string;
  message: string;
}

// Batch transform types
export interface BatchTransformRequest {
  modelName: string;
  inputPrefix?: string;
  jobName?: string;
}

export interface BatchTransformResponse {
  jobName: string;
  message: string;
}

export interface TransformJobStatus {
  jobName: string;
  status: 'InProgress' | 'Completed' | 'Failed' | 'Stopped';
  creationTime?: string;
  endTime?: string;
  outputPath?: string;
}

// Endpoint types
export interface DeployEndpointRequest {
  modelName: string;
  endpointName?: string;
  instanceType?: string;
}

export interface DeployEndpointResponse {
  endpointName: string;
  message: string;
}

export interface EndpointStatusResponse {
  endpointName: string;
  status: string;
  message?: string;
}

// Price what-if types (pre-computed batch scenarios)
export interface PriceWhatIfRequest {
  itemId: string;
  storeId?: string;
  price: number;
}

export interface PriceWhatIfResponse {
  itemId: string;
  storeId: string;
  forecasts: ForecastDataPoint[];
}

// Price scenario types
export interface GeneratePriceScenariosRequest {
  modelName: string;
  prices?: number[];
}

export interface PriceScenarioJob {
  price: number;
  jobName: string;
  status?: string;
}

export interface GeneratePriceScenariosResponse {
  jobs: PriceScenarioJob[];
  message: string;
}

export interface PriceScenarioStatusResponse {
  jobs: PriceScenarioJob[];
  allComplete: boolean;
}

export interface PriceScenarioResponse {
  itemId: string;
  storeId: string;
  price: number;
  interpolated: boolean;
  forecasts: ForecastDataPoint[];
}

// Process batch output types
export interface ProcessBatchOutputRequest {
  jobName: string;
  priceTag?: string;
}

export interface ProcessBatchOutputResponse {
  message: string;
  jobName: string;
  outputFiles: number;
  forecastGroups: number;
  filesWritten: number;
}

// Training job listing types
export interface TrainingJobSummary {
  jobName: string;
  status: string;
  creationTime?: string;
  endTime?: string;
}

export interface ListTrainingJobsResponse {
  jobs: TrainingJobSummary[];
  count: number;
}

// Endpoint listing types
export interface EndpointSummary {
  endpointName: string;
  status: string;
  creationTime?: string;
}

export interface ListEndpointsResponse {
  endpoints: EndpointSummary[];
  count: number;
}

// Pipeline status types
export interface PipelineStatusResponse {
  jobName: string;
  trainingStatus: string;
  bestCandidate?: {
    candidateName: string;
    finalMetricValue?: {
      metricName: string;
      value: number;
    };
  };
  models: { modelName: string }[];
  transformJobs: { jobName: string; status: string }[];
  endpoints: { endpointName: string; status: string }[];
  resumeStep: number;
  pipelineComplete: boolean;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}
