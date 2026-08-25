'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PackagePlus, 
  Sparkles, 
  Building, 
  MapPin, 
  Tag, 
  Layers, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft 
} from 'lucide-react';
import { SupplyCategory } from '@/lib/types';

export default function NewSupplyPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<SupplyCategory[]>([]);
  const [userSession, setUserSession] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [quantityTotal, setQuantityTotal] = useState('5');
  const [condition, setCondition] = useState('LIKE_NEW');
  const [locationDetails, setLocationDetails] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [availabilityUntil, setAvailabilityUntil] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/session')
      .then((res) => res.json())
      .then((data) => {
        setUserSession(data.user);
        if (data.categories) {
          setCategories(data.categories);
          if (data.categories.length > 0) {
            setCategoryId(String(data.categories[0].id));
          }
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/supplies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category_id: parseInt(categoryId, 10),
          description,
          quantity_total: parseInt(quantityTotal, 10),
          condition,
          location_details: locationDetails,
          estimated_replacement_value: estimatedValue ? parseFloat(estimatedValue) : null,
          availability_until: availabilityUntil || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to list surplus supply.');
      }

      setSuccessMsg(`Surplus listing "${title}" published successfully!`);
      setTimeout(() => {
        router.push(`/supplies/${data.supply.id}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Submission error.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCategoryName = categories.find((c) => String(c.id) === categoryId)?.name || 'General';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/supplies"
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">List Surplus Supply</h1>
          <p className="text-xs text-slate-500">
            List usable resources your department no longer needs so another department can use them before purchasing new supplies.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Department Ownership Note */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Listing from: <strong className="text-slate-900">{userSession?.department_name || 'My Department'} ({userSession?.department_code || 'DEPT'})</strong></span>
            </div>
            <span className="text-slate-400 text-[11px]">Department Staff</span>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supply Item Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 10x High-Speed 2-Meter HDMI Cables (Black)"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Condition *
              </label>
              <select
                required
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="NEW">New (Unopened / In Packaging)</option>
                <option value="LIKE_NEW">Like New (Barely used, fully functional)</option>
                <option value="GOOD">Good (Functional with minor cosmetic signs)</option>
                <option value="FAIR">Fair (Usable for standard lab work)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description & Specifications *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe specifications, capabilities, connector types, or intended lab use..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Help other departments understand compatibility and condition.
            </p>
          </div>

          {/* Quantity & Replacement Value */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity Available *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantityTotal}
                onChange={(e) => setQuantityTotal(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Est. Replacement Value (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="Optional e.g. 3500"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400">Used to track avoided procurement value</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Available Until (Optional)
              </label>
              <input
                type="date"
                value={availabilityUntil}
                onChange={(e) => setAvailabilityUntil(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Location in Campus */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Campus Location / Storage Desk *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="e.g. Alan Turing Block, Hardware Lab 302, Locker Shelf B"
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Search Index Summary Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Smart Search Discovery:</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This listing will be automatically discoverable by other departments when they search for matching equipment or describe related requirements.
            </p>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/supplies"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <PackagePlus className="w-4 h-4" />
              <span>{isLoading ? 'Publishing...' : 'List Surplus Supply'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

