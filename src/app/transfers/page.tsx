'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  Clock, 
  Building, 
  ArrowRight, 
  RotateCw, 
  AlertCircle, 
  User, 
  FileText,
  ShieldCheck
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { SupplyAllocation } from '@/lib/types';

export default function TransfersPage() {
  const [allocations, setAllocations] = useState<SupplyAllocation[]>([]);
  const [scope, setScope] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Handover Completion Modal State
  const [selectedAllocation, setSelectedAllocation] = useState<SupplyAllocation | null>(null);
  const [handoverNotes, setHandoverNotes] = useState('Handed over in good condition at lab storage desk');
  const [isCompleting, setIsCompleting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ success?: string; error?: string } | null>(null);

  const fetchAllocations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/allocations?scope=${scope}`);
      const data = await res.json();
      if (res.ok) {
        setAllocations(data.allocations || []);
      }
    } catch (err) {
      console.error('Failed to load allocations', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [scope]);

  const handleCompleteHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocation) return;
    setIsCompleting(true);
    setActionFeedback(null);

    try {
      const res = await fetch(`/api/allocations/${selectedAllocation.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: handoverNotes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete handover.');

      setActionFeedback({
        success: `Physical handover recorded successfully and appended to the Rescue Chain!`,
      });

      await fetchAllocations();
    } catch (err: any) {
      setActionFeedback({ error: err.message || 'Handover failed.' });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transfers & Handovers</h1>
          <p className="text-xs text-slate-500">
            Manage departmental reservations, confirm physical handovers, and track resource transfers
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setScope('all')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            scope === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Allocations
        </button>
        <button
          onClick={() => setScope('incoming')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            scope === 'incoming'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Incoming (Requests for Our Surplus)
        </button>
        <button
          onClick={() => setScope('outgoing')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            scope === 'outgoing'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Outgoing (Items Reserved by Us)
        </button>
      </div>

      {/* Allocations Table / Cards */}
      {isLoading ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
          <RotateCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading allocation ledger...</p>
        </div>
      ) : allocations.length > 0 ? (
        <div className="space-y-4">
          {allocations.map((alloc) => (
            <div
              key={alloc.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">Transfer #{alloc.id}</span>
                    <StatusBadge status={alloc.allocation_status} type="allocation" size="sm" />
                    <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      Qty: {alloc.allocated_quantity} units
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 hover:text-emerald-700">
                    <Link href={`/supplies/${alloc.supply_id}`}>
                      {alloc.supply_title}
                    </Link>
                  </h3>
                </div>

                {alloc.allocation_status === 'RESERVED' && (
                  <button
                    onClick={() => {
                      setSelectedAllocation(alloc);
                      setActionFeedback(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    Confirm Physical Handover
                  </button>
                )}
              </div>

              {/* Department Transfer Path */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Donor Department</span>
                    <strong className="text-slate-900">{alloc.source_department_name} ({alloc.source_department_code})</strong>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mx-2" />
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Recipient Department</span>
                    <strong className="text-emerald-800">{alloc.receiving_department_name} ({alloc.receiving_department_code})</strong>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-500">
                  <div>Reserved: {new Date(alloc.reserved_at).toLocaleString()}</div>
                  {alloc.completed_at && (
                    <div className="text-emerald-700 font-medium">
                      Completed: {new Date(alloc.completed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {alloc.request_purpose && (
                <p className="text-xs text-slate-600 italic">
                  <strong>Purpose:</strong> "{alloc.request_purpose}"
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
          <ArrowLeftRight className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No transfers found in this view</h3>
          <p className="text-xs text-slate-500">
            Reserve available supplies from the catalog to initiate new handovers.
          </p>
        </div>
      )}

      {/* Complete Handover Modal */}
      {selectedAllocation && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
            <h3 className="text-base font-bold text-slate-900">
              Confirm Physical Handover
            </h3>

            {actionFeedback?.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionFeedback.error}</span>
              </div>
            )}

            {actionFeedback?.success ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
                  <div className="font-bold text-sm text-emerald-800">✓ Handover Completed!</div>
                  <p>{actionFeedback.success}</p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => { setSelectedAllocation(null); setActionFeedback(null); }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCompleteHandover} className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                  <div><strong>Supply:</strong> {selectedAllocation.supply_title}</div>
                  <div><strong>Quantity:</strong> {selectedAllocation.allocated_quantity} units</div>
                  <div><strong>From:</strong> {selectedAllocation.source_department_name}</div>
                  <div><strong>To:</strong> {selectedAllocation.receiving_department_name}</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Handover Confirmation Notes & Staff Sign-off
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedAllocation(null)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCompleting}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                  >
                    {isCompleting ? 'Completing Handover...' : 'Confirm Handover'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

