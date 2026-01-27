'use client';

import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

type Status = 'uploaded' | 'processing' | 'tagged' | 'error';

interface ProcessingStatusProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { icon: typeof Loader2; text: string; color: string; bgColor: string }> = {
  uploaded: {
    icon: Clock,
    text: '업로드 완료',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  processing: {
    icon: Loader2,
    text: '처리 중...',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  tagged: {
    icon: CheckCircle,
    text: '태깅 완료',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  error: {
    icon: AlertCircle,
    text: '오류 발생',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

export default function ProcessingStatus({ status, className = '' }: ProcessingStatusProps) {
  const config = statusConfig[status] || statusConfig.uploaded;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} ${className}`}>
      <Icon className={`w-4 h-4 ${config.color} ${status === 'processing' ? 'animate-spin' : ''}`} />
      <span className={`text-sm font-medium ${config.color}`}>{config.text}</span>
    </div>
  );
}
