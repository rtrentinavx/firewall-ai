'use client';

import React, { useEffect, useState } from 'react';
import { auditApi } from '@/lib/api';
import { CacheStats } from '@/types';
import { CacheStatsDisplay } from '@/components/CacheStatsDisplay';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

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
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-sm text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300">
        Loading cache performance...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-sm text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300">
        <div className="flex items-center justify-between">
          <span>Cache stats unavailable.</span>
          <Button variant="outline" size="sm" onClick={loadStats}>
            <RefreshCw className="mr-2 h-4 w-4" />Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Cache Performance</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Monitor context + semantic cache utilization to optimize audit speed.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadStats}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>
      <CacheStatsDisplay stats={stats} onClearCache={auditApi.clearCache} />
    </div>
  );
}
