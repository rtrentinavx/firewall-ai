// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  result?: T;
  audit_id?: string;
  normalized_rules?: T;
  context_cache?: any;
  semantic_cache?: any;
  cache_stats?: T;
  message?: string;
  similar_issues?: T;
  providers?: T;
  rules?: T;
  count?: number;
  directory?: string;
  validation?: any;
  warnings?: string[];
  errors?: string[];
  metadata?: any;
  parser?: string;
}
export type CloudProvider = 'gcp' | 'azure' | 'aviatrix' | 'cisco' | 'palo_alto';

// Firewall Rule Types
export interface FirewallRule {
  id: string;
  name: string;
  description?: string;
  cloud_provider: 'gcp' | 'azure' | 'aviatrix' | 'cisco' | 'palo_alto';
  direction: 'ingress' | 'egress';
  action: 'allow' | 'deny' | 'redirect';
  priority?: number;
  source_ranges?: string[];
  destination_ranges?: string[];
  source_tags?: string[];
  target_tags?: string[];
  source_service_accounts?: string[];
  protocols?: string[];
  ports?: string[];
  network?: string;
  target_service_accounts?: string[];
  disabled?: boolean;
  logging_enabled?: boolean;
  provider_specific?: Record<string, any>;
}

// Audit Request Types
export interface AuditRequest {
  rules: FirewallRule[];
  intent: string;
  cloud_provider?: string;
}
export interface Violation {
  rule_id: string;
  rule_name: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  reason: string;
  remediation: string;
  risk_score: number;
  affected_resources?: string[];
  compliance_standards?: string[];
}

export interface Recommendation {
  id: string;
  rule_id: string;
  title: string;
  description: string;
  terraform_code: string;
  explanation: string;
  risk_reduction: number;
  effort_level: 'low' | 'medium' | 'high';
  alternative_approaches?: string[];
  prerequisites?: string[];
}

export interface AuditResult {
  id: string;
  timestamp: string;
  total_rules: number;
  violations_found: number;
  recommendations: number;
  intent: string;
  cloud_provider: string;
  violations: Violation[];
  recommendations_list: Recommendation[];
  summary?: Record<string, any>;
  execution_time_seconds: number;
  cached: boolean;
  confidence_score: number;
  similar_issues?: any[];
  terraform_diff?: {
    original?: string;
    modified?: string;
    additions?: number;
    deletions?: number;
    modifications?: number;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuditRequest {
  rules: FirewallRule[];
  intent: string;
  cloud_provider?: string;
}

export interface NormalizationRequest {
  rules: FirewallRule[];
}

export interface NormalizedRule {
  original_rule: FirewallRule;
  normalized_data: Record<string, any>;
  schema_version: string;
  normalization_timestamp: string;
  confidence_score: number;
}

// User Management Types
export interface User {
  user_id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  created_at: string;
  last_login?: string;
  active: boolean;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  admins: number;
  users: number;
  viewers: number;
}

// UI State Types
export interface AuditState {
  isLoading: boolean;
  currentStep: 'input' | 'analyzing' | 'results' | 'diff';
  rules: FirewallRule[];
  intent: string;
  result?: AuditResult;
  error?: string;
}

export interface DiffViewState {
  originalCode: string;
  proposedCode: string;
  selectedRecommendation?: Recommendation;
  isApproved: boolean;
}

// Cache Statistics Types
export interface CacheStats {
  context_cache: {
    entries: number;
    total_size_mb: number;
    max_size: number;
    utilization_percent: number;
    oldest_entry?: string;
    ttl_hours: number;
  };
  semantic_cache: {
    entries: number;
    max_entries: number;
    total_usage: number;
    avg_usage_per_entry: number;
    embedding_dimension: number;
    model_name?: number;
  };
}