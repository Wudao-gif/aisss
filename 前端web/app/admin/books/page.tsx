'use client'

/**
 * 管理后台 - 图书管理页面
 */

import { useState, useEffect } from 'react'
import FileUpload from '@/components/admin/FileUpload'
import BookResourcesModal from '@/components/admin/books/BookResourcesModal'

interface Book {
  id: string
  name: string
  author: string
  isbn: string
  publisher: string
  coverUrl?: string | null
  fileUrl?: string | null
  fileSize?: number | null
  allowReading?: boolean
  createdAt: string
  _count: {
    bookshelf: number
    resources: number
  }
}

interface BooksData {
  books: Book[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function BooksPage() {
  const [data, setData] = useState<BooksData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [managingResourcesBook, setManagingResourcesBook] = useState<Book | null>(null)

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    author: '',
    isbn: '',
    publisher: '',
    coverUrl: '',
    fileUrl: '',
    fileSize: 0,
    allowReading: false,
  })

  const fetchBooks = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('page', page.toString())

      const response = await fetch(`/api/admin/books?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        alert(result.message || '获取图书列表失败')
      }
    } catch (error) {
      console.error('获取图书列表失败:', error)
      alert('获取图书列表失败')
    } finally {
      setLoading(false)
    }
  }



  useEffect(() => {
    fetchBooks()
  }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchBooks()
  }

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/books', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      if (result.success) {
        alert('图书添加成功')
        setShowAddModal(false)
        setFormData({ name: '', author: '', isbn: '', publisher: '', coverUrl: '', fileUrl: '', fileSize: 0, allowReading: false })
        fetchBooks()
      } else {
        alert(result.message || '添加失败')
      }
    } catch (error) {
      console.error('添加图书失败:', error)
      alert('添加图书失败')
    }
  }

  const handleEditBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBook) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/books/${editingBook.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      if (result.success) {
        alert('图书更新成功')
        setEditingBook(null)
        setFormData({ name: '', author: '', isbn: '', publisher: '', coverUrl: '', fileUrl: '', fileSize: 0, allowReading: false })
        fetchBooks()
      } else {
        alert(result.message || '更新失败')
      }
    } catch (error) {
      console.error('更新图书失败:', error)
      alert('更新图书失败')
    }
  }

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('确定要删除此图书吗？此操作不可恢复！')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/books/${bookId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        alert('图书删除成功')
        fetchBooks()
      } else {
        alert(result.message || '删除失败')
      }
    } catch (error) {
      console.error('删除图书失败:', error)
      alert('删除图书失败')
    }
  }

  const openEditModal = (book: Book) => {
    setEditingBook(book)
    setFormData({
      name: book.name,
      author: book.author,
      isbn: book.isbn,
      publisher: book.publisher,
      coverUrl: book.coverUrl || '',
      fileUrl: book.fileUrl || '',
      fileSize: book.fileSize || 0,
      allowReading: book.allowReading || false,
    })
  }

  const handleFileUpload = async (file: File, folder: string = 'uploads', isPublic: boolean = false) => {
    try {
      const token = localStorage.getItem('authToken')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      formData.append('isPublic', isPublic.toString())

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('文件上传失败:', error)
      throw error
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="space-y-6">
      {/* 搜索和筛选栏 */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索书名、作者或 ISBN..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            搜索
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + 添加图书
          </button>
        </form>
      </div>

      {/* 图书列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : data && data.books.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      书名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      作者
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ISBN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      出版社
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      收藏数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      资源数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.books.map((book) => (
                    <tr key={book.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{book.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{book.author}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{book.isbn}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{book.publisher}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {book._count.bookshelf} 人
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {book._count.resources} 个
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button
                          onClick={() => setManagingResourcesBook(book)}
                          className="px-3 py-1 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 transition-colors"
                        >
                          管理资源
                        </button>
                        <button
                          onClick={() => openEditModal(book)}
                          className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteBook(book.id)}
                          className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {data.totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  共 {data.total} 本图书，第 {data.page} / {data.totalPages} 页
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.totalPages}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">暂无图书</div>
        )}
      </div>

      {/* 添加图书模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">添加图书</h3>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  书名 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  作者 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ISBN *
                </label>
                <input
                  type="text"
                  required
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  出版社 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  封面图片（可选）
                </label>
                <FileUpload
                  accept="image/*"
                  onUpload={async (file) => {
                    // 封面上传到公共 Bucket
                    const uploadedFile = await handleFileUpload(file, 'book-covers', true)
                    setFormData({
                      ...formData,
                      coverUrl: uploadedFile.url,
                    })
                  }}
                />
                {formData.coverUrl && (
                  <div className="mt-2">
                    <img
                      src={formData.coverUrl}
                      alt="封面预览"
                      className="w-32 h-40 object-cover rounded border"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图书文件（可选）
                </label>
                <FileUpload
                  accept=".pdf,.doc,.docx"
                  onUpload={async (file) => {
                    // 图书文件上传到私有 Bucket
                    const uploadedFile = await handleFileUpload(file, 'book-files', false)
                    setFormData({
                      ...formData,
                      fileUrl: uploadedFile.url,
                      fileSize: uploadedFile.size,
                    })
                  }}
                />
                {formData.fileUrl && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ 文件已上传：{formatFileSize(formData.fileSize)}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowReading}
                    onChange={(e) => setFormData({ ...formData, allowReading: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    允许在线阅读
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  开启后，用户可以在线阅读图书文件；关闭后，用户无法访问源文件
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  添加
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setFormData({ name: '', author: '', isbn: '', publisher: '', coverUrl: '', fileUrl: '', fileSize: 0, allowReading: false })
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑图书模态框 */}
      {editingBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">编辑图书</h3>
            <form onSubmit={handleEditBook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  书名 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  作者 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ISBN *
                </label>
                <input
                  type="text"
                  required
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  出版社 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  封面图片（可选）
                </label>
                <FileUpload
                  accept="image/*"
                  onUpload={async (file) => {
                    // 封面上传到公共 Bucket
                    const uploadedFile = await handleFileUpload(file, 'book-covers', true)
                    setFormData({
                      ...formData,
                      coverUrl: uploadedFile.url,
                    })
                  }}
                />
                {formData.coverUrl && (
                  <div className="mt-2">
                    <img
                      src={formData.coverUrl}
                      alt="封面预览"
                      className="w-32 h-40 object-cover rounded border"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图书文件（可选）
                </label>
                <FileUpload
                  accept=".pdf,.doc,.docx"
                  onUpload={async (file) => {
                    // 图书文件上传到私有 Bucket
                    const uploadedFile = await handleFileUpload(file, 'book-files', false)
                    setFormData({
                      ...formData,
                      fileUrl: uploadedFile.url,
                      fileSize: uploadedFile.size,
                    })
                  }}
                />
                {formData.fileUrl && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ 文件已上传：{formatFileSize(formData.fileSize)}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowReading}
                    onChange={(e) => setFormData({ ...formData, allowReading: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    允许在线阅读
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  开启后，用户可以在线阅读图书文件；关闭后，用户无法访问源文件
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBook(null)
                    setFormData({ name: '', author: '', isbn: '', publisher: '', coverUrl: '', fileUrl: '', fileSize: 0, allowReading: false })
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 资源管理弹窗 */}
      {managingResourcesBook && (
        <BookResourcesModal
          bookId={managingResourcesBook.id}
          bookName={managingResourcesBook.name}
          onClose={() => setManagingResourcesBook(null)}
        />
      )}
    </div>
  )
}

