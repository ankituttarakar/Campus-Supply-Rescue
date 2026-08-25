'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Shield, 
  Building, 
  RotateCw, 
  AlertCircle, 
  Search, 
  Clock, 
  FileSpreadsheet,
  Layers,
  Users
} from 'lucide-react';
import { AuditLog, Department, CategorySurplusAnalysis } from '@/lib/types';

export default function AdminPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<CategorySurplusAnalysis[]>([]);
  const [searchAction, setSearchAction] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Audit Logs
      const auditRes = await fetch(`/api/admin/audit${searchAction ? `?action=${encodeURIComponent(searchAction)}` : ''}`);
      const auditData = await auditRes.json();
      if (!auditRes.ok) {
        throw new Error(auditData.error || 'Access denied. Administrator privileges required.');
      }
      setAuditLogs(auditData.audit_logs || []);

      // 2. Fetch Dashboard & Session metadata
      const dashRes = await fetch('/api/dashboard');
      const dashData = await dashRes.json();
      setCategories(dashData.categories || []);

      const sessRes = await fetch('/api/session');
      const sessData = await sessRes.json();
      setDepartments(sessData.departments || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative console.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminData();
  };

  const formatActionName = (action: string) => {
    const formatted = action.replace(/_/g, ' ');
    if (formatted.toLowerCase().includes('create') || formatted.toLowerCase().includes('insert')) return 'Supply Listed';
    if (formatted.toLowerCase().includes('reserve')) return 'Units Reserved';
    if (formatted.toLowerCase().includes('handover') || formatted.toLowerCase().includes('transfer')) return 'Handover Completed';
    if (formatted.toLowerCase().includes('request')) return 'Request Submitted';
    return formatted;
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
              Administrator Console
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Campus Administration & Audit Log
          </h1>
          <p className="text-xs text-slate-500">
            System governance, departmental directory, surplus distribution analysis, and activity audit trail
          </p>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>Administrator Access Required</span>
          </div>
          <p>{error}</p>
          <p className="text-[11px] text-slate-600">
            Please switch to or sign in with an Administrator account (e.g., Ankit Uttarakar) using the account menu.
          </p>
        </div>
      )}

      {!error && (
        <div className="space-y-8">
          {/* Top 2 Grid: Department Directory & Surplus Pattern Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Directory */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-600" />
                  Academic Departments ({departments.length})
                </h2>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {departments.map((d) => (
                  <div key={d.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-xs flex justify-between items-center">
                    <div>
                      <strong className="text-slate-900 font-semibold">{d.name}</strong>
                      <span className="text-[11px] text-slate-500 block">{d.building}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                      {d.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Surplus Pattern Analysis */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  Category Inventory Overview
                </h2>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {categories.map((c) => (
                  <div key={c.category_id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-xs flex justify-between items-center">
                    <div>
                      <strong className="text-slate-900 font-semibold">{c.category_name}</strong>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Listings: <strong>{c.active_listings_count}</strong></span>
                        <span>• Rescued: <strong>{c.total_rescued_units} units</strong></span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {c.current_available_units} Available
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System Audit Trail */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Campus Resource Audit Log
                </h2>
                <p className="text-xs text-slate-500">
                  Comprehensive activity history of supply listings, requests, reservations, and handovers
                </p>
              </div>

              <form onSubmit={handleFilterSubmit} className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchAction}
                    onChange={(e) => setSearchAction(e.target.value)}
                    placeholder="Filter by action..."
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                >
                  Filter
                </button>
              </form>
            </div>

            {isLoading ? (
              <div className="p-12 text-center space-y-2">
                <RotateCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Loading audit log...</p>
              </div>
            ) : auditLogs.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5">Date & Time</th>
                      <th className="px-3.5 py-2.5">Action</th>
                      <th className="px-3.5 py-2.5">Resource</th>
                      <th className="px-3.5 py-2.5">User</th>
                      <th className="px-3.5 py-2.5">Department</th>
                      <th className="px-3.5 py-2.5">Status / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[11px]">
                            {formatActionName(log.action)}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-800 font-medium">
                          {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-900 font-medium">
                          {log.user_name || log.user_email || 'System'}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                          {log.department_name || 'N/A'}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 max-w-xs truncate">
                          {log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)) : 'Completed'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-8 text-center text-xs text-slate-400 italic">No audit records found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

