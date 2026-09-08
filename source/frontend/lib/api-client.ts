// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import type {
  Product,
  ProductsResponse,
  ProductDetailResponse,
  ForecastResponse,
  StockProjectionRequest,
  StockProjectionResponse,
  WhatIfRequest,
  WhatIfResponse,
  StartTrainingRequest,
  TrainingJobResponse,
  TrainingJobStatus,
  CreateModelRequest,
  CreateModelResponse,
  BatchTransformRequest,
  BatchTransformResponse,
  TransformJobStatus,
  ProcessBatchOutputRequest,
  ProcessBatchOutputResponse,
  DeployEndpointRequest,
  DeployEndpointResponse,
  EndpointStatusResponse,
  PriceWhatIfJobResponse,
  PriceWhatIfResultResponse,
  ListTrainingJobsResponse,
  ListEndpointsResponse,
  PipelineStatusResponse,
  GeneratePriceScenariosRequest,
  GeneratePriceScenariosResponse,
  PriceScenarioStatusResponse,
  PriceScenarioResponse,
} from '@/types';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export const DEFAULT_STORE_ID = 'store_001';
export const DEFAULT_CURRENT_STOCK = 100;

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_PRODUCTS: Product[] = [
  {
    itemId: 'wireless-earbuds',
    itemType: 'Audio',
    itemDescription: 'Wireless Earbuds Pro',
    basePrice: 79.99,
    imageKey: 'products/wireless-earbuds.png',
  },
  {
    itemId: 'smart-watch',
    itemType: 'Wearables',
    itemDescription: 'Smart Watch Ultra',
    basePrice: 249.99,
    imageKey: 'products/smart-watch.png',
  },
  {
    itemId: 'bluetooth-speaker',
    itemType: 'Audio',
    itemDescription: 'Portable Bluetooth Speaker',
    basePrice: 49.99,
    imageKey: 'products/bluetooth-speaker.png',
  },
  {
    itemId: 'noise-cancelling-headphones',
    itemType: 'Audio',
    itemDescription: 'Noise Cancelling Headphones',
    basePrice: 199.99,
    imageKey: 'products/noise-cancelling-headphones.png',
  },
  {
    itemId: '4k-webcam',
    itemType: 'Accessories',
    itemDescription: '4K Webcam',
    basePrice: 89.99,
    imageKey: 'products/4k-webcam.png',
  },
  {
    itemId: 'mechanical-keyboard',
    itemType: 'Peripherals',
    itemDescription: 'Mechanical Keyboard RGB',
    basePrice: 129.99,
    imageKey: 'products/mechanical-keyboard.png',
  },
  {
    itemId: 'gaming-mouse',
    itemType: 'Peripherals',
    itemDescription: 'Wireless Gaming Mouse',
    basePrice: 69.99,
    imageKey: 'products/gaming-mouse.png',
  },
  {
    itemId: 'usb-c-hub',
    itemType: 'Accessories',
    itemDescription: 'USB-C Hub 7-in-1',
    basePrice: 39.99,
    imageKey: 'products/usb-c-hub.png',
  },
  {
    itemId: 'portable-ssd',
    itemType: 'Storage',
    itemDescription: 'Portable SSD 1TB',
    basePrice: 89.99,
    imageKey: 'products/portable-ssd.png',
  },
  {
    itemId: 'smart-display',
    itemType: 'Smart Home',
    itemDescription: 'Smart Home Display',
    basePrice: 149.99,
    imageKey: 'products/smart-display.png',
  },
  {
    itemId: 'robot-vacuum',
    itemType: 'Smart Home',
    itemDescription: 'Robot Vacuum',
    basePrice: 299.99,
    imageKey: 'products/robot-vacuum.png',
  },
  {
    itemId: 'action-camera',
    itemType: 'Camera',
    itemDescription: 'Action Camera 4K',
    basePrice: 179.99,
    imageKey: 'products/action-camera.png',
  },
];

function generateMockProjections(
  currentStock: number,
  days: number = 14,
  purchaseArrival?: { day: number; quantity: number },
): StockProjectionResponse['projections'] {
  const projections: StockProjectionResponse['projections'] = [];
  let stock = currentStock;
  const baseDate = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);

    // Random daily demand between 5-15 units
    const demand = Math.floor(Math.random() * 11) + 5;

    // Add purchase arrival if applicable
    if (purchaseArrival && i === purchaseArrival.day) {
      stock += purchaseArrival.quantity;
    }

    // Stock available at start of day, before demand is consumed
    const availableStock = stock;

    stock = Math.max(0, stock - demand);

    projections.push({
      date: date.toISOString().split('T')[0],
      availableStock: Math.max(0, availableStock),
      forecastedDemand: demand,
      projectedStock: stock,
      stockShortage: stock <= 0,
    });
  }

  return projections;
}

