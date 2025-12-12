/**
 * Human-in-the-Loop (HITL) 前端工具函数库
 * 用于处理中断检测、操作格式化和决策管理
 */

// ==================== 类型定义 ====================

export interface ActionRequest {
  name: string
  args: Record<string, any>
}

export interface ReviewConfig {
  action_name: string
  allowed_decisions: string[]
  description?: string
}

export interface InterruptInfo {
  action_requests: ActionRequest[]
  review_configs: ReviewConfig[]
  config_map: Record<string, ReviewConfig>
}

export interface FormattedAction {
  index: number
  tool_name: string
  arguments: Record<string, any>
  allowed_decisions: string[]
  description?: string
}

export interface Decision {
  type: 'approve' | 'edit' | 'reject'
  edited_action?: {
    name: string
    args: Record<string, any>
  }
}

// ==================== 中断检测 ====================

/**
 * 检查响应中是否有中断
 */
export function hasInterrupt(data: any): boolean {
  return data && data.__interrupt__ && Array.isArray(data.__interrupt__) && data.__interrupt__.length > 0
}

/**
 * 从响应中提取中断信息
 */
export function extractInterruptInfo(data: any): InterruptInfo | null {
  if (!hasInterrupt(data)) {
    return null
  }

  try {
    const interrupt = data.__interrupt__[0]
    const value = interrupt.value || interrupt

    const action_requests = value.action_requests || []
    const review_configs = value.review_configs || []

    // 创建配置映射
    const config_map: Record<string, ReviewConfig> = {}
    for (const config of review_configs) {
      config_map[config.action_name] = config
    }

    return {
      action_requests,
      review_configs,
      config_map,
    }
  } catch (error) {
    console.error('提取中断信息失败:', error)
    return null
  }
}

// ==================== 操作格式化 ====================

/**
 * 格式化中断信息用于前端展示
 */
export function formatActionsForDisplay(interruptInfo: InterruptInfo): FormattedAction[] {
  const actions: FormattedAction[] = []

  for (let idx = 0; idx < interruptInfo.action_requests.length; idx++) {
    const action = interruptInfo.action_requests[idx]
    const config = interruptInfo.config_map[action.name] || {}

    actions.push({
      index: idx,
      tool_name: action.name,
      arguments: action.args || {},
      allowed_decisions: config.allowed_decisions || [],
      description: config.description,
    })
  }

  return actions
}

// ==================== 决策验证 ====================

/**
 * 验证决策是否有效
 */
export function validateDecisions(
  decisions: Decision[],
  interruptInfo: InterruptInfo
): { valid: boolean; error?: string } {
  const { action_requests, config_map } = interruptInfo

  // 检查决策数量
  if (decisions.length !== action_requests.length) {
    return {
      valid: false,
      error: `决策数量(${decisions.length})与操作数量(${action_requests.length})不匹配`,
    }
  }

  // 验证每个决策
  for (let idx = 0; idx < decisions.length; idx++) {
    const decision = decisions[idx]
    const action = action_requests[idx]
    const config = config_map[action.name] || {}
    const allowed = config.allowed_decisions || []

    // 检查决策类型
    if (!allowed.includes(decision.type)) {
      return {
        valid: false,
        error: `操作 ${idx}(${action.name}): 决策类型 '${decision.type}' 不被允许。允许的类型: ${allowed.join(', ')}`,
      }
    }

    // 如果是 edit 决策，检查 edited_action
    if (decision.type === 'edit') {
      if (!decision.edited_action) {
        return {
          valid: false,
          error: `操作 ${idx}: edit 决策必须包含 'edited_action'`,
        }
      }

      const edited = decision.edited_action
      if (!edited.name || !edited.args) {
        return {
          valid: false,
          error: `操作 ${idx}: edited_action 必须包含 'name' 和 'args'`,
        }
      }
    }
  }

  return { valid: true }
}

// ==================== 决策创建 ====================

/**
 * 创建批准决策
 */
export function createApproveDecision(): Decision {
  return { type: 'approve' }
}

/**
 * 创建拒绝决策
 */
export function createRejectDecision(): Decision {
  return { type: 'reject' }
}

/**
 * 创建编辑决策
 */
export function createEditDecision(
  toolName: string,
  editedArgs: Record<string, any>
): Decision {
  return {
    type: 'edit',
    edited_action: {
      name: toolName,
      args: editedArgs,
    },
  }
}

