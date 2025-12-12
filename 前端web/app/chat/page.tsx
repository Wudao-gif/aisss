'use client'

/**
 * 对话页面
 * 显示与AI的对话，支持流式输出
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/home/Sidebar'
import { ChatInput } from '@/components/home/ChatInput'
import { UserDropdown } from '@/components/home/UserDropdown'
import { LoginModal } from '@/components/auth/LoginModal'
import { DeleteConversationModal } from '@/components/modals/DeleteConversationModal'
import { CreateProjectModal } from '@/components/modals/CreateProjectModal'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBookshelfStore } from '@/stores/useBookshelfStore'
import type { StudyMode } from '@/types'

// 消息类型
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  images?: string[]
  files?: { id: string | number; name: string }[]
}

// 对话历史类型
interface Conversation {
  id: number
  title: string
}

// 项目类型
interface Project {
  id: number
  name: string
  memoryAccess: 'default' | 'project-only'
}

export default function ChatPage() {
  const router = useRouter()
  const { user, initialize } = useAuthStore()
  const { books, selectedBook, selectBook, loadBookshelf } = useBookshelfStore()

  // UI 状态
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<{id: number; title: string} | null>(null)
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false)
  const [selectedMode, setSelectedMode] = useState<StudyMode>('学习')
  const [isLoading, setIsLoading] = useState(true)

  // 对话状态
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<number | string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 初始化
  useEffect(() => {
    const init = async () => {
      await initialize()
      loadBookshelf()
    }
    init()

    // 从 sessionStorage 获取新对话数据
    const newConversationData = sessionStorage.getItem('newConversation')
    if (newConversationData) {
      const data = JSON.parse(newConversationData)

      // 设置模式和书籍
      if (data.mode) setSelectedMode(data.mode)
      if (data.book) selectBook(data.book)

      // 添加用户消息
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: data.message,
        timestamp: new Date(),
        images: data.images || [],
        files: data.files || [],
      }
      setMessages([userMessage])

      // 创建新的对话记录
      const newConversationId = Date.now()
      const conversationTitle = data.message.length > 20
        ? data.message.substring(0, 20) + '...'
        : data.message

      setConversations(prev => [
        { id: newConversationId, title: conversationTitle },
        ...prev
      ])
      setCurrentConversationId(newConversationId)

      // 清除 sessionStorage
      sessionStorage.removeItem('newConversation')

      // 模拟 AI 回复
      setTimeout(() => {
        handleAIResponse(data.message)
      }, 500)
    }

    setIsLoading(false)
  }, [initialize, loadBookshelf, selectBook])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 处理 AI 回复（流式输出）
  const handleAIResponse = (userMessage: string) => {
    setIsTyping(true)

    // 模拟 AI 回复内容
    const aiResponse = `这是对"${userMessage}"的回复。我会一个字一个字地显示出来，模拟真实的 AI 对话体验。`

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, aiMessage])

    // 流式输出
    let currentIndex = 0
    const typingInterval = setInterval(() => {
      if (currentIndex < aiResponse.length) {
        setMessages((prev) => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage.role === 'assistant') {
            lastMessage.content = aiResponse.slice(0, currentIndex + 1)
          }
          return newMessages
        })
        currentIndex++
      } else {
        clearInterval(typingInterval)
        setIsTyping(false)
      }
    }, 30) // 每30ms输出一个字符
  }

  // 处理发送消息
  const handleSendMessage = (message: string) => {
    if (!message.trim() || isTyping) return

    // 检查登录状态
    if (!user) {
      setLoginModalOpen(true)
      return
    }

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    // 模拟 AI 回复
    setTimeout(() => {
      handleAIResponse(message)
    }, 500)
  }

  // 处理新对话
  const handleNewConversation = () => {
    router.push('/new')
  }

  // 打开删除确认弹窗
  const handleOpenDeleteModal = (id: number, title: string) => {
    setConversationToDelete({ id, title })
    setDeleteModalOpen(true)
  }

  // 确认删除对话
  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      // 如果删除的是当前对话，跳转到主页
      if (currentConversationId === conversationToDelete.id) {
        router.push('/new')
      }
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

  // 打开创建项目弹窗
  const handleOpenCreateProjectModal = () => {
    setCreateProjectModalOpen(true)
  }

  // 创建新项目
  const handleCreateProject = (name: string, memoryAccess: 'default' | 'project-only') => {
    const newProject: Project = {
      id: Date.now(),
      name,
      memoryAccess
    }
    setProjects(prev => [newProject, ...prev])
    // TODO: 调用后端API创建项目
    console.log('新建项目:', name, '记忆访问权限:', memoryAccess)
  }

  // 处理删除项目
  const handleDeleteProject = (id: number | string) => {
    setProjects(prev => prev.filter(proj => proj.id !== id))
    if (activeProjectId === id) {
      setActiveProjectId(null)
    }
    // TODO: 调用后端API删除项目
    console.log('删除项目:', id)
  }

  // 处理重命名项目
  const handleRenameProject = (id: number | string, newName: string) => {
    setProjects(prev =>
      prev.map(proj => proj.id === id ? { ...proj, name: newName } : proj)
    )
    // TODO: 调用后端API更新项目名称
    console.log('重命名项目:', id, newName)
  }

  // 处理选择项目
  const handleSelectProject = (id: number | string) => {
    setActiveProjectId(id)
    console.log('选择项目:', id)
  }

  if (isLoading) {
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
    <div className="w-full h-screen relative bg-white overflow-hidden flex">
      {/* 侧边栏 */}
      <Sidebar
        isOpen={sidebarOpen}
        conversations={conversations}
        activeConversationId={currentConversationId}
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
        {/* 顶部栏 */}
        <div className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-6 relative">
          {/* 侧边栏切换按钮 - 与主页样式一致 */}
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

          {/* 用户菜单 */}
          <div className="ml-auto">
            <UserDropdown onLoginClick={() => setLoginModalOpen(true)} />
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-[#37322F] text-white'
                      : 'bg-gray-50 border border-gray-100 text-gray-900'
                  }`}
                >
                  {/* 消息内容 */}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* 图片附件 */}
                  {message.images && message.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {message.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`附件 ${idx + 1}`}
                          className="rounded-lg max-h-40 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {/* 文件附件 */}
                  {message.files && message.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.files.map((file) => (
                        <div
                          key={file.id}
                          className="text-xs bg-gray-100 rounded px-2 py-1 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 正在输入指示器 */}
            {isTyping && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入框 - 固定在底部 */}
        <div className="bg-white px-6 py-3">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              selectedMode={selectedMode}
              selectedBook={selectedBook}
              bookshelfBooks={books}
              onModeChange={setSelectedMode}
              onBookSelect={(book) => selectBook(book ? { id: String(book.id), name: book.name } : null)}
              onSend={handleSendMessage}
              isConversationPage={true}
              onLoginRequired={() => setLoginModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* 登录模态框 */}
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} sidebarOpen={sidebarOpen} />

      {/* 删除确认弹窗 */}
      <DeleteConversationModal
        isOpen={deleteModalOpen}
        conversationTitle={conversationToDelete?.title || ''}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* 创建项目弹窗 */}
      <CreateProjectModal
        isOpen={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  )
}

