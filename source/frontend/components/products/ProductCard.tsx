'use client';

import { forwardRef } from 'react';
import { Check, Package, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import type { Product } from '@/types';

const productCardVariants = cva(
  'rounded-lg border p-6 transition-all duration-200',
  {
    variants: {
      state: {
        default: 'border-border bg-card hover:border-border hover:shadow-md',
        selected: 'border-primary bg-primary-muted ring-2 ring-primary/20',
      },
      interactive: {
        true: 'cursor-pointer hover-lift',
        false: '',
      },
    },
    defaultVariants: {
      state: 'default',
      interactive: false,
    },
  }
);

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  selected?: boolean;
  showActions?: boolean;
}

export const ProductCard = forwardRef<HTMLDivElement, ProductCardProps>(
  ({ product, onSelect, selected = false, showActions: _showActions = false }, ref) => {
    const isInteractive = !!onSelect;

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onSelect?.(product);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          productCardVariants({
            state: selected ? 'selected' : 'default',
            interactive: isInteractive,
          }),
          'group'
        )}
        onClick={() => onSelect?.(product)}
        onKeyDown={handleKeyDown}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? 'button' : undefined}
        aria-pressed={isInteractive ? selected : undefined}
        aria-label={`Product: ${product.itemDescription}`}
      >
        <div className="flex items-start justify-between mb-3">
          <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {product.itemId}
          </span>
          {selected && (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          {!selected && isInteractive && (
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          )}
        </div>

        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {product.itemType}
        </p>

        <h3 className="text-base text-foreground font-medium mt-2 group-hover:text-primary transition-colors">
          {product.itemDescription}
        </h3>
      </div>
    );
  }
);

ProductCard.displayName = 'ProductCard';

// Simple product card for grid display
interface SimpleProductCardProps {
  product: Product;
  onClick?: () => void;
}

export function SimpleProductCard({ product, onClick }: SimpleProductCardProps) {
  return (
    <Card
      className="hover-lift cursor-pointer group"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardContent className="p-4">
        {/* Product Image Placeholder */}
        <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center overflow-hidden">
          <Package className="w-12 h-12 text-muted-foreground" />
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {product.itemDescription}
            </h3>
            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {product.itemId}
            </span>
            <span className="text-xs text-muted-foreground">-</span>
            <span className="text-xs text-muted-foreground">{product.itemType}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
