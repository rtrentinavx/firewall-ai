'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FirewallRule, CloudProvider } from '@/types';

type RuleInputFormProps = {
  onAddRule: (rule: FirewallRule) => void;
  provider: CloudProvider;
};

export default function RuleInputForm({ onAddRule, provider }: RuleInputFormProps) {
  const [name, setName] = useState('');
  const [sourceRanges, setSourceRanges] = useState('');
  const [destinationRanges, setDestinationRanges] = useState('');
  const [protocols, setProtocols] = useState('tcp');
  const [ports, setPorts] = useState('80,443');
  const [direction, setDirection] = useState<'ingress' | 'egress'>('ingress');
  const [action, setAction] = useState<'allow' | 'deny' | 'redirect'>('allow');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
  );
}