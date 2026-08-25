'use client';

import React, { useState } from 'react';
import { Play, Clock, CheckCircle, Database, AlertCircle, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface DemoModule {
  id: number;
  title: string;
  category: string;
  viva_explanation: string;
  sql: string;
}

interface SqlDemoRunnerProps {
  module: DemoModule;
}

export const SqlDemoRunner: React.FC<SqlDemoRunnerProps> = ({ module }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runQuery = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/sql-demo?id=${module.id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Execution failed.');
      }
      setResultData(data);
    } catch (err: any) {
      setError(err.message || 'Execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const getResultHeaders = (rows: any[]) => {
    if (!rows || rows.length === 0) return [];
    if (typeof rows[0] !== 'object') return ['Value'];
    return Object.keys(rows[0]);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-all">
      {/* Module Header */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              {module.category}
            </span>
            <span className="text-xs font-semibold text-slate-400">Demo #{module.id}</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-1">{module.title}</h3>
        </div>

        <button
          onClick={runQuery}
          disabled={isRunning}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-all',
            isRunning
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
          )}
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Executing Query...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Live Demo Query</span>
            </>
          )}
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Viva Explanation Alert Box */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
          <Database className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block mb-0.5">What to explain in Viva:</strong>
            <p className="leading-relaxed text-amber-800">{module.viva_explanation}</p>
          </div>
        </div>

        {/* SQL Code Box */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-slate-500 font-mono">SQL Implementation:</span>
            <span className="text-[11px] text-slate-400 font-mono">PostgreSQL 15+ / pgvector</span>
          </div>
          <pre className="p-3.5 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
            <code>{module.sql}</code>
          </pre>
        </div>

        {/* Query Output Area */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resultData && (
          <div className="space-y-2 pt-2 border-t border-slate-100 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold flex items-center gap-1 text-slate-900">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Live Execution Results ({resultData.row_count} {resultData.row_count === 1 ? 'row' : 'rows'})
              </span>
              <span className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                <Clock className="w-3 h-3 text-slate-400" />
                Duration: {resultData.execution_time_ms} ms
              </span>
            </div>

            {Array.isArray(resultData.results) && resultData.results.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      {getResultHeaders(resultData.results).map((header) => (
                        <th key={header} className="px-3 py-2 whitespace-nowrap font-mono text-[11px]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultData.results.map((row: any, rIdx: number) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        {getResultHeaders(resultData.results).map((header) => {
                          const val = row[header];
                          return (
                            <td key={header} className="px-3 py-2 text-slate-800 whitespace-nowrap font-mono text-[11px]">
                              {val === null || val === undefined
                                ? <span className="text-slate-400 italic">NULL</span>
                                : typeof val === 'object'
                                ? JSON.stringify(val)
                                : String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-mono">
                {JSON.stringify(resultData.results, null, 2)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
