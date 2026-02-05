'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, BarChart3, Clock, CheckCircle, XCircle, Zap, TrendingUp, Activity } from 'lucide-react';

type AnalysisStats = {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  cached_calls: number;
  total_rules_analyzed: number;
  total_violations_found: number;
  total_recommendations: number;
  avg_execution_time_seconds: number;
  total_execution_time_seconds: number;
  calls_by_provider: Record<string, number>;
  calls_by_hour: Array<{ hour: string; count: number }>;
  recent_calls: Array<{
    timestamp: string;
    rule_count: number;
    intent: string;
    cloud_provider: string;
    execution_time_seconds: number;
    violations_found: number;
    recommendations_count: number;
    cached: boolean;
    success: boolean;
    error?: string;
  }>;
  time_range_hours: number;
};

export default function AnalysisTrackingPanel() {
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState(24);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/analytics/stats?hours=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to load analysis stats');
      }
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load analysis stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  if (loading && !stats) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-xl shadow-indigo-100/20 dark:border-slate-800/70 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Analysis Agent Tracking</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Monitor analysis calls, performance, and usage patterns.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading tracking data...</p>
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
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Analysis Agent Tracking</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Monitor analysis calls, performance, and usage patterns.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 dark:text-slate-300">Unable to load tracking data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-xl shadow-indigo-100/20 dark:border-slate-800/70 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Analysis Agent Tracking</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Monitor analysis calls, performance, and usage patterns.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Button
              variant={timeRange === 24 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(24)}
            >
              24h
            </Button>
            <Button
              variant={timeRange === 168 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(168)}
            >
              7d
            </Button>
            <Button
              variant={timeRange === 720 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(720)}
            >
              30d
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="providers">By Provider</TabsTrigger>
            <TabsTrigger value="recent">Recent Calls</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Total Calls</p>
                <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">{stats.total_calls}</div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {stats.successful_calls} successful, {stats.failed_calls} failed
                </p>
              </div>

              <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Rules Analyzed</p>
                <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">{stats.total_rules_analyzed.toLocaleString()}</div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Avg {stats.total_calls > 0 ? Math.round(stats.total_rules_analyzed / stats.total_calls) : 0} per call
                </p>
              </div>

              <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Avg Execution Time</p>
                <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">{formatDuration(stats.avg_execution_time_seconds)}</div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Total: {formatDuration(stats.total_execution_time_seconds)}
                </p>
              </div>

              <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Cache Hit Rate</p>
                <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">
                  {stats.total_calls > 0
                    ? Math.round((stats.cached_calls / stats.total_calls) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {stats.cached_calls} cached calls
                </p>
              </div>

              <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Violations Found</p>
                <div className="text-2xl font-semibold text-red-600 dark:text-red-400 mb-1">{stats.total_violations_found}</div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Avg {stats.total_calls > 0 ? (stats.total_violations_found / stats.total_calls).toFixed(1) : 0} per call
                </p>
              </div>

              <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Recommendations</p>
                <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-1">{stats.total_recommendations}</div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Avg {stats.total_calls > 0 ? (stats.total_recommendations / stats.total_calls).toFixed(1) : 0} per call
                </p>
              </div>

              <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Success Rate</p>
                <div className="text-2xl font-semibold text-green-600 dark:text-green-400 mb-1">
                  {stats.total_calls > 0
                    ? Math.round((stats.successful_calls / stats.total_calls) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {stats.successful_calls} / {stats.total_calls} calls
                </p>
              </div>

              <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Time Range</p>
                <div className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">{stats.time_range_hours}h</div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Last {stats.time_range_hours === 24 ? '24 hours' : stats.time_range_hours === 168 ? '7 days' : '30 days'}
                </p>
              </div>
            </div>

            {stats.calls_by_hour.length > 0 && (
              <div className="mt-6 rounded-xl border border-slate-200/70 bg-white/80 p-6 dark:border-slate-800/70 dark:bg-slate-900/40">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Call Volume Over Time</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Calls per hour</p>
                <div>
                  <div className="flex items-end gap-2 h-32">
                    {stats.calls_by_hour.map((item, index) => {
                      const maxCount = Math.max(...stats.calls_by_hour.map(h => h.count), 1);
                      const height = (item.count / maxCount) * 100;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-indigo-500 rounded-t transition-all"
                            style={{ height: `${height}%` }}
                            title={`${item.hour}: ${item.count} calls`}
                          />
                          <span className="text-xs text-slate-500 mt-1 truncate w-full text-center">
                            {new Date(item.hour).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="providers" className="mt-6">
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-6 dark:border-slate-800/70 dark:bg-slate-900/40">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Calls by Cloud Provider</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Distribution of analysis calls across providers</p>
              <div>
                {Object.keys(stats.calls_by_provider).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(stats.calls_by_provider)
                      .sort(([, a], [, b]) => b - a)
                      .map(([provider, count]) => {
                        const percentage = stats.total_calls > 0
                          ? Math.round((count / stats.total_calls) * 100)
                          : 0;
                        return (
                          <div key={provider} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="uppercase">
                                {provider}
                              </Badge>
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {count} calls
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-indigo-500 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">No provider data available</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-6 dark:border-slate-800/70 dark:bg-slate-900/40">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Recent Analysis Calls</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Last 20 analysis calls</p>
              <div>
                <ScrollArea className="h-[500px]">
                  {stats.recent_calls.length > 0 ? (
                    <div className="space-y-3">
                      {stats.recent_calls.map((call, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {call.success ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-sm font-medium">
                                {formatTimestamp(call.timestamp)}
                              </span>
                              {call.cached && (
                                <Badge variant="secondary" className="text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Cached
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                              {call.intent || 'No intent specified'}
                            </p>
                            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                              <span>
                                <strong>{call.rule_count}</strong> rules
                              </span>
                              <span>
                                Provider: <strong className="uppercase">{call.cloud_provider}</strong>
                              </span>
                              <span>
                                Time: <strong>{formatDuration(call.execution_time_seconds)}</strong>
                              </span>
                              {call.success && (
                                <>
                                  <span>
                                    Violations: <strong className="text-red-600">{call.violations_found}</strong>
                                  </span>
                                  <span>
                                    Recommendations: <strong className="text-blue-600">{call.recommendations_count}</strong>
                                  </span>
                                </>
                              )}
                            </div>
                            {call.error && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                Error: {call.error}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-8">No recent calls</p>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
