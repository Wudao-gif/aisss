/**
 * useHITL Hook
 * 用于管理 Human-in-the-loop 中断和决策流程
 */

import { useState, useCallback } from 'react'
import {
  InterruptInfo,
  FormattedAction,
  Decision,
  extractInterruptInfo,
  formatActionsForDisplay,
  validateDecisions,
} from '@/lib/hitl-utils'

export interface HITLState {
  isInterrupted: boolean
  interruptInfo: InterruptInfo | null
  formattedActions: FormattedAction[]
  decisions: Decision[]
  isValidating: boolean
  validationError: string | null
}

export interface HITLActions {
  handleInterrupt: (data: any) => boolean
  clearInterrupt: () => void
  setDecision: (index: number, decision: Decision) => void
  submitDecisions: () => { valid: boolean; error?: string }
  getDecisions: () => Decision[]
}

export function useHITL(): [HITLState, HITLActions] {
  const [isInterrupted, setIsInterrupted] = useState(false)
  const [interruptInfo, setInterruptInfo] = useState<InterruptInfo | null>(null)
  const [formattedActions, setFormattedActions] = useState<FormattedAction[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // 处理中断
  const handleInterrupt = useCallback((data: any): boolean => {
    const info = extractInterruptInfo(data)
    if (!info) {
      return false
    }

    setInterruptInfo(info)
    setFormattedActions(formatActionsForDisplay(info))
    setDecisions(Array(info.action_requests.length).fill(null))
    setIsInterrupted(true)
    setValidationError(null)

    return true
  }, [])

  // 清除中断
  const clearInterrupt = useCallback(() => {
    setIsInterrupted(false)
    setInterruptInfo(null)
    setFormattedActions([])
    setDecisions([])
    setValidationError(null)
  }, [])

  // 设置单个决策
  const setDecision = useCallback((index: number, decision: Decision) => {
    setDecisions(prev => {
      const newDecisions = [...prev]
      newDecisions[index] = decision
      return newDecisions
    })
    setValidationError(null)
  }, [])

  // 提交决策
  const submitDecisions = useCallback(() => {
    if (!interruptInfo) {
      return { valid: false, error: '没有待审批的操作' }
    }

    setIsValidating(true)
    const result = validateDecisions(decisions, interruptInfo)
    setIsValidating(false)

    if (!result.valid) {
      setValidationError(result.error || '决策验证失败')
      return result
    }

    setValidationError(null)
    return { valid: true }
  }, [decisions, interruptInfo])

  // 获取决策
  const getDecisions = useCallback(() => {
    return decisions
  }, [decisions])

  const state: HITLState = {
    isInterrupted,
    interruptInfo,
    formattedActions,
    decisions,
    isValidating,
    validationError,
  }

  const actions: HITLActions = {
    handleInterrupt,
    clearInterrupt,
    setDecision,
    submitDecisions,
    getDecisions,
  }

  return [state, actions]
}

