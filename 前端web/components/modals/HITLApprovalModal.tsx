/**
 * Human-in-the-Loop 审批模态框
 * 用于展示待审批操作并收集用户决策
 */

'use client'

import React, { useState } from 'react'
import { Modal, Button, Tag, Tooltip, TextArea } from '@lobehub/ui'
import { AlertCircle, CheckCircle, XCircle, Edit2 } from 'lucide-react'
import { FormattedAction, Decision, createApproveDecision, createRejectDecision, createEditDecision } from '@/lib/hitl-utils'

interface HITLApprovalModalProps {
  isOpen: boolean
  actions: FormattedAction[]
  onApprove: (decisions: Decision[]) => void
  onCancel: () => void
  isLoading?: boolean
}

export function HITLApprovalModal({
  isOpen,
  actions,
  onApprove,
  onCancel,
  isLoading = false,
}: HITLApprovalModalProps) {
  const [decisions, setDecisions] = useState<(Decision | null)[]>(
    Array(actions.length).fill(null)
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedArgs, setEditedArgs] = useState<Record<string, any>>({})

  const handleApprove = (index: number) => {
    const newDecisions = [...decisions]
    newDecisions[index] = createApproveDecision()
    setDecisions(newDecisions)
  }

  const handleReject = (index: number) => {
    const newDecisions = [...decisions]
    newDecisions[index] = createRejectDecision()
    setDecisions(newDecisions)
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditedArgs(JSON.parse(JSON.stringify(actions[index].arguments)))
  }

  const handleSaveEdit = (index: number) => {
    const action = actions[index]
    const newDecisions = [...decisions]
    newDecisions[index] = createEditDecision(action.tool_name, editedArgs)
    setDecisions(newDecisions)
    setEditingIndex(null)
  }

  const allDecided = decisions.every(d => d !== null)

  const handleSubmit = () => {
    if (allDecided) {
      onApprove(decisions as Decision[])
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="⚠️ 待审批操作"
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={isLoading}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          disabled={!allDecided || isLoading}
          loading={isLoading}
        >
          提交决策
        </Button>,
      ]}
    >
      <div className="space-y-4">
        {actions.map((action, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition"
          >
            {/* 操作头部 */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900">{action.tool_name}</h3>
                </div>
                {action.description && (
                  <p className="text-sm text-gray-600">{action.description}</p>
                )}
              </div>
              <div className="flex gap-1">
                {action.allowed_decisions.includes('approve') && (
                  <Tooltip title="批准">
                    <Button
                      size="small"
                      type={decisions[index]?.type === 'approve' ? 'primary' : 'default'}
                      onClick={() => handleApprove(index)}
                      icon={<CheckCircle className="w-4 h-4" />}
                    />
                  </Tooltip>
                )}
                {action.allowed_decisions.includes('edit') && (
                  <Tooltip title="编辑">
                    <Button
                      size="small"
                      type={decisions[index]?.type === 'edit' ? 'primary' : 'default'}
                      onClick={() => handleEdit(index)}
                      icon={<Edit2 className="w-4 h-4" />}
                    />
                  </Tooltip>
                )}
                {action.allowed_decisions.includes('reject') && (
                  <Tooltip title="拒绝">
                    <Button
                      size="small"
                      type={decisions[index]?.type === 'reject' ? 'primary' : 'default'}
                      onClick={() => handleReject(index)}
                      icon={<XCircle className="w-4 h-4" />}
                    />
                  </Tooltip>
                )}
              </div>
            </div>

            {/* 参数显示 */}
            <div className="bg-white rounded p-3 mb-3 font-mono text-sm">
              <pre className="text-gray-700 overflow-auto max-h-32">
                {JSON.stringify(action.arguments, null, 2)}
              </pre>
            </div>

            {/* 编辑模式 */}
            {editingIndex === index && (
              <div className="bg-blue-50 rounded p-3 mb-3 space-y-2">
                <p className="text-sm font-semibold text-blue-900">编辑参数</p>
                <TextArea
                  value={JSON.stringify(editedArgs, null, 2)}
                  onChange={(e) => {
                    try {
                      setEditedArgs(JSON.parse(e.target.value))
                    } catch {
                      // 保持当前值
                    }
                  }}
                  rows={6}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => handleSaveEdit(index)}
                  >
                    保存编辑
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setEditingIndex(null)}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}

            {/* 决策状态 */}
            {decisions[index] && (
              <div className="flex items-center gap-2">
                {decisions[index]?.type === 'approve' && (
                  <Tag color="green">✓ 已批准</Tag>
                )}
                {decisions[index]?.type === 'reject' && (
                  <Tag color="red">✗ 已拒绝</Tag>
                )}
                {decisions[index]?.type === 'edit' && (
                  <Tag color="blue">✎ 已编辑</Tag>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}

