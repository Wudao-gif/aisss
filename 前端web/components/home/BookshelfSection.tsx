'use client'

/**
 * 书架区域组件
 * 显示用户的书架，支持选择和管理书籍
 */

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useBookshelfStore } from '@/stores/useBookshelfStore'
import { BookDrawer } from '@/components/library/BookDrawer'
import type { BookshelfItem, Book } from '@/types'

interface BookshelfSectionProps {
  onBookSelect?: (book: { id: string | number; name: string }) => void
  selectedBookId?: string | number | null
}

export function BookshelfSection({
  onBookSelect,
  selectedBookId
}: BookshelfSectionProps) {
  const router = useRouter()
  const { books, loadBookshelf } = useBookshelfStore()
  const [showAll, setShowAll] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [pasteContent, setPasteContent] = useState('')
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    bookItem: BookshelfItem
  } | null>(null)

  // 抽屉状态（用于上传资源）
  const [drawerBook, setDrawerBook] = useState<Book | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // 确保组件已挂载（用于 Portal）
  useEffect(() => {
    setMounted(true)
  }, [])

  // 加载书架
  useEffect(() => {
    loadBookshelf()
  }, [loadBookshelf])

  // 弹窗打开时隐藏滚动条
  useEffect(() => {
    if (showAddModal) {
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
    }
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [showAddModal])

  // 点击外部关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    const handleScroll = () => setContextMenu(null)

    if (contextMenu) {
      document.addEventListener('click', handleClick)
      document.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [contextMenu])

  // 调试：打印书架数据
  useEffect(() => {
    console.log('📚 书架数据:', books)
    if (books.length > 0) {
      console.log('📖 第一本书:', books[0])
    }
  }, [books])

  // 显示的书籍数量
  const displayBooks = showAll ? books : books.slice(0, 11)
  const hasMore = books.length > 11

  // 处理书籍点击 - 在新标签页打开书籍对话页面
  const handleBookClick = (item: BookshelfItem) => {
    window.open(`/book-chat-v2?bookId=${item.bookId}`, '_blank', 'noopener,noreferrer')
  }

  // 处理添加图书 - 打开弹窗
  const handleAddBook = () => {
    setShowAddModal(true)
  }

  // 跳转到图书馆
  const handleGoToLibrary = () => {
    router.push('/library-new')
    setShowAddModal(false)
  }

  // 打开文件选择器
  const handleUploadDocument = () => {
    fileInputRef.current?.click()
  }

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      // TODO: 处理文件上传逻辑
      console.log('选择的文件:', files[0])
      setShowAddModal(false)
      // 这里可以添加文件上传的逻辑
    }
  }

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, item: BookshelfItem) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      bookItem: item
    })
  }

  // 处理移除书架
  const handleRemoveFromBookshelf = async (item: BookshelfItem) => {
    if (!confirm(`确定要将《${item.book.name}》从书架移除吗？`)) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        alert('请先登录')
        return
      }

      // 使用 bookId 查询参数，而不是路径参数
      const response = await fetch(`/api/bookshelf?bookId=${item.bookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        // 重新加载书架
        loadBookshelf()
        setContextMenu(null)
      } else {
        alert('移除失败: ' + data.message)
      }
    } catch (error) {
      console.error('移除失败:', error)
      alert('移除失败')
    }
  }

  // 处理上传资源
  const handleUploadResource = (item: BookshelfItem) => {
    // 打开右侧抽屉，显示资源管理界面
    setDrawerBook(item.book)
    setIsDrawerOpen(true)
    setContextMenu(null)
  }

  // 关闭抽屉
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setDrawerBook(null)
  }

  // 处理从书架移除（抽屉中的操作）
  const handleRemoveFromBookshelfInDrawer = (book: Book) => {
    const item = books.find(b => b.book.id === book.id)
    if (item) {
      handleRemoveFromBookshelf(item)
    }
    handleCloseDrawer()
  }

  // 提交粘贴的内容
  const handleSubmitPaste = () => {
    if (pasteContent.trim()) {
      // TODO: 处理粘贴内容的逻辑
      console.log('粘贴的内容:', pasteContent)
      setShowAddModal(false)
      setPasteContent('')
      // 这里可以添加处理粘贴内容的逻辑
    }
  }

  return (
    <>
      <div className="w-full mx-auto px-4 mb-8">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">我的书架</h2>
      </div>

      {/* 书架内容 */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-6">
          {/* 添加按钮 - 始终显示在第一个位置 */}
          <div className="relative">
            <button
              onClick={handleAddBook}
              className="relative w-32 h-44 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#37322F] bg-gray-50 hover:bg-gray-100 transition-all flex items-center justify-center group"
            >
              <svg
                className="w-12 h-12 text-gray-400 group-hover:text-[#37322F] transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>

          {/* 书籍列表 - 显示封面，从左往右对齐 */}
          {displayBooks.map((item) => (
            <button
              key={item.id}
              onClick={() => handleBookClick(item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
              className="group relative flex flex-col items-center transition-all"
            >
              {/* 书籍封面 */}
              <div className="relative w-32 h-44 rounded-lg overflow-hidden border-2 border-gray-200 transition-all">
                {item.book.coverUrl ? (
                  <img
                    src={item.book.coverUrl}
                    alt={item.book.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-3">
                    <span className="text-xs text-gray-600 text-center line-clamp-4">
                      {item.book.name}
                    </span>
                  </div>
                )}
              </div>

              {/* 书名 - 显示在封面下方 */}
              <div className="mt-2 w-32 text-center">
                <p className="text-sm font-medium text-gray-900 truncate" title={item.book.name}>
                  {item.book.name}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* 展开/收起按钮 */}
        {hasMore && (
          <div className="text-center mt-6">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-[#37322F] hover:underline font-medium"
            >
              {showAll ? '收起' : `查看全部 (${books.length})`}
            </button>
          </div>
        )}
      </div>

        {/* 隐藏的文件输入 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
        />
      </div>

      {/* 添加教材弹窗 - 使用 Portal 渲染到 body */}
      {mounted && showAddModal && createPortal(
        <div
          className="fixed z-50 flex items-center justify-center"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="bg-white rounded-2xl p-8 w-[800px] max-w-[90vw] mx-4 shadow-2xl">
            {/* 顶部：标题和右侧区域（关闭按钮 + 图书馆按钮） */}
            <div className="flex items-start justify-between mb-6">
              {/* 左侧：标题和副标题 */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  添加教材
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  你可以选择从图书馆和本地添加教材
                </p>
              </div>

              {/* 右侧：关闭按钮和图书馆按钮 */}
              <div className="flex flex-col items-end gap-2">
                {/* 关闭按钮 */}
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* 图书馆按钮 - 在×下面 */}
                <button
                  onClick={handleGoToLibrary}
                  className="flex items-center gap-2 px-4 py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-all shadow-md hover:shadow-lg text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                  <span className="font-medium">从图书馆选择</span>
                </button>
              </div>
            </div>

            {/* 上传文件区域 - 虚线框 */}
            <div
              className="mt-6 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#37322F] transition-all cursor-pointer bg-gray-50 hover:bg-gray-100"
              onClick={handleUploadDocument}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.classList.add('border-[#37322F]', 'bg-gray-100')
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-[#37322F]', 'bg-gray-100')
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove('border-[#37322F]', 'bg-gray-100')
                const files = e.dataTransfer.files
                if (files && files.length > 0) {
                  // 触发文件输入
                  const input = fileInputRef.current
                  if (input) {
                    const dataTransfer = new DataTransfer()
                    Array.from(files).forEach(file => dataTransfer.items.add(file))
                    input.files = dataTransfer.files
                    handleFileChange({ target: input } as any)
                  }
                }
              }}
            >
              {/* 上传图标 */}
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-base font-medium text-gray-700 mb-2">
                拖放或选择文件上传
              </p>
              <p className="text-sm text-gray-500">
                支持的文件格式：PDF、PPT、Word、TXT
              </p>
            </div>

            {/* 粘贴文本区域 */}
            <div className="mt-6 relative border-2 border-gray-300 rounded-xl focus-within:border-[#37322F] transition-colors">
              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="粘贴文本内容..."
                className="w-full h-32 px-4 py-3 pr-20 focus:outline-none resize-none text-gray-900 bg-transparent rounded-xl"
              />
              {/* 导入按钮 - 在粘贴框内部右下角 */}
              <button
                onClick={handleSubmitPaste}
                disabled={!pasteContent.trim()}
                className={`absolute right-3 bottom-3 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  pasteContent.trim()
                    ? 'bg-[#37322F] text-white hover:bg-[#2a251f] shadow-md hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                导入
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 右键菜单 */}
      {mounted && contextMenu && createPortal(
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] z-[9999]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 打开 */}
          <button
            onClick={() => {
              handleBookClick(contextMenu.bookItem)
              setContextMenu(null)
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            打开
          </button>

          {/* 移除书架 */}
          <button
            onClick={() => {
              handleRemoveFromBookshelf(contextMenu.bookItem)
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            移除书架
          </button>

          {/* 上传资源 */}
          <button
            onClick={() => {
              handleUploadResource(contextMenu.bookItem)
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            上传资源
          </button>
        </div>,
        document.body
      )}

      {/* 资源管理抽屉 */}
      <BookDrawer
        book={drawerBook}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        isBookAdded={true}
        onAddToBookshelf={() => {}}
        onRemoveFromBookshelf={handleRemoveFromBookshelfInDrawer}
        isAuthenticated={true}
        isManagePage={true}
      />

    </>
  )
}

