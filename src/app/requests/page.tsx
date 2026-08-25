'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Inbox, 
  Sparkles, 
  PlusCircle, 
  Clock, 
  Building, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  HelpCircle,
  Tag
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { SupplyRequest, SupplyCategory, Supply } from '@/lib/types';

export default function RequestsPage() {
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [categories, setCategories] = useState<SupplyCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [purposeDescription, setPurposeDescription] = useState('');
  const [requestedQuantity, setRequestedQuantity] = useState('2');
  const [urgency, setUrgency] = useState('HIGH');
  const [preferredCategoryId, setPreferredCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success?: string; error?: string } | null>(null);

  // Real-Time Smart Pre-Check State
  const [smartMatches, setSmartMatches] = useState<Supply[]>([]);
  const [isCheckingMatches, setIsCheckingMatches] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/requests');
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load requests', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      });
    fetchRequests();
  }, []);

  // Debounced real-time check as user types
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (purposeDescription.trim().length >= 8) {
        setIsCheckingMatches(true);
        try {
          const res = await fetch('/api/supplies/search/semantic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: purposeDescription,
              threshold: 0.30,
              limit: 3,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            setSmartMatches(data.results || []);
          }
        } catch (err) {
          console.warn('Matching check failed', err);
        } finally {
          setIsCheckingMatches(false);
        }
      } else {
        setSmartMatches([]);
      }
    }, 450);

    return () => clearTimeout(handler);
  }, [purposeDescription]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose_description: purposeDescription,
          requested_quantity: parseInt(requestedQuantity, 10),
          urgency,
          preferred_category_id: preferredCategoryId ? parseInt(preferredCategoryId, 10) : null,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit request.');

      setFeedback({ success: 'Department requirement registered successfully!' });
      setPurposeDescription('');
      setNotes('');
      setSmartMatches([]);
      await fetchRequests();
    } catch (err: any) {
      setFeedback({ error: err.message || 'Submission error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Department Requests</h1>
          <p className="text-xs text-slate-500">
            Publish department requirements to discover surplus equipment before purchasing new items
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Request Submission Form with Real-Time Smart Pre-Check */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                <Inbox className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Request Supply</h2>
                <p className="text-[11px] text-slate-500">Describe what your department needs</p>
              </div>
            </div>

            {feedback?.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{feedback.error}</span>
              </div>
            )}

            {feedback?.success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedback.success}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Describe what you need *
                </label>
                <textarea
                  rows={3}
                  required
                  value={purposeDescription}
                  onChange={(e) => setPurposeDescription(e.target.value)}
                  placeholder="e.g. Need video cables for connecting student laptops to classroom projectors..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Real-Time Smart Matching Preview */}
              {purposeDescription.trim().length >= 8 && (
                <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Matching Surplus Detected
                    </span>
                    {isCheckingMatches && <span className="text-[10px] text-indigo-500 animate-pulse font-normal">Checking surplus...</span>}
                  </div>

                  {smartMatches.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] text-indigo-700">
                        Existing surplus supplies found on campus that match your description:
                      </p>
                      {smartMatches.map((match) => (
                        <Link
                          key={match.id}
                          href={`/supplies/${match.id}`}
                          className="block p-2.5 bg-white rounded-lg border border-indigo-100 hover:border-indigo-300 text-xs transition-all group"
                        >
                          <div className="font-semibold text-slate-900 group-hover:text-indigo-700 truncate">
                            {match.title}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                            <span>{match.department_name} ({match.quantity_available} avail)</span>
                            <span className="font-bold text-indigo-600">Smart Match</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      No direct matching surplus in stock right now. Submitting will register your open requirement.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Units Needed *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={requestedQuantity}
                    onChange={(e) => setRequestedQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Urgency Level
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Category (Optional)
                </label>
                <select
                  value={preferredCategoryId}
                  onChange={(e) => setPreferredCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">Any Matching Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Needed for final semester lab work in Room 302"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>

        {/* Right 2 Cols: Active Campus Requests List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Active Department Requests ({requests.length})
            </h2>
            <span className="text-xs text-slate-500">Ordered by urgency & date</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
              <Inbox className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading department requests...</p>
            </div>
          ) : requests.length > 0 ? (
            <div className="space-y-3.5">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={req.urgency} type="urgency" size="sm" />
                        <StatusBadge status={req.status} type="request" size="sm" />
                        {req.preferred_category_name && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                            {req.preferred_category_name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {req.purpose_description}
                      </h3>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {req.fulfilled_quantity} / {req.requested_quantity} Fulfilled
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {req.notes && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-md border border-slate-100">
                      "{req.notes}"
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{req.requesting_department_name} ({req.requesting_department_code})</span>
                      <span className="text-slate-400">• Requested by: {req.requester_name}</span>
                    </div>

                    <Link
                      href={`/supplies?search=${encodeURIComponent(req.purpose_description.substring(0, 30))}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <span>Find Matching Supplies</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
              <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-800">No active requirements posted</h3>
              <p className="text-xs text-slate-500">Submit a requirement using the form on the left to find surplus resources.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

