'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  RotateCw, 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Tag, 
  TrendingDown,
  PlusCircle,
  Package,
  Layers,
  Inbox,
  ArrowLeftRight
} from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';

export default function LandingPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => setDashboardData(data))
      .catch((err) => console.error('Dashboard fetch error', err));
  }, []);

  const summary = dashboardData?.summary || {};

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white rounded-2xl p-8 sm:p-12 border border-slate-800 shadow-xl">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span>Inter-Departmental Surplus Resource Platform</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
            Use What Already Exists.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Campus Supply Rescue helps departments discover and redistribute usable surplus resources before purchasing new ones. 
            Connect lab equipment, accessories, cables, and stationery across academic units effortlessly.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/supplies"
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Discover Supplies</span>
            </Link>

            <Link
              href="/supplies/new"
              className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>List Surplus Supply</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Live Campus Impact Metrics */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Campus Impact & Activity</h2>
            <p className="text-xs text-slate-500">Real-time resource utilization and avoided procurement across campus</p>
          </div>
          <Link href="/dashboard" className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1">
            <span>View Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Available Supplies"
            value={summary.active_available_units || 0}
            subtext="Available immediately across labs"
            icon={<Tag className="w-5 h-5" />}
            color="emerald"
          />
          <StatsCard
            title="Active Requests"
            value={summary.open_requests_count || 0}
            subtext="Open departmental requirements"
            icon={<Inbox className="w-5 h-5" />}
            color="amber"
          />
          <StatsCard
            title="Resources Rescued"
            value={summary.total_units_rescued || 0}
            subtext="Units transferred across departments"
            icon={<RotateCw className="w-5 h-5" />}
            color="blue"
          />
          <StatsCard
            title="Estimated Avoided Cost"
            value={`₹${Number(summary.total_avoided_procurement_value || 0).toLocaleString('en-IN')}`}
            subtext="Estimated procurement budget saved"
            icon={<TrendingDown className="w-5 h-5" />}
            color="purple"
          />
        </div>
      </section>

      {/* How It Works: 3 Simple Steps */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">How It Works</h2>
          <p className="text-xs text-slate-500">Three simple steps to redistribute usable resources and reduce unnecessary purchasing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-base">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">List Surplus</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              List usable resources your department no longer needs so another department can use them before purchasing new supplies.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-base">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">Find What You Need</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Describe what you need in your own words and discover relevant supplies across campus departments.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold text-base">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">Rescue & Reuse</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Reserve available units instantly and coordinate safe inter-departmental handovers with complete traceability.
            </p>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Platform Capabilities</h2>
          <p className="text-xs text-slate-500">Built to streamline campus resource sharing with speed, reliability, and transparency</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Smart Matching</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Describe equipment requirements in natural sentences (e.g. <em>“cables for connecting laptops to projector”</em>) and find matching items across all department inventories.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Instant Stock Reservations</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Reliable reservation workflow ensures item stock is allocated accurately in real-time without double-booking or scheduling conflicts.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <RotateCw className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">The Rescue Chain</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Maintains a comprehensive chronological timeline of physical item handovers across departments, preserving provenance, staff sign-offs, and quantities.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
              <TrendingDown className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Campus Analytics & Insights</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Provides actionable insights on surplus accumulation patterns, active sharing departments, and calculated institutional procurement savings.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="bg-slate-100 border border-slate-200 rounded-xl p-8 text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Ready to Discover or Share Campus Supplies?</h3>
        <p className="text-xs text-slate-600 max-w-xl mx-auto">
          Join your department colleagues in discovering available surplus resources or listing equipment no longer in active use.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link
            href="/supplies"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Search className="w-4 h-4 text-emerald-400" />
            <span>Browse Catalog</span>
          </Link>
          <Link
            href="/supplies/new"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>List Surplus Supply</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

