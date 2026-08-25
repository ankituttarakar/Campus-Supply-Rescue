'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  RotateCw, 
  Search, 
  PlusCircle, 
  TrendingDown, 
  Building, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet,
  PackageCheck,
  Tag
} from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { DepartmentRescueStats, CategorySurplusAnalysis } from '@/lib/types';

export default function DashboardPage() {
  const [data, setData] = useState<{
    summary: any;
    departments: DepartmentRescueStats[];
    categories: CategorySurplusAnalysis[];
    recent_timeline: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Dashboard load error', err);
        setIsLoading(false);
      });
  }, []);

  const summary = data?.summary || {};

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campus Resource Dashboard</h1>
          <p className="text-xs text-slate-500">
            Real-time surplus inventory analytics, departmental redistribution metrics, and avoided procurement ledger
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/supplies/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List Surplus Supply</span>
          </Link>
          <Link
            href="/supplies"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>Discover Supplies</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Available Supplies"
          value={summary.active_available_units || 0}
          subtext={`${summary.active_listings_count || 0} unique listings available`}
          icon={<Tag className="w-5 h-5" />}
          color="emerald"
        />
        <StatsCard
          title="Active Requests"
          value={summary.open_requests_count || 0}
          subtext="Requirements seeking surplus"
          icon={<Search className="w-5 h-5" />}
          color="amber"
        />
        <StatsCard
          title="Resources Rescued"
          value={summary.total_units_rescued || 0}
          subtext="Transferred across departments"
          icon={<RotateCw className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          title="Avoided Procurement"
          value={`₹${Number(summary.total_avoided_procurement_value || 0).toLocaleString('en-IN')}`}
          subtext="Estimated campus budget saved"
          icon={<TrendingDown className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Two-Column Analytics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Department Rescue Table & Category Pattern Analysis */}
        <div className="lg:col-span-2 space-y-8">
          {/* Department Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-600" />
                  Department Rescue & Contribution Statistics
                </h2>
                <p className="text-xs text-slate-500">
                  Summary of surplus resources contributed and received across academic departments
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Department</th>
                    <th className="px-3.5 py-2.5 text-center">Listings</th>
                    <th className="px-3.5 py-2.5 text-center">Contributed Units</th>
                    <th className="px-3.5 py-2.5 text-center">Received Units</th>
                    <th className="px-3.5 py-2.5 text-right">Avoided Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.departments?.map((dept) => (
                    <tr key={dept.department_id} className="hover:bg-slate-50/70">
                      <td className="px-3.5 py-2.5 font-medium text-slate-900">
                        <div>{dept.department_name}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{dept.building}</span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-slate-600">{dept.total_supplies_listed}</td>
                      <td className="px-3.5 py-2.5 text-center font-bold text-emerald-700">{dept.total_units_transferred_out}</td>
                      <td className="px-3.5 py-2.5 text-center font-bold text-blue-700">{dept.total_units_received}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-slate-800">
                        ₹{Number(dept.estimated_avoided_procurement_value).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                  {(!data?.departments || data.departments.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 italic">No departmental statistics available yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Surplus Distribution */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                Category Surplus Distribution
              </h2>
              <p className="text-xs text-slate-500">
                Surplus inventory status and rescue volume by equipment category
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data?.categories?.map((cat) => (
                <div key={cat.category_id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800">{cat.category_name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {cat.current_available_units} In Stock
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Rescued: <strong className="text-slate-700">{cat.total_rescued_units} units</strong></span>
                    <span>Open Requests: <strong className="text-amber-700">{cat.open_requests_count}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity (Rescue Chain Stream) */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-emerald-600" />
                Recent Activity
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Rescue Chain
              </span>
            </div>

            <div className="space-y-3.5">
              {data?.recent_timeline?.map((evt: any) => (
                <div key={evt.event_id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate max-w-[180px]">{evt.supply_title}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {evt.event_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800">{evt.from_department_code}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-semibold text-emerald-800">{evt.to_department_code}</span>
                    <span className="text-slate-400">• Qty: {evt.quantity}</span>
                  </div>
                  {evt.notes && <p className="text-[11px] text-slate-500 italic">"{evt.notes}"</p>}
                </div>
              ))}
              {(!data?.recent_timeline || data.recent_timeline.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4 italic">No transfer events recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

