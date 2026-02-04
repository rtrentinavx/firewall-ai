'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, RefreshCw, Server, ShieldCheck, Brain } from 'lucide-react';

type HealthResponse = {
  status: string;
  version: string;
  components: Record<string, string>;
  supported_providers?: string[];
  embedding_model?: {
    model_name: string;
    provider: string;
    library: string;
    embedding_dimension: number;
    model_loaded: boolean;
  };
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

      <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Runtime</p>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">
            {health?.status ?? 'Unknown'}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Version {health?.version ?? '—'}</p>
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Core services</p>
            <Server className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex-1 space-y-2 text-sm">
            {health?.components
              ? Object.entries(health.components).map(([name, status]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="capitalize text-slate-600 dark:text-slate-300">{name}</span>
                    <Badge variant="secondary">{status}</Badge>
                  </div>
                ))
              : <p className="text-slate-500 dark:text-slate-400">No data</p>}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Cloud providers</p>
          </div>
          <div className="flex-1 flex flex-wrap gap-2 items-start">
            {health?.supported_providers?.length
              ? health.supported_providers.map((provider) => (
                  <Badge key={provider} variant="outline">
                    {provider.toUpperCase()}
                  </Badge>
                ))
              : <span className="text-sm text-slate-500 dark:text-slate-400">No providers</span>}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Embedding Model</p>
            <Brain className="h-4 w-4 text-slate-400" />
          </div>
          {health?.embedding_model ? (
            <>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1 truncate" title={health.embedding_model.model_name}>
                {health.embedding_model.model_name}
              </p>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <p>Provider: {health.embedding_model.provider}</p>
                <p>Library: {health.embedding_model.library}</p>
                <p>Dimension: {health.embedding_model.embedding_dimension}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Not available</p>
          )}
        </div>
      </div>
    </div>
  );
}
