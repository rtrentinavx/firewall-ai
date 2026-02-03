'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, AlertTriangle, Upload, Download, RefreshCw, Zap, X } from 'lucide-react';
import { auditApi, utils } from '@/lib/api';
import { AuditRequest, AuditResult, FirewallRule, NormalizedRule, CacheStats, CloudProvider } from '@/types';
import RuleInputForm from '@/components/RuleInputForm';
import { AuditResults } from '@/components/AuditResults';
import { DiffViewer } from '@/components/DiffViewer';
import { CacheStatsDisplay } from '@/components/CacheStatsDisplay';
import { RuleFlowVisualization } from '@/components/RuleFlowVisualization';

export default function FirewallAuditDashboard() {
  // State management
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [analysisIntent, setAnalysisIntent] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AuditResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('input');
  const [selectedProvider, setSelectedProvider] = useState<string>('aviatrix');
  const [useSampleData, setUseSampleData] = useState(false);
  const cacheUtilization = cacheStats?.context_cache.utilization_percent;
  const semanticEntries = cacheStats?.semantic_cache.entries;

  // Load cache stats on mount
  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      const stats = await auditApi.getCacheStats();
      setCacheStats(stats);
    } catch (err) {
      console.error('Failed to load cache stats:', err);
    }
  };

  const handleAnalyze = async () => {
    if (rules.length === 0 && !useSampleData) {
      setError('Please add firewall rules or use sample data');
      return;
    }

    if (!analysisIntent.trim()) {
      setError('Please specify the analysis intent');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const analysisRules = useSampleData ? utils.generateSampleRules(selectedProvider || 'gcp') : rules;

      const request: AuditRequest = {
        rules: analysisRules,
        intent: analysisIntent,
        cloud_provider: selectedProvider || 'gcp'
      };

      const result = await auditApi.auditRules(request);
      setAnalysisResult(result);
      setActiveTab('results');

      // Refresh cache stats
      await loadCacheStats();
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await auditApi.clearCache();
      await loadCacheStats();
    } catch (err) {
      setError('Failed to clear cache');
    }
  };

  const handleAddRule = (rule: FirewallRule) => {
    setRules(prev => [...prev, rule]);
  };

  const handleAddMultipleRules = (newRules: FirewallRule[]) => {
    setRules(prev => [...prev, ...newRules]);
  };

  const handleRemoveRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const handleLoadSampleData = () => {
    const sampleRules = utils.generateSampleRules(selectedProvider || 'gcp');
    setRules(sampleRules);
  };

  const handleExportRules = () => {
    const dataStr = JSON.stringify(rules, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `firewall-rules-${selectedProvider || 'unknown'}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportRules = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedRules = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedRules)) {
          setRules(importedRules);
        } else {
          setError('Invalid file format');
        }
      } catch (err) {
        setError('Failed to parse file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/80 shadow-xl shadow-indigo-100/30 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70">
      <div className="border-b border-slate-200/60 px-6 py-4 dark:border-slate-800/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Intelligence command center</p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Firewall intelligence workspace</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">AI-powered rule analysis, conflict detection, and optimization.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {rules.length} rules loaded
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div className="flex-1">
                <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="rounded-xl border border-slate-200/60 bg-slate-50/80 p-1.5 dark:border-slate-800/70 dark:bg-slate-900/40">
            <TabsList className="grid w-full grid-cols-5 gap-1 bg-transparent">
              <TabsTrigger value="input" className="data-[state=active]:bg-white data-[state=active]:shadow dark:data-[state=active]:bg-slate-900">
                Rule intake
              </TabsTrigger>
              <TabsTrigger value="audit" className="data-[state=active]:bg-white data-[state=active]:shadow dark:data-[state=active]:bg-slate-900">
                Analysis setup
              </TabsTrigger>
              <TabsTrigger value="rules" className="data-[state=active]:bg-white data-[state=active]:shadow dark:data-[state=active]:bg-slate-900">
                Rules
              </TabsTrigger>
              <TabsTrigger value="results" disabled={!analysisResult} className="data-[state=active]:bg-white data-[state=active]:shadow dark:data-[state=active]:bg-slate-900">
                Results
              </TabsTrigger>
              <TabsTrigger value="diff" disabled={!analysisResult} className="data-[state=active]:bg-white data-[state=active]:shadow dark:data-[state=active]:bg-slate-900">
                Diff view
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="input" className="pt-6">
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200/70 bg-white/80 p-5 dark:border-slate-800/70 dark:bg-slate-900/60">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Cloud provider</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { id: 'aviatrix', name: 'Aviatrix DCF', icon: '🚀' }
                  ].map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedProvider(provider.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selectedProvider === provider.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                          : 'border-slate-200/70 bg-white/70 hover:border-slate-300 dark:border-slate-800/70 dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="text-2xl">{provider.icon}</div>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{provider.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-white/80 p-5 dark:border-slate-800/70 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Add firewall rules</h3>
                  <Badge variant="secondary">{rules.length} rules</Badge>
                </div>
                <div className="mt-4">
                  <RuleInputForm 
                    onAddRule={handleAddRule} 
                    onAddMultipleRules={handleAddMultipleRules}
                    provider={selectedProvider as CloudProvider} 
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={handleLoadSampleData} variant="outline">
                    <Zap className="mr-2 h-4 w-4" />Load sample rules
                  </Button>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <Upload className="h-4 w-4" />
                    Import JSON
                    <Input type="file" accept=".json" className="hidden" onChange={handleImportRules} />
                  </label>
                  <Button onClick={handleExportRules} variant="outline">
                    <Download className="mr-2 h-4 w-4" />Export rules
                  </Button>
                  <Button variant="outline" onClick={() => setRules([])}>
                    Clear all
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="pt-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl border border-slate-200/70 bg-white/80 p-6 dark:border-slate-800/70 dark:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-200">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">Security requirements</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Describe the intent and goals for your policy.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="intent" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Audit intent
                    </Label>
                    <Textarea
                      id="intent"
                      value={analysisIntent}
                      onChange={(e) => setAnalysisIntent(e.target.value)}
                      placeholder="Example: Allow public HTTPS, restrict database to private subnet, and block unused ports."
                      rows={4}
                      className="mt-2 bg-white/80 dark:bg-slate-900/60"
                    />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {[
                      'Secure public web application',
                      'Restrict database access to private subnets',
                      'Allow VPN traffic from branch offices',
                      'Block inbound except essential services'
                    ].map((template) => (
                      <button
                        key={template}
                        onClick={() => setAnalysisIntent(template)}
                        className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-left text-sm text-slate-600 hover:border-slate-300 dark:border-slate-800/70 dark:bg-slate-900/50 dark:text-slate-300"
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 p-6 text-white shadow-lg">
                <h3 className="text-lg font-semibold">Launch AI analysis</h3>
                <p className="mt-2 text-sm text-indigo-100">Neural engine will analyze your rules against intent and security best practices.</p>
                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Rules queued</span>
                    <span className="font-semibold">{rules.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Provider</span>
                    <span className="font-semibold">{selectedProvider?.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Intent status</span>
                    <span className="font-semibold">{analysisIntent.trim() ? 'Ready' : 'Missing'}</span>
                  </div>
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || (rules.length === 0 && !useSampleData) || !analysisIntent.trim()}
                  className="mt-6 w-full bg-white text-indigo-700 hover:bg-indigo-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />Analyze rules
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rules" className="pt-6">
            <div className="space-y-5">
              {/* Flow Visualization */}
              <div className="rounded-xl border border-slate-200/70 bg-white/80 p-5 dark:border-slate-800/70 dark:bg-slate-900/60">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">Network Flow Diagram</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Visual representation of firewall rules</p>
                  </div>
                  <Badge variant="secondary">{rules.length} rules</Badge>
                </div>
                <RuleFlowVisualization rules={rules} />
              </div>

              {/* Rules List */}
              <div className="rounded-xl border border-slate-200/70 bg-white/80 p-5 dark:border-slate-800/70 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Rules overview</h3>
                  <Badge variant="secondary">{rules.length} rules</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {rules.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      No rules loaded yet.
                    </div>
                  )}
                  {rules.map((rule, index) => (
                    <div key={rule.id || index} className="rounded-lg border border-slate-200/70 bg-white/70 p-3 text-sm dark:border-slate-800/70 dark:bg-slate-900/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{rule.name || `Rule ${index + 1}`}</p>
                          <p className="text-slate-500 dark:text-slate-400">
                            {rule.direction} • {rule.action} • {rule.protocols?.join(', ') || 'any'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRule(rule.id || `rule-${index}`)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {rule.source_ranges?.join(', ') || 'No source'} → {rule.destination_ranges?.join(', ') || 'No destination'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="pt-6">
            {analysisResult ? (
              <AuditResults result={analysisResult} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200/70 p-10 text-center text-sm text-slate-500 dark:border-slate-800/70 dark:text-slate-400">
                Run analysis to see security intelligence results.
              </div>
            )}
          </TabsContent>

          <TabsContent value="diff" className="pt-6">
            {analysisResult ? (
              <DiffViewer result={analysisResult} />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200/70 p-10 text-center text-sm text-slate-500 dark:border-slate-800/70 dark:text-slate-400">
                Run analysis to compare Terraform changes.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}