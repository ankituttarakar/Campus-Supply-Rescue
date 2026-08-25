'use client';

import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Database, 
  CheckCircle2, 
  Play, 
  Layers, 
  ShieldCheck, 
  Sparkles, 
  RotateCw,
  Cpu,
  BookOpen
} from 'lucide-react';
import { SqlDemoRunner } from '@/components/SqlDemoRunner';

export default function SqlDemoPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sql-demo')
      .then((res) => res.json())
      .then((data) => {
        setModules(data.modules || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load demo modules', err);
        setIsLoading(false);
      });
  }, []);

  const categories = ['ALL', 'Relational Querying', 'Aggregations', 'Subqueries', 'Views', 'Stored Procedures', 'Concurrency Control', 'Triggers', 'Indexing & Performance', 'Vector Database'];

  const filteredModules = selectedCategory === 'ALL'
    ? modules
    : modules.filter((m) => m.category === selectedCategory);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Terminal className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Live DBMS Level 3 Evaluation Suite
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Interactive DBMS Demonstration Studio
              </h1>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
            10 Curated Viva Demonstration Modules
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          This studio allows students and evaluators to execute every required DBMS Level 3 concept against the live PostgreSQL database. 
          Each demonstration executes parameterized SQL queries, stored procedures, or triggers, returning formatted runtime tables, execution timing, and clear viva explanations.
        </p>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Demonstration Cards List */}
      {isLoading ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
          <RotateCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading DBMS viva demonstration test suite...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredModules.map((module) => (
            <SqlDemoRunner key={module.id} module={module} />
          ))}
        </div>
      )}

      {/* Viva Explanation Cheat Sheet Summary Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Viva Evaluator Summary & Narrative
          </h2>
        </div>
        <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
          <blockquote className="border-l-4 border-emerald-500 pl-3 italic text-slate-800">
            “Campus Supply Rescue solves a simple operational problem: one college department may have usable resources sitting unused while another department purchases the same thing because they cannot discover it. Our system lets departments register surplus supplies and lets other departments search for them. PostgreSQL stores the structured transactional data, while pgvector allows natural-language requests to discover semantically similar supplies. PostgreSQL transactions and row-level locking prevent two departments from reserving the same stock. Triggers maintain history and audit information, stored procedures handle critical operations, views support analytics, and the Rescue Chain records how resources move across departments.”
          </blockquote>
          <p>
            During the examination, you can click <strong>Run Live Demo Query</strong> on any module above to demonstrate the underlying database engine execution directly.
          </p>
        </div>
      </div>
    </div>
  );
}
