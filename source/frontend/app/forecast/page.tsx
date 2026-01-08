'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProductSelector } from '@/components/forecast/ProductSelector';
import { SimulatePurchasePanel } from '@/components/forecast/SimulatePurchasePanel';
import { StockForecastChart } from '@/components/forecast/StockForecastChart';
import { StockAlertBanner } from '@/components/forecast/StockAlertBanner';
import { useProducts } from '@/hooks/useProducts';
import { useForecast } from '@/hooks/useForecast';
import type { SimulationResult } from '@/types';

export const dynamic = 'force-dynamic';

function ForecastContent() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null);

  const { products, isLoading: productsLoading } = useProducts();
  const { forecast, stockAlerts, isLoading: forecastLoading, error } = useForecast(selectedProductId);

  const handleProductChange = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setSimulationData(null);
  }, []);

  const handleSimulationResult = useCallback((result: SimulationResult) => {
    setSimulationData(result);
  }, []);

  const selectedProduct = products?.find((p) => p.itemId === selectedProductId);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-card">
          <div className="p-6 space-y-6">
            {/* Product Selector */}
            <ProductSelector
              products={products || []}
              selectedId={selectedProductId}
              onSelect={handleProductChange}
              isLoading={productsLoading}
            />

            {/* Simulate Purchase Panel */}
            {selectedProductId && (
              <SimulatePurchasePanel
                productId={selectedProductId}
                productName={selectedProduct?.itemDescription || ''}
                onSimulationResult={handleSimulationResult}
              />
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 min-w-0">
          {/* Stock Alert Banner */}
          {stockAlerts && stockAlerts.length > 0 && (
            <StockAlertBanner
              alerts={stockAlerts}
              className="mb-6"
            />
          )}

          {/* Forecast Chart */}
          <StockForecastChart
            forecast={forecast}
            simulation={simulationData}
            isLoading={forecastLoading}
            error={error}
            productName={selectedProduct?.itemDescription}
          />
        </main>
      </div>
    </div>
  );
}

export default function ForecastPage() {
  return (
    <ProtectedRoute>
      <ForecastContent />
    </ProtectedRoute>
  );
}
