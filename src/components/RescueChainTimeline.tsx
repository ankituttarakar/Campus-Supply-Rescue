import React from 'react';
import { RescueChainEvent } from '@/lib/types';
import { Package, ArrowRight, Clock, CheckCircle2, RotateCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';

interface RescueChainTimelineProps {
  events: RescueChainEvent[];
  supplyTitle?: string;
}

export const RescueChainTimeline: React.FC<RescueChainTimelineProps> = ({ events, supplyTitle }) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm">
        No Rescue Chain events recorded yet for this resource.
      </div>
    );
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'LISTED':
        return <Package className="w-4 h-4 text-emerald-600" />;
      case 'RESERVED':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'HANDED_OVER':
      case 'RECEIVED':
        return <CheckCircle2 className="w-4 h-4 text-indigo-600" />;
      case 'REDISTRIBUTED':
        return <RotateCw className="w-4 h-4 text-purple-600" />;
      case 'WITHDRAWN':
      case 'EXPIRED':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-slate-600" />;
    }
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'LISTED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'RESERVED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'HANDED_OVER':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'RECEIVED':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'REDISTRIBUTED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <RotateCw className="w-4 h-4 text-emerald-600" />
            Rescue Chain
          </h3>
          <p className="text-xs text-slate-500">
            Lifecycle history of {supplyTitle ? `"${supplyTitle}"` : 'this resource'} across campus departments
          </p>
        </div>
        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
          {events.length} {events.length === 1 ? 'Event' : 'Events'}
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {events.map((event, index) => (
          <div key={event.id || index} className="relative group">
            {/* Dot Node */}
            <div className="absolute -left-[23px] top-1.5 w-5 h-5 rounded-full bg-white border-2 border-slate-300 group-hover:border-emerald-500 flex items-center justify-center transition-colors">
              <span className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-emerald-600 transition-colors" />
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border', getEventBadge(event.event_type))}>
                    {getEventIcon(event.event_type)}
                    {event.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Quantity: {event.quantity} {event.quantity === 1 ? 'unit' : 'units'}
                  </span>
                </div>
                <time className="text-[11px] text-slate-400">
                  {new Date(event.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>

              {/* Department Transfer Path */}
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium my-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
                <span className="text-slate-900 font-semibold">{event.from_department_name || event.from_department_code}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-emerald-800 font-semibold">{event.to_department_name || event.to_department_code}</span>
              </div>

              {event.notes && (
                <p className="text-xs text-slate-600 mt-1 italic">
                  "{event.notes}"
                </p>
              )}

              {event.actor_name && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Logged by: <strong className="text-slate-600 font-normal">{event.actor_name}</strong></span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

