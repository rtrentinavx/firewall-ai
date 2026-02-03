'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, RefreshCw, Server, ShieldCheck } from 'lucide-react';

type HealthResponse = {
  status: string;
  version: string;
  components: Record<string, string>;
  supported_providers?: string[];
};

export default function AdminStatusPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/health');
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      const data = await response.json();
      setHealth(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-xl shadow-indigo-100/20 dark:border-slate-800/70 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">System control center</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Monitor core services, runtime health, and cloud readiness.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="border border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            {health?.status ?? 'Unknown'}
          </Badge>
          <Button variant="outline" size="sm" onClick={loadHealth} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {loading ? 'Refreshing' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-slate-500">Runtime</p>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
            {health?.status ?? 'Unknown'}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Version {health?.version ?? '—'}</p>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-slate-500">Core services</p>
            <Server className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {health?.components
              ? Object.entries(health.components).map(([name, status]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="capitalize text-slate-600 dark:text-slate-300">{name}</span>
                    <Badge variant="secondary">{status}</Badge>
                  </div>
                ))
              : <p className="text-slate-500">No data</p>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
          <p className="text-xs uppercase text-slate-500">Cloud providers</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {health?.supported_providers?.length
              ? health.supported_providers.map((provider) => (
                  <Badge key={provider} variant="outline">
                    {provider.toUpperCase()}
                  </Badge>
                ))
              : <span className="text-sm text-slate-500">No providers</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
