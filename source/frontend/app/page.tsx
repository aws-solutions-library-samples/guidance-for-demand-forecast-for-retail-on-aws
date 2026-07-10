'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TrendingUp, AlertTriangle, Compass, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ============================================================================
// Step Data
// ============================================================================

interface Step {
  id: number;
  title: string;
  icon?: typeof TrendingUp;
  iconSrc?: string;
  description: string;
}

const STEPS: Step[] = [
  {
    id: 1,
    title: 'Your Sales Data',
    iconSrc: '/icons/aws-s3.svg',
    description:
      'Historical sales data stored in **Amazon S3**.\n\nMinimum required columns:\n• **Item ID** (product identifier)\n• **Timestamp** (date)\n• **Demand** (target to forecast)\n\n**Price** is optional and enables what-if scenarios.',
  },
  {
    id: 2,
    title: 'AutoML Training',
    iconSrc: '/icons/aws-sagemaker.svg',
    description:
      'SageMaker Canvas trains **6 algorithms in parallel** and combines them into a **stacking ensemble**.\n\nOptimized for **Average Weighted Quantile Loss**, the standard metric for probabilistic forecasting.',
  },
  {
    id: 3,
    title: 'Probabilistic Forecasts',
    icon: TrendingUp,
    description:
      'The ensemble outputs **probabilistic forecasts** at multiple quantiles:\n\n• **p10** (optimistic, 10th percentile)\n• **p50** (median prediction)\n• **p90** (conservative, 90th percentile)\n\nThe **p10 to p90 band** represents the confidence range.',
  },
  {
    id: 4,
    title: 'Stock Alerts & What-If',
    icon: AlertTriangle,
    description:
      'Automated detection of:\n\n• **Stockouts** when demand exceeds supply\n• **Overstock** with excess inventory\n• **Demand spikes** from unusual surges\n\nRun **what-if scenarios** to simulate pricing or demand changes.',
  },
  {
    id: 5,
    title: 'Explore Your Forecasts',
    icon: Compass,
    description:
      'Browse your **product catalog**, select any SKU, and view:\n\n• **Demand forecast** with confidence bands\n• **Stock projections** over time\n• **Purchase order simulation** with lead times',
  },
];

const AUTO_ADVANCE_MS = 10000;

// ============================================================================
// Step Content Components
// ============================================================================