// ============================================================================
// Error Handling
// ============================================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isUnauthorizedError(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}

export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && error.status === 404;
}

// ============================================================================
// Auth Token
// ============================================================================

async function getAuthToken(): Promise<string | null> {
  if (MOCK_MODE) {
    return 'mock-token-123';
  }

  try {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

async function buildHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ============================================================================
// Response Parser
// ============================================================================

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(
      response.status,
      response.statusText,
      `API Error: ${response.status} ${response.statusText}`,
      body,
    );
  }
  return response.json() as Promise<T>;
}

// ============================================================================
// API Client Class
// ============================================================================

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers = await buildHeaders();
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return parseResponse<T>(response);
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

// Singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// ============================================================================
// Products API
// ============================================================================

export async function getProducts(): Promise<ProductsResponse> {
  if (MOCK_MODE) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      products: MOCK_PRODUCTS,
      count: MOCK_PRODUCTS.length,
    };
  }
  return apiClient.get<ProductsResponse>('/products');
}

export async function getProduct(itemId: string): Promise<ProductDetailResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const product = MOCK_PRODUCTS.find((p) => p.itemId === itemId);
    if (!product) {
      throw new ApiError(404, 'Not Found', `Product ${itemId} not found`);
    }
    return {
      product,
      salesHistory: [],
    };
  }
  return apiClient.get<ProductDetailResponse>(`/products/${encodeURIComponent(itemId)}`);
}

// ============================================================================
// Forecasts API
// ============================================================================

export async function getForecast(
  itemId: string,
  storeId: string = DEFAULT_STORE_ID,
): Promise<ForecastResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const baseDate = new Date();
    return {
      itemId,
      storeId,
      forecasts: Array.from({ length: 14 }, (_, i) => {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        const base = 10 + Math.random() * 5;
        return {
          timestamp: date.toISOString(),
          p50: Math.round(base),
          p60: Math.round(base * 1.1),
          p70: Math.round(base * 1.2),
          p80: Math.round(base * 1.35),
          p90: Math.round(base * 1.5),
        };
      }),
      generatedAt: new Date().toISOString(),
    };
  }
  const params = new URLSearchParams({ storeId });
  return apiClient.get<ForecastResponse>(
    `/forecasts/${encodeURIComponent(itemId)}?${params.toString()}`,
  );
}

export async function getStockProjection(
  request: StockProjectionRequest,
): Promise<StockProjectionResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const projections = generateMockProjections(
      request.currentStock ?? DEFAULT_CURRENT_STOCK,
      request.forecastDays ?? 14,
    );
    const shortageIndex = projections.findIndex((p) => p.stockShortage);
    return {
      itemId: request.itemId,
      storeId: request.storeId ?? DEFAULT_STORE_ID,
      projections,
      shortageDate: shortageIndex >= 0 ? projections[shortageIndex].date : undefined,
    };
  }
  const payload: StockProjectionRequest = {
    storeId: request.storeId ?? DEFAULT_STORE_ID,
    currentStock: request.currentStock ?? DEFAULT_CURRENT_STOCK,
    itemId: request.itemId,
    forecastDays: request.forecastDays,
  };
  return apiClient.post<StockProjectionResponse>('/forecasts/stock-projection', payload);
}

export async function runWhatIfScenario(request: WhatIfRequest): Promise<WhatIfResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const leadTimeDays = request.purchaseOrders?.[0]?.leadTimeDays ?? 3;
    const quantity = request.purchaseOrders?.[0]?.quantity ?? 50;

    const projections = generateMockProjections(request.currentStock ?? DEFAULT_CURRENT_STOCK, 14, {
      day: leadTimeDays,
      quantity,
    });

    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + leadTimeDays);

    const shortageIndex = projections.findIndex((p) => p.stockShortage);

    return {
      itemId: request.itemId,
      storeId: request.storeId ?? DEFAULT_STORE_ID,
      scenario: {
        purchaseQuantity: quantity,
        purchaseDate: new Date().toISOString().split('T')[0],
        leadTimeDays,
        arrivalDate: arrivalDate.toISOString().split('T')[0],
      },
      projections,
      shortageDate: shortageIndex >= 0 ? projections[shortageIndex].date : undefined,
    };
  }
  const payload: WhatIfRequest = {
    storeId: request.storeId ?? DEFAULT_STORE_ID,
    currentStock: request.currentStock ?? DEFAULT_CURRENT_STOCK,
    itemId: request.itemId,
    purchaseOrders: request.purchaseOrders,
  };
  return apiClient.post<WhatIfResponse>('/forecasts/what-if', payload);
}

// ============================================================================
// Training API
// ============================================================================

