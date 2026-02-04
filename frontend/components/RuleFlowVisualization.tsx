'use client';

import React, { useCallback, useMemo, useEffect } from 'react';
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
import { 
  Shield, 
  Globe, 
  Server, 
  Network, 
  Lock, 
  Unlock, 
  ArrowRight, 
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Cloud,
  Database,
  Zap,
  Activity
} from 'lucide-react';

interface RuleFlowVisualizationProps {
  rules: FirewallRule[];
}

// Custom node component with enhanced visuals
const CustomNode = ({ data }: { data: any }) => {
  const getIcon = () => {
    switch (data.type) {
      case 'external':
        return <Globe className="w-6 h-6 text-blue-500" />;
      case 'namespace':
        return <Network className="w-6 h-6 text-purple-500" />;
      case 'cluster':
        return <Server className="w-6 h-6 text-green-500" />;
      case 'rule':
        return data.action === 'allow' ? 
          <Unlock className="w-6 h-6 text-green-500" /> : 
          <Lock className="w-6 h-6 text-red-500" />;
      default:
        return <Shield className="w-6 h-6" />;
    }
  };

  const getNodeStyle = () => {
    if (data.type === 'rule') {
      const isIngress = data.direction === 'ingress';
      const isAllow = data.action === 'allow';
      
      return {
        background: isAllow 
          ? (isIngress ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)')
          : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
        borderColor: isAllow ? (isIngress ? '#3b82f6' : '#22c55e') : '#ef4444',
        borderWidth: '3px',
      };
    } else if (data.type === 'external') {
      return {
        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
        borderColor: '#6366f1',
      };
    } else if (data.type === 'namespace') {
      return {
        background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
        borderColor: '#a855f7',
      };
    } else {
      return {
        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        borderColor: '#10b981',
      };
    }
  };

  const getDirectionIcon = () => {
    if (data.type !== 'rule') return null;
    
    if (data.direction === 'ingress') {
      return <ArrowRight className="w-4 h-4 text-blue-600" />;
    } else if (data.direction === 'egress') {
      return <ArrowLeft className="w-4 h-4 text-green-600" />;
    }
    return null;
  };

  const nodeStyle = getNodeStyle();

  return (
    <div 
      className={`px-5 py-4 rounded-xl border-2 shadow-xl min-w-[200px] backdrop-blur-sm transition-all hover:scale-105 ${
        data.type === 'rule' ? 'ring-2 ring-offset-2' : ''
      }`}
      style={{
        background: nodeStyle.background,
        borderColor: nodeStyle.borderColor,
        borderWidth: nodeStyle.borderWidth || '2px',
        boxShadow: data.type === 'rule' 
          ? `0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px ${nodeStyle.borderColor}40`
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-white/50">
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-900">{data.label}</span>
            {getDirectionIcon()}
          </div>
        </div>
      </div>
      
      {data.sublabel && (
        <div className="text-xs text-gray-600 mb-2 font-medium">{data.sublabel}</div>
      )}
      
      <div className="flex flex-wrap gap-2 mt-2">
        {data.direction && (
          <Badge 
            variant="outline"
            className={`text-xs font-semibold ${
              data.direction === 'ingress' 
                ? 'border-blue-500 text-blue-700 bg-blue-50' 
                : 'border-green-500 text-green-700 bg-green-50'
            }`}
          >
            {data.direction === 'ingress' ? '⬇️ INGRESS' : '⬆️ EGRESS'}
          </Badge>
        )}
        {data.action && (
          <Badge 
            variant={data.action === 'allow' ? 'default' : 'destructive'}
            className="text-xs font-semibold"
          >
            {data.action === 'allow' ? '✓ ALLOW' : '✗ DENY'}
          </Badge>
        )}
      </div>
      
      {data.protocols && data.protocols.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200/50">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Activity className="w-3 h-3" />
            <span className="font-medium">{data.protocols.join(', ')}</span>
            {data.ports && data.ports.length > 0 && (
              <span className="text-gray-500">: {data.ports.join(', ')}</span>
            )}
          </div>
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
    // For ingress: left = external source, right = internal destination
    // For egress: left = internal source, right = external destination
    const sourceGroups = new Map<string, { ruleIds: Set<string>, directions: Set<string> }>();
    
    // Collect sources from all rules with their directions
    rules.forEach(rule => {
      const sources = rule.source_ranges || ['Any'];
      sources.forEach(source => {
        if (!sourceGroups.has(source)) {
          sourceGroups.set(source, { ruleIds: new Set(), directions: new Set() });
        }
        sourceGroups.get(source)!.ruleIds.add(rule.id);
        sourceGroups.get(source)!.directions.add(rule.direction);
      });
    });

    let yPosition = 0;
    const sourceNodeIds: string[] = [];
    
    Array.from(sourceGroups.keys()).forEach((source, idx) => {
      const nodeId = `source-${idx}`;
      sourceNodeIds.push(nodeId);
      
      const sourceInfo = sourceGroups.get(source)!;
      const hasIngress = sourceInfo.directions.has('ingress');
      const hasEgress = sourceInfo.directions.has('egress');
      
      // Determine if external: 0.0.0.0/0, Any, or internet-like = always external
      const isExplicitlyExternal = source === 'Any' || source === '0.0.0.0/0' || 
                                   source.includes('internet') || source.includes('external');
      
      // For ingress: source is external (traffic coming FROM outside)
      // For egress: source is internal (traffic going FROM inside)
      // If used by both, check the actual IP/CIDR
      let isExternalSource = false;
      if (hasIngress && !hasEgress) {
        // Only ingress - source is external
        isExternalSource = true;
      } else if (hasEgress && !hasIngress) {
        // Only egress - source is internal (unless explicitly external IP)
        isExternalSource = isExplicitlyExternal;
      } else {
        // Both directions - check if it's an external IP
        isExternalSource = isExplicitlyExternal;
      }
      
      const nodeType = isExternalSource ? 'external' : 
                      source.includes('namespace') ? 'namespace' : 'cluster';
      
      nodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 50, y: yPosition },
        data: {
          label: isExternalSource ? '🌐 Outside' : (source.includes('namespace') ? '📦 Namespace' : '🏠 Inside'),
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
          direction: rule.direction,
          protocols: rule.protocols,
          ports: rule.ports,
          type: 'rule',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      centralY += 150;
    });

    // Create destination nodes (right side)
    const destGroups = new Map<string, { ruleIds: Set<string>, directions: Set<string> }>();
    rules.forEach(rule => {
      // For ingress: destination is internal (target_tags, destination_ranges)
      // For egress: destination is external (destination_ranges)
      const destinations = rule.destination_ranges || rule.target_tags || ['Any'];
      destinations.forEach(dest => {
        if (!destGroups.has(dest)) {
          destGroups.set(dest, { ruleIds: new Set(), directions: new Set() });
        }
        destGroups.get(dest)!.ruleIds.add(rule.id);
        destGroups.get(dest)!.directions.add(rule.direction);
      });
    });

    yPosition = 0;
    const destNodeIds: string[] = [];
    
    Array.from(destGroups.keys()).forEach((dest, idx) => {
      const nodeId = `dest-${idx}`;
      destNodeIds.push(nodeId);
      
      const destInfo = destGroups.get(dest)!;
      const hasIngress = destInfo.directions.has('ingress');
      const hasEgress = destInfo.directions.has('egress');
      
      // Determine if external: 0.0.0.0/0, Any, or internet-like = always external
      const isExplicitlyExternal = dest === 'Any' || dest === '0.0.0.0/0' || 
                                   dest.includes('internet') || dest.includes('external');
      
      // For ingress: destination is internal (traffic going TO inside)
      // For egress: destination is external (traffic going TO outside)
      // If used by both, check the actual IP/CIDR
      let isExternalDest = false;
      if (hasIngress && !hasEgress) {
        // Only ingress - destination is internal (unless explicitly external IP)
        isExternalDest = isExplicitlyExternal;
      } else if (hasEgress && !hasIngress) {
        // Only egress - destination is external
        isExternalDest = true;
      } else {
        // Both directions - check if it's an external IP
        isExternalDest = isExplicitlyExternal;
      }
      
      const nodeType = isExternalDest ? 'external' : 
                      dest.includes('namespace') ? 'namespace' : 'cluster';
      
      nodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 750, y: yPosition },
        data: {
          label: isExternalDest ? '🌐 Outside' : (dest.includes('namespace') ? '📦 Namespace' : '🏠 Inside'),
          sublabel: dest === 'Any' ? 'Any endpoint' : dest,
          type: nodeType,
        },
        targetPosition: Position.Left,
      });
      
      yPosition += 150;
    });

    // Create edges from sources to rules and rules to destinations
    rules.forEach((rule) => {
      const ruleNodeId = `rule-${rule.id}`;
      const isIngress = rule.direction === 'ingress';
      const isAllow = rule.action === 'allow';
      
      // Determine edge color based on direction
      const edgeColor = isIngress 
        ? (isAllow ? '#3b82f6' : '#ef4444')  // Blue for ingress
        : (isAllow ? '#22c55e' : '#ef4444'); // Green for egress
      
      // For ingress: source -> rule -> destination
      // For egress: source -> rule -> destination (same flow, but different visual treatment)
      const sources = rule.source_ranges || ['Any'];
      sources.forEach(source => {
        const sourceIdx = Array.from(sourceGroups.keys()).indexOf(source);
        if (sourceIdx >= 0) {
          edges.push({
            id: `e-source-${sourceIdx}-${ruleNodeId}`,
            source: `source-${sourceIdx}`,
            target: ruleNodeId,
            type: 'smoothstep',
            animated: isAllow,
            style: { 
              stroke: edgeColor,
              strokeWidth: isAllow ? 3 : 2,
              strokeDasharray: isAllow ? '0' : '5,5',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edgeColor,
              width: 20,
              height: 20,
            },
            label: isIngress ? '⬇️ INGRESS' : '⬆️ EGRESS',
            labelStyle: { 
              fill: edgeColor,
              fontWeight: 700,
              fontSize: '11px',
            },
            labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
          });
        }
      });

      // Create edges from rules to destinations
      const destinations = rule.destination_ranges || rule.target_tags || ['Any'];
      destinations.forEach(dest => {
        const destIdx = Array.from(destGroups.keys()).indexOf(dest);
        if (destIdx >= 0) {
          edges.push({
            id: `e-${ruleNodeId}-dest-${destIdx}`,
            source: ruleNodeId,
            target: `dest-${destIdx}`,
            type: 'smoothstep',
            animated: isAllow,
            style: { 
              stroke: edgeColor,
              strokeWidth: isAllow ? 3 : 2,
              strokeDasharray: isAllow ? '0' : '5,5',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: edgeColor,
              width: 20,
              height: 20,
            },
          });
        }
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [rules]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when rules change
  useEffect(() => {
    if (rules.length > 0) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules]);

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
