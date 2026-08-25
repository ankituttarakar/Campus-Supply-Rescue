import React from 'react';
import clsx from 'clsx';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  trend?: string;
  color?: 'emerald' | 'blue' | 'purple' | 'amber' | 'slate';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtext,
  icon,
  trend,
  color = 'slate',
}) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={clsx('p-2 rounded-lg border', colorMap[color])}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
        {trend && (
          <div className="mt-2 text-xs font-medium text-emerald-600 flex items-center gap-1">
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
};
