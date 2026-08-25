import React from 'react';
import { Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface SemanticMatchBadgeProps {
  score?: number; // 0.0 to 1.0
  showDetails?: boolean;
}

export const SemanticMatchBadge: React.FC<SemanticMatchBadgeProps> = ({ score }) => {
  if (score === undefined || score === null) return null;

  const percentage = Math.round(score * 100);

  let colorClasses = 'bg-slate-50 text-slate-700 border-slate-200';
  let badgeLabel = 'Relevant Match';

  if (percentage >= 80) {
    colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    badgeLabel = 'Strong Match';
  } else if (percentage >= 60) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    badgeLabel = 'Relevant Match';
  } else if (percentage >= 40) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    badgeLabel = 'Potential Match';
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs', colorClasses)}>
        <Sparkles className="w-3 h-3" />
        <span>Smart Match</span>
        <span className="opacity-75 text-[11px] font-normal">• {badgeLabel}</span>
      </div>
    </div>
  );
};

