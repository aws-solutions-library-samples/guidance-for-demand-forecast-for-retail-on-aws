import type {
  Product,
  ProductsResponse,
  ProductDetailResponse,
  ForecastResponse,
  StockProjectionRequest,
  StockProjectionResponse,
  WhatIfRequest,
  WhatIfResponse,
  EmbedUrlResponse,
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
  { itemId: 'SKU-001', itemType: 'Electronics', itemDescription: 'Wireless Bluetooth Headphones' },
  { itemId: 'SKU-002', itemType: 'Electronics', itemDescription: 'USB-C Charging Cable 2m' },
  { itemId: 'SKU-003', itemType: 'Home', itemDescription: 'LED Desk Lamp with Dimmer' },
  { itemId: 'SKU-004', itemType: 'Office', itemDescription: 'Ergonomic Mouse Pad' },
  { itemId: 'SKU-005', itemType: 'Electronics', itemDescription: 'Portable Power Bank 10000mAh' },
  { itemId: 'SKU-006', itemType: 'Home', itemDescription: 'Smart WiFi Plug' },
  { itemId: 'SKU-007', itemType: 'Office', itemDescription: 'Mechanical Keyboard' },
  { itemId: 'SKU-008', itemType: 'Electronics', itemDescription: '4K HDMI Cable 3m' },
];

function generateMockProjections(
  currentStock: number,
  days: number = 14,
  purchaseArrival?: { day: number; quantity: number }
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

    stock = Math.max(0, stock - demand);

    projections.push({
      date: date.toISOString().split('T')[0],
      availableStock: Math.max(0, stock + demand), // Stock at start of day
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
    public body?: unknown
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
      body
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

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
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
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      products: MOCK_PRODUCTS,
      count: MOCK_PRODUCTS.length,
    };
  }
  return apiClient.get<ProductsResponse>('/products');
}

export async function getProduct(itemId: string): Promise<ProductDetailResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const product = MOCK_PRODUCTS.find(p => p.itemId === itemId);
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
  storeId: string = DEFAULT_STORE_ID
): Promise<ForecastResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 300));
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
    `/forecasts/${encodeURIComponent(itemId)}?${params.toString()}`
  );
}

export async function getStockProjection(
  request: StockProjectionRequest
): Promise<StockProjectionResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const projections = generateMockProjections(
      request.currentStock ?? DEFAULT_CURRENT_STOCK,
      request.forecastDays ?? 14
    );
    const shortageIndex = projections.findIndex(p => p.stockShortage);
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
  return apiClient.post<StockProjectionResponse>(
    '/forecasts/stock-projection',
    payload
  );
}

export async function runWhatIfScenario(
  request: WhatIfRequest
): Promise<WhatIfResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const leadTimeDays = request.purchaseOrders?.[0]?.leadTimeDays ?? 3;
    const quantity = request.purchaseOrders?.[0]?.quantity ?? 50;

    const projections = generateMockProjections(
      request.currentStock ?? DEFAULT_CURRENT_STOCK,
      14,
      { day: leadTimeDays, quantity }
    );

    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + leadTimeDays);

    const shortageIndex = projections.findIndex(p => p.stockShortage);

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
// Analytics API
// ============================================================================

export async function getQuickSightEmbedUrl(): Promise<EmbedUrlResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      embedUrl: 'https://example.com/quicksight-embed-placeholder',
    };
  }
  return apiClient.get<EmbedUrlResponse>('/analytics/embed-url');
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
  EmbedUrlResponse,
};
