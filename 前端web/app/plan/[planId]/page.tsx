'use client'

/**
 * 计划详情页面
 * 显示计划信息和文件列表，支持文件上传
 * 保持和 new 页面相同的布局结构
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Sidebar } from '@/components/home/Sidebar'
import { UserDropdown } from '@/components/home/UserDropdown'
import { NavTabs } from '@/components/shared/NavTabs'
import { LoginModal } from '@/components/auth/LoginModal'
import { DeleteConversationModal } from '@/components/modals/DeleteConversationModal'
import { CreateProjectModal } from '@/components/modals/CreateProjectModal'
import { CreateDocumentModal } from '@/components/plan/CreateDocumentModal'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBookshelfStore } from '@/stores/useBookshelfStore'

interface PlanFile {
  id: string
  name: string
  description?: string
  fileUrl: string
  fileType: string
  fileSize: number
  allowReading: boolean
  createdAt: string
}

interface UploadingFile {
  id: string
  name: string
  size: number
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

interface FileTypeFilter {
  label: string
  extensions: string[]
  icon: string
}

interface CreatorFilter {
  id: string
  name: string
}

interface FileIcon {
  id: string
  name: string
  extensions: string
  iconUrl: string
  isDefault: boolean
}

interface Plan {
  id: string
  name: string
  description?: string
  files: PlanFile[]
  createdAt: string
  updatedAt: string
}

export default function PlanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.planId as string
  const { user, isAuthenticated, initialize } = useAuthStore()
  const { loadBookshelf } = useBookshelfStore()

  // 计划相关状态
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])

  // 文件列表筛选和选择状态
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([])
  const [selectedCreators, setSelectedCreators] = useState<string[]>([])
  const [fileTypeDropdownOpen, setFileTypeDropdownOpen] = useState(false)
  const [creatorDropdownOpen, setCreatorDropdownOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [fileIcons, setFileIcons] = useState<FileIcon[]>([])
  const [hoveredFileId, setHoveredFileId] = useState<string | null>(null)

  // UI 状态（和 new 页面保持一致）
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [activeNavItem, setActiveNavItem] = useState('学习')
  const [conversations, setConversations] = useState<{id: number; title: string}[]>([])
  const [projects, setProjects] = useState<{id: number | string; name: string; memoryAccess: 'default' | 'project-only'; isOptimistic?: boolean}[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<{id: number; title: string} | null>(null)
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false)
  const [createDocumentModalOpen, setCreateDocumentModalOpen] = useState(false)



  // 加载计划列表（用于侧边栏）
  const loadPlans = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch('/api/plans', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        const formattedProjects = data.data.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          memoryAccess: 'default' as const,
          files: plan.files || []
        }))
        setProjects(formattedProjects)
      }
    } catch (error) {
      console.error('❌ 加载计划列表失败:', error)
    }
  }

  // 加载文件图标
  const loadFileIcons = async () => {
    try {
      const response = await fetch('/api/file-icons')
      const data = await response.json()
      if (data.success) {
        setFileIcons(data.data)
      }
    } catch (error) {
      console.error('加载文件图标失败:', error)
    }
  }

  // 初始化
  useEffect(() => {
    initialize()
    loadBookshelf()
    loadPlans()
    loadFileIcons()
  }, [])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.file-type-dropdown') && !target.closest('.creator-dropdown')) {
        setFileTypeDropdownOpen(false)
        setCreatorDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 加载计划详情
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/new')
      return
    }

    loadPlanDetail()
  }, [planId, isAuthenticated])

  const loadPlanDetail = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`/api/plans/${planId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setPlan(data.data)
      } else {
        alert('加载计划失败: ' + data.message)
      }
    } catch (error) {
      console.error('加载计划失败:', error)
      alert('加载计划失败')
    } finally {
      setLoading(false)
    }
  }

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📤 handleFileUpload 被调用')
    const files = e.target.files
    console.log('📤 选择的文件:', files)

    if (!files || files.length === 0) {
      console.log('❌ 没有选择文件')
      return
    }

    console.log('✅ 文件数量:', files.length)

    // 先保存文件数组，再重置input
    const fileArray = Array.from(files)
    console.log('📦 创建上传任务，文件数组:', fileArray)

    // 重置input，允许重复上传同一文件
    e.target.value = ''

    setUploading(true)

    const token = localStorage.getItem('authToken')
    if (!token) {
      alert('请先登录')
      setUploading(false)
      return
    }

    console.log('🔑 Token 存在，开始上传流程')
    console.log('📦 创建上传任务，文件数组:', fileArray)

    const newUploadingFiles: UploadingFile[] = fileArray.map(file => ({
      id: `uploading-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading' as const,
    }))

    console.log('📋 上传文件列表:', newUploadingFiles)

    // 立即显示上传中的文件
    setUploadingFiles(newUploadingFiles)
    console.log('✅ 已设置 uploadingFiles 状态')

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const uploadingFileId = newUploadingFiles[i].id
        console.log(`\n🔄 开始处理文件 ${i + 1}/${fileArray.length}: ${file.name}`)

        try {
          // 更新进度：开始上传
          console.log('📊 更新进度到 10%')
          setUploadingFiles(prev =>
            prev.map(f => f.id === uploadingFileId ? { ...f, progress: 10 } : f)
          )

          // 1. 上传文件到 OSS
          const formData = new FormData()
          formData.append('file', file)
          formData.append('folder', 'plans')
          console.log('📤 准备上传到 /api/upload')

          // 模拟上传进度
          console.log('📊 更新进度到 30%')
          setUploadingFiles(prev =>
            prev.map(f => f.id === uploadingFileId ? { ...f, progress: 30 } : f)
          )

          console.log('🌐 发送上传请求...')
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          })

          console.log('📥 收到上传响应:', uploadResponse.status)
          const uploadData = await uploadResponse.json()
          console.log('📄 上传响应数据:', uploadData)

          if (!uploadData.success) {
            throw new Error(uploadData.message || '上传失败')
          }

          // 更新进度：上传完成，开始创建记录
          console.log('📊 更新进度到 70%')
          setUploadingFiles(prev =>
            prev.map(f => f.id === uploadingFileId ? { ...f, progress: 70 } : f)
          )

          // 2. 创建文件记录
          console.log('💾 创建文件记录...')
          const createResponse = await fetch(`/api/plans/${planId}/files`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: file.name,
              fileUrl: uploadData.data.url,
              fileType: file.type || 'application/octet-stream',
              fileSize: file.size,
              allowReading: true,
            }),
          })

          const createData = await createResponse.json()

          if (!createData.success) {
            throw new Error(createData.message || '创建文件记录失败')
          }

          // 更新进度：完成
          setUploadingFiles(prev =>
            prev.map(f => f.id === uploadingFileId ? { ...f, progress: 100, status: 'success' } : f)
          )

          console.log('✅ 文件上传成功:', file.name)
        } catch (error) {
          // 标记该文件上传失败
          const errorMessage = error instanceof Error ? error.message : '上传失败'
          setUploadingFiles(prev =>
            prev.map(f => f.id === uploadingFileId ? { ...f, status: 'error', error: errorMessage } : f)
          )
          console.error(`❌ 文件 ${file.name} 上传失败:`, error)
        }
      }

      // 等待一下让用户看到100%的进度
      await new Promise(resolve => setTimeout(resolve, 500))

      // 重新加载计划详情
      await loadPlanDetail()

      // 清除上传列表
      setUploadingFiles([])
    } catch (error) {
      console.error('上传文件失败:', error)
      alert('上传文件失败')
    } finally {
      setUploading(false)
    }
  }

  // 侧边栏处理函数
  const handleNewConversation = () => {
    router.push('/new')
  }

  const handleRenameConversation = (id: number, newTitle: string) => {
    console.log('重命名对话:', id, newTitle)
  }

  const handleOpenDeleteModal = (id: number, title: string) => {
    setConversationToDelete({ id, title })
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      console.log('删除对话:', conversationToDelete.id)
    }
    setDeleteModalOpen(false)
    setConversationToDelete(null)
  }

  const handleOpenCreateProjectModal = () => {
    setCreateProjectModalOpen(true)
  }

  const handleCreateProject = async (name: string, memoryAccess: 'default' | 'project-only') => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        alert('请先登录')
        return
      }

      const tempId = `temp-${Date.now()}`
      const optimisticProject = {
        id: tempId,
        name: name.trim(),
        memoryAccess,
        files: [],
        isOptimistic: true,
      }
      setProjects(prev => [optimisticProject, ...prev])
      setCreateProjectModalOpen(false)

      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: null,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setProjects(prev => prev.map(p =>
          p.id === tempId
            ? { id: data.data.id, name: data.data.name, memoryAccess, files: [], isOptimistic: false }
            : p
        ))
      } else {
        setProjects(prev => prev.filter(p => p.id !== tempId))
        alert('创建失败: ' + data.message)
      }
    } catch (error) {
      console.error('❌ 创建计划失败:', error)
      setProjects(prev => prev.filter(p => !p.isOptimistic))
      alert('创建失败，请重试')
    }
  }

  const handleDeleteProject = async (id: number | string) => {
    if (!confirm('确定要删除这个计划吗？')) return

    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`/api/plans/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setProjects(prev => prev.filter(p => p.id !== id))
        // 如果删除的是当前查看的计划，返回首页
        if (id === planId) {
          router.push('/new')
        }
      } else {
        alert('删除失败: ' + data.message)
      }
    } catch (error) {
      console.error('❌ 删除计划失败:', error)
      alert('删除失败，请重试')
    }
  }

  const handleRenameProject = (id: number | string, newName: string) => {
    setProjects(prev =>
      prev.map(proj => proj.id === id ? { ...proj, name: newName } : proj)
    )
    console.log('重命名计划:', id, newName)
  }

  const handleSelectProject = (id: number | string) => {
    console.log('选择计划:', id)
    router.push(`/plan/${id}`)
  }

  const handleNavItemClick = (item: string) => {
    setActiveNavItem(item)
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  // 获取文件图标
  const getFileIcon = (fileName: string): { iconUrl: string; name: string } => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    // 查找匹配的图标
    const matchedIcon = fileIcons.find(icon => {
      const extensions = icon.extensions.split(',').map(e => e.trim().toLowerCase())
      return extensions.includes(ext)
    })

    // 如果找到匹配的图标，返回
    if (matchedIcon) {
      return { iconUrl: matchedIcon.iconUrl, name: matchedIcon.name }
    }

    // 否则返回默认图标
    const defaultIcon = fileIcons.find(icon => icon.isDefault)
    if (defaultIcon) {
      return { iconUrl: defaultIcon.iconUrl, name: defaultIcon.name }
    }

    // 如果没有默认图标，返回空
    return { iconUrl: '', name: '未知文件' }
  }

  // 文件类型定义（用于筛选）
  const fileTypes: FileTypeFilter[] = fileIcons
    .filter(icon => !icon.isDefault)
    .map(icon => ({
      label: icon.name,
      extensions: icon.extensions.split(',').map(e => e.trim()),
      icon: icon.iconUrl
    }))

  // 获取创作者列表（从文件中提取唯一创作者）
  const getCreators = (): CreatorFilter[] => {
    if (!plan) return []
    // 这里暂时使用当前用户作为创作者，实际应该从文件数据中获取
    const creators = new Set<string>()
    creators.add((user as any)?.username || (user as any)?.name || '当前用户')
    return Array.from(creators).map(name => ({ id: name, name }))
  }

  // 切换文件类型筛选
  const toggleFileType = (extensions: string[]) => {
    const key = extensions.join(',')
    setSelectedFileTypes(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    )
  }

  // 切换创作者筛选
  const toggleCreator = (creatorId: string) => {
    setSelectedCreators(prev =>
      prev.includes(creatorId) ? prev.filter(c => c !== creatorId) : [...prev, creatorId]
    )
  }

  // 筛选文件
  const getFilteredFiles = () => {
    if (!plan) return []
    let files = plan.files

    // 按文件类型筛选
    if (selectedFileTypes.length > 0) {
      files = files.filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        return selectedFileTypes.some(typeKey => {
          const extensions = typeKey.split(',')
          return extensions.includes(ext) || (extensions.length === 0 && !fileTypes.slice(0, -1).some(t => t.extensions.includes(ext)))
        })
      })
    }

    // 按创作者筛选（暂时跳过，因为文件数据中没有创作者信息）
    // if (selectedCreators.length > 0) {
    //   files = files.filter(file => selectedCreators.includes(file.creatorId))
    // }

    return files
  }

  // 切换单个文件选择
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  // 切换全选
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedFiles(new Set())
      setSelectAll(false)
    } else {
      const allFileIds = getFilteredFiles().map(f => f.id)
      setSelectedFiles(new Set(allFileIds))
      setSelectAll(true)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7F5F3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37322F] mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen relative bg-[#F7F5F3] overflow-x-hidden">
      {/* 侧边栏 */}
      <Sidebar
        isOpen={sidebarOpen}
        conversations={conversations}
        projects={projects}
        activeProjectId={planId}
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
          <div className="flex-1 overflow-y-auto">
            <div className="w-full max-w-[1400px] mx-auto px-8 pt-16 sm:pt-20 md:pt-24 lg:pt-[120px] pb-8">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37322F] mx-auto mb-4"></div>
                    <p className="text-gray-600">加载中...</p>
                  </div>
                </div>
              ) : !plan ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">计划不存在</p>
                    <button
                      onClick={() => router.push('/new')}
                      className="px-4 py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#4a4540]"
                    >
                      返回首页
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 计划标题和描述 */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h1 className="text-3xl font-bold text-[#37322F]">{plan.name}</h1>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <button
                            onClick={() => setCreateDocumentModalOpen(true)}
                            className="px-4 py-2 rounded-lg bg-[#37322F] text-white hover:bg-[#4a4540] transition-colors flex items-center gap-2"
                          >
                            <span>➕</span>
                            <span>新建文件</span>
                          </button>
                          {/* 下拉菜单 */}
                          <CreateDocumentModal
                            planId={planId}
                            open={createDocumentModalOpen}
                            onClose={() => setCreateDocumentModalOpen(false)}
                            onSuccess={loadPlanDetail}
                          />
                        </div>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            multiple
                            onChange={(e) => {
                              console.log('🎯 Input onChange 事件被触发!')
                              console.log('🎯 Event:', e)
                              console.log('🎯 Files:', e.target.files)
                              handleFileUpload(e)
                            }}
                            disabled={uploading}
                            className="hidden"
                            accept="*/*"
                          />
                          <div className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                            uploading
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-[#37322F] text-white hover:bg-[#4a4540]'
                          }`}>
                            <span>📎</span>
                            <span>{uploading ? '上传中...' : '上传文件'}</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 文件列表区域 */}
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-[#37322F] mb-4">文件列表</h2>

                    {/* 文件列表 */}
                    {uploadingFiles.length === 0 && plan.files.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm">暂无文件</p>
                        <p className="text-xs mt-2">点击上方按钮上传文件</p>
                      </div>
                    ) : (
                      <div>
                        {/* 表头 */}
                        <div className="grid grid-cols-[32px_2fr_1fr_1fr_120px_100px] gap-3 px-4 py-3 text-sm font-medium text-gray-600 border-b border-gray-300 group/header">
                          {/* 全选框 - 有文件被选中时显示 */}
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={toggleSelectAll}
                              className={`w-4 h-4 rounded border-gray-300 text-[#37322F] focus:ring-[#37322F] cursor-pointer ${
                                selectedFiles.size > 0 ? 'opacity-100' : 'opacity-0 group-hover/header:opacity-100'
                              }`}
                            />
                          </div>

                          {/* 文件类型 - 可筛选 */}
                          <div className="relative file-type-dropdown">
                            <button
                              onClick={() => setFileTypeDropdownOpen(!fileTypeDropdownOpen)}
                              className="flex items-center gap-1 hover:text-[#37322F] transition-colors"
                            >
                              <span>文件类型</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {/* 文件类型下拉菜单 */}
                            {fileTypeDropdownOpen && fileTypes.length > 0 && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                                {/* 全部类型选项 */}
                                <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer group/type-item">
                                  <input
                                    type="checkbox"
                                    checked={selectedFileTypes.length === 0}
                                    onChange={() => setSelectedFileTypes([])}
                                    className={`w-4 h-4 rounded border-gray-300 text-[#37322F] focus:ring-[#37322F] ${
                                      selectedFileTypes.length === 0 ? 'opacity-100' : 'opacity-0 group-hover/type-item:opacity-100'
                                    }`}
                                  />
                                  <span className="text-sm">全部类型</span>
                                </label>

                                {fileTypes.map((type, index) => {
                                  const isSelected = selectedFileTypes.includes(type.extensions.join(','))
                                  return (
                                    <label
                                      key={index}
                                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer group/type-item"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleFileType(type.extensions)}
                                        className={`w-4 h-4 rounded border-gray-300 text-[#37322F] focus:ring-[#37322F] ${
                                          isSelected ? 'opacity-100' : 'opacity-0 group-hover/type-item:opacity-100'
                                        }`}
                                      />
                                      {type.icon ? (
                                        <img src={type.icon} alt={type.label} className="w-4 h-4 object-contain" />
                                      ) : null}
                                      <span className="text-sm">{type.label}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* 创作者 - 可筛选 */}
                          <div className="relative creator-dropdown">
                            <button
                              onClick={() => setCreatorDropdownOpen(!creatorDropdownOpen)}
                              className="flex items-center gap-1 hover:text-[#37322F] transition-colors"
                            >
                              <span>创作者</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {/* 创作者下拉菜单 */}
                            {creatorDropdownOpen && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                                {getCreators().map((creator) => (
                                  <label
                                    key={creator.id}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedCreators.includes(creator.id)}
                                      onChange={() => toggleCreator(creator.id)}
                                      className="w-4 h-4 rounded border-gray-300 text-[#37322F] focus:ring-[#37322F]"
                                    />
                                    <span className="text-sm">{creator.name}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 最近修改 */}
                          <div>最近修改</div>

                          {/* 大小 */}
                          <div>大小</div>

                          {/* 操作 */}
                          <div></div>
                        </div>

                        {/* 文件列表内容 */}
                        <div className="flex flex-col gap-[1px]">
                          {/* 上传中的文件 */}
                          {uploadingFiles.map((file) => {
                            const fileIcon = getFileIcon(file.name)
                            return (
                              <div
                                key={file.id}
                                className={`grid grid-cols-[32px_2fr_1fr_1fr_120px_100px] gap-3 px-4 py-3 transition-colors ${
                                  file.status === 'error' ? 'bg-red-50' : ''
                                }`}
                              >
                                {/* 勾选框 */}
                                <div className="flex items-center justify-center">
                                  <div className="w-4 h-4"></div>
                                </div>

                                {/* 文件名（包含图标） */}
                                <div className="flex items-center gap-3 min-w-0">
                                  {fileIcon.iconUrl ? (
                                    <img src={fileIcon.iconUrl} alt={fileIcon.name} className="w-6 h-6 object-contain flex-shrink-0" />
                                  ) : (
                                    <span className="text-xl">📄</span>
                                  )}
                                  <span className="text-sm text-gray-900 truncate">{file.name}</span>
                                </div>

                                {/* 创作者 */}
                                <div className="flex items-center text-sm text-gray-600">
                                  我
                                </div>

                                {/* 最近修改 */}
                                <div className="flex items-center text-sm text-gray-600">
                                  {new Date().toLocaleString('zh-CN', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>

                                {/* 大小 */}
                                <div className="flex items-center text-sm text-gray-600">
                                  {file.status === 'uploading' ? (
                                    <span className="text-[#37322F] font-medium">{file.progress}%</span>
                                  ) : file.status === 'error' ? (
                                    <span className="text-red-600 font-medium">失败</span>
                                  ) : (
                                    formatFileSize(file.size)
                                  )}
                                </div>

                                {/* 操作按钮 */}
                                <div></div>
                              </div>
                            )
                          })}

                          {/* 已上传的文件 */}
                          {getFilteredFiles().map((file, index, array) => {
                            const fileIcon = getFileIcon(file.name)
                            const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
                            const isOfficeFile = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExt)
                            const isSelected = selectedFiles.has(file.id)
                            const isLast = index === array.length - 1
                            const isHovered = hoveredFileId === file.id
                            const nextFile = array[index + 1]
                            const isNextHovered = nextFile && hoveredFileId === nextFile.id
                            const isNextSelected = nextFile && selectedFiles.has(nextFile.id)

                            return (
                              <div
                                key={file.id}
                                className={`grid grid-cols-[32px_2fr_1fr_1fr_120px_100px] gap-3 px-4 py-3 transition-all group/file cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-50 rounded-md'
                                    : isHovered
                                    ? 'bg-[#EDE9E6] rounded-md'
                                    : ''
                                }`}
                                onMouseEnter={() => setHoveredFileId(file.id)}
                                onMouseLeave={() => setHoveredFileId(null)}
                                onClick={() => {
                                  // 点击其他区域只选中文件
                                  toggleFileSelection(file.id)
                                }}
                              >
                                {/* 勾选框 - 选中时始终显示，未选中时悬停显示 */}
                                <div
                                  className="flex items-center justify-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleFileSelection(file.id)}
                                    className={`w-4 h-4 rounded border-gray-300 text-[#37322F] focus:ring-[#37322F] cursor-pointer ${
                                      isSelected ? 'opacity-100' : 'opacity-0 group-hover/file:opacity-100'
                                    }`}
                                  />
                                </div>

                                {/* 文件名（包含图标） - 只有文件名可点击 */}
                                <div className="flex items-center gap-3 min-w-0">
                                  {fileIcon.iconUrl ? (
                                    <img src={fileIcon.iconUrl} alt={fileIcon.name} className="w-6 h-6 object-contain flex-shrink-0" />
                                  ) : (
                                    <span className="text-xl">📄</span>
                                  )}
                                  <span
                                    className="text-sm text-gray-900 truncate hover:text-blue-600 cursor-pointer transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      // 点击文件名才打开文件
                                      if (isOfficeFile) {
                                        // Office 文件在新标签页打开编辑器
                                        window.open(`/plan/${planId}/file/${file.id}`, '_blank')
                                      } else if (fileExt === 'pdf') {
                                        // PDF 文件使用预览页面（避免 CORS 问题）
                                        const previewUrl = `/preview?${new URLSearchParams({
                                          url: file.fileUrl,
                                          name: file.name,
                                          type: 'pdf',
                                          source: 'plan',
                                        }).toString()}`
                                        window.open(previewUrl, '_blank')
                                      } else {
                                        // 其他文件直接下载
                                        window.open(file.fileUrl, '_blank')
                                      }
                                    }}
                                  >
                                    {file.name}
                                  </span>
                                </div>

                                {/* 创作者 */}
                                <div className="flex items-center text-sm text-gray-600">
                                  我
                                </div>

                                {/* 最近修改 */}
                                <div className="flex items-center text-sm text-gray-600">
                                  {new Date(file.createdAt).toLocaleString('zh-CN', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>

                                {/* 大小 */}
                                <div className="flex items-center text-sm text-gray-600">
                                  {formatFileSize(file.fileSize)}
                                </div>

                                {/* 操作按钮 */}
                                <div
                                  className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    className="p-1.5 hover:bg-[#DDD5CF] rounded-lg transition-colors"
                                    title="分享"
                                  >
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                  </button>
                                  <button
                                    className="p-1.5 hover:bg-[#DDD5CF] rounded-lg transition-colors"
                                    title="更多"
                                  >
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
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
    </div>
  )
}
