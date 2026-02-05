'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Upload, Link as LinkIcon, Search, FileText, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

type Document = {
  document_id: string;
  source: string;
  source_type: 'file' | 'url';
  title: string;
  content_length: number;
  chunks_count: number;
  metadata: Record<string, any>;
  created_at: string;
};

type RAGStats = {
  total_documents: number;
  total_chunks: number;
  embedding_model: string;
  embedding_dimension: number;
  chunk_size: number;
  chunk_overlap: number;
};

type RAGDocumentsResponse = {
  success: boolean;
  documents: Document[];
  stats: RAGStats;
};

type SearchResult = {
  chunk: {
    document_id: string;
    chunk_index: number;
    content: string;
    metadata: Record<string, any>;
  };
  document: Document | null;
  score: number;
  relevance: 'high' | 'medium' | 'low';
};

export default function RAGDocumentManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<RAGStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [url, setUrl] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
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

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.get(`${baseURL}/rag/documents`, {
        headers: getAuthHeaders(),
      });
      
      if (response.data.success) {
        setDocuments(response.data.documents);
        setStats(response.data.stats);
      } else {
        throw new Error(response.data.error || 'Failed to load documents');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to load documents';
        setError(errorMessage);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('authBasic');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Basic ${token}`;
      }

      const response = await axios.post(`${baseURL}/rag/documents/upload`, formData, {
        headers,
      });

      if (response.data.success) {
        setSuccess(`Document "${file.name}" uploaded successfully`);
        await loadDocuments();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to upload document';
        setError(errorMessage);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to upload document');
      }
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleUrlAdd = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.post(
        `${baseURL}/rag/documents/url`,
        {
          url: url.trim(),
          title: urlTitle.trim() || undefined,
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        setSuccess(`Document from URL added successfully`);
        setUrl('');
        setUrlTitle('');
        await loadDocuments();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response.data.error || 'Failed to add URL');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to add URL';
        setError(errorMessage);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to add URL');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.delete(`${baseURL}/rag/documents/${documentId}`, {
        headers: getAuthHeaders(),
      });

      if (response.data.success) {
        setSuccess('Document deleted successfully');
        await loadDocuments();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response.data.error || 'Failed to delete document');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to delete document';
        setError(errorMessage);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to delete document');
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const response = await axios.post(
        `${baseURL}/rag/search`,
        {
          query: searchQuery.trim(),
          limit: 10,
          min_score: 0.3,
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        setSearchResults(response.data.results);
      } else {
        throw new Error(response.data.error || 'Search failed');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.error || err.message || 'Search failed';
        setError(errorMessage);
      } else {
        setError(err instanceof Error ? err.message : 'Search failed');
      }
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-xl shadow-indigo-100/20 dark:border-slate-800/70 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50 px-6 py-5 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">RAG Knowledge Base</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Manage documents for retrieval-augmented generation. Add files or URLs to enhance analysis.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadDocuments} disabled={loading}>
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

        {/* Stats */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Documents</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.total_documents}</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Chunks</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.total_chunks}</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Model</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={stats.embedding_model}>
                {stats.embedding_model}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Dimension</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">{stats.embedding_dimension}</p>
            </div>
          </div>
        )}

        <Tabs defaultValue="add" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add">Add Documents</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="mt-6 space-y-6">
            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Upload File</CardTitle>
                <CardDescription>Upload a document from your local filesystem</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Select File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    accept=".txt,.md,.pdf,.docx,.html,.json,.yaml,.csv"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Supported formats: TXT, MD, PDF, DOCX, HTML, JSON, YAML, CSV (max 10MB)
                  </p>
                </div>
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading and processing document...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* URL Input */}
            <Card>
              <CardHeader>
                <CardTitle>Add from URL</CardTitle>
                <CardDescription>Add a document by fetching content from a URL</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com/document"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={uploading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url-title">Title (optional)</Label>
                  <Input
                    id="url-title"
                    type="text"
                    placeholder="Document title"
                    value={urlTitle}
                    onChange={(e) => setUrlTitle(e.target.value)}
                    disabled={uploading}
                  />
                </div>
                <Button onClick={handleUrlAdd} disabled={uploading || !url.trim()}>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  {uploading ? 'Adding...' : 'Add Document'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>All documents in the knowledge base</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && !documents.length ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500">Loading documents...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No documents yet. Add documents using the &quot;Add Documents&quot; tab.
                  </p>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.document_id}
                          className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-slate-900 dark:text-white">{doc.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {doc.source_type === 'file' ? '📄 File' : '🔗 URL'}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                              {doc.source}
                            </p>
                            <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                              <span>{doc.chunks_count} chunks</span>
                              <span>{formatFileSize(doc.content_length)}</span>
                              <span>{formatDate(doc.created_at)}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(doc.document_id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Search Knowledge Base</CardTitle>
                <CardDescription>Search for relevant information in your documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter your search query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    disabled={searching}
                  />
                  <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                    <Search className="mr-2 h-4 w-4" />
                    {searching ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {searchResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  result.relevance === 'high'
                                    ? 'default'
                                    : result.relevance === 'medium'
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {result.relevance} relevance
                              </Badge>
                              <span className="text-xs text-slate-500">
                                Score: {result.score.toFixed(3)}
                              </span>
                            </div>
                          </div>
                          {result.document && (
                            <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                              {result.document.title}
                            </p>
                          )}
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {result.chunk.content}
                          </p>
                          {result.chunk.metadata.source && (
                            <p className="text-xs text-slate-500 mt-2">
                              Source: {result.chunk.metadata.source}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {searchQuery && !searching && searchResults.length === 0 && (
                  <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No results found. Try a different query.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
