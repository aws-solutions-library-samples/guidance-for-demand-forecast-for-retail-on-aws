'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getForecast, getStockProjection, DEFAULT_STORE_ID, DEFAULT_CURRENT_STOCK } from '@/lib/api-client';
import type { ForecastData, StockAlert, UseForecastReturn, StockProjection } from '@/types';

export function useForecast(itemId: string | null): UseForecastReturn {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [projections, setProjections] = useState<StockProjection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchForecastData = useCallback(async () => {
    if (!itemId) {
      setForecast(null);
      setProjections([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch forecast data
      const forecastResponse = await getForecast(itemId, DEFAULT_STORE_ID);

      // Fetch stock projection
      const projectionResponse = await getStockProjection({
        itemId,
        storeId: DEFAULT_STORE_ID,
        currentStock: DEFAULT_CURRENT_STOCK,
      });

      // Transform forecast data
      const dates = forecastResponse.forecasts.map((f) => f.timestamp);
      const demand = forecastResponse.forecasts.map((f) => f.p50);

      // Calculate stock from projections or simulate
      const stock = projectionResponse.projections.map((p) => p.availableStock);

      setForecast({ dates, stock, demand });
      setProjections(projectionResponse.projections);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch forecast'));
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchForecastData();
  }, [fetchForecastData]);

  // Generate stock alerts from projections
  const stockAlerts = useMemo((): StockAlert[] => {
    const alerts: StockAlert[] = [];

    projections.forEach((projection, index) => {
      if (projection.stockShortage) {
        const isFirst = index === 0 || !projections[index - 1].stockShortage;
        if (isFirst) {
          alerts.push({
            id: `alert-${projection.date}`,
            date: projection.date,
            message: `Stock shortage expected. Projected stock: ${projection.availableStock} units, Forecasted demand: ${projection.forecastedDemand} units.`,
            severity: projection.availableStock < 0 ? 'critical' : 'warning',
          });
        }
      }
    });

    return alerts;
  }, [projections]);

  return {
    forecast,
    stockAlerts,
    isLoading,
    error,
    refetch: fetchForecastData,
  };
}