function StepDataTable() {
  const rows = [
    {
      item: 'wireless-earbuds',
      name: 'Wireless Earbuds Pro',
      ts: '2026-03-20',
      demand: '156',
      price: '$79.99',
      img: '/products/wireless-earbuds.png',
    },
    {
      item: 'smart-watch',
      name: 'Smart Watch Ultra',
      ts: '2026-03-20',
      demand: '64',
      price: '$249.99',
      img: '/products/smart-watch.png',
    },
    {
      item: 'robot-vacuum',
      name: 'Robot Vacuum',
      ts: '2026-03-21',
      demand: '48',
      price: '$299.99',
      img: '/products/robot-vacuum.png',
    },
    {
      item: 'gaming-mouse',
      name: 'Wireless Gaming Mouse',
      ts: '2026-03-21',
      demand: '138',
      price: '$69.99',
      img: '/products/gaming-mouse.png',
    },
  ];

  return (
    <div className="rounded-2xl border border-white/60 bg-white/40 backdrop-blur-xl shadow-lg shadow-black/5 overflow-hidden flex flex-col">
      <table className="w-full text-sm border-collapse">
        <colgroup>
          <col style={{ width: '34%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '22%' }} />
        </colgroup>
        <thead>
          <tr className="text-xs font-mono uppercase tracking-wider text-foreground-muted bg-white/50">
            <th className="py-4 pl-[96px] text-left">item_id</th>
            <th className="py-4 text-center">timestamp</th>
            <th className="py-4 text-center">demand</th>
            <th className="py-4 pr-10 text-right">price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.35, ease: 'easeOut' }}
              className="border-t border-white/30"
            >
              <td className="py-4 pl-8">
                <div className="flex items-center gap-3">
                  <img
                    src={row.img}
                    alt={row.name}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                  <span className="font-mono text-primary text-xs">{row.item}</span>
                </div>
              </td>
              <td className="py-4 text-foreground-secondary text-center">{row.ts}</td>
              <td className="py-4 font-medium tabular-nums text-center">{row.demand}</td>
              <td className="py-4 pr-10 text-foreground-secondary tabular-nums text-right">
                {row.price}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ALGORITHMS = [
  {
    name: 'CNN-QR',
    type: 'Deep Learning / CNN',
    url: 'https://docs.aws.amazon.com/forecast/latest/dg/aws-forecast-algo-cnnqr.html',
  },
  {
    name: 'DeepAR+',
    type: 'Deep Learning / RNN',
    url: 'https://docs.aws.amazon.com/forecast/latest/dg/aws-forecast-recipe-deeparplus.html',
  },
  {
    name: 'Prophet',
    type: 'Bayesian',
    url: 'https://docs.aws.amazon.com/forecast/latest/dg/aws-forecast-recipe-prophet.html',
  },
  {
    name: 'NPTS',
    type: 'Non-Parametric',
    url: 'https://docs.aws.amazon.com/forecast/latest/dg/aws-forecast-recipe-npts.html',
  },
  {
    name: 'ARIMA',
    type: 'Statistical',
    url: 'https://docs.aws.amazon.com/forecast/latest/dg/aws-forecast-recipe-arima.html',
  },
  {
    name: 'ETS',
    type: 'Statistical',
    url: 'https://docs.aws.amazon.com/forecast/latest/dg/aws-forecast-recipe-ets.html',
  },
];

function StepAutoML({ looping }: { looping: boolean }) {
  const [phase, setPhase] = useState<'grid' | 'fusing' | 'ensemble'>('grid');

  useEffect(() => {
    const fuseDelay = looping ? 8000 : 6000;
    const ensembleDelay = fuseDelay + 1200;

    if (!looping) {
      const t1 = setTimeout(() => setPhase('fusing'), fuseDelay);
      const t2 = setTimeout(() => setPhase('ensemble'), ensembleDelay);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    setPhase('grid');
    const cycle = () => {
      setPhase('grid');
      const t1 = setTimeout(() => setPhase('fusing'), fuseDelay);
      const t2 = setTimeout(() => setPhase('ensemble'), ensembleDelay);
      const t3 = setTimeout(() => setPhase('grid'), ensembleDelay + 8000);
      return [t1, t2, t3];
    };

    let timers = cycle();
    const interval = setInterval(
      () => {
        timers = cycle();
      },
      fuseDelay + 1200 + 8000,
    );

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [looping]);

  return (
    <div className="relative h-full flex flex-col items-center">
      <AnimatePresence mode="wait">
        {phase !== 'ensemble' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-3 gap-4 w-full max-w-lg"
          >
            {ALGORITHMS.map((algo, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              const targetX = (1 - col) * 110;
              const targetY = row === 0 ? 70 : -70;

              return (
                <motion.a
                  key={algo.name}
                  href={phase !== 'fusing' ? algo.url : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 16 }}
                  animate={
                    phase === 'fusing'
                      ? {
                          opacity: 0,
                          scale: 0.15,
                          x: targetX,
                          y: targetY,
                        }
                      : { opacity: 1, y: 0, scale: 1, x: 0 }
                  }
                  transition={
                    phase === 'fusing'
                      ? { duration: 0.9, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }
                      : { delay: i * 0.12, duration: 0.35, ease: 'easeOut' }
                  }
                  className={cn(
                    'rounded-xl border border-white/60 bg-white/40 backdrop-blur-xl shadow-sm py-6 px-6 text-center transition-colors',
                    phase !== 'fusing' && 'cursor-pointer hover:border-primary/40 hover:shadow-md',
                  )}
                >
                  <p className="font-display font-semibold text-sm text-foreground">{algo.name}</p>
                  <p className="text-xs text-foreground-muted mt-1">{algo.type}</p>
                </motion.a>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="ensemble"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center items-start h-full"
          >
            <motion.div
              initial={{ boxShadow: '0 0 0 0 rgba(37, 99, 235, 0)' }}
              animate={{
                boxShadow: ['0 0 40px 8px rgba(37, 99, 235, 0.3)', '0 0 0 0 rgba(37, 99, 235, 0)'],
              }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="rounded-2xl border border-primary/20 bg-white/70 backdrop-blur-xl px-16 py-12 text-center"
            >
              <Image
                src="/icons/aws-sagemaker.svg"
                alt="SageMaker"
                width={48}
                height={48}
                className="mx-auto mb-3 rounded"
              />
              <p className="font-display font-bold text-2xl text-primary">Ensemble Model</p>
              <p className="text-sm text-foreground-muted mt-2">
                6 algorithms combined into a stacking ensemble
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepForecasts() {
  const bands = [
    { label: 'p90', width: '100%', opacity: 0.15 },
    { label: 'p50', width: '72%', opacity: 0.35 },
    { label: 'p10', width: '44%', opacity: 0.15 },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="rounded-2xl border border-white/60 bg-white/40 backdrop-blur-xl p-8 shadow-lg shadow-black/5">
        <svg
          viewBox="-20 -10 440 190"
          className="w-full h-auto"
          aria-label="Forecast confidence bands"
        >
          {[0, 40, 80, 120, 160].map((y) => (
            <line key={`h-${y}`} x1="0" y1={y} x2="400" y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
          ))}
          {[0, 80, 160, 240, 320, 400].map((x) => (
            <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="160" stroke="#e5e7eb" strokeWidth="0.5" />
          ))}
          <text
            x="-6"
            y="80"
            textAnchor="middle"
            className="fill-foreground-muted"
            fontSize="9"
            transform="rotate(-90, -6, 80)"
          >
            Demand
          </text>
          <text x="200" y="178" textAnchor="middle" className="fill-foreground-muted" fontSize="9">
            Days ahead
          </text>
          {/* p90 band */}
          <motion.path
            d="M 20 90 Q 80 85 140 70 Q 200 55 260 50 Q 320 45 380 30"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity={0.3}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
          {/* p50 line */}
          <motion.path
            d="M 20 70 Q 80 68 140 55 Q 200 42 260 38 Q 320 34 380 22"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          />
          {/* p10 band */}
          <motion.path
            d="M 20 50 Q 80 52 140 40 Q 200 28 260 26 Q 320 24 380 14"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity={0.3}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
          />
          {/* Shaded area between p10–p90 */}
          <motion.path
            d="M 20 90 Q 80 85 140 70 Q 200 55 260 50 Q 320 45 380 30 L 380 14 Q 320 24 260 26 Q 200 28 140 40 Q 80 52 20 50 Z"
            fill="hsl(var(--primary))"
            opacity={0.08}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.08 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          />
        </svg>
      </div>

      <div className="flex justify-center gap-4">
        {bands.map((band, i) => (
          <motion.div
            key={band.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.15, duration: 0.3 }}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="w-3 h-1 rounded-full bg-primary"
              style={{ opacity: band.label === 'p50' ? 1 : 0.4 }}
            />
            <span className="text-foreground-muted font-mono">{band.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StepAlerts() {
  const alerts = [
    {
      name: 'Wireless Earbuds Pro',
      img: '/products/wireless-earbuds.png',
      msg: 'will run out in 5 days',
      type: 'destructive' as const,
    },
    {
      name: 'Robot Vacuum',
      img: '/products/robot-vacuum.png',
      msg: 'overstocked by 200 units',
      type: 'warning' as const,
    },
    {
      name: 'Smart Watch Ultra',
      img: '/products/smart-watch.png',
      msg: 'demand spike detected (+40%)',
      type: 'warning' as const,
    },
  ];

  return (
    <div className="space-y-5 h-full flex flex-col">
      <div className="space-y-3">
        {alerts.map((alert, i) => (
          <motion.div
            key={alert.name}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15, duration: 0.35, ease: 'easeOut' }}
            className={cn(
              'rounded-xl border px-6 py-5 flex items-center gap-4 backdrop-blur-xl shadow-sm',
              alert.type === 'destructive'
                ? 'border-destructive/30 bg-destructive/5'
                : 'border-warning/30 bg-warning/5',
            )}
          >
            <img
              src={alert.img}
              alt={alert.name}
              className="w-10 h-10 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{alert.name}</p>
              <p className="text-xs text-foreground-secondary">{alert.msg}</p>
            </div>
            <AlertTriangle
              className={cn(
                'w-5 h-5 shrink-0',
                alert.type === 'destructive' ? 'text-destructive' : 'text-warning',
              )}
            />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="rounded-2xl border border-white/60 bg-white/40 backdrop-blur-xl p-6 shadow-lg shadow-black/5"
      >
        <p className="text-xs text-foreground-muted mb-2.5 font-medium">What-If Scenario</p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-foreground-secondary whitespace-nowrap">Demand</span>
          <div className="flex-1 h-2 rounded-full bg-background-muted relative overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: '50%' }}
              animate={{ width: '70%' }}
              transition={{ delay: 0.9, duration: 0.8, ease: 'easeInOut' }}
            />
          </div>
          <span className="text-sm font-mono font-medium text-primary">+20%</span>
        </div>
      </motion.div>
    </div>
  );
}

function StepExplore() {
  const products = [
    {
      name: 'Wireless Earbuds Pro',
      id: 'wireless-earbuds',
      img: '/products/wireless-earbuds.png',
      demand: '156',
      price: '$79.99',
    },
    {
      name: 'Smart Watch Ultra',
      id: 'smart-watch',
      img: '/products/smart-watch.png',
      demand: '64',
      price: '$249.99',
    },
    {
      name: 'Mechanical Keyboard RGB',
      id: 'mechanical-keyboard',
      img: '/products/mechanical-keyboard.png',
      demand: '98',
      price: '$129.99',
    },
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-white/60 bg-white/40 backdrop-blur-xl p-6 shadow-lg shadow-black/5"
      >
        <div className="grid grid-cols-3 gap-4">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.12, duration: 0.35 }}
              className="rounded-xl bg-white/50 backdrop-blur p-4 text-center"
            >
              <img
                src={product.img}
                alt={product.name}
                className="w-16 h-16 rounded-lg object-cover mx-auto mb-3"
              />
              <p className="text-sm font-medium truncate">{product.name}</p>
              <p className="text-xs text-foreground-muted mt-1">{product.price}</p>
              <p className="text-xs text-primary font-medium mt-1">{product.demand} units/day</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="flex justify-center"
      >
        <Link href="/forecast">
          <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 cursor-pointer">
            Start Exploring
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Step Content Router
// ============================================================================

function StepContent({ stepId, isPaused }: { stepId: number; isPaused: boolean }) {
  switch (stepId) {
    case 1:
      return <StepDataTable />;
    case 2:
      return <StepAutoML looping={isPaused} />;
    case 3:
      return <StepForecasts />;
    case 4:
      return <StepAlerts />;
    case 5:
      return <StepExplore />;
    default:
      return null;
  }
}

// ============================================================================
// Step Indicator
// ============================================================================

function StepIndicator({
  steps,
  activeStep,
  onStepClick,
}: {
  steps: Step[];
  activeStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => {
        const isActive = step.id === activeStep;
        const isCompleted = step.id < activeStep;
        const Icon = step.icon;

        return (
          <div
            key={step.id}
            className={cn('flex items-center', i < steps.length - 1 ? 'flex-1' : '')}
          >
            <button
              onClick={() => onStepClick(step.id)}
              className={cn(
                'relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer shrink-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'w-16 h-16 sm:w-20 sm:h-20 bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : isCompleted
                    ? 'w-14 h-14 sm:w-16 sm:h-16 border-2 border-primary text-primary'
                    : 'w-14 h-14 sm:w-16 sm:h-16 border border-border-emphasis text-foreground-muted hover:border-foreground-subtle',
              )}
              aria-label={`Step ${step.id}: ${step.title}`}
              aria-current={isActive ? 'step' : undefined}
            >
              {step.iconSrc ? (
                <Image
                  src={step.iconSrc}
                  alt={step.title}
                  width={isActive ? 40 : 32}
                  height={isActive ? 40 : 32}
                  className="rounded-sm"
                />
              ) : Icon ? (
                <Icon className={cn(isActive ? 'w-7 h-7' : 'w-6 h-6')} />
              ) : null}
            </button>

            {i < steps.length - 1 && (
              <div className="flex-1 h-px mx-2 relative">
                <div className="absolute inset-0 bg-border" />
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary"
                  initial={false}
                  animate={{ width: isCompleted ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Landing Content
// ============================================================================

function LandingContent() {
  const [activeStep, setActiveStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const goToStep = useCallback(
    (step: number) => {
      if (step < 1 || step > STEPS.length) return;
      setDirection(step > activeStep ? 1 : -1);
      setActiveStep(step);
      setIsPaused(true);
    },
    [activeStep],
  );

  // Auto-advance
  useEffect(() => {
    if (isPaused) {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
      return;
    }

    autoAdvanceRef.current = setInterval(() => {
      setDirection(1);
      setActiveStep((prev) => (prev < STEPS.length ? prev + 1 : 1));
    }, AUTO_ADVANCE_MS);

    return () => {
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
  }, [isPaused]);

  const currentStep = STEPS[activeStep - 1];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 48 : -48,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -48 : 48,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="px-4 sm:px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="pt-8 pb-28"
          >
            <StepIndicator steps={STEPS} activeStep={activeStep} onStepClick={goToStep} />
          </motion.section>

          {/* Step Content — Side-by-side: description left, visual right */}
          <div className="relative min-h-[calc(100vh-220px)]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="w-full flex flex-col lg:flex-row lg:items-start gap-12 h-full"
              >
                <div className="lg:w-[320px] lg:shrink-0">
                  <div className="h-full flex flex-col">
                    <h2 className="font-display text-3xl sm:text-4xl font-semibold mb-4 pb-1 bg-gradient-to-r from-[#1e3a5f] to-[#2563EB] bg-clip-text text-transparent">
                      {currentStep.title}
                    </h2>
                    <div className="text-sm lg:text-base text-foreground-secondary leading-relaxed space-y-3">
                      {currentStep.description.split('\n\n').map((block, i) => {
                        const renderBold = (text: string) =>
                          text.replace(
                            /\*\*(.+?)\*\*/g,
                            '<strong class="text-foreground font-medium underline decoration-foreground/20 underline-offset-2">$1</strong>',
                          );

                        if (block.includes('\n•')) {
                          const lines = block.split('\n').filter(Boolean);
                          return (
                            <ul key={i} className="space-y-1.5 pl-1">
                              {lines.map((line, j) => (
                                <li key={j} className="flex gap-2.5 items-start">
                                  <span className="text-primary text-[8px] shrink-0 leading-none mt-[7px]">
                                    &#9679;
                                  </span>
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: renderBold(line.replace(/^•\s*/, '')),
                                    }}
                                  />
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        if (block.startsWith('•')) {
                          const lines = block.split('\n').filter(Boolean);
                          return (
                            <ul key={i} className="space-y-1.5 pl-1">
                              {lines.map((line, j) => (
                                <li key={j} className="flex gap-2.5 items-start">
                                  <span className="text-primary text-[8px] shrink-0 leading-none mt-[7px]">
                                    &#9679;
                                  </span>
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: renderBold(line.replace(/^•\s*/, '')),
                                    }}
                                  />
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        return (
                          <p key={i} dangerouslySetInnerHTML={{ __html: renderBold(block) }} />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0 h-[360px] [&>*]:h-full">
                  <StepContent stepId={activeStep} isPaused={isPaused} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <LandingContent />
    </ProtectedRoute>
  );
}