export async function startTrainingJob(
  request: StartTrainingRequest,
): Promise<TrainingJobResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const jobName = request.jobName || `retail-forecast-${Date.now()}`;
    return {
      jobName,
      jobArn: `arn:aws:sagemaker:us-east-1:123456789:automl-job/${jobName}`,
      message: 'Mock training job started successfully',
    };
  }
  return apiClient.post<TrainingJobResponse>('/training/start', request);
}

export async function getTrainingJobStatus(jobName: string): Promise<TrainingJobStatus> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      jobName,
      status: 'InProgress',
      secondaryStatus: 'AnalyzingData',
      creationTime: new Date().toISOString(),
    };
  }
  return apiClient.get<TrainingJobStatus>(`/training/${encodeURIComponent(jobName)}`);
}

export async function listTrainingJobs(maxResults?: number): Promise<ListTrainingJobsResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { jobs: [], count: 0 };
  }
  const params = maxResults ? `?maxResults=${maxResults}` : '';
  return apiClient.get<ListTrainingJobsResponse>(`/training${params}`);
}

export async function getPipelineStatus(jobName: string): Promise<PipelineStatusResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      jobName,
      trainingStatus: 'Unknown',
      models: [],
      transformJobs: [],
      endpoints: [],
      resumeStep: 1,
      pipelineComplete: false,
    };
  }
  return apiClient.get<PipelineStatusResponse>(`/training/${encodeURIComponent(jobName)}/pipeline`);
}

export async function createModel(request: CreateModelRequest): Promise<CreateModelResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      modelName: request.modelName || `model-${request.jobName}`,
      message: 'Mock model created successfully',
    };
  }
  return apiClient.post<CreateModelResponse>('/training/create-model', request);
}

// ============================================================================
// Inference API
// ============================================================================

export async function startBatchTransform(
  request: BatchTransformRequest,
): Promise<BatchTransformResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const jobName = request.jobName || `transform-${Date.now()}`;
    return {
      jobName,
      message: 'Mock batch transform job started successfully',
    };
  }
  return apiClient.post<BatchTransformResponse>('/inference/batch', request);
}

export async function getTransformJobStatus(jobName: string): Promise<TransformJobStatus> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      jobName,
      status: 'InProgress',
      creationTime: new Date().toISOString(),
    };
  }
  return apiClient.get<TransformJobStatus>(`/inference/${encodeURIComponent(jobName)}`);
}

// ============================================================================
// Batch Output Processing API
// ============================================================================

export async function processBatchOutput(
  request: ProcessBatchOutputRequest,
): Promise<ProcessBatchOutputResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      message: 'Mock batch output processed successfully',
      jobName: request.jobName,
      outputFiles: 2,
      forecastGroups: 8,
      filesWritten: 8,
    };
  }
  return apiClient.post<ProcessBatchOutputResponse>('/inference/process-output', request);
}

// ============================================================================
// Endpoint Management API
// ============================================================================

export async function deployEndpoint(
  request: DeployEndpointRequest,
): Promise<DeployEndpointResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const endpointName = request.endpointName || `ep-${request.modelName}-${Date.now()}`;
    return {
      endpointName,
      message: 'Mock endpoint deployment started',
    };
  }
  return apiClient.post<DeployEndpointResponse>('/inference/endpoint', request);
}

export async function getEndpointStatus(endpointName: string): Promise<EndpointStatusResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      endpointName,
      status: 'InService',
      message: 'Mock endpoint is in service',
    };
  }
  return apiClient.get<EndpointStatusResponse>(
    `/inference/endpoint/${encodeURIComponent(endpointName)}`,
  );
}

export async function deleteEndpoint(endpointName: string): Promise<{ message: string }> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      message: 'Mock endpoint deleted successfully',
    };
  }
  return apiClient.delete<{ message: string }>(
    `/inference/endpoint/${encodeURIComponent(endpointName)}`,
  );
}

export async function listEndpoints(maxResults?: number): Promise<ListEndpointsResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { endpoints: [], count: 0 };
  }
  const params = maxResults ? `?maxResults=${maxResults}` : '';
  return apiClient.get<ListEndpointsResponse>(`/inference/endpoint${params}`);
}

// ============================================================================
// Price What-If API
// ============================================================================

export async function invokeWhatIfPrice(
  request: Record<string, unknown>,
): Promise<PriceWhatIfJobResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      jobId: `mock-job-${Date.now()}`,
      status: 'RUNNING',
    };
  }
  return apiClient.post<PriceWhatIfJobResponse>('/inference/invoke', request);
}

