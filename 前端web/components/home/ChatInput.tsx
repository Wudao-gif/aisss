'use client'

/**
 * 聊天输入框组件
 * 包含模式选择、书籍选择、输入框
 */

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/useAuthStore'
import type { BookshelfItem } from '@/types'

type StudyMode = '学习' | '复习' | '解题'

interface ChatInputProps {
  selectedMode: StudyMode
  selectedBook: { id: string | number; name: string } | null
  bookshelfBooks: BookshelfItem[]
  onModeChange: (mode: StudyMode) => void
  onBookSelect: (book: { id: string | number; name: string } | null) => void
  onSend: (message: string) => void
  isConversationPage?: boolean // 是否在对话页面
  onLoginRequired?: () => void // 未登录时的回调
}

export function ChatInput({
  selectedMode,
  selectedBook,
  bookshelfBooks,
  onModeChange,
  onBookSelect,
  onSend,
  isConversationPage = false,
  onLoginRequired,
}: ChatInputProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const [inputValue, setInputValue] = useState('')
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false)
  const [typingPlaceholder, setTypingPlaceholder] = useState('')
  const [isTypingComplete, setIsTypingComplete] = useState(false)
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false)
  const [bookshelfMenuOpen, setBookshelfMenuOpen] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [importedFiles, setImportedFiles] = useState<BookshelfItem[]>([])

  const modeDropdownRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const uploadMenuRef = useRef<HTMLDivElement>(null)
  const bookshelfMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modeDropdownRef.current &&
        !modeDropdownRef.current.contains(event.target as Node)
      ) {
        setModeDropdownOpen(false)
      }
      if (
        uploadMenuRef.current &&
        !uploadMenuRef.current.contains(event.target as Node)
      ) {
        setUploadMenuOpen(false)
      }
      if (
        bookshelfMenuRef.current &&
        !bookshelfMenuRef.current.contains(event.target as Node)
      ) {
        setBookshelfMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 动态 placeholder 打字效果
  useEffect(() => {
    let fullText = ''

    if (selectedMode === '学习' && selectedBook) {
      fullText = `我想学习《${selectedBook.name}》。`
    } else if (selectedMode === '复习' && selectedBook) {
      fullText = `我想复习《${selectedBook.name}》。`
    } else if (selectedMode === '解题') {
      fullText = '请输入你的问题，我会帮你解答。'
    } else if (selectedMode === '学习' && !selectedBook) {
      fullText = '我无法确认你需要学习哪一门课程。'
    } else if (selectedMode === '复习' && !selectedBook) {
      fullText = '我无法确认你需要复习哪一门课程。'
    }

    if (fullText) {
      let currentIndex = 0
      setTypingPlaceholder('')
      setIsTypingComplete(false)

      const typingInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setTypingPlaceholder(fullText.slice(0, currentIndex + 1))
          currentIndex++
        } else {
          setIsTypingComplete(true)
          clearInterval(typingInterval)
        }
      }, 50)

      return () => clearInterval(typingInterval)
    } else {
      setTypingPlaceholder('')
      setIsTypingComplete(false)
    }
  }, [selectedBook, selectedMode])

  // 自动调整 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  const handleModeSelect = (mode: StudyMode) => {
    onModeChange(mode)
    setModeDropdownOpen(false)

    // 切换到解题模式时清除选中的书籍
    if (mode === '解题' && selectedBook) {
      onBookSelect(null)
    }
  }

  const handleSend = () => {
    if (!inputValue.trim()) return

    // 只在主页（非对话页面）检查登录状态
    if (!isConversationPage) {
      // 使用 Zustand 的 isAuthenticated 状态
      if (!isAuthenticated && onLoginRequired) {
        onLoginRequired()
        return
      }

      // 跳转到对话页面并传递数据
      const conversationData = {
        message: inputValue,
        mode: selectedMode,
        book: selectedBook,
        images: uploadedImages,
        files: importedFiles,
      }

      // 将数据存储到 sessionStorage
      sessionStorage.setItem('newConversation', JSON.stringify(conversationData))

      // 跳转到对话页面
      router.push('/chat')
    } else {
      // 在对话页面直接发送（登录检查由对话页面的 handleSendMessage 处理）
      onSend(inputValue)
      setInputValue('')
      setUploadedImages([])
      setImportedFiles([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 处理图片上传
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // 将图片转换为 base64 或 URL
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedImages((prev) => [...prev, e.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })

    // 重置文件输入
    event.target.value = ''
    setUploadMenuOpen(false)
  }

  // 从书架导入用户上传的文件
  const handleImportFromBookshelf = (book: BookshelfItem) => {
    // 添加到导入文件列表
    setImportedFiles((prev) => {
      // 避免重复添加
      if (prev.some((f) => f.id === book.id)) {
        return prev
      }
      return [...prev, book]
    })
    setBookshelfMenuOpen(false)
  }

  // 移除上传的图片
  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  // 移除导入的文件
  const removeFile = (id: string | number) => {
    setImportedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  // 筛选出用户上传的书籍（假设有 isUserUploaded 字段）
  const userUploadedBooks = bookshelfBooks.filter((book) => {
    // TODO: 根据实际数据结构判断是否是用户上传的
    // 暂时返回所有书籍用于演示
    return true
  })

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl md:rounded-3xl min-h-[48px] flex flex-col">
      {/* 附件预览区域 */}
      {(uploadedImages.length > 0 || importedFiles.length > 0) && (
        <div className="px-4 pt-3 pb-2 border-b border-gray-100">
          {/* 上传的图片 */}
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img}
                    alt={`图片 ${idx + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 导入的文件 */}
          {importedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {importedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm group"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-gray-700 truncate max-w-[150px]">{file.book?.name || file.id}</span>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Textarea container */}
      <div className="flex-1 relative">
        {/* Placeholder */}
        {inputValue.length === 0 && (
          <div className="absolute top-3 left-4 pointer-events-none z-10">
            <div className="text-gray-400 text-base">
              {selectedBook ? (
                <>
                  {typingPlaceholder}
                  {!isTypingComplete && <span className="animate-pulse">|</span>}
                </>
              ) : (
                '输入消息...'
              )}
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent resize-none outline-none pt-2.5 pl-4 pr-4 pb-2 text-base text-[#37322F] min-h-[48px] max-h-[150px] overflow-y-auto placeholder-transparent"
          placeholder="Ask me anything..."
          rows={1}
        />
      </div>

      {/* Buttons row */}
      <div className="px-3 pb-3 flex items-center justify-between border-t border-transparent">
        {/* 左侧：添加按钮 */}
        <div className="flex items-center gap-2">
          {/* 添加按钮（上传图片 + 从书架导入） */}
          <div className="relative" ref={uploadMenuRef}>
            <button
              onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="添加附件"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {uploadMenuOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                {/* 上传图片 */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  上传图片
                </button>

                {/* 从书架导入 */}
                <button
                  onClick={() => {
                    setUploadMenuOpen(false)
                    setBookshelfMenuOpen(true)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  从我的书架导入
                </button>
              </div>
            )}

            {/* 隐藏的文件输入 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* 从书架导入的下拉菜单 */}
          {bookshelfMenuOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 max-h-64 overflow-y-auto" ref={bookshelfMenuRef}>
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                我的上传文件
              </div>
              {userUploadedBooks.length > 0 ? (
                userUploadedBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleImportFromBookshelf(book)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="truncate">{book.book?.name || book.id}</div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  暂无上传的文件
                </div>
              )}
            </div>
          )}

          {/* 选中的书籍 */}
          {selectedBook && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#37322F] text-white rounded-lg text-sm">
              <span className="truncate max-w-[200px]">{selectedBook.name}</span>
              <button
                onClick={() => onBookSelect(null)}
                className="hover:bg-white/20 rounded p-0.5 transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* 右侧：发送按钮（主页不显示模式切换） */}
        <div className="flex items-center gap-2">
          {/* 模式选择下拉菜单（学习按钮） - 仅在对话页面显示 */}
          {isConversationPage && (
            <div className="relative" ref={modeDropdownRef}>
              <button
                onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg transition-colors text-sm font-medium hover:bg-gray-50 cursor-pointer"
              >
                {selectedMode}
                <svg
                  className={`w-4 h-4 transition-transform ${
                    modeDropdownOpen ? 'rotate-180' : ''
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

              {modeDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                  {(['学习', '复习', '解题'] as StudyMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleModeSelect(mode)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        selectedMode === mode
                          ? 'bg-gray-100 text-[#37322F] font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

