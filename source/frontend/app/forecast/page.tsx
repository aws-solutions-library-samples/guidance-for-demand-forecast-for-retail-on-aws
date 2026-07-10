'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SimulatePurchasePanel } from '@/components/forecast/SimulatePurchasePanel';
import { StockForecastChart } from '@/components/forecast/StockForecastChart';
import { StockAlertBanner } from '@/components/forecast/StockAlertBanner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useProducts } from '@/hooks/useProducts';
import { useForecast } from '@/hooks/useForecast';
import { usePriceWhatIf } from '@/hooks/usePriceWhatIf';
import { DEFAULT_STORE_ID } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Search, Package, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { SimulationResult } from '@/types';

function ForecastContent() {
  const searchParams = useSearchParams();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null);
  const [currentStock, setCurrentStock] = useState<number>(500);
  const [searchTerm, setSearchTerm] = useState('');
  const forecastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const productParam = searchParams.get('product');
    if (productParam && !selectedProductId) {
      setSelectedProductId(productParam);
    }
  }, [searchParams, selectedProductId]);

  const { products, isLoading: productsLoading, error: productsError } = useProducts();
  const {
    forecast,
    stockAlerts,
    isLoading: forecastLoading,
    error,
    forecastAvailable,
  } = useForecast(selectedProductId, currentStock);
  const {
    priceForecasts,
    isLoading: priceLoading,
    runPriceWhatIf,
    clearPriceForecasts,
  } = usePriceWhatIf();

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.itemDescription.toLowerCase().includes(term) ||
        p.itemId.toLowerCase().includes(term) ||
        p.itemType.toLowerCase().includes(term),
    );
  }, [products, searchTerm]);

  const handleProductSelect = useCallback(
    (productId: string) => {
      setSelectedProductId(productId);
      setSimulationData(null);
      clearPriceForecasts();
      setTimeout(() => {
        forecastRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    },
    [clearPriceForecasts],
  );

  const handleSimulationResult = useCallback((result: SimulationResult) => {
    setSimulationData(result);
  }, []);

  const handleRunPriceWhatIf = useCallback(
    (price: number) => {
      if (!selectedProductId || !forecast) return;
      runPriceWhatIf({
        itemId: selectedProductId,
        storeId: DEFAULT_STORE_ID,
        price,
      });
    },
    [selectedProductId, forecast, runPriceWhatIf],
  );

  const selectedProduct = products?.find((p) => p.itemId === selectedProductId);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold">Explore</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {productsLoading
                ? 'Loading...'
                : `${filteredProducts.length} products \u2014 select one to view forecast`}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {productsLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {productsError && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h3 className="font-display text-lg font-semibold mb-1">Failed to load products</h3>
            <p className="text-sm text-muted-foreground">
              {productsError.message || 'An error occurred while fetching products'}
            </p>
          </div>
        )}

        {!productsLoading && !productsError && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display text-lg font-semibold mb-1">No products found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Try adjusting your search' : 'No products in catalog'}
            </p>
          </div>
        )}

        {!productsLoading && !productsError && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredProducts.map((product) => {
              const isSelected = product.itemId === selectedProductId;
              return (
                <button
                  key={product.itemId}
                  onClick={() => handleProductSelect(product.itemId)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer group',
                    'hover-lift',
                    isSelected
                      ? 'border-primary bg-primary-muted ring-2 ring-primary/20'
                      : 'border-border/50 bg-card/50 hover:border-border',
                  )}
                  aria-pressed={isSelected}
                  aria-label={`Product: ${product.itemDescription}`}
                >
                  <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                    {product.imageKey ? (
                      <img
                        src={`/${product.imageKey}`}
                        alt={product.itemDescription}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[80%]">
                      {product.itemId}
                    </span>
                    {isSelected && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground shrink-0">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {product.itemType}
                  </p>
                  <h3
                    className={cn(
                      'text-sm font-medium mt-1 line-clamp-2 transition-colors',
                      isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary',
                    )}
                  >
                    {product.itemDescription}
                  </h3>
                </button>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {selectedProductId && (
            <motion.div
              ref={forecastRef}
              key="forecast-panel"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mt-8 border-t border-border/30 pt-6"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 min-w-0 space-y-6">
                  {stockAlerts && stockAlerts.length > 0 && (
                    <StockAlertBanner alerts={stockAlerts} />
                  )}

                  <StockForecastChart
                    forecast={forecast}
                    simulation={simulationData}
                    priceWhatIfForecasts={priceForecasts}
                    isLoading={forecastLoading}
                    error={error}
                    productName={selectedProduct?.itemDescription}
                    forecastAvailable={forecastAvailable}
                  />
                </div>

                {selectedProductId && forecastAvailable !== false && (
                  <div className="w-full lg:w-80 shrink-0 flex flex-col">
                    <div className="space-y-2 mb-4">
                      <label htmlFor="currentStock" className="text-sm font-medium text-foreground">
                        Current Stock Level
                      </label>
                      <input
                        id="currentStock"
                        type="number"
                        min={0}
                        value={currentStock}
                        onChange={(e) => setCurrentStock(Math.max(0, Number(e.target.value)))}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>

                    <SimulatePurchasePanel
                      productId={selectedProductId}
                      productName={selectedProduct?.itemDescription || ''}
                      basePrice={selectedProduct?.basePrice}
                      currentStock={currentStock}
                      onSimulationResult={handleSimulationResult}
                      forecastAvailable={forecastAvailable ?? false}
                      forecastDates={forecast?.dates}
                      onRunPriceWhatIf={handleRunPriceWhatIf}
                      isPriceLoading={priceLoading}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
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
