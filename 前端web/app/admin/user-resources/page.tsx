'use client'

/**
 * 用户资源管理页面
 * 显示所有用户上传的资源
 */

import { useEffect, useState } from 'react'

interface UserResource {
  id: string
  name: string
  fileUrl: string
  fileType: string
  fileSize: number
  createdAt: string
  user: {
    id: string
    email: string
    realName: string
    university: string
  }
  bookshelfResources: Array<{
    id: string
    bookshelfItem: {
      book: {
        id: string
        name: string
        author: string
      }
    }
  }>
  referenceCount: number
}

interface Pagination {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function UserResourcesPage() {
  const [resources, setResources] = useState<UserResource[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  // 加载资源列表
  const loadResources = async (page: number = 1, searchQuery: string = '') => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams({
        page: page.toString(),
      })
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/admin/user-resources?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setResources(data.data)
        setPagination(data.pagination)
      } else {
        alert(data.message || '加载失败')
      }
    } catch (error) {
      console.error('加载资源列表失败:', error)
      alert('加载资源列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResources(1, search)
  }, [search])

  // 搜索
  const handleSearch = () => {
    setSearch(searchInput)
  }

  // 下载资源
  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const token = localStorage.getItem('authToken')

      // 获取签名URL
      const response = await fetch('/api/oss/sign-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filePath: fileUrl }), // 修改为 filePath
      })

      const data = await response.json()
      if (data.success && data.data?.url) {
        // 创建一个隐藏的 a 标签来触发下载
        const link = document.createElement('a')
        link.href = data.data.url
        link.download = fileName
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        console.error('获取签名URL失败:', data.message)
        alert(data.message || '获取下载链接失败')
      }
    } catch (error) {
      console.error('下载资源失败:', error)
      alert('下载资源失败')
    }
  }

  // 删除资源
  const handleDelete = async (id: string, name: string, referenceCount: number) => {
    if (referenceCount > 0) {
      if (!confirm(`此资源还有 ${referenceCount} 个引用。确定要删除资源「${name}」吗？删除后所有引用都会被移除。`)) {
        return
      }
    } else {
      if (!confirm(`确定要删除资源「${name}」吗？`)) {
        return
      }
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/user-resources?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        alert('删除成功')
        loadResources(pagination.page, search)
      } else {
        alert(data.message || '删除失败')
      }
    } catch (error) {
      console.error('删除资源失败:', error)
      alert('删除资源失败')
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="搜索资源名称、用户名或邮箱..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            搜索
          </button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-sm text-gray-600">
          共 <span className="font-bold text-blue-600">{pagination.total}</span> 个用户资源
        </div>
      </div>

      {/* 资源列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">加载中...</span>
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无用户资源
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    资源名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    教材名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    大学
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    文件信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    引用次数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    上传时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {resource.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {resource.bookshelfResources.length > 0 ? (
                        <>
                          <div className="text-sm text-gray-900">
                            {resource.bookshelfResources[0].bookshelfItem.book.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {resource.bookshelfResources[0].bookshelfItem.book.author}
                          </div>
                          {resource.bookshelfResources.length > 1 && (
                            <div className="text-xs text-blue-600 mt-1">
                              +{resource.bookshelfResources.length - 1} 个其他教材
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">已被移除</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{resource.user.realName}</div>
                      <div className="text-xs text-gray-500">{resource.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {resource.user.university}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{resource.fileType.toUpperCase()}</div>
                      <div className="text-xs text-gray-500">{formatFileSize(resource.fileSize)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        resource.referenceCount > 0
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {resource.referenceCount} 次引用
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(resource.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(resource.fileUrl, resource.name)}
                          className="text-blue-600 hover:text-blue-900"
                          title="下载资源"
                        >
                          下载
                        </button>
                        <button
                          onClick={() => handleDelete(resource.id, resource.name, resource.referenceCount)}
                          className="text-red-600 hover:text-red-900"
                          title="删除资源"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              第 {pagination.page} / {pagination.totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadResources(pagination.page - 1, search)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => loadResources(pagination.page + 1, search)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


