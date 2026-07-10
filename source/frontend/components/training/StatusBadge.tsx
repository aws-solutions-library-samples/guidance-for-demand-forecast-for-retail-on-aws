// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CheckCircle, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';

export function StatusBadge({ status }: { status: string }) {
  const getStatusColor = () => {
    switch (status) {
      case 'Completed':
      case 'InService':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'InProgress':
      case 'Creating':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Failed':
      case 'OutOfService':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Stopped':
      case 'Deleting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'Completed':
      case 'InService':
        return <CheckCircle className="w-4 h-4" />;
      case 'InProgress':
      case 'Creating':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'Failed':
      case 'OutOfService':
        return <XCircle className="w-4 h-4" />;
      case 'Stopped':
      case 'Deleting':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor()}`}
    >
      {getStatusIcon()}
      {status}
    </span>
  );
}
