'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getDatasetUploadStatus } from '@/lib/api-client';

interface UploadRecord {
  user: string;
  fileName: string;
  status: string;
  message: string;
  s3Key: string;
  timestamp: string;
}

export function UploadHistory() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDatasetUploadStatus();
      setUploads(data.uploads);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load upload history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 10 seconds if there are processing items
    const interval = setInterval(() => {
      if (uploads.some((u) => u.status === 'processing')) {
        fetchStatus();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus, uploads]);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'invalid':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default:
        return <FileText className="w-4 h-4 text-foreground-muted" />;
    }
  };

  const statusBadge = (status: string) => {
    const styles = {
      valid: 'bg-green-100 text-green-700 border-green-200',
      invalid: 'bg-red-50 text-red-700 border-red-200',
      processing: 'bg-blue-50 text-blue-700 border-blue-200',
    };
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700 border-gray-200',
        )}
      >
        {statusIcon(status)}
        {status}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-white/60 bg-white/40 backdrop-blur-xl shadow-lg shadow-black/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Upload History</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStatus}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 mb-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading && uploads.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : uploads.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 text-foreground-muted mx-auto mb-3" />
          <p className="text-sm text-foreground-secondary">No uploads yet</p>
          <p className="text-xs text-foreground-muted mt-1">
            Upload a dataset above to get started
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-mono uppercase tracking-wider text-foreground-muted border-b border-border">
                <th className="py-3 text-left pl-2">File</th>
                <th className="py-3 text-left">Status</th>
                <th className="py-3 text-left">Message</th>
                <th className="py-3 text-right pr-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((upload, i) => (
                <tr key={`${upload.timestamp}-${i}`} className="border-b border-border/50">
                  <td className="py-3 pl-2">
                    <span className="font-mono text-xs">{upload.fileName}</span>
                  </td>
                  <td className="py-3">{statusBadge(upload.status)}</td>
                  <td className="py-3">
                    <span className="text-xs text-foreground-secondary line-clamp-2">
                      {upload.message}
                    </span>
                  </td>
                  <td className="py-3 pr-2 text-right">
                    <span className="text-xs text-foreground-muted whitespace-nowrap">
                      {new Date(upload.timestamp).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
