import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RuleInputForm from '@/components/RuleInputForm'
import { auditApi } from '@/lib/api'
import type { CloudProvider } from '@/types'

// Mock the API
jest.mock('@/lib/api', () => ({
  auditApi: {
    parseTerraform: jest.fn(),
    validateTerraform: jest.fn(),
  },
}))

const mockOnAddRule = jest.fn()
const mockOnAddMultipleRules = jest.fn()

const defaultProps = {
  onAddRule: mockOnAddRule,
  onAddMultipleRules: mockOnAddMultipleRules,
  provider: 'gcp' as CloudProvider,
}

describe('RuleInputForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render form with tabs', () => {
    render(<RuleInputForm {...defaultProps} />)
    
    expect(screen.getByText(/manual/i)).toBeInTheDocument()
    expect(screen.getByText(/terraform code/i)).toBeInTheDocument()
  })

  it('should render manual entry form fields', () => {
    render(<RuleInputForm {...defaultProps} />)
    
    expect(screen.getByLabelText(/rule name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/source ranges/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/protocols/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ports/i)).toBeInTheDocument()
  })

  it('should validate required fields on manual submit', async () => {
    render(<RuleInputForm {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /add rule/i })
    
    await act(async () => {
      await userEvent.click(submitButton)
    })
    
    // Should show error for missing name
    await waitFor(() => {
      expect(screen.getByText(/rule name is required/i)).toBeInTheDocument()
    })
  })

  it('should submit manual form with valid data', async () => {
    render(<RuleInputForm {...defaultProps} />)
    
    const nameInput = screen.getByLabelText(/rule name/i)
    const submitButton = screen.getByRole('button', { name: /add rule/i })
    
    await act(async () => {
      await userEvent.type(nameInput, 'test-rule')
      await userEvent.click(submitButton)
    })
    
    await waitFor(() => {
      expect(mockOnAddRule).toHaveBeenCalled()
    })
    
    const callArg = mockOnAddRule.mock.calls[0][0]
    expect(callArg.name).toBe('test-rule')
    expect(callArg.cloud_provider).toBe('gcp')
  })

  it('should render Terraform tab content', async () => {
    render(<RuleInputForm {...defaultProps} />)
    
    const terraformTab = screen.getByText(/terraform code/i)
    await userEvent.click(terraformTab)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/paste your terraform/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should parse Terraform content', async () => {
    const mockRules = [
      {
        id: 'rule-1',
        name: 'terraform-rule',
        cloud_provider: 'gcp' as CloudProvider,
        direction: 'ingress' as const,
        action: 'allow' as const,
      },
    ]

    const mockValidation = {
      valid: true,
      syntax_errors: [],
      security_issues: [],
      recommendations: [],
    }

    ;(auditApi.validateTerraform as jest.Mock).mockResolvedValue(mockValidation)
    ;(auditApi.parseTerraform as jest.Mock).mockResolvedValue(mockRules)

    render(<RuleInputForm {...defaultProps} />)
    
    const terraformTab = screen.getByText(/terraform code/i)
    await act(async () => {
      await userEvent.click(terraformTab)
    })
    
    const textarea = await screen.findByPlaceholderText(/paste your terraform/i)
    
    await act(async () => {
      await userEvent.type(textarea, 'resource "google_compute_firewall"')
    })
    
    const parseButton = screen.getByRole('button', { name: /import/i })
    await act(async () => {
      await userEvent.click(parseButton)
    })
    
    await waitFor(() => {
      expect(auditApi.validateTerraform).toHaveBeenCalled()
      expect(auditApi.parseTerraform).toHaveBeenCalled()
      expect(mockOnAddMultipleRules).toHaveBeenCalledWith(mockRules)
    }, { timeout: 5000 })
  })

  it('should validate Terraform content', async () => {
    const mockValidation = {
      valid: true,
      warnings: [],
    }

    ;(auditApi.validateTerraform as jest.Mock).mockResolvedValue(mockValidation)

    render(<RuleInputForm {...defaultProps} />)
    
    const terraformTab = screen.getByText(/terraform code/i)
    await act(async () => {
      await userEvent.click(terraformTab)
    })
    
    const textarea = await screen.findByPlaceholderText(/paste your terraform/i)
    
    await act(async () => {
      await userEvent.type(textarea, 'resource "google_compute_firewall"')
    })
    
    const validateButton = screen.getByRole('button', { name: /validate/i })
    await act(async () => {
      await userEvent.click(validateButton)
    })
    
    await waitFor(() => {
      expect(auditApi.validateTerraform).toHaveBeenCalled()
    })
  })

  it('should handle parse errors', async () => {
    const errorMessage = 'Failed to parse Terraform'
    ;(auditApi.parseTerraform as jest.Mock).mockRejectedValue(new Error(errorMessage))

    render(<RuleInputForm {...defaultProps} />)
    
    const terraformTab = screen.getByText(/terraform code/i)
    await act(async () => {
      await userEvent.click(terraformTab)
    })
    
    const textarea = await screen.findByPlaceholderText(/paste your terraform/i)
    
    await act(async () => {
      await userEvent.type(textarea, 'invalid terraform')
    })
    
    const parseButton = screen.getByRole('button', { name: /import/i })
    await act(async () => {
      await userEvent.click(parseButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument()
    })
  })
})
