'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Sparkles, 
  Filter, 
  SlidersHorizontal, 
  PlusCircle, 
  RotateCw, 
  Layers, 
  Building, 
  AlertCircle,
  Clock,
  X
} from 'lucide-react';
import { SupplyCard } from '@/components/SupplyCard';
import { Supply, SupplyCategory, Department } from '@/lib/types';

export default function SuppliesPage() {
  const [mode, setMode] = useState<'semantic' | 'structured'>('semantic');
  const [semanticQuery, setSemanticQuery] = useState('I need something to connect my laptop to a classroom projector');
  const [keywordQuery, setKeywordQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [condition, setCondition] = useState('');
  const [minQty, setMinQty] = useState('');
  
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [categories, setCategories] = useState<SupplyCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);

  // Request Modal State
  const [selectedSupplyForRequest, setSelectedSupplyForRequest] = useState<Supply | null>(null);
  const [requestQty, setRequestQty] = useState(1);
  const [requestPurpose, setRequestPurpose] = useState('');
  const [requestUrgency, setRequestUrgency] = useState('HIGH');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ success?: string; error?: string } | null>(null);

  useEffect(() => {
    // Load metadata categories and departments
    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
        if (data.departments) setDepartments(data.departments);
      });

    // Initial search
    executeSemanticSearch('I need something to connect my laptop to a classroom projector');
  }, []);

  const executeSemanticSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/supplies/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: queryText,
          category_id: categoryId || undefined,
          department_id: departmentId || undefined,
          condition: condition || undefined,
          min_qty: minQty ? parseInt(minQty, 10) : 1,
          threshold: 0.25,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSupplies(data.results || []);
        setResultCount(data.count);
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const executeStructuredSearch = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (keywordQuery) params.append('search', keywordQuery);
      if (categoryId) params.append('category_id', categoryId);
      if (departmentId) params.append('department_id', departmentId);
      if (condition) params.append('condition', condition);
      if (minQty) params.append('min_qty', minQty);
      params.append('status', 'AVAILABLE');

      const res = await fetch(`/api/supplies?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setSupplies(data.supplies || []);
        setResultCount(data.count);
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'semantic') {
      executeSemanticSearch(semanticQuery);
    } else {
      executeStructuredSearch();
    }
  };

  const handleOpenRequestModal = (supply: Supply) => {
    setSelectedSupplyForRequest(supply);
    setRequestQty(Math.min(2, supply.quantity_available));
    setRequestPurpose(`Required for department activity: ${supply.title}`);
    setModalFeedback(null);
  };

  const handleSubmitRequestAndReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplyForRequest) return;
    setIsSubmittingRequest(true);
    setModalFeedback(null);

    try {
      // 1. Create the request first
      const reqRes = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose_description: requestPurpose,
          requested_quantity: requestQty,
          urgency: requestUrgency,
          preferred_category_id: selectedSupplyForRequest.category_id,
        }),
      });

      const reqData = await reqRes.json();
      if (!reqRes.ok) {
        throw new Error(reqData.error || 'Failed to submit request.');
      }

      // 2. Reserve allocation immediately
      const allocRes = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: reqData.request.id,
          supply_id: selectedSupplyForRequest.id,
          quantity: requestQty,
        }),
      });

      const allocData = await allocRes.json();
      if (!allocRes.ok) {
        throw new Error(allocData.error || 'Reservation failed.');
      }

      setModalFeedback({
        success: `Successfully reserved ${requestQty} unit(s)! You can view this reservation in Transfers.`,
      });

      // Refresh list
      if (mode === 'semantic') executeSemanticSearch(semanticQuery);
      else executeStructuredSearch();
    } catch (err: any) {
      setModalFeedback({ error: err.message || 'Action failed.' });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Discover Supplies</h1>
          <p className="text-xs text-slate-500">
            Search and request usable surplus resources across campus departments
          </p>
        </div>
        <Link
          href="/supplies/new"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>List Surplus Supply</span>
        </Link>
      </div>

      {/* Search Mode Toggles & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMode('semantic'); executeSemanticSearch(semanticQuery); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'semantic'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Matching</span>
            </button>
            <button
              onClick={() => { setMode('structured'); executeStructuredSearch(); }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'structured'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Keyword & Filters</span>
            </button>
          </div>

          {resultCount !== null && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span>{resultCount} {resultCount === 1 ? 'supply found' : 'supplies found'}</span>
            </div>
          )}
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          {mode === 'semantic' ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Describe what you need:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-indigo-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  placeholder="Describe what you need... (e.g. 'I need something to connect a laptop to a projector')"
                  className="w-full pl-10 pr-28 py-2.5 text-xs sm:text-sm border border-slate-200 focus:border-indigo-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-100 font-medium"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Searching...' : 'Find Matches'}
                </button>
              </div>

              {/* Sample Suggested Searches */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-medium text-slate-400">Suggested searches:</span>
                {[
                  'I need something to connect my laptop to a projector',
                  'variable voltage power supply for hardware prototyping',
                  'USB-C display adapters and ethernet dongles',
                  'slide remote clicker for presentation conference',
                  'extension power spike guards for lab desks'
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setSemanticQuery(prompt);
                      executeSemanticSearch(prompt);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-colors border border-slate-200"
                  >
                    "{prompt.substring(0, 32)}..."
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Keyword Search:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={keywordQuery}
                  onChange={(e) => setKeywordQuery(e.target.value)}
                  placeholder="Search by title, location, or keyword..."
                  className="w-full pl-10 pr-24 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Search
                </button>
              </div>
            </div>
          )}

          {/* Filters Selectors */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="">Any Condition</option>
                <option value="NEW">New</option>
                <option value="LIKE_NEW">Like New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Min. Available Qty</label>
              <input
                type="number"
                min="1"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                placeholder="1"
                className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Results Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Available Supplies ({supplies.length})
          </h2>
          {mode === 'semantic' && (
            <span className="text-xs font-medium text-slate-500">
              Ranked by relevance
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
            <RotateCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Searching campus supplies catalog...</p>
          </div>
        ) : supplies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {supplies.map((supply) => (
              <SupplyCard
                key={supply.id}
                supply={supply}
                onRequestClick={handleOpenRequestModal}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">No surplus supplies match current filters</h3>
            <p className="text-xs text-slate-500">
              Try adjusting your search criteria or register a new campus requirement in Requests.
            </p>
          </div>
        )}
      </div>

      {/* Request Modal */}
      {selectedSupplyForRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Request Supply
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Request {selectedSupplyForRequest.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSupplyForRequest(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalFeedback?.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalFeedback.error}</span>
              </div>
            )}

            {modalFeedback?.success ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800 text-sm">
                    <span>✓ Supply Reserved Successfully!</span>
                  </div>
                  <p>{modalFeedback.success}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Link
                    href="/transfers"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    View in Transfers
                  </Link>
                  <button
                    onClick={() => setSelectedSupplyForRequest(null)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequestAndReserve} className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                  <div><strong>Donor Department:</strong> {selectedSupplyForRequest.department_name}</div>
                  <div><strong>Current Stock Available:</strong> <span className="text-emerald-700 font-bold">{selectedSupplyForRequest.quantity_available} units</span></div>
                  <div><strong>Location:</strong> {selectedSupplyForRequest.location_details}</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Units to Request (Max: {selectedSupplyForRequest.quantity_available})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedSupplyForRequest.quantity_available}
                    required
                    value={requestQty}
                    onChange={(e) => setRequestQty(parseInt(e.target.value, 10))}
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
                    value={requestPurpose}
                    onChange={(e) => setRequestPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Urgency Level
                  </label>
                  <select
                    value={requestUrgency}
                    onChange={(e) => setRequestUrgency(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="LOW">Low (Next Month)</option>
                    <option value="MEDIUM">Medium (Next 1-2 Weeks)</option>
                    <option value="HIGH">High (Within 3 Days)</option>
                    <option value="URGENT">Urgent (Immediate Event / Lab Work)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedSupplyForRequest(null)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRequest}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                  >
                    {isSubmittingRequest ? 'Reserving...' : 'Submit Request & Reserve'}
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

