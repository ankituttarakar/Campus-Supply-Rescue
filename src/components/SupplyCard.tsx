import React from 'react';
import Link from 'next/link';
import { Supply } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { SemanticMatchBadge } from './SemanticMatchBadge';
import { 
  Building, 
  MapPin, 
  Layers, 
  ArrowUpRight,
  Package,
  Cable,
  Monitor,
  Cpu,
  Presentation,
  FileText,
  Zap,
  Tag
} from 'lucide-react';

interface SupplyCardProps {
  supply: Supply;
  onRequestClick?: (supply: Supply) => void;
}

export const SupplyCard: React.FC<SupplyCardProps> = ({ supply, onRequestClick }) => {
  const getCategoryIcon = (slug?: string) => {
    switch (slug) {
      case 'cables-adapters':
        return <Cable className="w-4 h-4 text-emerald-600" />;
      case 'peripherals':
        return <Monitor className="w-4 h-4 text-blue-600" />;
      case 'lab-hardware':
        return <Cpu className="w-4 h-4 text-purple-600" />;
      case 'presentation-event':
        return <Presentation className="w-4 h-4 text-amber-600" />;
      case 'stationery':
        return <FileText className="w-4 h-4 text-teal-600" />;
      case 'electrical-power':
        return <Zap className="w-4 h-4 text-orange-600" />;
      default:
        return <Package className="w-4 h-4 text-slate-600" />;
    }
  };

  const availPercent = Math.round((supply.quantity_available / (supply.quantity_total || 1)) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group">
      <div>
        {/* Category & Status Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
            {getCategoryIcon(supply.category_slug)}
            <span>{supply.category_name || 'Supply Item'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={supply.condition} type="condition" size="sm" />
            <StatusBadge status={supply.status} type="supply" size="sm" />
          </div>
        </div>

        {/* Semantic Match Score if present */}
        {supply.similarity_score !== undefined && (
          <div className="mb-3">
            <SemanticMatchBadge score={supply.similarity_score} showDetails={false} />
          </div>
        )}

        {/* Title & Description */}
        <h3 className="font-semibold text-slate-900 text-base leading-snug group-hover:text-emerald-700 transition-colors mb-1.5">
          <Link href={`/supplies/${supply.id}`} className="hover:underline flex items-center justify-between">
            <span>{supply.title}</span>
            <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 shrink-0" />
          </Link>
        </h3>
        
        <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
          {supply.description}
        </p>

        {/* Department & Location metadata */}
        <div className="space-y-1.5 text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700">{supply.department_name}</span>
            <span className="text-slate-400">({supply.department_code})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{supply.location_details}</span>
          </div>
          {supply.estimated_replacement_value && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Est. Replacement Value: <strong>₹{Number(supply.estimated_replacement_value).toLocaleString('en-IN')}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Quantity & Actions Footer */}
      <div>
        <div className="mb-3">
          <div className="flex justify-between text-xs font-medium mb-1">
            <span className="text-slate-700">Stock Availability:</span>
            <span className="text-emerald-700 font-bold">
              {supply.quantity_available} / {supply.quantity_total} Units
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all" 
              style={{ width: `${availPercent}%` }} 
            />
            {supply.quantity_reserved > 0 && (
              <div 
                className="bg-blue-400 h-full transition-all" 
                style={{ width: `${Math.round((supply.quantity_reserved / supply.quantity_total) * 100)}%` }} 
              />
            )}
          </div>
          {supply.quantity_reserved > 0 && (
            <p className="text-[11px] text-blue-600 mt-1">
              ({supply.quantity_reserved} units currently reserved for approved requests)
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Link
            href={`/supplies/${supply.id}`}
            className="flex-1 text-center py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
          >
            View Details & History
          </Link>
          {supply.quantity_available > 0 && onRequestClick && (
            <button
              type="button"
              onClick={() => onRequestClick(supply)}
              className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Request Supply
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
