'use client'

/**
 * 主页 - 重构版本
 * 使用拆分后的组件和新的状态管理
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/home/Sidebar'
import { BookshelfSection } from '@/components/home/BookshelfSection'
import { UserDropdown } from '@/components/home/UserDropdown'
import { NavTabs } from '@/components/shared/NavTabs'
import { LoginModal } from '@/components/auth/LoginModal'
import { DeleteConversationModal } from '@/components/modals/DeleteConversationModal'
import { CreateProjectModal } from '@/components/modals/CreateProjectModal'
import { BindUniversityModal } from '@/components/modals/BindUniversityModal'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBookshelfStore } from '@/stores/useBookshelfStore'

export default function HomePage() {
  const router = useRouter()

  // 认证状态
  const { user, initialize } = useAuthStore()
  const { selectedBook, selectBook, loadBookshelf } = useBookshelfStore()

  // UI 状态
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [activeNavItem, setActiveNavItem] = useState('学习')
  const [isLoading, setIsLoading] = useState(true)
  const [conversations, setConversations] = useState<{id: number; title: string}[]>([])
  const [projects, setProjects] = useState<{id: number | string; name: string; memoryAccess: 'default' | 'project-only'; files?: any[]; isOptimistic?: boolean}[]>([])
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<{id: number; title: string} | null>(null)
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false)
  const [bindUniversityModalOpen, setBindUniversityModalOpen] = useState(false)

  // 加载计划列表
  const loadPlans = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        console.log('⚠️ 没有 token，跳过加载计划')
        return
      }

      console.log('🔵 开始加载计划列表...')
      const response = await fetch('/api/plans', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      console.log('🔵 加载计划响应状态:', response.status)
      const data = await response.json()
      console.log('🔵 加载计划响应数据:', data)

      if (data.success) {
        // 转换为前端需要的格式
        const formattedProjects = data.data.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          memoryAccess: 'default' as const,
          files: plan.files || []
        }))
        setProjects(formattedProjects)
        console.log('✅ 加载计划列表成功:', formattedProjects.length, '个计划')
      } else {
        setProjects([])
        console.warn('⚠️ 加载计划列表失败:', data.message)
      }
    } catch (error) {
      console.error('❌ 加载计划列表失败:', error)
      setProjects([])
    }
  }

  // 初始化
  useEffect(() => {
    const init = async () => {
      await initialize() // 等待从服务器获取最新用户信息
      loadBookshelf()
      loadPlans() // 加载计划列表
      setIsLoading(false)
    }
    init()
  }, [initialize, loadBookshelf])

  // 检查管理员权限，如果是管理员则跳转到后台
  useEffect(() => {
    if (isLoading) return

    if (user?.role === 'admin') {
      router.push('/admin')
    }
  }, [user, router, isLoading])

  // 检查用户是否绑定大学，未绑定则弹出弹窗
  useEffect(() => {
    if (isLoading) return
    if (!user) return // 未登录不弹窗
    if (user.role === 'admin') return // 管理员不需要绑定

    // 用户已登录但未绑定大学
    if (!user.university || user.university.trim() === '') {
      setBindUniversityModalOpen(true)
    }
  }, [user, isLoading])

  // 如果正在加载或是管理员，显示加载状态
  if (isLoading || user?.role === 'admin') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7F5F3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37322F] mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  // 处理新对话
  const handleNewConversation = () => {
    console.log('创建新对话')
    // TODO: 实现新对话逻辑
  }

  // 打开删除确认弹窗
  const handleOpenDeleteModal = (id: number, title: string) => {
    setConversationToDelete({ id, title })
    setDeleteModalOpen(true)
  }

  // 确认删除对话
  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      setConversations(prev => prev.filter(conv => conv.id !== conversationToDelete.id))
      // TODO: 调用后端API删除对话
      console.log('删除对话:', conversationToDelete.id)
    }
    setConversationToDelete(null)
  }

  // 处理重命名对话
  const handleRenameConversation = (id: number, newTitle: string) => {
    setConversations(prev =>
      prev.map(conv => conv.id === id ? { ...conv, title: newTitle } : conv)
    )
    // TODO: 调用后端API更新对话标题
    console.log('重命名对话:', id, newTitle)
  }

  // 打开创建计划弹窗
  const handleOpenCreateProjectModal = () => {
    setCreateProjectModalOpen(true)
  }

  // 创建新计划（使用乐观更新）
  const handleCreateProject = async (name: string, memoryAccess: 'default' | 'project-only') => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        alert('请先登录')
        return
      }

      // 🚀 乐观更新：立即添加到前端，使用临时 ID
      const tempId = `temp-${Date.now()}`
      const optimisticProject = {
        id: tempId,
        name: name.trim(),
        memoryAccess,
        files: [],
        isOptimistic: true, // 标记为乐观更新
      }
      setProjects(prev => [optimisticProject, ...prev])
      setCreateProjectModalOpen(false)
      console.log('✨ 乐观更新：立即显示计划', name)

      // 后台调用 API
      console.log('🔵 开始创建计划:', name)
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: `记忆访问权限: ${memoryAccess}`,
        }),
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ 计划创建成功！', data.data)
        // 用真实 ID 替换临时 ID
        setProjects(prev => prev.map(p =>
          p.id === tempId
            ? { id: data.data.id, name: data.data.name, memoryAccess, files: [], isOptimistic: false }
            : p
        ))
        console.log('新建计划:', name, '记忆访问权限:', memoryAccess)
      } else {
        console.error('❌ 创建失败:', data.message)
        // 移除乐观更新的项目
        setProjects(prev => prev.filter(p => p.id !== tempId))
        alert('创建失败: ' + data.message)
      }
    } catch (error) {
      console.error('❌ 创建计划失败:', error)
      // 如果有临时项目，移除它
      setProjects(prev => prev.filter(p => !p.isOptimistic))
      alert('创建失败，请重试')
    }
  }

  // 处理删除计划
  const handleDeleteProject = async (id: number | string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        alert('请先登录')
        return
      }

      const response = await fetch(`/api/plans/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setProjects(prev => prev.filter(proj => proj.id !== id))
        if (activeProjectId === id) {
          setActiveProjectId(null)
        }
        console.log('删除计划:', id)
      } else {
        alert('删除失败: ' + data.message)
      }
    } catch (error) {
      console.error('❌ 删除计划失败:', error)
      alert('删除失败，请重试')
    }
  }

  // 处理重命名计划
  const handleRenameProject = (id: number | string, newName: string) => {
    setProjects(prev =>
      prev.map(proj => proj.id === id ? { ...proj, name: newName } : proj)
    )
    // TODO: 调用后端API更新计划名称
    console.log('重命名计划:', id, newName)
  }

  // 处理选择计划 - 跳转到计划详情页面
  const handleSelectProject = (id: number | string) => {
    console.log('选择计划:', id)
    // 跳转到计划详情页面
    router.push(`/plan/${id}`)
  }

  // 处理导航项点击
  const handleNavItemClick = (item: string) => {
    setActiveNavItem(item)
    // 只切换状态，不进行页面跳转
    // 未来可以根据不同的导航项显示不同的内容
  }

  return (
    <div className="w-full min-h-screen relative bg-[#F7F5F3] overflow-x-hidden">
      {/* 侧边栏 */}
      <Sidebar
        isOpen={sidebarOpen}
        conversations={conversations}
        projects={projects}
        activeProjectId={activeProjectId}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onSelectProject={handleSelectProject}
        onOpenDeleteModal={handleOpenDeleteModal}
        onOpenCreateProjectModal={handleOpenCreateProjectModal}
      />

      {/* 主内容区 */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'ml-[280px]' : 'ml-0'
        }`}
      >
        {/* 侧边栏切换按钮 */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-expanded={sidebarOpen}
          data-state={sidebarOpen ? 'open' : 'closed'}
          aria-controls="stage-slideover-sidebar"
          className={`fixed top-6 z-50 p-2 bg-white text-[#37322F] rounded-lg hover:bg-gray-50 transition-all duration-300 border border-gray-200 max-md:hidden px-2 my-0 mx-[-6px] ${
            sidebarOpen ? 'left-[268px]' : 'left-6'
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {sidebarOpen ? (
              <polyline points="15 18 9 12 15 6" />
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        {/* 顶部导航选项卡 */}
        <NavTabs activeItem={activeNavItem} onItemClick={handleNavItemClick} sidebarOpen={sidebarOpen} />

        {/* 右上角用户菜单 */}
        <div className="fixed top-6 right-6 z-50">
          <UserDropdown onLoginClick={() => setLoginModalOpen(true)} />
        </div>

        {/* 主要内容区域 - 可滚动 */}
        <div className="relative flex flex-col w-full h-screen">
          {/* 内容区域 - 可滚动 */}
          <div className="flex-1 overflow-y-auto">
            <div className="w-full max-w-[1400px] mx-auto px-8 pt-16 sm:pt-20 md:pt-24 lg:pt-[120px] pb-8">
              {/* 书架区域 */}
              {user ? (
                <div className="w-full mb-8">
                  <BookshelfSection
                    onBookSelect={(book) => selectBook({ ...book, id: String(book.id) })}
                    selectedBookId={selectedBook?.id}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* 登录模态框 */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        sidebarOpen={sidebarOpen}
      />

      {/* 删除确认弹窗 */}
      <DeleteConversationModal
        isOpen={deleteModalOpen}
        conversationTitle={conversationToDelete?.title || ''}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* 创建计划弹窗 */}
      <CreateProjectModal
        isOpen={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        onCreate={handleCreateProject}
      />

      {/* 绑定大学弹窗 */}
      <BindUniversityModal
        isOpen={bindUniversityModalOpen}
        onClose={() => setBindUniversityModalOpen(false)}
        onSuccess={() => {
          // 绑定成功后重新加载书架
          loadBookshelf()
        }}
      />
    </div>
  )
}

