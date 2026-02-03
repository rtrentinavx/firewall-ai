'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Info, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { AuditResult, Violation, Recommendation } from '@/types';

interface AuditResultsProps {
  result: AuditResult;
}

export function AuditResults({ result }: AuditResultsProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'medium': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'low': return <Info className="h-5 w-5 text-blue-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Audit Summary
          </CardTitle>
          <CardDescription>
            Results for {result.total_rules} rules processed in {formatDuration(result.execution_time_seconds)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{result.violations.length}</div>
              <div className="text-sm text-gray-600">Violations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{result.violations.filter(v => v.severity === 'low' || v.severity === 'info').length}</div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{result.recommendations_list.length}</div>
              <div className="text-sm text-gray-600">Recommendations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{result.confidence_score.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Violations */}
      {result.violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Security Violations
            </CardTitle>
            <CardDescription>
              Critical security issues that need immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {result.violations.map((violation, index) => (
                  <div key={index} className={`p-4 border rounded-lg ${getSeverityColor(violation.severity)}`}>
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(violation.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{violation.category}</h4>
                          <Badge variant="destructive">{violation.severity}</Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{violation.description}</p>
                        <div className="text-xs text-gray-500">
                          Rule: {violation.rule_id} • Risk Score: {violation.risk_score.toFixed(1)}/10
                        </div>
                        {violation.reason && (
                          <div className="mt-2 p-2 bg-white/50 rounded text-xs">
                            <strong>Reason:</strong> {violation.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {result.violations.filter(v => v.severity === 'low' || v.severity === 'info').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Warnings
            </CardTitle>
            <CardDescription>
              Potential security concerns that should be reviewed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {result.violations.filter(v => v.severity === 'low' || v.severity === 'info').map((violation, index) => (
                  <Alert key={index}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-1">{violation.category}</div>
                      <div className="text-sm">{violation.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Rule: {violation.rule_id} • Risk Score: {violation.risk_score.toFixed(1)}/10
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {result.recommendations_list.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              AI Recommendations
            </CardTitle>
            <CardDescription>
              Suggested improvements and best practices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {result.recommendations_list.map((rec, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium mb-2">{rec.title}</h4>
                        <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Risk Reduction: {rec.risk_reduction.toFixed(1)}</span>
                          <span>Effort: {rec.effort_level}</span>
                        </div>
                        {rec.terraform_code && (
                          <div className="mt-3 p-2 bg-white rounded text-xs font-mono">
                            <div className="text-gray-600 mb-1">Suggested Terraform changes:</div>
                            <pre className="whitespace-pre-wrap">{rec.terraform_code}</pre>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline">
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline">
                            <ThumbsDown className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                          <Button size="sm" variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Review Later
                          </Button>
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

      {/* Similar Issues */}
      {result.similar_issues && result.similar_issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Similar Issues Found
            </CardTitle>
            <CardDescription>
              Previously identified issues with similar patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {result.similar_issues.map((issue, index) => (
                  <div key={index} className="p-3 border rounded bg-blue-50 border-blue-200">
                    <div className="text-sm">
                      <span className="font-medium">{issue.title}</span>
                      <span className="text-gray-600 ml-2">({issue.similarity.toFixed(1)}% similar)</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{issue.description}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Processing Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Processing Time</div>
              <div className="text-gray-600">{formatDuration(result.execution_time_seconds)}</div>
            </div>
            <div>
              <div className="font-medium">Rules Processed</div>
              <div className="text-gray-600">{result.total_rules}</div>
            </div>
            <div>
              <div className="font-medium">Cached Result</div>
              <div className="text-gray-600">{result.cached ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}