'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, LineChart } from 'lucide-react';
import type { ForecastData, SimulationResult } from '@/types';

interface StockForecastChartProps {
  forecast: ForecastData | null;
  simulation: SimulationResult | null;
  isLoading: boolean;
  error: Error | null;
  productName?: string;
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
};

export function StockForecastChart({
  forecast,
  simulation,
  isLoading,
  error,
  productName,
}: StockForecastChartProps) {
  const chartData = useMemo(() => {
    if (!forecast) return [];

    return forecast.dates.map((date, index) => ({
      date: new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      rawDate: date,
      availableStock: forecast.stock[index],
      forecastedDemand: forecast.demand[index],
      simulatedStock: simulation?.projectedStock?.[index],
    }));
  }, [forecast, simulation]);

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
          <p className="text-sm text-muted-foreground">
            Failed to load forecast data
          </p>
        </div>
      </Card>
    );
  }

  if (!forecast) {
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
            <span className="text-muted-foreground font-normal text-base">
              - {productName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
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
            </defs>
            <CartesianGrid
              strokeDasharray="4 4"
              stroke="hsl(220 13% 91%)"
              vertical={false}
            />
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
            {simulation?.arrivalDate && (
              <ReferenceLine
                x={new Date(simulation.arrivalDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
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
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
