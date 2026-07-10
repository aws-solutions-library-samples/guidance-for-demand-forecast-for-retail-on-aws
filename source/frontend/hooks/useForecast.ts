'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getForecast, getStockProjection, DEFAULT_STORE_ID } from '@/lib/api-client';
import type { ForecastData, StockAlert, UseForecastReturn, StockProjection } from '@/types';

const DEFAULT_STOCK = 100;

export function useForecast(
  itemId: string | null,
  currentStock: number = DEFAULT_STOCK,
): UseForecastReturn {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [projections, setProjections] = useState<StockProjection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [forecastAvailable, setForecastAvailable] = useState<boolean | null>(null);

  const fetchForecastData = useCallback(async () => {
    if (!itemId) {
      setForecast(null);
      setProjections([]);
      setForecastAvailable(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch forecast data
      const forecastResponse = await getForecast(itemId, DEFAULT_STORE_ID);

      // Check if forecast data is available
      if (forecastResponse.forecastAvailable === false || forecastResponse.forecasts.length === 0) {
        setForecastAvailable(false);
        setForecast(null);
        setProjections([]);
        setIsLoading(false);
        return;
      }

      setForecastAvailable(true);

      // Fetch stock projection
      const projectionResponse = await getStockProjection({
        itemId,
        storeId: DEFAULT_STORE_ID,
        currentStock,
      });

      // Transform forecast data with all quantiles
      const dates = forecastResponse.forecasts.map((f) => f.timestamp);
      const demand = forecastResponse.forecasts.map((f) => f.p50);
      const demandP60 = forecastResponse.forecasts.map((f) => f.p60 ?? f.p50);
      const demandP70 = forecastResponse.forecasts.map((f) => f.p70 ?? f.p50);
      const demandP80 = forecastResponse.forecasts.map((f) => f.p80 ?? f.p50);
      const demandP90 = forecastResponse.forecasts.map((f) => f.p90);

      // Calculate stock from projections
      const stock = projectionResponse.projections.map((p) => p.availableStock);

      setForecast({ dates, stock, demand, demandP60, demandP70, demandP80, demandP90 });
      setProjections(projectionResponse.projections);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch forecast'));
    } finally {
      setIsLoading(false);
    }
  }, [itemId, currentStock]);

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
    forecastAvailable,
  };
}
