import React from 'react';
import { Clock, FileText, CheckCircle, XCircle } from 'lucide-react';

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-50';
    case 'processing':
      return 'text-blue-600 bg-blue-50';
    case 'completed':
      return 'text-green-600 bg-green-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4" />;
    case 'processing':
      return <FileText className="w-4 h-4" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <XCircle className="w-4 h-4" />;
  }
};