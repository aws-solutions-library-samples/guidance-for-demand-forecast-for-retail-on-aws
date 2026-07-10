// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  itemId: string;
  itemType: string;
  itemDescription: string;
  basePrice?: number;
  imageKey?: string;
}

export interface SalesRecord {
  ts: string;
  demand: number;
  price: number;
}

export interface ProductsResponse {
  products: Product[];
  count: number;
}

export interface ProductDetailResponse {
  product: Product;
  salesHistory: SalesRecord[];
}

// ============================================================================
// Forecast Types
// ============================================================================

export interface ForecastDataPoint {
  timestamp: string;
  p50: number;
  p60?: number;
  p70?: number;
  p80?: number;
  p90: number;
}

export interface ForecastResponse {
  itemId: string;
  storeId: string;
  forecastHorizon?: number;
  forecasts: ForecastDataPoint[];
  generatedAt?: string;
  forecastAvailable?: boolean;
}

export interface ForecastData {
  dates: string[];
  stock: number[];
  demand: number[];
  demandP60?: number[];
  demandP70?: number[];
  demandP80?: number[];
  demandP90?: number[];
}

// ============================================================================
// Stock Projection Types
// ============================================================================

export interface StockProjection {
  date: string;
  forecastedDemand: number;
  availableStock: number;
  projectedStock: number;
  stockShortage: boolean;
}

export interface StockProjectionRequest {
  itemId: string;
  storeId?: string;
  currentStock: number;
  forecastDays?: number;
}

export interface StockProjectionResponse {
  itemId: string;
  storeId: string;
  projections: StockProjection[];
  shortageDate?: string;
  forecastAvailable?: boolean;
}

// ============================================================================
// What-If Scenario Types
// ============================================================================

export interface PurchaseOrder {
  quantity: number;
  orderDate: string;
  leadTimeDays: number;
  arrivalDate: string;
}

export interface WhatIfRequest {
  itemId: string;
  storeId?: string;
  currentStock: number;
  purchaseOrders: PurchaseOrder[];
}

export interface WhatIfProjection extends StockProjection {
  purchaseArrival: number;
}

export interface WhatIfResponse {
  itemId: string;
  storeId: string;
  scenario: {
    purchaseQuantity: number;
    purchaseDate: string;
    leadTimeDays: number;
    arrivalDate: string;
  };
  projections: StockProjection[];
  shortageDate?: string;
}

export interface SimulationResult {
  projectedStock: number[];
  arrivalDate: string;
  shortageDate?: string;
}

// ============================================================================
// Training Types
// ============================================================================

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
  status: 'InProgress' | 'Completed' | 'Failed' | 'Stopped' | 'Unknown';
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

export interface CreateModelRequest {
  jobName: string;
  modelName?: string;
}

export interface CreateModelResponse {
  modelName: string;
  message: string;
}

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
  status: 'InProgress' | 'Completed' | 'Failed' | 'Stopped' | 'Unknown';
  creationTime?: string;
  endTime?: string;
  outputPath?: string;
}

// ============================================================================
// Training Job Listing Types
// ============================================================================

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

// ============================================================================
// Endpoint Listing Types
// ============================================================================

export interface EndpointSummary {
  endpointName: string;
  status: string;
  creationTime?: string;
}

export interface ListEndpointsResponse {
  endpoints: EndpointSummary[];
  count: number;
}

// ============================================================================
// Pipeline Status Types
// ============================================================================

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

// ============================================================================
// Batch Output Processing Types
// ============================================================================

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

// ============================================================================
// Endpoint Management Types
// ============================================================================

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
  status: 'Creating' | 'InService' | 'Deleting' | 'Failed' | 'OutOfService' | 'Unknown';
  message?: string;
}

// ============================================================================
// Price What-If Types
// ============================================================================

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

export interface PriceWhatIfJobResponse {
  jobId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
}

export interface PriceWhatIfResultResponse {
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  itemId?: string;
  storeId?: string;
  forecasts?: ForecastDataPoint[];
  error?: string;
}

// ============================================================================
// Price Scenario Types
// ============================================================================

export interface GeneratePriceScenariosRequest {
  modelName: string;
  prices?: number[];
}

export interface PriceScenarioJob {
  price: number;
  jobName: string;
  status?: string;
}

export interface FailedPriceScenarioJob {
  price: number;
  error: string;
}

export interface GeneratePriceScenariosResponse {
  jobs: PriceScenarioJob[];
  failed?: FailedPriceScenarioJob[];
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

// ============================================================================
// Auth Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  groups: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: AuthError | null;
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiError {
  status: number;
  statusText: string;
  message: string;
  body?: unknown;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// UI Types
// ============================================================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface LegendItem {
  color: string;
  label: string;
  value?: number;
}

export interface StockAlert {
  id: string;
  date: string;
  message: string;
  severity: 'warning' | 'critical';
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: AuthError | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignupData) => Promise<{ isConfirmed: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendSignUpCode: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export interface UseForecastReturn {
  forecast: ForecastData | null;
  stockAlerts: StockAlert[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  forecastAvailable: boolean | null;
}

export interface WhatIfInput {
  itemId: string;
  purchaseQuantity: number;
  leadTimeDays: number;
}

export interface UseStockProjectionReturn {
  projection: StockProjection[] | null;
  isLoading: boolean;
  error: Error | null;
  shortageDate: string | null;
  getProjection: (request: StockProjectionRequest) => Promise<void>;
  runWhatIf: (input: WhatIfInput) => Promise<SimulationResult | null>;
  clearProjection: () => void;
  hasShortage: boolean;
  daysUntilShortage: number | null;
}

export interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
