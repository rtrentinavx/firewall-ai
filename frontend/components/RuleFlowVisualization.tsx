'use client';

import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FirewallRule } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Shield, Globe, Server, Network, Lock, Unlock } from 'lucide-react';

interface RuleFlowVisualizationProps {
  rules: FirewallRule[];
}

// Custom node component
const CustomNode = ({ data }: { data: any }) => {
  const getIcon = () => {
    switch (data.type) {
      case 'external':
        return <Globe className="w-4 h-4 text-blue-500" />;
      case 'namespace':
        return <Network className="w-4 h-4 text-purple-500" />;
      case 'cluster':
        return <Server className="w-4 h-4 text-green-500" />;
      case 'rule':
        return data.action === 'allow' ? 
          <Unlock className="w-4 h-4 text-green-500" /> : 
          <Lock className="w-4 h-4 text-red-500" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-card shadow-lg min-w-[180px] ${
      data.type === 'rule' 
        ? 'border-primary' 
        : 'border-muted-foreground/20'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        {getIcon()}
        <span className="font-semibold text-sm">{data.label}</span>
      </div>
      {data.sublabel && (
        <div className="text-xs text-muted-foreground mt-1">{data.sublabel}</div>
      )}
      {data.action && (
        <Badge 
          variant={data.action === 'allow' ? 'default' : 'destructive'}
          className="mt-2 text-xs"
        >
          {data.action}
        </Badge>
      )}
      {data.protocols && data.protocols.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          {data.protocols.join(', ')}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export function RuleFlowVisualization({ rules }: RuleFlowVisualizationProps) {
  // Generate nodes and edges from firewall rules
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    if (rules.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    // Group rules by direction
    const ingressRules = rules.filter(r => r.direction === 'ingress');
    const egressRules = rules.filter(r => r.direction === 'egress');

    // Create source nodes (left side)
    const sourceGroups = new Map<string, Set<string>>();
    rules.forEach(rule => {
      const sources = rule.source_ranges || ['Any'];
      sources.forEach(source => {
        if (!sourceGroups.has(source)) {
          sourceGroups.set(source, new Set());
        }
        sourceGroups.get(source)?.add(rule.id);
      });
    });

    let yPosition = 0;
    const sourceNodeIds: string[] = [];
    
    Array.from(sourceGroups.keys()).forEach((source, idx) => {
      const nodeId = `source-${idx}`;
      sourceNodeIds.push(nodeId);
      
      const isExternal = source === 'Any' || source === '0.0.0.0/0' || source.includes('internet');
      const nodeType = isExternal ? 'external' : 
                      source.includes('namespace') ? 'namespace' : 'cluster';
      
      nodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 50, y: yPosition },
        data: {
          label: isExternal ? 'Outside Cluster' : source.includes('namespace') ? 'In Namespace' : 'In Cluster',
          sublabel: source === 'Any' ? 'Any endpoint' : source,
          type: nodeType,
        },
        sourcePosition: Position.Right,
      });
      
      yPosition += 150;
    });

    // Create central rule nodes
    const centralX = 400;
    let centralY = 0;
    
    rules.forEach((rule, idx) => {
      const ruleNodeId = `rule-${rule.id}`;
      
      nodes.push({
        id: ruleNodeId,
        type: 'custom',
        position: { x: centralX, y: centralY },
        data: {
          label: rule.name || `Rule ${idx + 1}`,
          sublabel: rule.description || `${rule.direction} - ${rule.action}`,
          action: rule.action,
          protocols: rule.protocols,
          type: 'rule',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      centralY += 150;
    });

    // Create destination nodes (right side)
    const destGroups = new Map<string, Set<string>>();
    rules.forEach(rule => {
      const destinations = rule.destination_ranges || ['Any'];
      destinations.forEach(dest => {
        if (!destGroups.has(dest)) {
          destGroups.set(dest, new Set());
        }
        destGroups.get(dest)?.add(rule.id);
      });
    });

    yPosition = 0;
    const destNodeIds: string[] = [];
    
    Array.from(destGroups.keys()).forEach((dest, idx) => {
      const nodeId = `dest-${idx}`;
      destNodeIds.push(nodeId);
      
      const isExternal = dest === 'Any' || dest === '0.0.0.0/0' || dest.includes('internet');
      const nodeType = isExternal ? 'external' : 
                      dest.includes('namespace') ? 'namespace' : 'cluster';
      
      nodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 750, y: yPosition },
        data: {
          label: isExternal ? 'Outside Cluster' : dest.includes('namespace') ? 'In Namespace' : 'In Cluster',
          sublabel: dest === 'Any' ? 'Any endpoint' : dest,
          type: nodeType,
        },
        targetPosition: Position.Left,
      });
      
      yPosition += 150;
    });

    // Create edges from sources to rules
    rules.forEach((rule, ruleIdx) => {
      const ruleNodeId = `rule-${rule.id}`;
      const sources = rule.source_ranges || ['Any'];
      
      sources.forEach(source => {
        const sourceIdx = Array.from(sourceGroups.keys()).indexOf(source);
        if (sourceIdx >= 0) {
          edges.push({
            id: `e-source-${sourceIdx}-${ruleNodeId}`,
            source: `source-${sourceIdx}`,
            target: ruleNodeId,
            type: 'smoothstep',
            animated: rule.action === 'allow',
            style: { 
              stroke: rule.action === 'allow' ? '#22c55e' : '#ef4444',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: rule.action === 'allow' ? '#22c55e' : '#ef4444',
            },
          });
        }
      });

      // Create edges from rules to destinations
      const destinations = rule.destination_ranges || ['Any'];
      destinations.forEach(dest => {
        const destIdx = Array.from(destGroups.keys()).indexOf(dest);
        if (destIdx >= 0) {
          edges.push({
            id: `e-${ruleNodeId}-dest-${destIdx}`,
            source: ruleNodeId,
            target: `dest-${destIdx}`,
            type: 'smoothstep',
            animated: rule.action === 'allow',
            style: { 
              stroke: rule.action === 'allow' ? '#22c55e' : '#ef4444',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: rule.action === 'allow' ? '#22c55e' : '#ef4444',
            },
          });
        }
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [rules]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  if (rules.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/5">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No rules to visualize</p>
          <p className="text-xs text-muted-foreground mt-1">Add firewall rules to see the flow diagram</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] border rounded-lg bg-muted/5">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="rounded-lg"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
