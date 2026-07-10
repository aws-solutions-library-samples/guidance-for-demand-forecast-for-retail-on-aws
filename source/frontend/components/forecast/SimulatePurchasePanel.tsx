'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingUp, DollarSign } from 'lucide-react';
import { useWhatIf } from '@/hooks/useStockProjection';
import type { SimulationResult, ForecastDataPoint } from '@/types';

interface SimulatePurchasePanelProps {
  productId: string;
  productName: string;
  basePrice?: number;
  currentStock?: number;
  onSimulationResult: (result: SimulationResult) => void;
  forecastAvailable?: boolean;
  forecastDates?: string[];
  onPriceWhatIfResult?: (forecasts: ForecastDataPoint[]) => void;
  isPriceLoading?: boolean;
  onRunPriceWhatIf?: (price: number) => void;
}

export function SimulatePurchasePanel({
  productId,
  productName: _,
  basePrice,
  currentStock,
  onSimulationResult,
  forecastAvailable,
  forecastDates,
  onRunPriceWhatIf,
  isPriceLoading,
}: SimulatePurchasePanelProps) {
  const [quantity, setQuantity] = useState<number>(100);
  const [pricePerUnit, setPricePerUnit] = useState<number>(basePrice || 100);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(7);
  const { runSimulation, isLoading } = useWhatIf();

  useEffect(() => {
    if (basePrice) setPricePerUnit(basePrice);
  }, [basePrice, productId]);

  const isPriceWhatIfEnabled = forecastAvailable && forecastDates && forecastDates.length > 0;

  const handleSimulate = async () => {
    const result = await runSimulation({
      itemId: productId,
      purchaseQuantity: quantity,
      leadTimeDays,
      currentStock,
    });
    if (result) onSimulationResult(result);
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            Stock Simulation
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quantity" className="text-xs">
                Order Qty
              </Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="font-mono h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="leadTimeDays" className="text-xs">
                Lead Time
              </Label>
              <Input
                id="leadTimeDays"
                type="number"
                min={1}
                max={90}
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                className="font-mono h-8 text-sm"
              />
            </div>
          </div>
          <Button onClick={handleSimulate} disabled={isLoading} size="sm" className="w-full">
            {isLoading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <TrendingUp className="mr-2 h-3.5 w-3.5" />
            )}
            {isLoading ? 'Simulating...' : 'Simulate'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="w-3.5 h-3.5 text-purple-500" />
            Price What-If
          </div>
          <div>
            <Label htmlFor="pricePerUnit" className="text-xs">
              Price ($)
            </Label>
            <Input
              id="pricePerUnit"
              type="number"
              min={0.01}
              step={0.5}
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(Number(e.target.value))}
              className="font-mono h-8 text-sm"
              disabled={!isPriceWhatIfEnabled}
            />
          </div>
          <Button
            onClick={() => onRunPriceWhatIf?.(pricePerUnit)}
            disabled={isPriceLoading || !isPriceWhatIfEnabled}
            size="sm"
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isPriceLoading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <DollarSign className="mr-2 h-3.5 w-3.5" />
            )}
            {isPriceLoading ? 'Loading...' : 'Run Price Scenario'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
