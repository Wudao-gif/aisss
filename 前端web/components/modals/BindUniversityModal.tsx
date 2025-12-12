'use client'

/**
 * 绑定大学弹窗
 * 用户首次访问时如果没有绑定大学，弹出此弹窗
 */

import { useState } from 'react'
import { UniversitySelector } from '@/components/auth/UniversitySelector'
import { useAuthStore } from '@/stores/useAuthStore'

interface BindUniversityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function BindUniversityModal({ isOpen, onClose, onSuccess }: BindUniversityModalProps) {
  const { user, setUser } = useAuthStore()
  const [university, setUniversity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!university.trim()) {
      setError('请选择您的大学')
      return
    }

    // 确认提示
    const confirmed = window.confirm(
      `确定选择「${university}」吗？\n\n⚠️ 注意：选中后无法更改，后期若需修改大学请联系客服。`
    )
    if (!confirmed) return

    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ university }),
      })

      const data = await response.json()

      if (data.success) {
        // 更新本地用户状态
        if (user) {
          const updatedUser = { ...user, university }
          setUser(updatedUser)
          // 同步更新 localStorage 中的用户信息，确保刷新后状态一致
          localStorage.setItem('loggedInUser', JSON.stringify(updatedUser))
        }
        onSuccess()
        onClose()
      } else {
        setError(data.message || '绑定失败，请重试')
      }
    } catch (err) {
      console.error('绑定大学失败:', err)
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* 标题 */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🏫</div>
          <h2 className="text-xl font-semibold text-gray-900">选择您的大学</h2>
          <p className="text-sm text-gray-500 mt-2">
            绑定大学后，您可以查看该大学的专属教材和资源
          </p>
        </div>

        {/* 大学选择器 */}
        <div className="mb-6">
          <UniversitySelector
            value={university}
            onChange={setUniversity}
            disabled={loading}
          />
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* 提示 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <p className="text-amber-800 text-xs">
            ⚠️ 大学绑定后无法自行修改，如需更改请联系客服
          </p>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            稍后再说
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !university}
            className="flex-1 px-4 py-2.5 bg-[#37322F] text-white rounded-lg hover:bg-[#4a4340] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '绑定中...' : '确认绑定'}
          </button>
        </div>
      </div>
    </div>
  )
}

