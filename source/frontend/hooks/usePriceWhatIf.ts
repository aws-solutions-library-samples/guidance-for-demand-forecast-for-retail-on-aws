'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useCallback } from 'react';
import { invokeWhatIfPrice, listEndpoints, DEFAULT_STORE_ID } from '@/lib/api-client';
import type { ForecastDataPoint, PriceWhatIfRequest } from '@/types';

export interface UsePriceWhatIfReturn {
  priceForecasts: ForecastDataPoint[] | null;
  isLoading: boolean;
  error: Error | null;
  runPriceWhatIf: (request: PriceWhatIfRequest) => Promise<void>;
  clearPriceForecasts: () => void;
}

export function usePriceWhatIf(): UsePriceWhatIfReturn {
  const [priceForecasts, setPriceForecasts] = useState<ForecastDataPoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const runPriceWhatIf = useCallback(async (request: PriceWhatIfRequest) => {
    setIsLoading(true);
    setError(null);
    setPriceForecasts(null);

    try {
      const endpointsResponse = await listEndpoints();
      const activeEndpoint = endpointsResponse.endpoints?.find(
        (ep: { status: string }) => ep.status === 'InService',
      );

      if (!activeEndpoint) {
        throw new Error(
          'No active SageMaker endpoint found. The ML pipeline may still be running.',
        );
      }

      const baseDate = new Date();
      const futurePrices = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i + 1);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return { timestamp: `${y}-${m}-${d} 00:00:00`, price: request.price };
      });

      const result = await invokeWhatIfPrice({
        endpointName: activeEndpoint.endpointName,
        itemId: request.itemId,
        storeId: request.storeId || DEFAULT_STORE_ID,
        futurePrices,
      });

      const data = result as { forecasts?: ForecastDataPoint[]; status?: string };
      if (data.status === 'COMPLETED' || data.forecasts) {
        setPriceForecasts(data.forecasts || null);
      } else {
        throw new Error('Unexpected response from inference endpoint');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get price scenario'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPriceForecasts = useCallback(() => {
    setPriceForecasts(null);
    setError(null);
  }, []);

  return {
    priceForecasts,
    isLoading,
    error,
    runPriceWhatIf,
    clearPriceForecasts,
  };
}
