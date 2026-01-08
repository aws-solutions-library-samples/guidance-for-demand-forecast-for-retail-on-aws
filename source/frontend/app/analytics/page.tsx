'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getQuickSightEmbedUrl } from '@/lib/api-client';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Maximize2,
  Minimize2,
  BarChart3,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EmbedState {
  url: string | null;
  isLoading: boolean;
  error: string | null;
}

function AnalyticsContent() {
  useAuthContext(); // Ensure user is authenticated
  const [embedState, setEmbedState] = useState<EmbedState>({
    url: null,
    isLoading: true,
    error: null,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const fetchEmbedUrl = useCallback(async () => {
    setEmbedState({ url: null, isLoading: true, error: null });
    setIframeLoaded(false);

    try {
      const response = await getQuickSightEmbedUrl();
      setEmbedState({ url: response.embedUrl, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load analytics';
      setEmbedState({
        url: null,
        isLoading: false,
        error: message,
      });
    }
  }, []);

  useEffect(() => {
    fetchEmbedUrl();
  }, [fetchEmbedUrl]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Loading state
  if (embedState.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Generating analytics dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (embedState.error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center animate-fade-in-up">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold mb-2">
            Failed to Load Analytics
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {embedState.error}
          </p>
          <Button onClick={fetchEmbedUrl}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  // Empty state (no URL)
  if (!embedState.url) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold mb-2">
            Analytics Not Available
          </h2>
          <p className="text-sm text-muted-foreground">
            QuickSight dashboard is not configured for this environment
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchEmbedUrl}
          className="bg-background/80 backdrop-blur-sm"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-background/80 backdrop-blur-sm"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Iframe loading overlay */}
      {!iframeLoaded && (
        <div className="absolute inset-0 bg-background flex items-center justify-center z-0">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Loading dashboard...
            </p>
          </div>
        </div>
      )}

      {/* QuickSight iframe */}
      <iframe
        src={embedState.url}
        title="QuickSight Analytics Dashboard"
        className={`
          w-full h-full border-0
          ${iframeLoaded ? 'opacity-100' : 'opacity-0'}
          transition-opacity duration-300
        `}
        onLoad={() => setIframeLoaded(true)}
        allow="fullscreen"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
}

function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="h-[calc(100vh-64px)]">
        <AnalyticsContent />
      </main>
    </div>
  );
}

export default function ProtectedAnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsPage />
    </ProtectedRoute>
  );
}
