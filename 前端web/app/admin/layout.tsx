'use client'

/**
 * 管理后台布局
 */

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/useAuthStore'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 等待 Zustand 从 localStorage 恢复状态
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // 只在加载完成后检查权限
    if (isLoading) return

    // 检查是否登录且是管理员
    if (!user) {
      router.push('/new')
      return
    }

    // 检查用户是否是管理员
    if (user.role !== 'admin') {
      alert('您没有管理员权限，无法访问后台管理页面')
      router.push('/new')
      return
    }
  }, [user, router, isLoading])

  const handleLogout = () => {
    logout()
    router.push('/new')
  }

  const navItems = [
    { name: '用户管理', path: '/admin/users', icon: '👥' },
    { name: '图书管理', path: '/admin/books', icon: '📚' },
    { name: '大学管理', path: '/admin/universities', icon: '🏫' },
    { name: '用户资源', path: '/admin/user-resources', icon: '📁' },
    { name: '文档模板', path: '/admin/templates', icon: '📄' },
    { name: '文件图标', path: '/admin/file-icons', icon: '🖼️' },
    { name: '模型配置', path: '/admin/models', icon: '🤖' },
  ]

  // 加载中或未登录时显示加载状态
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white shadow-lg transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-gray-800">Brillance 管理</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* 底部用户信息 */}
        <div className="p-4 border-t">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <div className="font-medium text-gray-800">{user.realName}</div>
                <div className="text-xs">{user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                退出登录
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="退出登录"
            >
              🚪
            </button>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        {/* 顶部栏 */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {navItems.find((item) => item.path === pathname)?.name || '管理后台'}
          </h2>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-600 text-sm rounded-full">
              管理员
            </span>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}

