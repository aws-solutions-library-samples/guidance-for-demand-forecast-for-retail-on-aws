'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { type ReactNode } from 'react';
import { motion } from 'motion/react';

interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  delayChildren?: number;
  staggerChildren?: number;
}

export function StaggerChildren({
  children,
  className,
  delayChildren = 0.15,
  staggerChildren = 0.1,
}: StaggerChildrenProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-64px' }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren,
            staggerChildren,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
