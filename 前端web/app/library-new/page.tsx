'use client'

/**
 * 图书馆页面 - 重构版本
 * 使用组件化架构，接入真实API
 */

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBookshelfStore } from '@/stores/useBookshelfStore'
import { Sidebar } from '@/components/home/Sidebar'
import { BookGrid } from '@/components/library/BookGrid'
import { BookDrawer } from '@/components/library/BookDrawer'
import { SearchBar } from '@/components/library/SearchBar'
import { Pagination } from '@/components/library/Pagination'
import { UserDropdown } from '@/components/home/UserDropdown'
import { LoginModal } from '@/components/auth/LoginModal'
import { DeleteConversationModal } from '@/components/modals/DeleteConversationModal'
import { CreateProjectModal } from '@/components/modals/CreateProjectModal'
import { getBooks } from '@/lib/api/books'
import type { Book } from '@/types'

export default function LibraryPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { books: bookshelfBooks, addBook, removeBook } = useBookshelfStore()

  // UI 状态
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [activeNavItem, setActiveNavItem] = useState('学习')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showSearchBackdrop, setShowSearchBackdrop] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 数据状态
  const [allBooks, setAllBooks] = useState<Book[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])

  // 分页
  const [currentPage, setCurrentPage] = useState(1)
  const booksPerPage = 15 // 3 rows × 5 columns

  // 书籍详情抽屉
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  // 对话和项目状态
  const [conversations, setConversations] = useState<{id: number; title: string}[]>([])
  const [projects, setProjects] = useState<{id: number; name: string; memoryAccess: 'default' | 'project-only'}[]>([])
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<{id: number; title: string} | null>(null)
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false)

  const navItems = ['学习', '查阅', '写作', '演示', '协作']

  // 从API获取图书数据
  useEffect(() => {
    const fetchBooks = async () => {
      setIsLoading(true)
      try {
        const books = await getBooks()
        setAllBooks(books)
        setFilteredBooks(books)
      } catch (error) {
        console.error('获取图书列表失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBooks()
  }, [])

  // 检查管理员权限
  useEffect(() => {
    if (isLoading) return

    if (user?.role === 'admin') {
      router.push('/admin')
    }
  }, [user, router, isLoading])

  // 搜索和筛选逻辑
  useEffect(() => {
    let results = allBooks

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      results = results.filter(
        (book) =>
          book.name.toLowerCase().includes(query) ||
          book.isbn.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query) ||
          book.publisher.toLowerCase().includes(query)
      )
    }

    setFilteredBooks(results)
    setCurrentPage(1) // 重置到第一页
  }, [searchQuery, allBooks])

  // 分页计算
  const indexOfLastBook = currentPage * booksPerPage
  const indexOfFirstBook = indexOfLastBook - booksPerPage
  const currentBooks = filteredBooks.slice(indexOfFirstBook, indexOfLastBook)
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage)

  // 事件处理
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBookClick = (book: Book) => {
    setSelectedBook(book)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setTimeout(() => setSelectedBook(null), 300)
  }

  const handleNavItemClick = (item: string) => {
    setActiveNavItem(item)
    if (item === '学习') {
      window.location.href = '/new'
    }
  }

  const handleAddToBookshelf = async (book: Book, resourceIds?: string[]) => {
    if (!isAuthenticated) {
      setLoginModalOpen(true)
      return
    }

    try {
      // 调用API添加到书架
      const { addToBookshelf } = await import('@/lib/api/books')
      const result = await addToBookshelf(book.id, resourceIds)

      if (result.success) {
        // 更新本地状态 - addBook 会自动重新加载书架
        await addBook(book.id)
      } else {
        alert(result.message || '添加失败')
      }
    } catch (error) {
      console.error('添加到书架失败:', error)
      alert('添加失败，请重试')
    }
  }

  const handleRemoveFromBookshelf = async (book: Book) => {
    if (!isAuthenticated) {
      return
    }

    try {
      // 调用API从书架移除
      const { removeFromBookshelf } = await import('@/lib/api/books')
      const result = await removeFromBookshelf(book.id)

      if (result.success) {
        // 更新本地状态
        removeBook(book.id)
      } else {
        alert(result.message || '移除失败')
      }
    } catch (error) {
      console.error('从书架移除失败:', error)
      alert('移除失败，请重试')
    }
  }

  const isBookAdded = (book: Book) => {
    return bookshelfBooks.some((b) => b.id === book.id)
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
      setConversations(prev => prev.filter(conv => conv.id !== conversationToDelete.id))
      console.log('删除对话:', conversationToDelete.id)
    }
    setConversationToDelete(null)
  }

  // 处理重命名对话
  const handleRenameConversation = (id: number, newTitle: string) => {
    setConversations(prev =>
      prev.map(conv => conv.id === id ? { ...conv, title: newTitle } : conv)
    )
    console.log('重命名对话:', id, newTitle)
  }

  // 打开创建计划弹窗
  const handleOpenCreateProjectModal = () => {
    setCreateProjectModalOpen(true)
  }

  // 创建新计划
  const handleCreateProject = (name: string, memoryAccess: 'default' | 'project-only') => {
    const newProject = {
      id: Date.now(),
      name,
      memoryAccess
    }
    setProjects(prev => [newProject, ...prev])
    console.log('新建计划:', name, '记忆访问权限:', memoryAccess)
  }

  // 处理删除计划
  const handleDeleteProject = (id: string | number) => {
    setProjects(prev => prev.filter(proj => proj.id !== id))
    if (activeProjectId === id) {
      setActiveProjectId(null)
    }
    console.log('删除计划:', id)
  }

  // 处理重命名计划
  const handleRenameProject = (id: string | number, newName: string) => {
    setProjects(prev =>
      prev.map(proj => proj.id === id ? { ...proj, name: newName } : proj)
    )
    console.log('重命名计划:', id, newName)
  }

  // 处理选择计划
  const handleSelectProject = (id: string | number) => {
    setActiveProjectId(id as number)
    console.log('选择计划:', id)
  }

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
        className={`flex flex-col justify-start items-center transition-all duration-300 ${
          sidebarOpen ? 'ml-[280px]' : 'ml-0'
        }`}
      >
        {/* 侧边栏切换按钮 */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`fixed top-6 p-2 bg-white text-[#37322F] rounded-lg hover:bg-gray-50 transition-[left] duration-300 border border-gray-200 max-md:hidden px-2 my-0 mx-[-6px] ${
            sidebarOpen ? 'left-[268px]' : 'left-6'
          } ${showSearchBackdrop ? 'z-30 opacity-40' : 'z-50 opacity-100'}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

        {/* 右侧用户菜单 */}
        <div className={`fixed top-6 right-6 flex items-center gap-3 z-[60] ${showSearchBackdrop ? 'opacity-40' : 'opacity-100'}`}>
          <UserDropdown onLoginClick={() => setLoginModalOpen(true)} />
        </div>

        {/* 顶部导航栏 */}
        <div
          className={`fixed top-6 z-40 max-md:hidden transition-all duration-300 ${
            sidebarOpen ? 'left-1/2 transform -translate-x-1/2 ml-[140px]' : 'left-1/2 transform -translate-x-1/2'
          } ${showSearchBackdrop ? 'opacity-40' : 'opacity-100'}`}
        >
          <div className="flex items-center gap-1 bg-white rounded-full p-1 border border-gray-200">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => handleNavItemClick(item)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeNavItem === item ? 'bg-[#37322F] text-white shadow-sm' : 'text-[#37322F] hover:bg-gray-50'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* 主图书馆内容 */}
        <div className={`w-full max-w-6xl mx-auto pt-32 transition-all duration-300 ${sidebarOpen ? 'px-8' : 'px-4'}`}>
          {/* 标题 */}
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-[#37322F] mb-2">全国高校图书数据集</h1>
            <p className="text-sm text-gray-600">
              探索并收录全国院校的教材与辅材，一键加书架，随时接入 AI。
              {allBooks.length > 0 && ` 共 ${allBooks.length} 本图书`}
            </p>
          </div>

          {/* 搜索背景遮罩 */}
          {showSearchBackdrop && (
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => {
                setIsSearchFocused(false)
                setShowSearchBackdrop(false)
              }}
            />
          )}

          {/* 搜索栏 */}
          <div className="mb-8 flex justify-center relative z-50">
            <div className={`w-full max-w-2xl transition-all duration-300 ${isSearchFocused ? 'scale-105' : 'scale-100'}`}>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onFocus={() => {
                  setIsSearchFocused(true)
                  setShowSearchBackdrop(true)
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setIsSearchFocused(false)
                    setShowSearchBackdrop(false)
                  }, 150)
                }}
              />
            </div>
          </div>

          {/* 书籍网格 */}
          <BookGrid books={currentBooks} onBookClick={handleBookClick} isLoading={isLoading} />

          {/* 分页 */}
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      </div>

      {/* 书籍详情抽屉 */}
      <BookDrawer
        book={selectedBook}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        isBookAdded={selectedBook ? isBookAdded(selectedBook) : false}
        onAddToBookshelf={handleAddToBookshelf}
        onRemoveFromBookshelf={handleRemoveFromBookshelf}
        isAuthenticated={isAuthenticated}
      />

      {/* 登录模态框 */}
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} sidebarOpen={sidebarOpen} />

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