export async function getInferenceResult(jobId: string): Promise<PriceWhatIfResultResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    // In mock mode, return completed result immediately
    return {
      status: 'COMPLETED',
      itemId: 'mock-item',
      storeId: DEFAULT_STORE_ID,
      forecasts: Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const base = 280 + Math.random() * 40;
        return {
          timestamp: date.toISOString().split('T')[0],
          p50: Math.round(base),
          p60: Math.round(base * 1.1),
          p70: Math.round(base * 1.2),
          p80: Math.round(base * 1.35),
          p90: Math.round(base * 1.5),
        };
      }),
    };
  }
  return apiClient.get<PriceWhatIfResultResponse>(`/inference/invoke/${encodeURIComponent(jobId)}`);
}

// ============================================================================
// Price Scenario API
// ============================================================================

export async function generatePriceScenarios(
  request: GeneratePriceScenariosRequest,
): Promise<GeneratePriceScenariosResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const prices = request.prices || [80, 90, 100, 110, 120];
    return {
      jobs: prices.map((price) => ({
        price,
        jobName: `price-${price}-${request.modelName}-${Date.now()}`,
      })),
      failed: [],
      message: `Started ${prices.length} price scenario batch transforms`,
    };
  }
  return apiClient.post<GeneratePriceScenariosResponse>('/inference/price-scenarios', request);
}

export async function getPriceScenarioStatus(
  jobNames: string[],
): Promise<PriceScenarioStatusResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      jobs: jobNames.map((jobName) => {
        const priceMatch = jobName.match(/^price-(\d+)-/);
        return {
          price: priceMatch ? parseInt(priceMatch[1], 10) : 0,
          jobName,
          status: 'Completed',
        };
      }),
      allComplete: true,
    };
  }
  const params = new URLSearchParams({ jobs: jobNames.join(',') });
  return apiClient.get<PriceScenarioStatusResponse>(
    `/inference/price-scenarios/status?${params.toString()}`,
  );
}

export async function getPriceScenario(
  itemId: string,
  storeId: string,
  price: number,
): Promise<PriceScenarioResponse> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const baseDate = new Date();
    return {
      itemId,
      storeId,
      price,
      interpolated: false,
      forecasts: Array.from({ length: 14 }, (_, i) => {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        const priceFactor = price / 100;
        const base = (10 + Math.random() * 5) / priceFactor;
        return {
          timestamp: date.toISOString().split('T')[0],
          p50: Math.round(base),
          p60: Math.round(base * 1.1),
          p70: Math.round(base * 1.2),
          p80: Math.round(base * 1.35),
          p90: Math.round(base * 1.5),
        };
      }),
    };
  }
  const params = new URLSearchParams({ storeId, price: price.toString() });
  return apiClient.get<PriceScenarioResponse>(
    `/forecasts/${encodeURIComponent(itemId)}/price-scenario?${params.toString()}`,
  );
}

// ============================================================================
// Dataset Upload API (Admin)
// ============================================================================

export async function getDatasetUploadUrl(
  fileName: string,
): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      uploadUrl: 'https://mock-presigned-url.s3.amazonaws.com/upload',
      key: `uploads/zip/mock-user/${Date.now()}-${fileName}`,
      expiresIn: 300,
    };
  }
  return apiClient.post<{ uploadUrl: string; key: string; expiresIn: number }>(
    '/dataset/upload-url',
    { fileName },
  );
}

export async function uploadFileToS3(presignedUrl: string, file: File): Promise<void> {
  if (MOCK_MODE) {
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return;
  }

  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': 'application/zip',
    },
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
}

export async function getDatasetUploadStatus(): Promise<{
  uploads: Array<{
    user: string;
    fileName: string;
    status: string;
    message: string;
    s3Key: string;
    timestamp: string;
  }>;
  count: number;
}> {
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    // Return sample data so the history table is visible in mock mode
    return {
      uploads: [
        {
          user: 'mock-user@example.com',
          fileName: 'sample_sales.zip',
          status: 'valid',
          message: 'Successfully processed 1 CSV file(s). Ready for model training.',
          s3Key: 'data/sales/sample_sales.csv',
          timestamp: new Date(Date.now() - 60000).toISOString(),
        },
        {
          user: 'mock-user@example.com',
          fileName: 'bad_format.zip',
          status: 'invalid',
          message:
            'File sales.csv is missing required fields: store_id, demand. Required: item_id, store_id, ts, demand, price',
          s3Key: '',
          timestamp: new Date(Date.now() - 120000).toISOString(),
        },
        {
          user: 'mock-user@example.com',
          fileName: 'new_data.zip',
          status: 'processing',
          message: 'Unzipping and validating file...',
          s3Key: '',
          timestamp: new Date().toISOString(),
        },
      ],
      count: 3,
    };
  }
  return apiClient.get('/dataset/status');
}

// ============================================================================
// Type Exports
// ============================================================================

export type {
  Product,
  ProductsResponse,
  ProductDetailResponse,
  ForecastResponse,
  StockProjectionRequest,
  StockProjectionResponse,
  WhatIfRequest,
  WhatIfResponse,
};
