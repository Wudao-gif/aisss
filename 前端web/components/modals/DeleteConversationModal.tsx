'use client'

import { useEffect } from 'react'

interface DeleteConversationModalProps {
  isOpen: boolean
  conversationTitle: string
  onClose: () => void
  onConfirm: () => void
}

export function DeleteConversationModal({
  isOpen,
  conversationTitle,
  onClose,
  onConfirm
}: DeleteConversationModalProps) {
  // ESC键关闭弹窗
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* 标题 */}
        <h2 className="text-xl font-semibold text-[#37322F] mb-3">
          删除聊天？
        </h2>

        {/* 内容 */}
        <p className="text-gray-600 mb-6">
          这将删除 <span className="font-medium text-[#37322F]">{conversationTitle}</span>。
        </p>

        {/* 按钮组 */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="px-6 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}

