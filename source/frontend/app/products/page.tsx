'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SimpleProductCard } from '@/components/products/ProductCard';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useProducts } from '@/hooks/useProducts';
import { Search, Package } from 'lucide-react';

function ProductsContent() {
  const router = useRouter();
  const { products, isLoading, error } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.itemDescription.toLowerCase().includes(term) ||
        p.itemId.toLowerCase().includes(term) ||
        p.itemType.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleProductClick = (productId: string) => {
    router.push(`/forecast?product=${productId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-6 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="animate-fade-in-up">
            <h1 className="font-display text-3xl font-semibold">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? 'Loading...' : `${filteredProducts.length} products in catalog`}
            </p>
          </div>
          <div className="relative w-full sm:w-64 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {[...Array(12)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="aspect-square rounded-lg mb-4" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">Failed to load products</h3>
            <p className="text-sm text-muted-foreground">
              {error.message || 'An error occurred while fetching products'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No products found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Try adjusting your search' : 'No products in catalog'}
            </p>
          </div>
        )}

        {/* Product Grid */}
        {!isLoading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {filteredProducts.map((product, index) => (
              <div
                key={product.itemId}
                className="animate-stagger"
                style={{ animationDelay: `${((index % 8) + 1) * 50}ms` }}
              >
                <SimpleProductCard
                  product={product}
                  onClick={() => handleProductClick(product.itemId)}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <ProductsContent />
    </ProtectedRoute>
  );
}
