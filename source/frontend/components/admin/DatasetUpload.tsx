'use client';

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useCallback, useRef } from 'react';
import { Upload, FileArchive, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getDatasetUploadUrl, uploadFileToS3 } from '@/lib/api-client';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function DatasetUpload() {
  const [state, setState] = useState<UploadState>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.zip')) {
      setState('error');
      setMessage('Please upload a .zip file containing a CSV with sales data');
      return;
    }
    setSelectedFile(file);
    setState('idle');
    setMessage('');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setState('uploading');
    setProgress(0);
    setMessage('Requesting upload URL...');

    try {
      // Step 1: Get presigned URL from backend
      const { uploadUrl } = await getDatasetUploadUrl(selectedFile.name);
      setProgress(30);
      setMessage('Uploading file to S3...');

      // Step 2: Upload file directly to S3 using presigned URL
      await uploadFileToS3(uploadUrl, selectedFile);
      setProgress(100);

      setState('success');
      setMessage(
        'File uploaded successfully! Processing will begin shortly. Check the status below.',
      );
      setSelectedFile(null);
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  }, [selectedFile]);

  const reset = useCallback(() => {
    setState('idle');
    setSelectedFile(null);
    setMessage('');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground-secondary">
        Upload a <code className="text-primary font-mono text-xs">.zip</code> file containing a CSV
        with timeseries sales data. Required columns:{' '}
        <code className="text-primary font-mono text-xs">item_id, store_id, ts, demand, price</code>
      </p>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          dragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/40 hover:bg-primary/[0.02]',
          state === 'error' && 'border-destructive/40 bg-destructive/5',
          state === 'success' && 'border-green-400/40 bg-green-50/50',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload zip file"
        />

        {state === 'uploading' ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-foreground-secondary">{message}</p>
            <div className="w-full max-w-xs h-2 rounded-full bg-background-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : state === 'success' ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="text-sm text-green-700">{message}</p>
            <Button variant="outline" size="sm" onClick={reset}>
              Upload Another
            </Button>
          </div>
        ) : state === 'error' ? (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="w-10 h-10 text-destructive" />
            <p className="text-sm text-destructive">{message}</p>
            <Button variant="outline" size="sm" onClick={reset}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {selectedFile ? (
              <>
                <FileArchive className="w-10 h-10 text-primary" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-foreground-muted">
                    {selectedFile.size < 1024 * 1024
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                      : `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
                  </p>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpload();
                  }}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload & Process
                </Button>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-foreground-muted" />
                <div>
                  <p className="text-sm font-medium">Drop your .zip file here</p>
                  <p className="text-xs text-foreground-muted mt-1">or click to browse</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
