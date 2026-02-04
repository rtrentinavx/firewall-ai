import { auditApi, utils } from '@/lib/api'
import type { FirewallRule, AuditRequest } from '@/types'

// Mock axios module
let axiosMockInstance: any

jest.mock('axios', () => {
  const mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
  }
  
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockInstance),
    },
  }
})

describe('auditApi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => null)
    // Get the mocked axios instance
    const axios = require('axios')
    axiosMockInstance = axios.default.create()
    axiosMockInstance.get.mockClear()
    axiosMockInstance.post.mockClear()
  })

  describe('auditRules', () => {
    it('should successfully audit rules', async () => {
      const mockRequest: AuditRequest = {
        rules: [],
        intent: 'security audit',
        cloud_provider: 'gcp',
      }

      const mockResponse = {
        data: {
          success: true,
          result: {
            id: 'audit-1',
            timestamp: new Date(),
            total_rules: 0,
            violations_found: 0,
            recommendations: 0,
            intent: 'security audit',
            cloud_provider: 'gcp',
          },
        },
      }

      axiosMockInstance.post.mockResolvedValue(mockResponse)

      const result = await auditApi.auditRules(mockRequest)
      expect(result).toBeDefined()
      expect(result.intent).toBe('security audit')
    })

    it('should throw error on failed audit', async () => {
      const mockRequest: AuditRequest = {
        rules: [],
        intent: 'security audit',
        cloud_provider: 'gcp',
      }

      const mockResponse = {
        data: {
          success: false,
          error: 'Audit failed',
        },
      }

      axiosMockInstance.post.mockResolvedValue(mockResponse)

      await expect(auditApi.auditRules(mockRequest)).rejects.toThrow('Audit failed')
    })
  })

  describe('normalizeRules', () => {
    it('should normalize rules successfully', async () => {
      const mockRules: FirewallRule[] = [
        {
          id: 'rule-1',
          name: 'test-rule',
          cloud_provider: 'gcp',
          direction: 'ingress',
          action: 'allow',
        },
      ]

      const mockResponse = {
        data: {
          success: true,
          normalized_rules: [
            {
              original_rule: mockRules[0],
              normalized_data: {},
              schema_version: '1.0',
            },
          ],
        },
      }

      axiosMockInstance.post.mockResolvedValue(mockResponse)

      const result = await auditApi.normalizeRules(mockRules)
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getCacheStats', () => {
    it('should get cache stats successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          context_cache: { entries: 10 },
          semantic_cache: { entries: 5 },
        },
      }

      axiosMockInstance.get.mockResolvedValue(mockResponse)

      const result = await auditApi.getCacheStats()
      expect(result).toBeDefined()
      expect(result.context_cache).toBeDefined()
      expect(result.semantic_cache).toBeDefined()
    })
  })

  describe('parseTerraform', () => {
    it('should parse Terraform content successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          rules: [
            {
              id: 'rule-1',
              name: 'terraform-rule',
              cloud_provider: 'gcp',
              direction: 'ingress',
              action: 'allow',
            },
          ],
        },
      }

      axiosMockInstance.post.mockResolvedValue(mockResponse)

      const result = await auditApi.parseTerraform('resource "google_compute_firewall"')
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})

describe('utils', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(utils.formatFileSize(0)).toBe('0 Bytes')
      expect(utils.formatFileSize(1024)).toBe('1 KB')
      expect(utils.formatFileSize(1048576)).toBe('1 MB')
    })

    it('should handle large file sizes', () => {
      const result = utils.formatFileSize(1073741824)
      expect(result).toContain('GB')
    })
  })

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(utils.formatDuration(30)).toBe('30.0s')
      expect(utils.formatDuration(90)).toBe('1m 30s')
      expect(utils.formatDuration(120)).toBe('2m 0s')
    })
  })

  describe('getSeverityColor', () => {
    it('should return correct colors for severity levels', () => {
      expect(utils.getSeverityColor('high')).toContain('red')
      expect(utils.getSeverityColor('medium')).toContain('yellow')
      expect(utils.getSeverityColor('low')).toContain('blue')
      expect(utils.getSeverityColor('info')).toContain('gray')
      expect(utils.getSeverityColor('unknown')).toContain('gray')
    })

    it('should be case insensitive', () => {
      expect(utils.getSeverityColor('HIGH')).toContain('red')
      expect(utils.getSeverityColor('Medium')).toContain('yellow')
    })
  })

  describe('validateFirewallRule', () => {
    it('should validate complete rule', () => {
      const rule: Partial<FirewallRule> = {
        id: 'rule-1',
        name: 'test-rule',
        cloud_provider: 'gcp',
        direction: 'ingress',
        action: 'allow',
      }

      const errors = utils.validateFirewallRule(rule)
      expect(errors).toHaveLength(0)
    })

    it('should return errors for missing required fields', () => {
      const rule: Partial<FirewallRule> = {}
      const errors = utils.validateFirewallRule(rule)

      expect(errors).toContain('Rule ID is required')
      expect(errors).toContain('Rule name is required')
      expect(errors).toContain('Cloud provider is required')
      expect(errors).toContain('Direction is required')
      expect(errors).toContain('Action is required')
    })
  })

  describe('generateSampleRules', () => {
    it('should generate sample rules', () => {
      const rules = utils.generateSampleRules('gcp')
      expect(Array.isArray(rules)).toBe(true)
      expect(rules.length).toBeGreaterThan(0)
      expect(rules[0]).toHaveProperty('id')
      expect(rules[0]).toHaveProperty('name')
      expect(rules[0]).toHaveProperty('cloud_provider')
    })

    it('should use provided provider', () => {
      const rules = utils.generateSampleRules('azure')
      expect(rules[0].cloud_provider).toBe('azure')
    })
  })
})
