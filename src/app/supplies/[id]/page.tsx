'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  Building, 
  MapPin, 
  User, 
  Mail, 
  Calendar, 
  Tag, 
  Layers, 
  ArrowLeft, 
  RotateCw, 
  PlusCircle, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { RescueChainTimeline } from '@/components/RescueChainTimeline';
import { Supply, RescueChainEvent } from '@/lib/types';

export default function SupplyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplyId = params.id;

  const [supply, setSupply] = useState<Supply | null>(null);
  const [rescueChain, setRescueChain] = useState<RescueChainEvent[]>([]);
  const [relatedSupplies, setRelatedSupplies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reservation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reqQty, setReqQty] = useState(1);
  const [reqPurpose, setReqPurpose] = useState('');
  const [isReserving, setIsReserving] = useState(false);
  const [reserveFeedback, setReserveFeedback] = useState<{ success?: string; error?: string } | null>(null);

  const fetchSupplyDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/supplies/${supplyId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load supply details.');
      }
      setSupply(data.supply);
      setRescueChain(data.rescue_chain || []);
      setRelatedSupplies(data.related_supplies || []);
      setReqQty(Math.min(1, data.supply.quantity_available));
      setReqPurpose(`Request for academic use: ${data.supply.title}`);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (supplyId) {
      fetchSupplyDetails();
    }
  }, [supplyId]);

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supply) return;
    setIsReserving(true);
    setReserveFeedback(null);

    try {
      // 1. Create open request
      const reqRes = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose_description: reqPurpose,
          requested_quantity: reqQty,
          urgency: 'HIGH',
          preferred_category_id: supply.category_id,
        }),
      });
      const reqData = await reqRes.json();
      if (!reqRes.ok) throw new Error(reqData.error || 'Failed to create request.');

      // 2. Reserve allocation
      const allocRes = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: reqData.request.id,
          supply_id: supply.id,
          quantity: reqQty,
        }),
      });
      const allocData = await allocRes.json();
      if (!allocRes.ok) throw new Error(allocData.error || 'Reservation failed.');

      setReserveFeedback({
        success: `Successfully reserved ${reqQty} unit(s)! You can view this reservation in Transfers.`,
      });

      await fetchSupplyDetails();
    } catch (err: any) {
      setReserveFeedback({ error: err.message || 'Reservation failed.' });
    } finally {
      setIsReserving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center space-y-3">
        <RotateCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading supply details and history...</p>
      </div>
    );
  }

  if (error || !supply) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Supply Record Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'This listing does not exist in the campus catalog.'}</p>
        <Link href="/supplies" className="inline-flex px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const availPercent = Math.round((supply.quantity_available / (supply.quantity_total || 1)) * 100);

  return (
    <div className="space-y-8">
      {/* Top Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/supplies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discover Supplies</span>
        </Link>
        <div className="flex items-center gap-2">
          <StatusBadge status={supply.condition} type="condition" />
          <StatusBadge status={supply.status} type="supply" />
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Main Supply Info & Rescue Chain */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                {supply.category_name}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {supply.title}
              </h1>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {supply.description}
            </p>

            {/* Quantity Progress */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Quantity Breakdown:</span>
                <span className="text-emerald-800 font-bold">
                  {supply.quantity_available} Available / {supply.quantity_total} Total Units
                </span>
              </div>

              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${availPercent}%` }} />
                {supply.quantity_reserved > 0 && (
                  <div 
                    className="bg-blue-400 h-full transition-all" 
                    style={{ width: `${Math.round((supply.quantity_reserved / supply.quantity_total) * 100)}%` }} 
                  />
                )}
                {supply.quantity_transferred_out > 0 && (
                  <div 
                    className="bg-purple-500 h-full transition-all" 
                    style={{ width: `${Math.round((supply.quantity_transferred_out / supply.quantity_total) * 100)}%` }} 
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600 font-medium">
                <div>Available: <strong className="text-emerald-700">{supply.quantity_available}</strong></div>
                <div>Reserved: <strong className="text-blue-700">{supply.quantity_reserved}</strong></div>
                <div>Transferred: <strong className="text-purple-700">{supply.quantity_transferred_out}</strong></div>
              </div>
            </div>

            {/* Action Bar */}
            {supply.quantity_available > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Need this supply for your department?</span>
                  <span className="text-[11px] text-slate-500">Reserve available units instantly for pickup or handover</span>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                >
                  Request Supply
                </button>
              </div>
            )}
          </div>

          {/* The Rescue Chain Timeline Component */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            <RescueChainTimeline events={rescueChain} supplyTitle={supply.title} />
          </div>
        </div>

        {/* Right Col: Location, Department, Contributor & Related */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Location & Logistics
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Department</span>
                  <strong className="text-slate-800 font-semibold">{supply.department_name} ({supply.department_code})</strong>
                  <span className="text-slate-500 block text-[11px]">{supply.department_building}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Campus Storage Location</span>
                  <strong className="text-slate-800 font-semibold">{supply.location_details}</strong>
                </div>
              </div>

              {supply.estimated_replacement_value && (
                <div className="flex items-start gap-2.5">
                  <Tag className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Estimated Replacement Value</span>
                    <strong className="text-emerald-800 font-bold">
                      ₹{Number(supply.estimated_replacement_value).toLocaleString('en-IN')}
                    </strong>
                    <span className="text-slate-400 block text-[10px]">Estimated procurement value</span>
                  </div>
                </div>
              )}

              {supply.availability_until && (
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Availability Window</span>
                    <span className="text-slate-700 font-medium">Until {new Date(supply.availability_until).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Listed By</span>
                  <span className="font-medium text-slate-700">{supply.contributor_name}</span>
                  <span className="text-[11px] text-slate-400 block">{supply.contributor_email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Related Supplies */}
          {relatedSupplies.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Other {supply.category_name}
              </h3>
              <div className="space-y-2">
                {relatedSupplies.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/supplies/${rel.id}`}
                    className="block p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 text-xs transition-colors"
                  >
                    <span className="font-semibold text-slate-900 block truncate">{rel.title}</span>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                      <span>{rel.department_name}</span>
                      <span className="text-emerald-700 font-bold">{rel.quantity_available} avail</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reservation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
            <h3 className="text-base font-bold text-slate-900">
              Request {supply.title}
            </h3>

            {reserveFeedback?.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{reserveFeedback.error}</span>
              </div>
            )}

            {reserveFeedback?.success ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
                  <div className="font-bold text-sm text-emerald-800">✓ Reservation Successful!</div>
                  <p>{reserveFeedback.success}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Link
                    href="/transfers"
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                  >
                    View in Transfers
                  </Link>
                  <button
                    onClick={() => { setIsModalOpen(false); setReserveFeedback(null); }}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReserveSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Units to Request (Available: {supply.quantity_available})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={supply.quantity_available}
                    required
                    value={reqQty}
                    onChange={(e) => setReqQty(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Intended Academic / Lab Purpose
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={reqPurpose}
                    onChange={(e) => setReqPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isReserving}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                  >
                    {isReserving ? 'Reserving...' : 'Submit Request'}
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

