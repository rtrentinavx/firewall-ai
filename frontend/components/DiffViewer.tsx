'use client';

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Copy, CheckCircle, XCircle } from 'lucide-react';
import { AuditResult } from '@/types';

interface DiffViewerProps {
  result: AuditResult;
}

export function DiffViewer({ result }: DiffViewerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    // Capture current ref value for cleanup
    const currentEditorRef = editorRef.current;

    // Load Monaco Editor
    if (typeof window !== 'undefined' && !monacoRef.current) {
      import('monaco-editor').then((monaco) => {
        monacoRef.current = monaco;

        if (currentEditorRef && result.terraform_diff) {
          // Create diff editor
          const diffEditor = monaco.editor.createDiffEditor(currentEditorRef, {
            theme: 'vs-dark',
            readOnly: true,
            renderSideBySide: true,
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            glyphMargin: false,
            folding: false,
            renderWhitespace: 'boundary',
            wordWrap: 'on'
          });

          // Set the diff content
          const originalContent = result.terraform_diff.original || '';
          const modifiedContent = result.terraform_diff.modified || '';

          diffEditor.setModel({
            original: monaco.editor.createModel(originalContent, 'hcl'),
            modified: monaco.editor.createModel(modifiedContent, 'hcl')
          });
        }
      });
    }

    return () => {
      // Cleanup - use captured ref value
      if (monacoRef.current && currentEditorRef) {
        const editor = monacoRef.current.editor.getEditors().find((e: any) =>
          e.getDomNode() === currentEditorRef
        );
        if (editor) {
          editor.dispose();
        }
      }
    };
  }, [result]);

  const handleCopyDiff = async () => {
    if (result.terraform_diff?.modified) {
      await navigator.clipboard.writeText(result.terraform_diff.modified);
    }
  };

  const handleDownloadDiff = () => {
    if (result.terraform_diff?.modified) {
      const blob = new Blob([result.terraform_diff.modified], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'firewall-changes.tf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!result.terraform_diff) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No Terraform diff available for this audit result.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Diff Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Proposed Changes
              </CardTitle>
              <CardDescription>
                Review the AI-proposed Terraform changes before applying
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopyDiff} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button onClick={handleDownloadDiff} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-green-600">+{result.terraform_diff.additions || 0}</div>
              <div className="text-gray-600">Additions</div>
            </div>
            <div>
              <div className="font-medium text-red-600">-{result.terraform_diff.deletions || 0}</div>
              <div className="text-gray-600">Deletions</div>
            </div>
            <div>
              <div className="font-medium text-blue-600">{result.terraform_diff.modifications || 0}</div>
              <div className="text-gray-600">Modifications</div>
            </div>
            <div>
              <div className="font-medium">{result.confidence_score.toFixed(1)}%</div>
              <div className="text-gray-600">AI Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diff Viewer */}
      <Card>
        <CardHeader>
          <CardTitle>Terraform Configuration Diff</CardTitle>
          <CardDescription>
            Side-by-side comparison of current vs proposed configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={editorRef}
            className="h-96 w-full border rounded-md"
            style={{ minHeight: '400px' }}
          />
        </CardContent>
      </Card>

      {/* Change Summary */}
      {result.recommendations_list && result.recommendations_list.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Change Rationale</CardTitle>
            <CardDescription>
              AI reasoning behind the proposed changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-4">
                {result.recommendations_list.map((rec, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">{rec.title}</h4>
                        <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Risk Reduction: <Badge variant="outline">{rec.risk_reduction.toFixed(1)}</Badge></span>
                          <span>Effort: <Badge variant="outline">{rec.effort_level}</Badge></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center gap-4">
            <Button variant="outline" className="min-w-32">
              <XCircle className="h-4 w-4 mr-2" />
              Reject Changes
            </Button>
            <Button className="min-w-32">
              <CheckCircle className="h-4 w-4 mr-2" />
              Apply Changes
            </Button>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            Changes will be applied to your Terraform configuration and require a terraform plan/apply cycle
          </p>
        </CardContent>
      </Card>
    </div>
  );
}