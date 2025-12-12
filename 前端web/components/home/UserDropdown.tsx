'use client'

/**
 * 用户下拉菜单组件
 * 显示用户头像和下拉菜单
 */

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/useAuthStore'
import { SettingsModal } from '@/components/settings-modal'

interface UserDropdownProps {
  onLoginClick?: () => void  // 改为可选，保持向后兼容
}

export function UserDropdown({ onLoginClick }: UserDropdownProps) {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    setDropdownOpen(false)
  }

  const handleOpenSettings = () => {
    setSettingsOpen(true)
    setDropdownOpen(false)
  }

  // 处理登录点击 - 在新标签页中打开登录页面
  const handleLoginClick = () => {
    // 获取当前完整 URL 作为回调
    const currentUrl = window.location.href
    window.open(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`, '_blank')
  }

  // 未登录状态
  if (!user) {
    return (
      <button
        onClick={handleLoginClick}
        className="px-4 py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors font-medium text-sm"
      >
        登录
      </button>
    )
  }

  // 已登录状态
  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {/* 用户头像 */}
          {user.avatar ? (
            <img
              src={user.avatar}
              alt="头像"
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-[#37322F] to-[#5a524d] rounded-full flex items-center justify-center text-white font-medium text-sm">
              {user.realName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || user.phone?.slice(-4) || 'U'}
            </div>
          )}

          {/* 用户名（桌面端显示） */}
          <span className="hidden md:block text-sm font-medium text-gray-900 max-w-[120px] truncate">
            {user.realName || user.email || (user.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : '用户')}
          </span>

          {/* 下拉箭头 */}
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${
              dropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* 下拉菜单 */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
            {/* 用户信息 */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="font-medium text-gray-900">
                {user.realName || (user.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : '用户')}
              </div>
              <div className="text-sm text-gray-600 truncate">
                {user.email || (user.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : '')}
              </div>
              {user.university && (
                <div className="text-xs text-gray-500 mt-1">{user.university}</div>
              )}
            </div>

            {/* 菜单项 */}
            <div className="py-1">
              <button
                onClick={handleOpenSettings}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                设置
              </button>

              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                帮助中心
              </button>
            </div>

            {/* 登出 */}
            <div className="border-t border-gray-100 pt-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                退出登录
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 设置模态框 */}
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  )
}

