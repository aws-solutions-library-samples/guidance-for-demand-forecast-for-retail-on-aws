'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  id?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    { id, min = 0, max = 100, step = 1, value, defaultValue, onValueChange, disabled, className },
    ref,
  ) => {
    const currentValue = value?.[0] ?? defaultValue?.[0] ?? min;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      onValueChange?.([newValue]);
    };

    const percentage = ((currentValue - min) / (max - min)) * 100;

    return (
      <div className={cn('relative flex w-full touch-none select-none items-center', className)}>
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <div className="absolute h-full bg-primary" style={{ width: `${percentage}%` }} />
        </div>
        <input
          ref={ref}
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'absolute inset-0 h-full w-full cursor-pointer opacity-0',
            disabled && 'cursor-not-allowed',
          )}
        />
        <div
          className="absolute h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    );
  },
);
Slider.displayName = 'Slider';

export { Slider };
