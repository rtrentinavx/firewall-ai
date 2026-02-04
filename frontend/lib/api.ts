import axios, { AxiosResponse } from 'axios';
import { ApiResponse, AuditRequest, AuditResult, FirewallRule, NormalizedRule, CacheStats, CloudProvider } from '@/types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  timeout: 30000, // 30 seconds
});

// Request interceptor for auth headers if needed
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authBasic');
      if (token) {
        config.headers.Authorization = `Basic ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API Functions
export const auditApi = {
  // Audit firewall rules
  auditRules: async (request: AuditRequest): Promise<AuditResult> => {
    const response: AxiosResponse<ApiResponse<AuditResult>> = await api.post('/audit', request);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Audit failed');
    }
    return response.data.result!;
  },

  // Normalize rules
  normalizeRules: async (rules: FirewallRule[]): Promise<NormalizedRule[]> => {
    const response: AxiosResponse<ApiResponse<NormalizedRule[]>> = await api.post('/rules/normalize', { rules });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Normalization failed');
    }
    return response.data.normalized_rules!;
  },

  // Get cache statistics
  getCacheStats: async (): Promise<CacheStats> => {
    const response: AxiosResponse<ApiResponse<CacheStats>> = await api.get('/cache/stats');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get cache stats');
    }
    return {
      context_cache: response.data.context_cache!,
      semantic_cache: response.data.semantic_cache!
    };
  },

  // Clear caches
  clearCache: async (): Promise<void> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/cache/clear');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to clear cache');
    }
  },

  // Get similar recommendations
  getSimilarRecommendations: async (issueDescription: string, limit: number = 5): Promise<any[]> => {
    const response: AxiosResponse<ApiResponse<any[]>> = await api.post('/recommendations/similar', {
      issue_description: issueDescription,
      limit
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get similar recommendations');
    }
    return response.data.similar_issues!;
  },

  // Submit feedback
  submitFeedback: async (originalIssue: string, approvedFix: any): Promise<void> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/feedback', {
      original_issue: originalIssue,
      approved_fix: approvedFix
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to submit feedback');
    }
  },

  // Get supported providers
  getSupportedProviders: async (): Promise<any[]> => {
    const response: AxiosResponse<ApiResponse<any[]>> = await api.get('/providers');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get providers');
    }
    return response.data.providers!;
  },

  // Health check
  healthCheck: async (): Promise<any> => {
    const response: AxiosResponse<any> = await api.get('/health');
    return response.data;
  },

  // Parse Terraform content
  parseTerraform: async (content: string, cloudProvider: string = 'aviatrix'): Promise<FirewallRule[]> => {
    const response: AxiosResponse<ApiResponse<FirewallRule[]>> = await api.post('/terraform/parse', {
      content,
      cloud_provider: cloudProvider,
      use_ai: true
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to parse Terraform');
    }
    return response.data.rules || [];
  },

  // Validate Terraform content
  validateTerraform: async (content: string, cloudProvider: string = 'aviatrix'): Promise<any> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.post('/terraform/validate', {
      content,
      cloud_provider: cloudProvider
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to validate Terraform');
    }
    return response.data.validation;
  },

  // Parse Terraform directory
  parseTerraformDirectory: async (path: string, cloudProvider: string = 'aviatrix'): Promise<FirewallRule[]> => {
    const response: AxiosResponse<ApiResponse<FirewallRule[]>> = await api.post('/terraform/parse-directory', {
      path,
      cloud_provider: cloudProvider
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to parse Terraform directory');
    }
    return response.data.rules || [];
  }
};

// Utility functions
export const utils = {
  // Format file size
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Format duration
  formatDuration: (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  },

  // Get severity color
  getSeverityColor: (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'info': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  },

  // Validate firewall rule
  validateFirewallRule: (rule: Partial<FirewallRule>): string[] => {
    const errors: string[] = [];

    if (!rule.id) errors.push('Rule ID is required');
    if (!rule.name) errors.push('Rule name is required');
    if (!rule.cloud_provider) errors.push('Cloud provider is required');
    if (!rule.direction) errors.push('Direction is required');
    if (!rule.action) errors.push('Action is required');

    return errors;
  },

  // Generate Terraform code from firewall rules
  generateTerraformCode: (rules: FirewallRule[], provider: CloudProvider = 'gcp'): string => {
    if (rules.length === 0) {
      return '# No rules to generate Terraform code for';
    }

    const terraformBlocks: string[] = [];

    rules.forEach((rule, index) => {
      const resourceName = rule.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || `firewall-rule-${index + 1}`;
      
      if (provider === 'gcp') {
        // GCP allows multiple allow/deny blocks for different protocols
        const allowDenyBlocks: string[] = [];
        
        if (rule.protocols && rule.protocols.length > 0) {
          rule.protocols.forEach((protocol, protoIdx) => {
            const ports = rule.ports && rule.ports.length > protoIdx 
              ? [rule.ports[protoIdx]] 
              : (rule.ports && rule.ports.length > 0 ? rule.ports : []);
            
            allowDenyBlocks.push(`  ${rule.action === 'allow' ? 'allow' : 'deny'} {
    protocol = "${protocol}"
${ports.length > 0 ? `    ports    = [${ports.map(p => `"${p}"`).join(', ')}]` : ''}
  }`);
          });
        } else {
          // No protocols specified, use "all"
          allowDenyBlocks.push(`  ${rule.action === 'allow' ? 'allow' : 'deny'} {
    protocol = "all"
  }`);
        }

        terraformBlocks.push(`resource "google_compute_firewall" "${resourceName}" {
  name        = "${rule.name}"
  description = "${rule.description || 'Firewall rule created via Firewall AI'}"
  network     = "${rule.network || 'default'}"
  direction   = "${rule.direction.toUpperCase()}"
  priority    = ${rule.priority || 1000}
${rule.disabled ? '  disabled = true' : ''}

${allowDenyBlocks.join('\n\n')}

${rule.source_ranges && rule.source_ranges.length > 0 
  ? `  source_ranges = [${rule.source_ranges.map(r => `"${r}"`).join(', ')}]`
  : ''}
${rule.destination_ranges && rule.destination_ranges.length > 0 
  ? `  destination_ranges = [${rule.destination_ranges.map(r => `"${r}"`).join(', ')}]`
  : ''}
${rule.source_tags && rule.source_tags.length > 0 
  ? `  source_tags = [${rule.source_tags.map(t => `"${t}"`).join(', ')}]`
  : ''}
${rule.target_tags && rule.target_tags.length > 0 
  ? `  target_tags = [${rule.target_tags.map(t => `"${t}"`).join(', ')}]`
  : ''}
${rule.logging_enabled ? '  enable_logging = true' : ''}
}

`);
      } else if (provider === 'azure') {
        terraformBlocks.push(`resource "azurerm_network_security_rule" "${resourceName}" {
  name                        = "${rule.name}"
  resource_group_name         = var.resource_group_name
  network_security_group_name = var.network_security_group_name
  priority                    = ${rule.priority || 100}
  direction                   = "${rule.direction === 'ingress' ? 'Inbound' : 'Outbound'}"
  access                      = "${rule.action === 'allow' ? 'Allow' : 'Deny'}"
  protocol                    = "${rule.protocols && rule.protocols.length > 0 ? rule.protocols[0].toUpperCase() : '*'}"
  
${rule.source_ranges && rule.source_ranges.length > 0 
  ? `  source_address_prefix      = "${rule.source_ranges[0]}"`
  : `  source_address_prefix      = "*"`}
${rule.destination_ranges && rule.destination_ranges.length > 0 
  ? `  destination_address_prefix = "${rule.destination_ranges[0]}"`
  : `  destination_address_prefix = "*"`}
${rule.ports && rule.ports.length > 0 
  ? `  source_port_range          = "*"\n  destination_port_range     = "${rule.ports[0]}"`
  : `  source_port_range          = "*"\n  destination_port_range     = "*"`}
}

`);
      } else if (provider === 'aviatrix') {
        // Aviatrix DCF Ruleset format
        terraformBlocks.push(`resource "aviatrix_dcf_ruleset" "${resourceName}" {
  name = "${rule.name}"

  rules {
    name     = "${rule.name}"
    action   = "${rule.action === 'allow' ? 'PERMIT' : 'DENY'}"
    protocol = "${rule.protocols && rule.protocols.length > 0 ? rule.protocols[0].toUpperCase() : 'ANY'}"
    
${rule.source_ranges && rule.source_ranges.length > 0 
  ? `    src_smart_groups = [${rule.source_ranges.map(r => `"${r}"`).join(', ')}]`
  : ''}
${rule.destination_ranges && rule.destination_ranges.length > 0 
  ? `    dst_smart_groups = [${rule.destination_ranges.map(r => `"${r}"`).join(', ')}]`
  : ''}
${rule.ports && rule.ports.length > 0 
  ? `    port_ranges {
      lo = ${rule.ports[0].split('-')[0] || rule.ports[0]}
      hi = ${rule.ports[0].split('-')[1] || rule.ports[0]}
    }`
  : ''}
    logging = ${rule.logging_enabled ? 'true' : 'false'}
    watch   = false
  }
}

`);
      } else {
        // Generic fallback
        terraformBlocks.push(`# Firewall Rule: ${rule.name}
# Provider: ${provider}
# Direction: ${rule.direction}
# Action: ${rule.action}
# This rule needs provider-specific Terraform resource definition

`);
      }
    });

    return terraformBlocks.join('\n');
  },

  // Generate sample rules for testing
  generateSampleRules: (provider: string = 'gcp'): FirewallRule[] => {
    const validProvider = provider as CloudProvider;
    const timestamp = Date.now();
    
    const baseRules: FirewallRule[] = [
      {
        id: `sample-rule-1-${timestamp}`,
        name: 'allow-ssh',
        description: 'Allow SSH access from anywhere',
        cloud_provider: validProvider,
        direction: 'ingress',
        action: 'allow',
        priority: 1000,
        source_ranges: ['0.0.0.0/0'],
        protocols: ['tcp'],
        ports: ['22'],
        target_tags: ['web-server'],
        logging_enabled: true
      },
      {
        id: `sample-rule-2-${timestamp}`,
        name: 'allow-http',
        description: 'Allow HTTP access',
        cloud_provider: validProvider,
        direction: 'ingress',
        action: 'allow',
        priority: 1001,
        source_ranges: ['0.0.0.0/0'],
        protocols: ['tcp'],
        ports: ['80'],
        target_tags: ['web-server']
      },
      {
        id: `sample-rule-3-${timestamp}`,
        name: 'allow-https',
        description: 'Allow HTTPS access',
        cloud_provider: validProvider,
        direction: 'ingress',
        action: 'allow',
        priority: 1002,
        source_ranges: ['0.0.0.0/0'],
        protocols: ['tcp'],
        ports: ['443'],
        target_tags: ['web-server']
      },
      {
        id: `sample-rule-4-${timestamp}`,
        name: 'deny-all-egress',
        description: 'Deny all outbound traffic (restrictive example)',
        cloud_provider: validProvider,
        direction: 'egress',
        action: 'deny',
        priority: 65534,
        source_ranges: [],
        protocols: ['all'],
        ports: []
      }
    ];

    return baseRules;
  }
};