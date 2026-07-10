'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Loader2, ChevronDown, Package } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductSelectorProps {
  products: Product[];
  selectedId: string | null;
  onSelect: (productId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ProductSelector({
  products,
  selectedId,
  onSelect,
  isLoading = false,
  disabled = false,
  placeholder = 'Select a product...',
}: ProductSelectorProps) {
  const selectedProduct = products.find((p) => p.itemId === selectedId);

  return (
    <div className="space-y-2">
      <Label
        htmlFor="product-select"
        className="text-sm font-medium flex items-center gap-2"
        id="product-selector-label"
      >
        <Package className="w-4 h-4" />
        Select Product
      </Label>
      <Select value={selectedId ?? ''} onValueChange={onSelect} disabled={disabled || isLoading}>
        <SelectTrigger
          id="product-select"
          className={cn(
            'w-full',
            isLoading && 'opacity-60 cursor-wait',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          aria-labelledby="product-selector-label"
          aria-busy={isLoading}
        >
          <SelectValue placeholder={isLoading ? 'Loading products...' : placeholder}>
            {selectedProduct ? (
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {selectedProduct.itemId}
                </span>
                <span className="truncate">{selectedProduct.itemDescription}</span>
              </span>
            ) : null}
          </SelectValue>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </SelectTrigger>
        <SelectContent>
          {products.map((product) => (
            <SelectItem
              key={product.itemId}
              value={product.itemId}
              className="flex items-center gap-2"
            >
              <div className="flex flex-col">
                <span className="font-medium">{product.itemDescription}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{product.itemId}</span>
                  <span>-</span>
                  <span>{product.itemType}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
