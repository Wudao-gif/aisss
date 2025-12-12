'use client'

import { useState, useEffect, useRef } from 'react'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, memoryAccess: 'default' | 'project-only') => void
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onCreate
}: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [memoryAccess, setMemoryAccess] = useState<'default' | 'project-only'>('default')
  const [memoryAccessLocked, setMemoryAccessLocked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setProjectName('')
      setShowSettings(false)
      setMemoryAccess('default')
      setMemoryAccessLocked(false)
      // 自动聚焦输入框
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

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

  const handleCreate = () => {
    if (projectName.trim()) {
      onCreate(projectName.trim(), memoryAccess)
      onClose()
    }
  }

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
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#37322F]">
            创建新计划
          </h2>
          <div className="flex items-center gap-2">
            {/* 设置按钮 */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings
                  ? 'bg-gray-200 text-[#37322F]'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              aria-label="设置"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l-4.2-4.2" />
              </svg>
            </button>
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              aria-label="关闭"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* 计划名称输入 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            计划名称
          </label>
          <input
            ref={inputRef}
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreate()
              }
            }}
            placeholder="输入计划名称"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:border-transparent"
          />
        </div>

        {/* 设置面板 */}
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              记忆访问权限
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              设置后无法更改
            </p>
            <div className="space-y-2">
              {/* 默认选项 */}
              <label
                className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  memoryAccess === 'default'
                    ? 'border-[#37322F] bg-white'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${memoryAccessLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="memoryAccess"
                  value="default"
                  checked={memoryAccess === 'default'}
                  onChange={(e) => !memoryAccessLocked && setMemoryAccess('default')}
                  disabled={memoryAccessLocked}
                  className="mt-0.5 mr-3"
                />
                <div>
                  <div className="font-medium text-sm text-[#37322F]">
                    默认
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    该计划可以访问外部聊天的记忆，反之亦然
                  </div>
                </div>
              </label>

              {/* 仅计划选项 */}
              <label
                className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  memoryAccess === 'project-only'
                    ? 'border-[#37322F] bg-white'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${memoryAccessLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="memoryAccess"
                  value="project-only"
                  checked={memoryAccess === 'project-only'}
                  onChange={(e) => !memoryAccessLocked && setMemoryAccess('project-only')}
                  disabled={memoryAccessLocked}
                  className="mt-0.5 mr-3"
                />
                <div>
                  <div className="font-medium text-sm text-[#37322F]">
                    仅计划
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    该计划只能访问自身的记忆，其记忆内容对外部聊天不可见
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!projectName.trim()}
            className={`px-6 py-2.5 text-white rounded-lg font-medium transition-colors ${
              projectName.trim()
                ? 'bg-[#37322F] hover:bg-[#2d2823]'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            创建
          </button>
        </div>
      </div>
    </div>
  )
}

