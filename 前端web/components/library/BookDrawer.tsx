'use client'

/**
 * 书籍详情抽屉组件
 * 从右侧滑入，显示书籍详细信息和资源列表
 */

import { useRef, useEffect, useState } from 'react'
import type { Book } from '@/types'
import { getBookResources } from '@/lib/api/books'

interface BookDrawerProps {
  book: Book | null
  isOpen: boolean
  onClose: () => void
  isBookAdded: boolean
  onAddToBookshelf: (book: Book, resourceIds?: string[]) => void
  onRemoveFromBookshelf: (book: Book) => void
  isAuthenticated?: boolean
  isManagePage?: boolean  // 是否是书架管理页面
}

export function BookDrawer({
  book,
  isOpen,
  onClose,
  isBookAdded,
  onAddToBookshelf,
  onRemoveFromBookshelf,
  isAuthenticated = false,
  isManagePage = false,
}: BookDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showOnlyReadable, setShowOnlyReadable] = useState(false)
  const [sortBy, setSortBy] = useState<'time' | 'size'>('time')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)
  const [resources, setResources] = useState<any[]>([])
  const [isLoadingResources, setIsLoadingResources] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // 成功提示
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // 资源选择相关状态（用于添加到书架时）
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([])

  // 获取资源列表
  useEffect(() => {
    if (isOpen && book && isAuthenticated) {
      const fetchResources = async () => {
        setIsLoadingResources(true)
        try {
          const token = localStorage.getItem('authToken')
          if (!token) {
            setResources([])
            return
          }

          let allResources: any[] = []

          if (isManagePage) {
            // 在书架管理页面：只获取 BookshelfResource 表中的资源（包括官方资源快照和用户上传资源）
            try {
              // 先获取 bookshelfItemId
              const bookshelfResponse = await fetch('/api/bookshelf', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              })
              const bookshelfData = await bookshelfResponse.json()

              if (bookshelfData.success) {
                const bookshelfItem = bookshelfData.data.find((item: any) => item.book.id === book.id)

                if (bookshelfItem) {
                  // 获取书架中的所有资源（包括官方资源快照和用户上传资源）
                  const resourcesResponse = await fetch(`/api/bookshelf/${bookshelfItem.id}/resources`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  })
                  const resourcesData = await resourcesResponse.json()

                  if (resourcesData.success) {
                    allResources = resourcesData.data.map((resource: any) => ({
                      id: resource.id, // BookshelfResource 的 ID
                      title: resource.name,
                      readable: resource.allowReading || false,
                      size: formatFileSize(resource.fileSize),
                      sizeBytes: resource.fileSize,
                      date: new Date(resource.createdAt).toISOString().split('T')[0],
                      fileUrl: resource.fileUrl,
                      fileType: resource.fileType,
                      description: resource.description,
                      isUserUploaded: resource.isUserUploaded, // 使用数据库中的标记
                    }))
                  }
                }
              }
            } catch (error) {
              console.error('获取书架资源失败:', error)
            }
          } else {
            // 在图书馆页面：获取官方资源（用于添加到书架时选择）
            const adminResources = await getBookResources(book.id)
            allResources = adminResources.map((resource: any) => ({
              id: resource.id, // BookResource 的 ID
              title: resource.name,
              readable: resource.allowReading || false,
              size: formatFileSize(resource.fileSize),
              sizeBytes: resource.fileSize,
              date: new Date(resource.createdAt).toISOString().split('T')[0],
              fileUrl: resource.fileUrl,
              fileType: resource.fileType,
              description: resource.description,
              isUserUploaded: false, // 官方资源
            }))
          }

          setResources(allResources)
          // 如果不在书架管理页面，默认全选所有资源（用于添加到书架时）
          if (!isManagePage) {
            setSelectedResourceIds(allResources.map((r: any) => r.id))
          }
        } catch (error) {
          console.error('获取资源列表失败:', error)
          setResources([])
        } finally {
          setIsLoadingResources(false)
        }
      }

      fetchResources()
    } else {
      setResources([])
    }
  }, [isOpen, book, isAuthenticated, isManagePage])

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // 处理上传资源（仅在书架管理页面）
  const handleUploadResource = () => {
    if (!isManagePage) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const token = localStorage.getItem('authToken')
    if (!token) {
      alert('请先登录')
      return
    }

    if (!book) {
      alert('请先选择一本书')
      return
    }

    try {
      setIsUploading(true)

      // 1. 获取书架项ID
      const bookshelfResponse = await fetch('/api/bookshelf', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const bookshelfResult = await bookshelfResponse.json()
      if (!bookshelfResult.success) {
        throw new Error('获取书架信息失败')
      }

      const bookshelfItem = bookshelfResult.data.find((item: any) => item.bookId === book.id)
      if (!bookshelfItem) {
        throw new Error('该书不在书架中')
      }

      // 2. 上传文件到 OSS
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'user-resources')
      formData.append('isPublic', 'false')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const uploadResult = await uploadResponse.json()
      if (!uploadResult.success) {
        throw new Error(uploadResult.message || '文件上传失败')
      }

      // 3. 创建资源记录
      const createResponse = await fetch(`/api/bookshelf/${bookshelfItem.id}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: file.name,
          description: null,
          fileUrl: uploadResult.data.url,
          fileType: uploadResult.data.type,
          fileSize: uploadResult.data.size,
        }),
      })

      const createResult = await createResponse.json()
      if (!createResult.success) {
        throw new Error(createResult.message || '创建资源失败')
      }

      // 4. 重新加载资源列表
      setSuccessMessage('资源上传成功！')
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 3000)

      // 刷新资源列表
      window.location.reload()
    } catch (error: any) {
      console.error('上传资源失败:', error)
      alert(error.message || '上传资源失败')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 移除资源
  const handleDeleteResource = async (resourceId: string, isUserUploaded: boolean) => {
    if (!confirm(`确定要移除这个资源吗？移除后只是解除绑定关系，不会删除源文件。${isUserUploaded ? '您上传的文件仍保留在后台。' : ''}`)) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        alert('请先登录')
        return
      }

      const response = await fetch(`/api/bookshelf/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || '移除失败')
      }

      // 刷新资源列表
      setSuccessMessage(result.message || '资源移除成功！')
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 3000)

      window.location.reload()
    } catch (error: any) {
      console.error('移除资源失败:', error)
      alert(error.message || '移除资源失败')
    }
  }

  // 筛选和排序资源
  const getFilteredResources = () => {
    let filteredResources = [...resources]

    // 筛选可阅读的
    if (showOnlyReadable) {
      filteredResources = filteredResources.filter((r) => r.readable)
    }

    // 排序
    if (sortBy === 'time') {
      filteredResources.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } else if (sortBy === 'size') {
      filteredResources.sort((a, b) => b.sizeBytes - a.sizeBytes)
    }

    return filteredResources
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node) && isOpen) {
        onClose()
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false)
      }
    }

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscKey)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isOpen, onClose])

  // 处理预览 - 跳转到新页面
  const handlePreview = (resource: any) => {
    const params = new URLSearchParams({
      url: resource.url,
      name: resource.name,
      type: resource.type || '',
      source: isManagePage ? 'bookshelf' : 'library',
    })
    window.open(`/preview?${params.toString()}`, '_blank')
  }

  // 显示成功提示
  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setShowSuccessToast(true)
    setTimeout(() => setShowSuccessToast(false), 3000)
  }

  // 包装添加书架函数，添加成功提示
  const handleAddToBookshelf = () => {
    if (book) {
      // 使用当前选中的资源ID列表
      onAddToBookshelf(book, selectedResourceIds)
      showSuccess('已添加到书架')
    }
  }

  // 切换资源选择
  const toggleResourceSelection = (resourceId: string) => {
    setSelectedResourceIds(prev =>
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    )
  }

  // 全选/取消全选资源
  const toggleSelectAllResources = () => {
    if (selectedResourceIds.length === resources.length) {
      setSelectedResourceIds([])
    } else {
      setSelectedResourceIds(resources.map(r => r.id))
    }
  }

  // 包装移除书架函数，添加成功提示
  const handleRemoveFromBookshelf = () => {
    if (book) {
      onRemoveFromBookshelf(book)
      showSuccess('已从书架移除')
    }
  }

  if (!book) return null

  const filteredResources = getFilteredResources()

  return (
    <>
      {/* 隐藏的文件上传input（仅在书架管理页面） */}
      {isManagePage && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
          className="hidden"
        />
      )}

      {/* 背景遮罩 */}
      {isOpen && <div className="fixed inset-0 bg-black/20 z-90 transition-opacity duration-300" />}

      {/* 抽屉 */}
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 h-screen w-[680px] bg-white shadow-2xl z-[100] transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="flex-shrink-0 min-h-20 border-b border-gray-200 px-6 py-4 flex items-start gap-4">
            {/* 书籍封面 */}
            <div className="flex-shrink-0 w-16 h-20 rounded overflow-hidden bg-gray-100">
              <img
                src={book.coverUrl || book.cover || '/placeholder.svg'}
                alt={book.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* 书籍信息 */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <h2 className="text-[15px] font-semibold text-[#37322F] line-clamp-1 leading-6">{book.name}</h2>
              <p className="text-xs text-gray-500 hover:text-[#37322F] transition-colors cursor-pointer" title="复制 ISBN">
                ISBN：{book.isbn}
              </p>
              <p className="text-xs text-gray-600 truncate">作者：{book.author}</p>
              <p className="text-xs text-gray-500 truncate">出版社：{book.publisher}</p>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => window.open(`/book/${book.id}`, '_blank')}
                className="px-3 py-1.5 border border-gray-300 text-[#37322F] rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium flex items-center gap-1.5"
                title="在新页打开"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                打开
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="关闭 (Esc)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* 可滚动内容 */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* 资源列表 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#37322F]">资源列表</h3>
                  {book.university && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px]">
                      {book.university}
                    </span>
                  )}
                  {/* 全选/取消全选（仅在非书架管理页面显示） */}
                  {!isManagePage && resources.length > 0 && (
                    <button
                      onClick={toggleSelectAllResources}
                      className="text-xs text-[#37322F] hover:underline font-medium ml-2"
                    >
                      {selectedResourceIds.length === resources.length ? '取消全选' : '全选'}
                      <span className="ml-1 text-gray-500">
                        ({selectedResourceIds.length}/{resources.length})
                      </span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* 上传资源按钮（仅在书架管理页面显示） */}
                  {isManagePage && (
                    <button
                      onClick={handleUploadResource}
                      disabled={isUploading}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#37322F] text-white text-xs rounded hover:bg-[#4a4340] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isUploading ? '上传中...' : '上传资源'}
                    >
                      {isUploading ? (
                        <>
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>上传中...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>上传资源</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* 仅看可阅读的开关 */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-600">仅看可阅读的</span>
                    <div
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        showOnlyReadable ? 'bg-[#37322F]' : 'bg-gray-300'
                      }`}
                      onClick={() => setShowOnlyReadable(!showOnlyReadable)}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          showOnlyReadable ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </label>

                  {/* 排序下拉菜单 */}
                  <div className="relative" ref={sortDropdownRef}>
                    <button
                      onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                      className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      排序
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {sortDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-20 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <button
                          onClick={() => {
                            setSortBy('time')
                            setSortDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors rounded-t-lg ${
                            sortBy === 'time'
                              ? 'bg-gray-100 text-[#37322F] font-medium'
                              : 'text-[#37322F] hover:bg-gray-50'
                          }`}
                        >
                          时间排序
                        </button>
                        <button
                          onClick={() => {
                            setSortBy('size')
                            setSortDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors rounded-b-lg ${
                            sortBy === 'size'
                              ? 'bg-gray-100 text-[#37322F] font-medium'
                              : 'text-[#37322F] hover:bg-gray-50'
                          }`}
                        >
                          大小排序
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 资源列表项 */}
              <div className="space-y-2">
                {isLoadingResources ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    加载资源中...
                  </div>
                ) : !isAuthenticated ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    请先登录查看资源列表
                  </div>
                ) : filteredResources.length > 0 ? (
                  filteredResources.map((resource, index) => (
                    <div
                      key={resource.id || index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* 勾选框（仅在非书架管理页面显示，用于添加到书架时选择资源） */}
                        {!isManagePage && (
                          <input
                            type="checkbox"
                            checked={selectedResourceIds.includes(resource.id)}
                            onChange={() => toggleResourceSelection(resource.id)}
                            className="w-4 h-4 text-[#37322F] rounded border-gray-300 focus:ring-[#37322F] cursor-pointer flex-shrink-0"
                          />
                        )}
                        <div className="flex-shrink-0 w-8 h-8 bg-white rounded flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-[#37322F] truncate">{resource.title}</p>
                            {resource.isUserUploaded && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full flex-shrink-0">
                                我的
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{resource.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {resource.readable ? (
                          <>
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full flex-shrink-0">
                              可阅读
                            </span>
                            <button
                              onClick={() => {
                                handlePreview({
                                  url: resource.fileUrl,
                                  name: resource.title,
                                  type: resource.fileType,
                                })
                              }}
                              className="px-3 py-1 bg-[#37322F] text-white text-xs rounded hover:bg-[#2a251f] transition-colors flex-shrink-0"
                            >
                              预览
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-[10px] rounded-full flex-shrink-0">
                              不可阅读
                            </span>
                            <button
                              disabled
                              className="px-3 py-1 bg-gray-300 text-gray-500 text-xs rounded cursor-not-allowed flex-shrink-0"
                              title="该资源不支持在线阅读"
                            >
                              预览
                            </button>
                          </>
                        )}
                        {/* 移除按钮（在书架管理页面显示） */}
                        {isManagePage && (
                          <button
                            onClick={() => handleDeleteResource(resource.id, resource.isUserUploaded)}
                            className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs rounded transition-colors flex-shrink-0"
                            title="移除资源"
                          >
                            移除
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    该图书暂无资源
                    {showOnlyReadable && <div className="mt-1 text-xs">（已筛选仅可阅读）</div>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 底部操作栏 - 仅在已登录时显示 */}
          {isAuthenticated && (
            <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
              <div className="flex gap-3">
                {/* 在线预览按钮 */}
                {book.fileUrl ? (
                  book.allowReading ? (
                    <button
                      onClick={() => {
                        handlePreview({
                          url: book.fileUrl!,
                          name: book.name,
                          type: book.fileUrl!.split('.').pop(),
                        })
                      }}
                      className="flex-1 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      在线预览
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 py-2.5 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
                      title="该图书不支持在线阅读"
                    >
                      在线预览
                    </button>
                  )
                ) : null}

                {/* 添加到书架/移除书架按钮 */}
                <button
                  onClick={() => (isBookAdded ? handleRemoveFromBookshelf() : handleAddToBookshelf())}
                  className={`${book.fileUrl ? 'flex-1' : 'w-full'} py-2.5 rounded-lg font-medium transition-colors ${
                    isManagePage
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : isBookAdded
                      ? 'bg-gray-100 text-[#37322F] hover:bg-gray-200'
                      : 'bg-[#37322F] text-white hover:bg-[#2a251f]'
                  }`}
                >
                  {isManagePage ? '移除书架' : isBookAdded ? '已添加到书架' : '添加到书架'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 成功提示 Toast - 无动画版本 */}
      {showSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200]">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}
    </>
  )
}

