// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  itemId: string;
  itemType: string;
  itemDescription: string;
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
}

export interface ForecastData {
  dates: string[];
  stock: number[];
  demand: number[];
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
// Analytics Types
// ============================================================================

export interface EmbedUrlResponse {
  embedUrl: string;
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
  signUp: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export interface UseForecastReturn {
  forecast: ForecastData | null;
  stockAlerts: StockAlert[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
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
