'use client'

/**
 * 主页 - 重构版本
 * 使用拆分后的组件和新的状态管理
 */

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/home/Sidebar'
import { ChatInput } from '@/components/home/ChatInput'
import { BookshelfSection } from '@/components/home/BookshelfSection'
import { UserDropdown } from '@/components/home/UserDropdown'
import { LoginModal } from '@/components/auth/LoginModal'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBookshelfStore } from '@/stores/useBookshelfStore'
import type { StudyMode } from '@/types'

// 示例对话数据
const SAMPLE_CONVERSATIONS = [
  { id: 1, title: '数学问题求解' },
  { id: 2, title: '英语语法学习' },
  { id: 3, title: '物理概念解释' },
  { id: 4, title: '化学实验分析' },
]

export default function HomePage() {
  // 认证状态
  const { user, initialize } = useAuthStore()
  const { books, selectedBook, selectBook, loadBookshelf } = useBookshelfStore()

  // UI 状态
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [selectedMode, setSelectedMode] = useState<StudyMode>('学习')

  // 初始化
  useEffect(() => {
    initialize()
    loadBookshelf()
  }, [initialize, loadBookshelf])

  // 处理发送消息
  const handleSendMessage = (message: string) => {
    console.log('发送消息:', message)
    // TODO: 实现发送消息逻辑
  }

  // 处理新对话
  const handleNewConversation = () => {
    console.log('创建新对话')
    // TODO: 实现新对话逻辑
  }

  return (
    <div className="w-full min-h-screen relative bg-[#F7F5F3] overflow-x-hidden flex">
      {/* 侧边栏 */}
      <Sidebar
        isOpen={sidebarOpen}
        conversations={SAMPLE_CONVERSATIONS}
        onNewConversation={handleNewConversation}
      />

      {/* 主内容区 */}
      <div
        className={`flex-1 flex flex-col justify-start items-center transition-all duration-300 ${
          sidebarOpen ? '' : 'ml-[-280px]'
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

        {/* 顶部导航栏 */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#37322F] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                B
              </div>
              <span className="font-semibold text-gray-900">Brillance</span>
            </div>

            {/* 用户菜单 */}
            <UserDropdown onLoginClick={() => setLoginModalOpen(true)} />
          </div>
        </div>

        {/* 主要内容 */}
        <div className="w-full flex-1 flex flex-col justify-center items-center pt-16">
          {/* 欢迎区域 */}
          {!user && (
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                欢迎使用 Brillance
              </h1>
              <p className="text-lg text-gray-600">
                你的智能学习助手，让学习更高效
              </p>
            </div>
          )}

          {/* 书架区域 */}
          {user && books.length > 0 && (
            <div className="w-full mb-8">
              <BookshelfSection
                onBookSelect={(book) => selectBook({ ...book, id: String(book.id) })}
                selectedBookId={selectedBook?.id}
              />
            </div>
          )}

          {/* 聊天输入区域 */}
          <div className="w-full mt-auto">
            <ChatInput
              selectedMode={selectedMode}
              selectedBook={selectedBook}
              bookshelfBooks={books}
              onModeChange={setSelectedMode}
              onBookSelect={(book) => book ? selectBook({ ...book, id: String(book.id) }) : selectBook(null)}
              onSend={handleSendMessage}
            />
          </div>

          {/* 底部提示 */}
          <div className="w-full max-w-3xl mx-auto px-4 py-4 text-center text-xs text-gray-500">
            Brillance 可能会出错。请核查重要信息。
          </div>
        </div>
      </div>

      {/* 登录模态框 */}
      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
      />
    </div>
  )
}

