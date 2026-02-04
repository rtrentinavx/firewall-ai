'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, Activity, Trash2, AlertCircle, CheckCircle, Loader2, BarChart3, Clock } from 'lucide-react';
import axios from 'axios';

type TelemetryEvent = {
  timestamp: string;
  event_type: string;
  event_name: string;
  metadata: Record<string, any>;
};

type TelemetryStats = {
  total_events: number;
  events_by_type: Record<string, number>;
  events_by_name: Record<string, number>;
  performance_metrics: Record<string, number>;
  time_range_hours: number;
};

type TelemetryConfig = {
  enabled: boolean;
  use_opentelemetry: boolean;
  config_file: string;
};

export default function TelemetryPanel() {
  const [config, setConfig] = useState<TelemetryConfig | null>(null);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(24);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  const getAuthHeaders = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authBasic');
      if (token) {
        return {
          'Authorization': `Basic ${token}`,
          'Content-Type': 'application/json',
        };
      }
    }
    return {
      'Content-Type': 'application/json',
    };
  };

  const loadConfig = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.get(`${baseURL}/telemetry/config`, {
        headers: getAuthHeaders(),
      });
      
      if (response.data.success) {
        setConfig(response.data.config);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to load telemetry config');
      }
    }
  };

  const toggleTelemetry = async (enabled: boolean) => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.post(
        `${baseURL}/telemetry/config`,
        { enabled, use_opentelemetry: config?.use_opentelemetry },
        { headers: getAuthHeaders() }
      );
      
      if (response.data.success) {
        setConfig(response.data.config);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to update telemetry config');
      }
    }
  };

  const toggleOpenTelemetry = async (enabled: boolean) => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.post(
        `${baseURL}/telemetry/config`,
        { enabled: config?.enabled, use_opentelemetry: enabled },
        { headers: getAuthHeaders() }
      );
      
      if (response.data.success) {
        setConfig(response.data.config);
        // Note: OpenTelemetry setting requires server restart to take full effect
        setSuccess('OpenTelemetry setting updated. Server restart required for full effect.');
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to update OpenTelemetry config');
      }
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const params: Record<string, any> = { hours: timeRange, limit: 1000 };
      if (eventTypeFilter !== 'all') {
        params.event_type = eventTypeFilter;
      }
      
      const response = await axios.get(`${baseURL}/telemetry/events`, {
        params,
        headers: getAuthHeaders(),
      });
      
      if (response.data.success) {
        setEvents(response.data.events);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to load events');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.get(`${baseURL}/telemetry/stats`, {
        params: { hours: timeRange },
        headers: getAuthHeaders(),
      });
      
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to load stats');
      }
    }
  };

  const clearEvents = async () => {
    if (!confirm('Are you sure you want to clear all telemetry events?')) {
      return;
    }

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.delete(`${baseURL}/telemetry/events`, {
        headers: getAuthHeaders(),
      });
      
      if (response.data.success) {
        await loadEvents();
        await loadStats();
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to clear events');
      }
    }
  };

  const refresh = async () => {
    await Promise.all([loadConfig(), loadEvents(), loadStats()]);
  };

  useEffect(() => {
    refresh();
  }, [timeRange, eventTypeFilter]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'user_action':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'system':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'performance':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-xl shadow-indigo-100/20 dark:border-slate-800/70 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Telemetry & Logs</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Monitor application usage, events, and performance metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {config && (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  id="telemetry-toggle"
                  checked={config.enabled}
                  onCheckedChange={toggleTelemetry}
                />
                <Label htmlFor="telemetry-toggle" className="text-sm">
                  {config.enabled ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
              <div className="flex items-center gap-2 border-l border-slate-300 dark:border-slate-700 pl-3">
                <Switch
                  id="opentelemetry-toggle"
                  checked={config.use_opentelemetry}
                  onCheckedChange={toggleOpenTelemetry}
                />
                <Label htmlFor="opentelemetry-toggle" className="text-sm">
                  OpenTelemetry: {config.use_opentelemetry ? 'On' : 'Off'}
                </Label>
              </div>
            </>
          )}
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Total Events</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.total_events}</p>
            </div>
            {config && (
              <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Backend</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={stats.backend || 'custom'}>
                  {stats.backend === 'opentelemetry' ? 'OpenTelemetry' : 'Custom'}
                </p>
                {stats.exported_to && stats.exported_to !== 'none' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    → {stats.exported_to === 'google_cloud_monitoring' ? 'GCP Monitoring' : stats.exported_to}
                  </p>
                )}
              </div>
            )}
            {Object.entries(stats.events_by_type).slice(0, 3).map(([type, count]) => (
              <div key={type} className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">{type}</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">{count}</p>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Event Logs</CardTitle>
                    <CardDescription>Application events and user actions</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={eventTypeFilter}
                      onChange={(e) => setEventTypeFilter(e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="all">All Types</option>
                      <option value="user_action">User Actions</option>
                      <option value="system">System</option>
                      <option value="error">Errors</option>
                      <option value="performance">Performance</option>
                    </select>
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(Number(e.target.value))}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value={1}>Last Hour</option>
                      <option value={24}>Last 24 Hours</option>
                      <option value={168}>Last 7 Days</option>
                      <option value={720}>Last 30 Days</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={clearEvents}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500">Loading events...</p>
                  </div>
                ) : events.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No events found for the selected time range.
                  </p>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {events.map((event, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                        >
                          <Badge className={getEventTypeColor(event.event_type)}>
                            {event.event_type}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-slate-900 dark:text-white">{event.event_name}</p>
                              <span className="text-xs text-slate-500">
                                <Clock className="inline h-3 w-3 mr-1" />
                                {formatDate(event.timestamp)}
                              </span>
                            </div>
                            {Object.keys(event.metadata).length > 0 && (
                              <pre className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(event.metadata, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Statistics</CardTitle>
                <CardDescription>Breakdown of events by type and name</CardDescription>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-3">Events by Type</h4>
                      <div className="space-y-2">
                        {Object.entries(stats.events_by_type).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">{type}</span>
                            <Badge>{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Top Events</h4>
                      <div className="space-y-2">
                        {Object.entries(stats.events_by_name)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 10)
                          .map(([name, count]) => (
                            <div key={name} className="flex items-center justify-between">
                              <span className="text-sm text-slate-600 dark:text-slate-400 truncate">{name}</span>
                              <Badge>{count}</Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-8 text-slate-500">No statistics available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Average performance metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                {stats && Object.keys(stats.performance_metrics).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(stats.performance_metrics).map(([metric, value]) => (
                      <div key={metric}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{metric}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {typeof value === 'number' ? value.toFixed(2) : value}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (value / 100) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-slate-500">No performance metrics available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
