'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LineChart, Package, BarChart3, ArrowRight, TrendingUp, AlertTriangle } from 'lucide-react';

const navItems = [
  {
    href: '/forecast',
    title: 'Stock Forecast',
    description: 'Visualize stock levels against forecasted demand',
    icon: LineChart,
    color: 'bg-primary-muted text-primary',
  },
  {
    href: '/products',
    title: 'Products',
    description: 'Browse and manage product catalog',
    icon: Package,
    color: 'bg-success-muted text-success',
  },
  {
    href: '/analytics',
    title: 'Analytics',
    description: 'Deep-dive with QuickSight dashboards',
    icon: BarChart3,
    color: 'bg-info-muted text-info',
  },
];

const statConfig = [
  { key: 'totalProducts', label: 'Total Products', value: '156', icon: Package, color: 'text-primary' },
  { key: 'activeForecast', label: 'Active Forecasts', value: '24', icon: TrendingUp, color: 'text-success' },
  { key: 'stockAlerts', label: 'Stock Alerts', value: '3', icon: AlertTriangle, color: 'text-destructive' },
  { key: 'accuracy', label: 'Forecast Accuracy', value: '94%', icon: BarChart3, color: 'text-info' },
];

function DashboardContent() {
  const { user } = useAuthContext();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8 xl:p-10 2xl:p-12">
        {/* Welcome Section */}
        <section className="animate-fade-in-up">
          <h1 className="font-display text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl text-foreground">
            Welcome back{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-muted-foreground mt-2 lg:mt-3 xl:mt-4">
            Your retail demand forecasting dashboard
          </p>
        </section>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 xl:gap-10 2xl:gap-12 mt-6 md:mt-8 lg:mt-10 xl:mt-12 2xl:mt-14">
          {statConfig.map((stat, index) => (
            <Card
              key={stat.key}
              className="animate-stagger hover-lift"
              style={{ animationDelay: `${(index + 1) * 50}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 lg:pb-3 xl:pb-4">
                <CardTitle className="text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className={`w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className={`text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-display font-semibold ${stat.color}`}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 xl:gap-10 2xl:gap-12 mt-6 md:mt-8 lg:mt-10 xl:mt-12 2xl:mt-14">
          {navItems.map((item, index) => (
            <Link key={item.href} href={item.href}>
              <Card
                className="animate-stagger hover-lift group cursor-pointer h-full"
                style={{ animationDelay: `${(index + 5) * 50}ms` }}
              >
                <CardHeader className="p-4 md:p-6 lg:p-8 xl:p-10 2xl:p-12">
                  <div
                    className={`w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 2xl:w-20 2xl:h-20 rounded-lg ${item.color} flex items-center justify-center mb-3 md:mb-4 lg:mb-5 xl:mb-6 2xl:mb-8`}
                  >
                    <item.icon className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 2xl:w-10 2xl:h-10" />
                  </div>
                  <CardTitle className="font-display text-lg md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl flex items-center justify-between">
                    {item.title}
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl mt-2 lg:mt-3 xl:mt-4">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
