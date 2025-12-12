/**
 * HITL 集成示例代码
 * 展示如何在 book-chat-v2 中集成 Human-in-the-loop 功能
 */

'use client'

import { useState, useRef } from 'react'
import { useHITL } from '@/hooks/useHITL'
import { HITLApprovalModal } from '@/components/modals/HITLApprovalModal'
import { Decision } from '@/lib/hitl-utils'

export function ChatWithHITL() {
  const [hitlState, hitlActions] = useHITL()
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  /**
   * 处理 SSE 流中的中断
   * 在 book-chat-v2 的 handleSendMessage 中调用
   */
  const handleSSEData = (data: any) => {
    // 检查是否有中断
    if (hitlActions.handleInterrupt(data)) {
      console.log('🛑 检测到中断，显示审批模态框')
      // 中断已被处理，useHITL 会自动更新状态
      // 模态框会自动显示
      return true
    }

    // 没有中断，继续处理正常数据
    return false
  }

  /**
   * 恢复执行（发送用户决策）
   */
  const resumeWithDecisions = async (decisions: Decision[]) => {
    if (!currentThreadId) {
      console.error('没有 thread_id')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/chat/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          thread_id: currentThreadId,
          decisions: decisions
        })
      })

      if (!response.ok) {
        throw new Error(`恢复失败: ${response.status}`)
      }

      // 处理恢复后的响应流
      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim()
            if (!dataStr) continue

            try {
              const data = JSON.parse(dataStr)

              // 再次检查中断
              if (handleSSEData(data)) {
                // 又有新的中断
                return
              }

              // 处理内容、sources 等
              // ...
            } catch (e) {
              console.warn('SSE 解析错误:', e)
            }
          }
        }
      }

      console.log('✅ 恢复执行完成')
    } catch (error) {
      console.error('恢复执行失败:', error)
      // 显示错误提示
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 处理模态框的批准
   */
  const handleApprove = async (decisions: Decision[]) => {
    console.log('📤 提交决策:', decisions)

    // 验证决策
    const validation = hitlState.interruptInfo
      ? hitlActions.submitDecisions()
      : { valid: false }

    if (!validation.valid) {
      console.error('决策验证失败:', validation.error)
      return
    }

    // 恢复执行
    await resumeWithDecisions(decisions)
  }

  /**
   * 处理模态框的取消
   */
  const handleCancel = () => {
    console.log('❌ 用户取消了审批')
    hitlActions.clearInterrupt()
    // 可选：显示用户提示
  }

  return (
    <>
      {/* 在你的聊天组件中使用 handleSSEData */}
      {/* 
        在 handleSendMessage 中：
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const dataStr = line.slice(5).trim()
              if (!dataStr) continue

              try {
                const data = JSON.parse(dataStr)
                
                // 添加这一行
                if (handleSSEData(data)) {
                  return  // 有中断，停止处理
                }

                // 继续处理其他事件...
              } catch (e) {
                console.warn('SSE 解析错误:', e)
              }
            }
          }
        }
      */}

      {/* HITL 审批模态框 */}
      <HITLApprovalModal
        isOpen={hitlState.isInterrupted}
        actions={hitlState.formattedActions}
        onApprove={handleApprove}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </>
  )
}

/**
 * 使用说明：
 * 
 * 1. 在 book-chat-v2/page.tsx 中导入此组件或复制相关逻辑
 * 2. 在 handleSendMessage 中调用 handleSSEData(data)
 * 3. 添加 <HITLApprovalModal /> 到页面
 * 4. 实现 resumeWithDecisions 函数
 * 
 * 关键点：
 * - 必须保存 thread_id 用于恢复
 * - 中断检测必须在 SSE 处理循环中
 * - 决策必须按顺序提交
 * - 恢复时使用相同的 thread_id
 */

