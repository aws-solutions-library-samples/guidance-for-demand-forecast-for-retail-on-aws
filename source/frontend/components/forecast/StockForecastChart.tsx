'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useMemo, useRef, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, LineChart } from 'lucide-react';
import type { ForecastData, ForecastDataPoint, SimulationResult } from '@/types';

interface StockForecastChartProps {
  forecast: ForecastData | null;
  simulation: SimulationResult | null;
  priceWhatIfForecasts?: ForecastDataPoint[] | null;
  isLoading: boolean;
  error: Error | null;
  productName?: string;
  forecastAvailable?: boolean | null;
}

const CHART_COLORS = {
  stock: {
    stroke: 'hsl(217 91% 60%)',
    fill: 'hsl(217 91% 60% / 0.15)',
  },
  demand: {
    stroke: 'hsl(0 84% 60%)',
    fill: 'hsl(0 84% 60% / 0.15)',
  },
  simulated: {
    stroke: 'hsl(142 71% 45%)',
    fill: 'hsl(142 71% 45% / 0.15)',
  },
  priceWhatIf: {
    stroke: 'hsl(280 70% 50%)',
    fill: 'hsl(280 70% 50% / 0.15)',
  },
};

export function StockForecastChart({
  forecast,
  simulation,
  priceWhatIfForecasts,
  isLoading,
  error,
  productName,
  forecastAvailable,
}: StockForecastChartProps) {
  const chartData = useMemo(() => {
    if (!forecast) return [];

    const simByDate = new Map<string, number>();
    if (simulation?.projectedStock && forecast?.dates?.length) {
      const firstParts = forecast.dates[0].split(/[-T ]/);
      const startDate = new Date(
        parseInt(firstParts[0]),
        parseInt(firstParts[1]) - 1,
        parseInt(firstParts[2]),
      );
      simulation.projectedStock.forEach((val: number, i: number) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        simByDate.set(key, val);
      });
    }

    return forecast.dates.map((date, index) => {
      const pricePoint =
        priceWhatIfForecasts?.[index] ??
        priceWhatIfForecasts?.find((f) => {
          try {
            const fDate = new Date(f.timestamp).toISOString().split('T')[0];
            const cDate = new Date(date).toISOString().split('T')[0];
            return fDate === cDate;
          } catch {
            return false;
          }
        });

      const dateParts = date.split(/[-T ]/);
      const dateKey = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;

      return {
        date: (() => {
          const d = new Date(
            parseInt(dateParts[0]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[2]),
          );
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        })(),
        rawDate: date,
        availableStock: forecast.stock[index],
        forecastedDemand: forecast.demand[index],
        demandP70: forecast.demandP70?.[index],
        demandP80: forecast.demandP80?.[index],
        demandP90: forecast.demandP90?.[index],
        simulatedStock: simByDate.get(dateKey),
        priceScenarioDemand: pricePoint?.p50,
      };
    });
  }, [forecast, simulation, priceWhatIfForecasts]);

  const [chartSize, setChartSize] = useState<{ width: number; height: number } | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const chartRef = useCallback((el: HTMLDivElement | null) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setChartSize({ width, height });
    });
    ro.observe(el);
    roRef.current = ro;
  }, []);

  if (isLoading) {
    return (
      <Card className="h-[500px]">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Failed to load forecast data</p>
        </div>
      </Card>
    );
  }

  if (!forecast && forecastAvailable !== false) {
    return (
      <Card className="h-[500px] flex items-center justify-center bg-card">
        <div className="text-center">
          <LineChart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold mb-2">No Product Selected</h3>
          <p className="text-sm text-muted-foreground">
            Select a product to view its stock forecast
          </p>
        </div>
      </Card>
    );
  }

  if (forecastAvailable === false) {
    return (
      <Card className="h-[500px] flex items-center justify-center bg-card">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold mb-2">No Forecast Available</h3>
          <p className="text-sm text-muted-foreground">
            Forecast data is not yet available for this product.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="h-[500px] animate-fade-in-up"
      role="img"
      aria-label="Stock forecast versus demand chart showing projected inventory levels over time"
    >
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <LineChart className="w-5 h-5 text-primary" />
          Stock Forecast vs Demand
          {productName && (
            <span className="text-muted-foreground font-normal text-base">- {productName}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={chartRef} style={{ width: '100%', height: 400 }}>
          {chartSize && (
            <AreaChart
              width={chartSize.width}
              height={chartSize.height}
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.stock.stroke} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.stock.stroke} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.demand.stroke} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.demand.stroke} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="simulatedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.simulated.stroke} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.simulated.stroke} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="priceWhatIfGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.priceWhatIf.stroke} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.priceWhatIf.stroke} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="demandP90Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.demand.stroke} stopOpacity={0.06} />
                  <stop offset="95%" stopColor={CHART_COLORS.demand.stroke} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="demandP80Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.demand.stroke} stopOpacity={0.08} />
                  <stop offset="95%" stopColor={CHART_COLORS.demand.stroke} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="demandP70Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.demand.stroke} stopOpacity={0.1} />
                  <stop offset="95%" stopColor={CHART_COLORS.demand.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="hsl(220 13% 91%)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(220 9% 46%)"
                tickLine={false}
                axisLine={{ stroke: 'hsl(220 13% 91%)' }}
              />
              <YAxis
                tick={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}
                stroke="hsl(220 9% 46%)"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(0 0% 100%)',
                  border: '1px solid hsl(220 13% 91%)',
                  borderRadius: '6px',
                  boxShadow: '0 10px 15px hsl(220 13% 10% / 0.08)',
                  fontFamily: 'var(--font-sans)',
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="line"
                wrapperStyle={{ fontFamily: 'var(--font-sans)', fontSize: 14 }}
              />
              {/* Quantile confidence bands (behind main lines) */}
              {chartData.some((d) => d.demandP90 !== undefined) && (
                <Area
                  type="monotone"
                  dataKey="demandP90"
                  name="Demand p90"
                  stroke="none"
                  fill="url(#demandP90Gradient)"
                  legendType="none"
                />
              )}
              {chartData.some((d) => d.demandP80 !== undefined) && (
                <Area
                  type="monotone"
                  dataKey="demandP80"
                  name="Demand p80"
                  stroke="none"
                  fill="url(#demandP80Gradient)"
                  legendType="none"
                />
              )}
              {chartData.some((d) => d.demandP70 !== undefined) && (
                <Area
                  type="monotone"
                  dataKey="demandP70"
                  name="Demand p70"
                  stroke="none"
                  fill="url(#demandP70Gradient)"
                  legendType="none"
                />
              )}
              <Area
                type="monotone"
                dataKey="availableStock"
                name="Available Stock"
                stroke={CHART_COLORS.stock.stroke}
                strokeWidth={2}
                fill="url(#stockGradient)"
              />
              <Area
                type="monotone"
                dataKey="forecastedDemand"
                name="Forecasted Demand"
                stroke={CHART_COLORS.demand.stroke}
                strokeWidth={2}
                fill="url(#demandGradient)"
              />
              {simulation && (
                <Area
                  type="monotone"
                  dataKey="simulatedStock"
                  name="Simulated Stock"
                  stroke={CHART_COLORS.simulated.stroke}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#simulatedGradient)"
                />
              )}
              {priceWhatIfForecasts && priceWhatIfForecasts.length > 0 && (
                <Area
                  type="monotone"
                  dataKey="priceScenarioDemand"
                  name="Price Scenario Demand"
                  stroke={CHART_COLORS.priceWhatIf.stroke}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#priceWhatIfGradient)"
                />
              )}
              {simulation?.arrivalDate && (
                <ReferenceLine
                  x={(() => {
                    const parts = simulation.arrivalDate.split('-');
                    const d = new Date(
                      parseInt(parts[0]),
                      parseInt(parts[1]) - 1,
                      parseInt(parts[2]),
                    );
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  })()}
                  stroke={CHART_COLORS.simulated.stroke}
                  strokeDasharray="3 3"
                  label={{
                    value: 'Order Arrival',
                    position: 'top',
                    fill: CHART_COLORS.simulated.stroke,
                    fontSize: 12,
                  }}
                />
              )}
            </AreaChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
