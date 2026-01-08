// Product/Item types
export interface Product {
  itemId: string;
  itemType: string;
  itemDescription: string;
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
  stockShortage: boolean;
}

export interface StockProjectionResponse {
  itemId: string;
  storeId: string;
  projections: StockProjection[];
  shortageDate?: string;
}

// What-if scenario types
export interface WhatIfRequest {
  itemId: string;
  storeId: string;
  currentStock: number;
  purchaseQuantity: number;
  purchaseDate: string;
  leadTimeDays: number;
}

export interface WhatIfProjection {
  date: string;
  availableStock: number;
  forecastedDemand: number;
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

// Analytics types
export interface EmbedUrlResponse {
  embedUrl: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}
