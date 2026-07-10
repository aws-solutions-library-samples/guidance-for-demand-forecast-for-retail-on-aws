'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { type ReactNode } from 'react';
import { motion, type Variants, type Easing } from 'motion/react';

const presets = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1 },
  },
  slideUp: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  },
  slideDown: {
    hidden: { opacity: 0, y: -24 },
    visible: { opacity: 1, y: 0 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0 },
  },
} satisfies Record<string, Variants>;

export type MotionPreset = keyof typeof presets;

interface MotionProps {
  children: ReactNode;
  className?: string;
  preset?: MotionPreset;
  delay?: number;
  duration?: number;
  ease?: Easing;
  /** When true, animation is controlled by parent StaggerChildren */
  inherit?: boolean;
}

export function Motion({
  children,
  className,
  preset = 'fadeIn',
  delay = 0,
  duration = 0.5,
  ease = 'easeOut',
  inherit = false,
}: MotionProps) {
  const variants = presets[preset];

  if (inherit) {
    return (
      <motion.div className={className} variants={variants} transition={{ duration, ease }}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-64px' }}
      variants={variants}
      transition={{ delay, duration, ease }}
    >
      {children}
    </motion.div>
  );
}
