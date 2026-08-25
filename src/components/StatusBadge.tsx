import React from 'react';
import clsx from 'clsx';
import { SupplyStatus, RequestStatus, RequestUrgency, AllocationStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: SupplyStatus | RequestStatus | RequestUrgency | AllocationStatus | string;
  type?: 'supply' | 'request' | 'urgency' | 'allocation' | 'condition';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'supply', size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (type === 'supply') {
    switch (status) {
      case 'AVAILABLE':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'PARTIALLY_RESERVED':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'FULLY_RESERVED':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'TRANSFERRED':
        colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
        break;
      case 'WITHDRAWN':
      case 'EXPIRED':
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
    }
  } else if (type === 'urgency') {
    switch (status) {
      case 'URGENT':
        colorClasses = 'bg-rose-100 text-rose-800 border-rose-300 font-semibold animate-pulse';
        break;
      case 'HIGH':
        colorClasses = 'bg-orange-50 text-orange-700 border-orange-200';
        break;
      case 'MEDIUM':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'LOW':
        colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
    }
  } else if (type === 'condition') {
    switch (status) {
      case 'NEW':
        colorClasses = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
        break;
      case 'LIKE_NEW':
        colorClasses = 'bg-teal-50 text-teal-700 border-teal-200';
        break;
      case 'GOOD':
        colorClasses = 'bg-sky-50 text-sky-700 border-sky-200';
        break;
      case 'FAIR':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
    }
  } else if (type === 'allocation' || type === 'request') {
    switch (status) {
      case 'OPEN':
      case 'RESERVED':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'PARTIALLY_FULFILLED':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'FULFILLED':
      case 'HANDED_OVER':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'CANCELLED':
        colorClasses = 'bg-slate-100 text-slate-500 border-slate-200';
        break;
    }
  }

  const formattedText = status.replace(/_/g, ' ');

  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full border shadow-sm', sizeClasses, colorClasses)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {formattedText}
    </span>
  );
};
