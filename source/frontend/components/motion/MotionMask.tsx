'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { type ReactNode } from 'react';
import { motion } from 'motion/react';

type Direction = 'top' | 'bottom' | 'left' | 'right' | 'center';

const clipPaths: Record<Direction, { hidden: string; visible: string }> = {
  top: {
    hidden: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
    visible: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
  },
  bottom: {
    hidden: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
    visible: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
  },
  left: {
    hidden: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
    visible: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
  },
  right: {
    hidden: 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)',
    visible: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
  },
  center: {
    hidden: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)',
    visible: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
  },
};

interface MotionMaskProps {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  duration?: number;
  delay?: number;
}

export function MotionMask({
  children,
  className,
  direction = 'bottom',
  duration = 0.7,
  delay = 0,
}: MotionMaskProps) {
  const paths = clipPaths[direction];

  return (
    <motion.div
      className={className}
      initial={{ clipPath: paths.hidden }}
      whileInView={{ clipPath: paths.visible }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
