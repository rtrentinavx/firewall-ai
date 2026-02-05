'use client';

import React, { useEffect, useState } from 'react';
import { auditApi } from '@/lib/api';
import { CacheStats } from '@/types';
import { CacheStatsDisplay } from '@/components/CacheStatsDisplay';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap } from 'lucide-react';

export default function CachePerformancePanel() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await auditApi.getCacheStats();
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-xl shadow-indigo-100/20 dark:border-slate-800/70 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Cache Performance</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Monitor context + semantic cache utilization to optimize audit speed.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading cache performance...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-xl shadow-indigo-100/20 dark:border-slate-800/70 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Cache Performance</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Monitor context + semantic cache utilization to optimize audit speed.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-300">Cache stats unavailable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-xl shadow-indigo-100/20 dark:border-slate-800/70 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Cache Performance</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Monitor context + semantic cache utilization to optimize audit speed.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing' : 'Refresh'}
        </Button>
      </div>
      <div className="p-6">
        <CacheStatsDisplay stats={stats} onClearCache={auditApi.clearCache} />
      </div>
    </div>
  );
}
