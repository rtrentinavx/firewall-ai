'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCode, FolderOpen, Plus, Loader2 } from 'lucide-react';
import { auditApi } from '@/lib/api';
import type { FirewallRule, CloudProvider } from '@/types';

type RuleInputFormProps = {
  onAddRule: (rule: FirewallRule) => void;
  onAddMultipleRules?: (rules: FirewallRule[]) => void;
  provider: CloudProvider;
};

export default function RuleInputForm({ onAddRule, onAddMultipleRules, provider }: RuleInputFormProps) {
  // Manual form state
  const [name, setName] = useState('');
  const [sourceRanges, setSourceRanges] = useState('');
  const [destinationRanges, setDestinationRanges] = useState('');
  const [protocols, setProtocols] = useState('tcp');
  const [ports, setPorts] = useState('80,443');
  const [direction, setDirection] = useState<'ingress' | 'egress'>('ingress');
  const [action, setAction] = useState<'allow' | 'deny' | 'redirect'>('allow');
  
  // Terraform state
  const [terraformContent, setTerraformContent] = useState('');
  const [terraformPath, setTerraformPath] = useState('');
  const [isParsingTerraform, setIsParsingTerraform] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  
  const [error, setError] = useState('');

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Rule name is required.');
      return;
    }

    const rule: FirewallRule = {
      id: `rule-${Date.now()}`,
      name: name.trim(),
      cloud_provider: provider,
      direction,
      action,
      source_ranges: sourceRanges
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      destination_ranges: destinationRanges
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      protocols: protocols
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      ports: ports
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    };

    onAddRule(rule);
    setName('');
    setSourceRanges('');
    setDestinationRanges('');
    setProtocols('tcp');
    setPorts('80,443');
    setError('');
  };

  const handleValidateAndImport = async () => {
    if (!terraformContent.trim()) {
      setError('Please paste Terraform code');
      return;
    }

    setIsParsingTerraform(true);
    setError('');
    setValidationResult(null);

    try {
      // Step 1: Validate with AI
      setIsValidating(true);
      const validation = await auditApi.validateTerraform(terraformContent, provider);
      setValidationResult(validation);
      setIsValidating(false);

      // Check for critical errors
      if (validation.syntax_errors && validation.syntax_errors.length > 0) {
        setError('Critical syntax errors found. Please fix them before importing.');
        setIsParsingTerraform(false);
        return;
      }

      // Show warnings but allow to proceed
      if (validation.security_issues && validation.security_issues.length > 0) {
        // Continue with import but show warnings
        console.warn('Security issues found:', validation.security_issues);
      }

      // Step 2: Parse and import rules
      const rules = await auditApi.parseTerraform(terraformContent, provider);
      
      if (rules.length === 0) {
        setError('No firewall rules found in Terraform code');
        setIsParsingTerraform(false);
        return;
      }

      // Step 3: Import the rules
      if (onAddMultipleRules) {
        onAddMultipleRules(rules);
      } else {
        rules.forEach(rule => onAddRule(rule));
      }
      
      // Success - clear form
      setTerraformContent('');
      setValidationResult(null);
      setError('');
      
    } catch (err: any) {
      setError(err.message || 'Failed to validate and import Terraform code');
    } finally {
      setIsParsingTerraform(false);
      setIsValidating(false);
    }
  };

  const handleParseTerraformDirectory = async () => {
    if (!terraformPath.trim()) {
      setError('Please enter a directory path');
      return;
    }

    setIsParsingTerraform(true);
    setError('');

    try {
      const rules = await auditApi.parseTerraformDirectory(terraformPath, provider);
      
      if (rules.length === 0) {
        setError('No firewall rules found in directory');
        return;
      }

      if (onAddMultipleRules) {
        onAddMultipleRules(rules);
      } else {
        rules.forEach(rule => onAddRule(rule));
      }
      
      setTerraformPath('');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to parse Terraform directory');
    } finally {
      setIsParsingTerraform(false);
    }
  };

  return (
    <Tabs defaultValue="manual" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="manual">
          <Plus className="w-4 h-4 mr-2" />
          Manual
        </TabsTrigger>
        <TabsTrigger value="terraform">
          <FileCode className="w-4 h-4 mr-2" />
          Terraform Code
        </TabsTrigger>
        <TabsTrigger value="directory">
          <FolderOpen className="w-4 h-4 mr-2" />
          Local Directory
        </TabsTrigger>
      </TabsList>

      <TabsContent value="manual" className="space-y-4 mt-4">
        <form onSubmit={handleManualSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rule-name">Rule name</Label>
          <Input
            id="rule-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Allow HTTPS"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-direction">Direction</Label>
          <select
            id="rule-direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'ingress' | 'egress')}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="ingress">Ingress</option>
            <option value="egress">Egress</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rule-source">Source ranges</Label>
          <Input
            id="rule-source"
            value={sourceRanges}
            onChange={(e) => setSourceRanges(e.target.value)}
            placeholder="0.0.0.0/0, 10.0.0.0/24"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-destination">Destination ranges</Label>
          <Input
            id="rule-destination"
            value={destinationRanges}
            onChange={(e) => setDestinationRanges(e.target.value)}
            placeholder="10.10.0.0/16"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="rule-protocols">Protocols</Label>
          <Input
            id="rule-protocols"
            value={protocols}
            onChange={(e) => setProtocols(e.target.value)}
            placeholder="tcp,udp"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-ports">Ports</Label>
          <Input
            id="rule-ports"
            value={ports}
            onChange={(e) => setPorts(e.target.value)}
            placeholder="80,443"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-action">Action</Label>
          <select
            id="rule-action"
            value={action}
            onChange={(e) => setAction(e.target.value as 'allow' | 'deny' | 'redirect')}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="allow">Allow</option>
            <option value="deny">Deny</option>
            <option value="redirect">Redirect</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" className="w-full">
        Add rule
      </Button>
    </form>
      </TabsContent>

      <TabsContent value="terraform" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="terraform-content">Paste Terraform Code</Label>
          <Textarea
            id="terraform-content"
            value={terraformContent}
            onChange={(e) => {
              setTerraformContent(e.target.value);
              setValidationResult(null);
              setError('');
            }}
            placeholder={`resource "aviatrix_dcf_ruleset" "production" {\n  name = "Production Rules"\n  \n  rules {\n    name = "allow-web"\n    action = "PERMIT"\n    protocol = "TCP"\n    src_smart_groups = ["uuid-1"]\n    dst_smart_groups = ["uuid-2"]\n    port_ranges {\n      lo = 443\n      hi = 443\n    }\n  }\n}`}
            className="font-mono text-sm min-h-[300px]"
          />
          <p className="text-xs text-muted-foreground">
            Paste your Terraform HCL code. AI will automatically validate and extract firewall rules.
          </p>
        </div>

        {/* Validation/Import Progress */}
        {(isValidating || isParsingTerraform) && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="font-medium">
                {isValidating && !isParsingTerraform && 'Step 1/2: AI is validating your Terraform code...'}
                {isParsingTerraform && !isValidating && 'Step 2/2: Extracting firewall rules...'}
                {isValidating && isParsingTerraform && 'Processing...'}
              </span>
            </div>
          </div>
        )}

        {/* Validation Results */}
        {validationResult && !isParsingTerraform && (
          <div className={`rounded-lg p-4 text-sm ${
            validationResult.syntax_errors?.length > 0 
              ? 'bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800' 
              : validationResult.security_issues?.length > 0 
                ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
                : 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800'
          }`}>
            <div className="flex items-start gap-2 mb-2">
              <span className="text-lg">
                {validationResult.syntax_errors?.length > 0 ? '❌' : 
                 validationResult.security_issues?.length > 0 ? '⚠️' : '✅'}
              </span>
              <div className="flex-1">
                <p className="font-semibold">
                  {validationResult.syntax_errors?.length > 0 ? 'Syntax Errors Found' :
                   validationResult.security_issues?.length > 0 ? 'Security Issues Detected' :
                   'Validation Passed - Importing Rules'}
                </p>
              </div>
            </div>
            
            {validationResult.syntax_errors?.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="font-medium text-red-700 dark:text-red-300">Critical Errors:</p>
                <ul className="list-disc list-inside space-y-1 text-red-600 dark:text-red-400">
                  {validationResult.syntax_errors.map((err: string, idx: number) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  Please fix these errors before importing.
                </p>
              </div>
            )}
            
            {validationResult.security_issues?.length > 0 && !validationResult.syntax_errors?.length && (
              <div className="mt-3 space-y-1">
                <p className="font-medium text-orange-700 dark:text-orange-300">Security Warnings:</p>
                <ul className="list-disc list-inside space-y-1 text-orange-600 dark:text-orange-400">
                  {validationResult.security_issues.map((issue: string, idx: number) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                  Proceeding with import (warnings will not block).
                </p>
              </div>
            )}
            
            {validationResult.recommendations?.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="font-medium text-blue-700 dark:text-blue-300">💡 Recommendations:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400 text-xs">
                  {validationResult.recommendations.map((rec: string, idx: number) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>}

        <Button 
          onClick={handleValidateAndImport} 
          disabled={isParsingTerraform || isValidating || !terraformContent.trim()}
          className="w-full"
        >
          {isParsingTerraform || isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isValidating ? 'Validating...' : 'Importing...'}
            </>
          ) : (
            <>
              <FileCode className="mr-2 h-4 w-4" />
              AI Validate & Import Rules
            </>
          )}
        </Button>
      </TabsContent>

      <TabsContent value="directory" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="terraform-path">Local Directory Path</Label>
          <Input
            id="terraform-path"
            value={terraformPath}
            onChange={(e) => setTerraformPath(e.target.value)}
            placeholder="/path/to/terraform/files"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Enter the full path to a directory containing .tf files. All Terraform files will be scanned for firewall rules.
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-2">Examples:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li className="font-mono text-xs">/Users/you/project/terraform</li>
            <li className="font-mono text-xs">./infrastructure/firewall</li>
            <li className="font-mono text-xs">/opt/terraform/environments/prod</li>
          </ul>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button 
          onClick={handleParseTerraformDirectory} 
          disabled={isParsingTerraform || !terraformPath.trim()}
          className="w-full"
        >
          {isParsingTerraform ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <FolderOpen className="mr-2 h-4 w-4" />
              Scan Directory & Import Rules
            </>
          )}
        </Button>
      </TabsContent>
    </Tabs>
  );
}