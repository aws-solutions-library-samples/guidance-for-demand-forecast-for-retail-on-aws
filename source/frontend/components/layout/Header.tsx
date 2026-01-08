'use client';

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
import { LogOut, User, Settings, LineChart, Package, BarChart3 } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuthContext();

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <header className="bg-card sticky top-0 z-header border-b border-border h-16 md:h-20 lg:h-24 xl:h-28 2xl:h-32">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16 h-full flex items-center justify-between">
        {/* Logo + Navigation grouped together on the left */}
        <div className="flex items-center gap-4 md:gap-6 lg:gap-8 xl:gap-10 2xl:gap-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 md:gap-3 lg:gap-4">
            <div className="w-9 h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-16 2xl:h-16 bg-primary rounded-lg flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">RF</span>
            </div>
            <span className="font-display font-semibold text-lg md:text-xl lg:text-2xl xl:text-2xl 2xl:text-3xl hidden sm:block">
              Retail Forecast
            </span>
          </Link>

          {/* Navigation - now next to logo */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 xl:gap-4 2xl:gap-6">
            <Link href="/forecast">
              <Button variant="ghost" size="lg" className="gap-2 lg:gap-3 px-3 lg:px-5 xl:px-6 2xl:px-8 text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl h-9 md:h-10 lg:h-12 xl:h-14 2xl:h-16">
                <LineChart className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8" />
                Forecast
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="ghost" size="lg" className="gap-2 lg:gap-3 px-3 lg:px-5 xl:px-6 2xl:px-8 text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl h-9 md:h-10 lg:h-12 xl:h-14 2xl:h-16">
                <Package className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8" />
                Products
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="ghost" size="lg" className="gap-2 lg:gap-3 px-3 lg:px-5 xl:px-6 2xl:px-8 text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl h-9 md:h-10 lg:h-12 xl:h-14 2xl:h-16">
                <BarChart3 className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8" />
                Analytics
              </Button>
            </Link>
          </nav>
        </div>

        {/* User Menu - stays on the right */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 md:h-11 md:w-11 lg:h-14 lg:w-14 xl:h-16 xl:w-16 2xl:h-20 2xl:w-20 rounded-full p-0">
              <div className="h-10 w-10 md:h-11 md:w-11 lg:h-14 lg:w-14 xl:h-16 xl:w-16 2xl:h-20 2xl:w-20 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-medium text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl">{initials}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 lg:w-64 xl:w-72 2xl:w-80">
            <div className="flex items-center gap-3 p-3 xl:p-4 2xl:p-5">
              <div className="h-10 w-10 xl:h-12 xl:w-12 2xl:h-14 2xl:w-14 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm xl:text-base 2xl:text-lg font-medium">{initials}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm lg:text-base xl:text-lg 2xl:text-xl font-medium">{user?.name || 'User'}</span>
                <span className="text-xs lg:text-sm xl:text-base 2xl:text-lg text-muted-foreground">{user?.email}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="py-2 lg:py-3 xl:py-4 2xl:py-5 text-sm lg:text-base xl:text-lg 2xl:text-xl">
              <User className="mr-2 h-4 w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2 lg:py-3 xl:py-4 2xl:py-5 text-sm lg:text-base xl:text-lg 2xl:text-xl">
              <Settings className="mr-2 h-4 w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive py-2 lg:py-3 xl:py-4 2xl:py-5 text-sm lg:text-base xl:text-lg 2xl:text-xl">
              <LogOut className="mr-2 h-4 w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
