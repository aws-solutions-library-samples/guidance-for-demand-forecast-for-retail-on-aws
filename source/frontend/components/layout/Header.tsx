'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import Link from 'next/link';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuthContext();

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';

  return (
    <header className="bg-background/90 backdrop-blur-md sticky top-0 z-header border-b border-border h-16 md:h-20 lg:h-24 xl:h-28 2xl:h-32">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16 h-full flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6 lg:gap-8 xl:gap-10 2xl:gap-14">
          <div className="flex flex-col items-center">
            <Link href="/" className="flex items-center">
              <span className="font-display font-semibold text-lg md:text-xl lg:text-2xl xl:text-2xl 2xl:text-3xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-transparent">
                Demand Forecasting
              </span>
            </Link>
            <a
              href="https://aws.amazon.com/sagemaker/ai/canvas/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] md:text-[11px] text-gray-400 hover:text-gray-500 transition-colors tracking-wide -mt-0.5"
            >
              Powered by Amazon SageMaker Canvas
            </a>
          </div>

          <nav className="hidden md:flex items-center">
            <Button
              variant="ghost"
              size="lg"
              asChild
              className="px-4 lg:px-6 xl:px-7 2xl:px-9 font-display font-semibold text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl h-10 md:h-12 lg:h-14 xl:h-16 2xl:h-18 hover:bg-primary/10 hover:text-primary"
            >
              <Link href="/forecast">Explore</Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              asChild
              className="px-4 lg:px-6 xl:px-7 2xl:px-9 font-display font-semibold text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl h-10 md:h-12 lg:h-14 xl:h-16 2xl:h-18 hover:bg-primary/10 hover:text-primary"
            >
              <Link href="/admin">Admin</Link>
            </Button>
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 xl:h-11 xl:w-11 2xl:h-12 2xl:w-12 rounded-full p-0"
            >
              <div className="h-8 w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 xl:h-11 xl:w-11 2xl:h-12 2xl:w-12 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-medium text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
                  {initials}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 lg:w-64 xl:w-72 2xl:w-80 z-[400]">
            <div className="px-3 py-3 xl:px-4 xl:py-3 2xl:px-5 2xl:py-4">
              <p className="text-sm lg:text-base xl:text-lg 2xl:text-xl text-foreground truncate">
                {user?.email || 'No email'}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive py-2 lg:py-3 xl:py-4 2xl:py-5 text-sm lg:text-base xl:text-lg 2xl:text-xl"
            >
              <LogOut className="mr-2 h-4 w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
