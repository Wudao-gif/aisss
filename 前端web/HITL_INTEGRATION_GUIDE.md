# 前端 Human-in-the-Loop (HITL) 集成指南

## 📋 概述

本指南说明如何在前端集成 Human-in-the-loop 功能，用于处理 AI Agent 的中断请求。

## 🎯 集成步骤

### 1. 导入必要的工具和 Hook

```typescript
import { useHITL } from '@/hooks/useHITL'
import { HITLApprovalModal } from '@/components/modals/HITLApprovalModal'
import { Decision } from '@/lib/hitl-utils'
```

### 2. 在组件中使用 useHITL Hook

```typescript
const [hitlState, hitlActions] = useHITL()
```

### 3. 在 SSE 流处理中检查中断

```typescript
// 在处理 SSE 数据时
if (currentEvent === 'done' || data.done) {
  // 检查是否有中断
  if (hitlActions.handleInterrupt(data)) {
    // 有待审批的操作，显示模态框
    return
  }
  
  // 没有中断，继续处理
  // ...
}
```

### 4. 添加 HITL 模态框

```typescript
<HITLApprovalModal
  isOpen={hitlState.isInterrupted}
  actions={hitlState.formattedActions}
  onApprove={(decisions) => {
    // 发送决策到后端
    resumeWithDecisions(decisions)
    hitlActions.clearInterrupt()
  }}
  onCancel={() => {
    hitlActions.clearInterrupt()
  }}
  isLoading={isLoading}
/>
```

### 5. 实现恢复逻辑

```typescript
async function resumeWithDecisions(decisions: Decision[]) {
  try {
    const response = await fetch('/api/ai/chat/resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        thread_id: currentThreadId,
        decisions: decisions
      })
    })
    
    // 处理恢复后的响应...
  } catch (error) {
    console.error('恢复执行失败:', error)
  }
}
```

## 📦 新增文件

| 文件 | 说明 |
|------|------|
| `lib/hitl-utils.ts` | HITL 工具函数库 |
| `hooks/useHITL.ts` | HITL 状态管理 Hook |
| `components/modals/HITLApprovalModal.tsx` | HITL 审批模态框 |

## 🔧 工具函数

### hitl-utils.ts

#### 中断检测
- `hasInterrupt(data)` - 检查是否有中断
- `extractInterruptInfo(data)` - 提取中断信息

#### 操作格式化
- `formatActionsForDisplay(interruptInfo)` - 格式化用于展示

#### 决策验证
- `validateDecisions(decisions, interruptInfo)` - 验证决策有效性

#### 决策创建
- `createApproveDecision()` - 创建批准决策
- `createRejectDecision()` - 创建拒绝决策
- `createEditDecision(toolName, editedArgs)` - 创建编辑决策

## 🎨 useHITL Hook

### 状态
```typescript
{
  isInterrupted: boolean          // 是否被中断
  interruptInfo: InterruptInfo    // 中断信息
  formattedActions: FormattedAction[]  // 格式化的操作
  decisions: Decision[]           // 用户决策
  isValidating: boolean           // 是否验证中
  validationError: string | null  // 验证错误
}
```

### 方法
- `handleInterrupt(data)` - 处理中断
- `clearInterrupt()` - 清除中断
- `setDecision(index, decision)` - 设置单个决策
- `submitDecisions()` - 提交决策
- `getDecisions()` - 获取决策列表

## 💡 使用示例

```typescript
'use client'

import { useHITL } from '@/hooks/useHITL'
import { HITLApprovalModal } from '@/components/modals/HITLApprovalModal'

export function ChatComponent() {
  const [hitlState, hitlActions] = useHITL()

  const handleMessage = async (message: string) => {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    })

    const data = await response.json()

    // 检查中断
    if (hitlActions.handleInterrupt(data)) {
      // 显示审批模态框
      return
    }

    // 处理正常响应
    // ...
  }

  return (
    <>
      {/* 聊天界面 */}
      
      {/* HITL 模态框 */}
      <HITLApprovalModal
        isOpen={hitlState.isInterrupted}
        actions={hitlState.formattedActions}
        onApprove={(decisions) => {
          // 发送决策
          submitDecisions(decisions)
          hitlActions.clearInterrupt()
        }}
        onCancel={() => hitlActions.clearInterrupt()}
      />
    </>
  )
}
```

## 🔗 相关文档

- `ai-education-service/HUMAN_IN_THE_LOOP_GUIDE.md` - 后端 HITL 指南
- `ai-education-service/HITL_QUICK_REFERENCE.md` - 快速参考

## ✅ 集成检查清单

- [ ] 导入 useHITL Hook
- [ ] 导入 HITLApprovalModal 组件
- [ ] 在 SSE 处理中添加中断检测
- [ ] 实现恢复逻辑
- [ ] 测试完整工作流程
- [ ] 处理错误情况

