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

  const handleParseTerraform = async () => {
    if (!terraformContent.trim()) {
      setError('Please paste Terraform code');
      return;
    }

    setIsParsingTerraform(true);
    setError('');

    try {
      const rules = await auditApi.parseTerraform(terraformContent, provider);
      
      if (rules.length === 0) {
        setError('No firewall rules found in Terraform code');
        return;
      }

      if (onAddMultipleRules) {
        onAddMultipleRules(rules);
      } else {
        rules.forEach(rule => onAddRule(rule));
      }
      
      setTerraformContent('');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to parse Terraform code');
    } finally {
      setIsParsingTerraform(false);
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
            onChange={(e) => setTerraformContent(e.target.value)}
            placeholder={`resource "google_compute_firewall" "allow_http" {\n  name    = "allow-http"\n  network = "default"\n  \n  allow {\n    protocol = "tcp"\n    ports    = ["80", "443"]\n  }\n  \n  source_ranges = ["0.0.0.0/0"]\n}`}
            className="font-mono text-sm min-h-[300px]"
          />
          <p className="text-xs text-muted-foreground">
            Paste your Terraform HCL code containing firewall rules (supports GCP, Azure, Aviatrix, Cisco, Palo Alto)
          </p>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button 
          onClick={handleParseTerraform} 
          disabled={isParsingTerraform || !terraformContent.trim()}
          className="w-full"
        >
          {isParsingTerraform ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <FileCode className="mr-2 h-4 w-4" />
              Parse & Import Rules
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