'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWhatIf } from '@/hooks/useStockProjection';
import { Calculator, Loader2, TrendingUp } from 'lucide-react';
import type { SimulationResult } from '@/types';

interface SimulatePurchasePanelProps {
  productId: string;
  productName: string;
  onSimulationResult: (result: SimulationResult) => void;
}

const PURCHASE_DATE_OPTIONS = [
  { value: '0', label: 'Today' },
  { value: '1', label: 'Tomorrow' },
  { value: '2', label: 'In 2 days' },
  { value: '3', label: 'In 3 days' },
  { value: '7', label: 'In 1 week' },
];

export function SimulatePurchasePanel({
  productId,
  productName: _productName,
  onSimulationResult,
}: SimulatePurchasePanelProps) {
  const [quantity, setQuantity] = useState<number>(100);
  const [purchaseDateOffset, setPurchaseDateOffset] = useState<string>('0');
  const [leadTimeDays, setLeadTimeDays] = useState<number>(7);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { runSimulation, isLoading } = useWhatIf();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    if (leadTimeDays < 1 || leadTimeDays > 90) {
      newErrors.leadTimeDays = 'Lead time must be between 1 and 90 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSimulate = async () => {
    if (!validateForm()) return;

    const result = await runSimulation({
      itemId: productId,
      purchaseQuantity: quantity,
      leadTimeDays: leadTimeDays + parseInt(purchaseDateOffset, 10),
    });

    if (result) {
      onSimulationResult(result);
    }
  };

  return (
    <Card className="animate-fade-in-up">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          What-If Scenario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Simulate a purchase order to see projected stock levels
        </p>

        <fieldset disabled={isLoading} className="space-y-4">
          <legend className="sr-only">Purchase order simulation parameters</legend>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-sm font-medium">
              Order Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => {
                setQuantity(Number(e.target.value));
                if (errors.quantity) {
                  setErrors((prev) => ({ ...prev, quantity: '' }));
                }
              }}
              className={`font-mono ${errors.quantity ? 'border-destructive' : ''}`}
              aria-describedby={errors.quantity ? 'quantity-error' : 'quantity-hint'}
            />
            {errors.quantity ? (
              <p id="quantity-error" className="text-xs text-destructive">
                {errors.quantity}
              </p>
            ) : (
              <p id="quantity-hint" className="text-xs text-muted-foreground">
                Units to order
              </p>
            )}
          </div>

          {/* Purchase Date Select */}
          <div className="space-y-2">
            <Label htmlFor="purchaseDate" className="text-sm font-medium">
              Purchase Date
            </Label>
            <Select
              value={purchaseDateOffset}
              onValueChange={setPurchaseDateOffset}
            >
              <SelectTrigger id="purchaseDate">
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {PURCHASE_DATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When to place the order
            </p>
          </div>

          {/* Lead Time Input */}
          <div className="space-y-2">
            <Label htmlFor="leadTimeDays" className="text-sm font-medium">
              Lead Time (days)
            </Label>
            <Input
              id="leadTimeDays"
              type="number"
              min={1}
              max={90}
              value={leadTimeDays}
              onChange={(e) => {
                setLeadTimeDays(Number(e.target.value));
                if (errors.leadTimeDays) {
                  setErrors((prev) => ({ ...prev, leadTimeDays: '' }));
                }
              }}
              className={`font-mono ${errors.leadTimeDays ? 'border-destructive' : ''}`}
              aria-describedby={errors.leadTimeDays ? 'leadTime-error' : 'leadTime-hint'}
            />
            {errors.leadTimeDays ? (
              <p id="leadTime-error" className="text-xs text-destructive">
                {errors.leadTimeDays}
              </p>
            ) : (
              <p id="leadTime-hint" className="text-xs text-muted-foreground">
                Days until delivery (1-90)
              </p>
            )}
          </div>
        </fieldset>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSimulate}
          disabled={isLoading}
          className="w-full"
          aria-disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-4 w-4" />
              Run Simulation
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
