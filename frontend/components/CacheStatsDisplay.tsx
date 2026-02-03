'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Database, Zap, TrendingUp } from 'lucide-react';
import { CacheStats } from '@/types';

interface CacheStatsDisplayProps {
  stats: CacheStats;
  onClearCache: () => void;
}

export function CacheStatsDisplay({ stats, onClearCache }: CacheStatsDisplayProps) {
  const contextCache = stats.context_cache;
  const semanticCache = stats.semantic_cache;

  const contextUtilization = contextCache.utilization_percent;
  const semanticUtilization = semanticCache.max_entries > 0
    ? (semanticCache.entries / semanticCache.max_entries) * 100
    : 0;
  const averageUtilization = (contextUtilization + semanticUtilization) / 2;

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl p-6 shadow-xl animate-in slide-in-from-left-4 duration-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-30 animate-pulse"></div>
            <div className="relative p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg">
              <Database className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              AI Cache Performance
            </h3>
            <p className="text-sm text-muted-foreground">Real-time caching statistics and cost optimization</p>
          </div>
        </div>
        <Button
          onClick={onClearCache}
          variant="outline"
          size="sm"
          className="bg-white/80 dark:bg-slate-800/80 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-purple-400 transition-all duration-300 rounded-lg shadow-sm hover:shadow-md"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Clear Cache
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Stats */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              💰
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {averageUtilization.toFixed(1)}%
            </div>
            <div className="text-sm font-medium text-blue-700">Average cache utilization</div>
            <div className="text-xs text-blue-600 mt-1">Context + semantic caches</div>
          </div>
        </div>

        {/* Context Cache */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Context Cache</h3>
              <p className="text-sm text-gray-600">Security context and intent</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-gray-900">{contextCache.entries}</span>
              <span className="text-sm text-gray-600">entries</span>
            </div>
            <div className="text-sm text-gray-600">Size: {(contextCache.total_size_mb).toFixed(1)} MB</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Utilization</span>
                <span>{contextUtilization.toFixed(1)}%</span>
              </div>
              <Progress value={contextUtilization} className="h-2" />
            </div>
          </div>
        </div>

        {/* Semantic Cache */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Semantic Cache</h3>
              <p className="text-sm text-gray-600">AI recommendations & patterns</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-gray-900">{semanticCache.entries}</span>
              <span className="text-sm text-gray-600">entries</span>
            </div>
            <div className="text-sm text-gray-600">Model: {semanticCache.model_name || 'Unknown'}</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Utilization</span>
                <span>{semanticUtilization.toFixed(1)}%</span>
              </div>
              <Progress value={semanticUtilization} className="h-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
          <div>
            <span className="font-medium">Context Cache:</span>
            <br />
            {contextCache.entries} entries
          </div>
          <div>
            <span className="font-medium">Semantic Cache:</span>
            <br />
            {semanticCache.entries} entries
          </div>
          <div>
            <span className="font-medium">Embedding Dim:</span>
            <br />
            {semanticCache.embedding_dimension}
          </div>
          <div>
            <span className="font-medium">Last Updated:</span>
            <br />
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}