'use client';

import { useState, useCallback, useMemo } from 'react';
import { runWhatIfScenario, DEFAULT_STORE_ID, DEFAULT_CURRENT_STOCK } from '@/lib/api-client';
import type {
  StockProjection,
  StockProjectionRequest,
  WhatIfRequest,
  SimulationResult,
  UseStockProjectionReturn,
  PurchaseOrder,
} from '@/types';

interface WhatIfInput {
  itemId: string;
  purchaseQuantity: number;
  leadTimeDays: number;
}

export function useStockProjection(): UseStockProjectionReturn {
  const [projection, setProjection] = useState<StockProjection[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [shortageDate, setShortageDate] = useState<string | null>(null);

  const getProjection = useCallback(async (_request: StockProjectionRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      // This would call getStockProjection from api-client
      // For now, we'll simulate the response
      setProjection([]);
      setShortageDate(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get projection'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runWhatIf = useCallback(async (input: WhatIfInput): Promise<SimulationResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const today = new Date();
      const arrivalDate = new Date(today);
      arrivalDate.setDate(arrivalDate.getDate() + input.leadTimeDays);

      const purchaseOrder: PurchaseOrder = {
        quantity: input.purchaseQuantity,
        orderDate: today.toISOString().split('T')[0],
        leadTimeDays: input.leadTimeDays,
        arrivalDate: arrivalDate.toISOString().split('T')[0],
      };

      const request: WhatIfRequest = {
        itemId: input.itemId,
        storeId: DEFAULT_STORE_ID,
        currentStock: DEFAULT_CURRENT_STOCK,
        purchaseOrders: [purchaseOrder],
      };

      const response = await runWhatIfScenario(request);

      setProjection(response.projections);
      setShortageDate(response.shortageDate || null);

      return {
        projectedStock: response.projections.map((p) => p.projectedStock),
        arrivalDate: response.scenario.arrivalDate,
        shortageDate: response.shortageDate,
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to run simulation'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearProjection = useCallback(() => {
    setProjection(null);
    setShortageDate(null);
    setError(null);
  }, []);

  const hasShortage = useMemo(() => {
    return projection?.some((p) => p.stockShortage) ?? false;
  }, [projection]);

  const daysUntilShortage = useMemo(() => {
    if (!shortageDate) return null;
    const today = new Date();
    const shortage = new Date(shortageDate);
    const diffTime = shortage.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [shortageDate]);

  return {
    projection,
    isLoading,
    error,
    shortageDate,
    getProjection,
    runWhatIf,
    clearProjection,
    hasShortage,
    daysUntilShortage,
  };
}

export function useWhatIf() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const runSimulation = useCallback(async (input: WhatIfInput): Promise<SimulationResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const today = new Date();
      const arrivalDate = new Date(today);
      arrivalDate.setDate(arrivalDate.getDate() + input.leadTimeDays);

      const purchaseOrder: PurchaseOrder = {
        quantity: input.purchaseQuantity,
        orderDate: today.toISOString().split('T')[0],
        leadTimeDays: input.leadTimeDays,
        arrivalDate: arrivalDate.toISOString().split('T')[0],
      };

      const request: WhatIfRequest = {
        itemId: input.itemId,
        storeId: DEFAULT_STORE_ID,
        currentStock: DEFAULT_CURRENT_STOCK,
        purchaseOrders: [purchaseOrder],
      };

      const response = await runWhatIfScenario(request);

      return {
        projectedStock: response.projections.map((p) => p.projectedStock),
        arrivalDate: response.scenario.arrivalDate,
        shortageDate: response.shortageDate,
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to run simulation'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    runSimulation,
    isLoading,
    error,
  };
}
