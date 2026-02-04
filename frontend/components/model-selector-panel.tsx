'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Brain, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import axios from 'axios';

type ModelConfig = {
  name: string;
  provider: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
  description: string;
  available: boolean;
};

type ModelsResponse = {
  success: boolean;
  current_model: ModelConfig | null;
  available_models: ModelConfig[];
};

export default function ModelSelectorPanel() {
  const [modelsData, setModelsData] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const loadModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.get(`${baseURL}/models`, {
        headers: getAuthHeaders(),
        timeout: 10000,
      });
      
      if (response.data.success) {
        setModelsData(response.data);
      } else {
        const errorMsg = response.data.error || response.data.details || 'Failed to load models';
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Error loading models:', err);
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          setError('Request timeout - backend may be slow or unresponsive');
        } else if (err.code === 'ECONNRESET') {
          setError('Connection reset - backend may have crashed. Please check backend logs.');
        } else {
          const errorData = err.response?.data;
          const errorMessage = errorData?.error || errorData?.details || err.message || 'Failed to load models';
          const status = err.response?.status;
          setError(status ? `[${status}] ${errorMessage}` : errorMessage);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load models');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchModel = async (modelId: string) => {
    if (switching) return;
    
    setSwitching(true);
    setError(null);
    setSuccess(null);
    
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.post(
        `${baseURL}/models/switch`,
        { model_id: modelId },
        { headers: getAuthHeaders() }
      );
      
      if (response.data.success) {
        setSuccess(`Model switched to ${response.data.current_model?.name || modelId}`);
        // Reload models to get updated current model
        await loadModels();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response.data.error || 'Failed to switch model');
      }
    } catch (err) {
      console.error('Failed to switch model:', err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to switch model';
        setError(errorMessage);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to switch model');
      }
    } finally {
      setSwitching(false);
    }
  };

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !modelsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Configuration</CardTitle>
          <CardDescription>Loading model information...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!modelsData && !loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-xl shadow-indigo-100/20 dark:border-slate-800/70 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Model Configuration</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Configure and switch between available AI models for analysis.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
              <CardDescription>Unable to load model information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button variant="outline" onClick={loadModels} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Retry'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!modelsData) {
    return null;
  }

  const currentModel = modelsData.current_model;
  const availableModels = modelsData.available_models.filter(m => m.available);
  const unavailableModels = modelsData.available_models.filter(m => !m.available);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-xl shadow-indigo-100/20 dark:border-slate-800/70 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Model Configuration</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Configure and switch between available AI models for analysis.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadModels} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing' : 'Refresh'}
        </Button>
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

        {/* Current Model Display */}
        <Card>
          <CardHeader>
            <CardTitle>Current Model</CardTitle>
            <CardDescription>Model currently used for analysis</CardDescription>
          </CardHeader>
          <CardContent>
            {currentModel ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm font-medium">
                      {currentModel.name}
                    </Badge>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {currentModel.model_id}
                    </span>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {currentModel.description}
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Provider:</span>
                    <span className="ml-2 font-medium capitalize">{currentModel.provider}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Temperature:</span>
                    <span className="ml-2 font-medium">{currentModel.temperature}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Max Tokens:</span>
                    <span className="ml-2 font-medium">{currentModel.max_tokens.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">No model currently configured</p>
            )}
          </CardContent>
        </Card>

        {/* Model Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Switch Model</CardTitle>
            <CardDescription>Select a different model for analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Select
                value={currentModel?.model_id || ''}
                onValueChange={(value) => {
                  if (value !== currentModel?.model_id) {
                    switchModel(value);
                  }
                }}
                disabled={switching || availableModels.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model">
                    {currentModel ? `${currentModel.name} (${currentModel.model_id})` : 'Select a model'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.model_id} value={model.model_id}>
                      {model.name} - {model.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {switching && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Switching model...</span>
                </div>
              )}

              {availableModels.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No models are currently available. Please check your configuration.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Models List */}
        {availableModels.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Available Models</CardTitle>
              <CardDescription>All models that can be used for analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availableModels.map((model) => (
                  <div
                    key={model.model_id}
                    className={`flex items-start justify-between rounded-lg border p-4 ${
                      model.model_id === currentModel?.model_id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{model.name}</span>
                        {model.model_id === currentModel?.model_id && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {model.description}
                      </p>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>ID: {model.model_id}</span>
                        <span>Temp: {model.temperature}</span>
                        <span>Max Tokens: {model.max_tokens.toLocaleString()}</span>
                      </div>
                    </div>
                    {model.model_id !== currentModel?.model_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => switchModel(model.model_id)}
                        disabled={switching}
                      >
                        Switch
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unavailable Models */}
        {unavailableModels.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Unavailable Models</CardTitle>
              <CardDescription>Models that are not currently available</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {unavailableModels.map((model) => (
                  <div
                    key={model.model_id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3 opacity-60"
                  >
                    <div>
                      <span className="font-medium">{model.name}</span>
                      <span className="ml-2 text-sm text-slate-500">({model.model_id})</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Unavailable
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
