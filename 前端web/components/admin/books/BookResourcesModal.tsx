'use client'

/**
 * 图书资源管理弹窗
 * 支持按大学查看和添加资源
 */

import { useState, useEffect } from 'react'
import FileUpload from '../FileUpload'

interface University {
  id: string
  name: string
}

interface BookResource {
  id: string
  bookId: string
  universityId: string
  name: string
  description: string | null
  fileUrl: string
  fileType: string
  fileSize: number
  allowReading?: boolean
  createdAt: string
  university: University
}

interface Props {
  bookId: string
  bookName: string
  onClose: () => void
}

export default function BookResourcesModal({ bookId, bookName, onClose }: Props) {
  const [universities, setUniversities] = useState<University[]>([])
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]) // 改为多选
  const [viewUniversity, setViewUniversity] = useState('') // 用于查看资源的大学
  const [resources, setResources] = useState<BookResource[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // 添加资源表单
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fileUrl: '',
    fileType: '',
    fileSize: 0,
    allowReading: false, // 是否支持预览
  })

  // 获取大学列表
  useEffect(() => {
    fetchUniversities()
  }, [])

  // 当选择查看大学时，获取资源列表
  useEffect(() => {
    if (viewUniversity) {
      fetchResources()
    }
  }, [viewUniversity])

  const fetchUniversities = async () => {
    try {
      const response = await fetch('/api/universities')
      const result = await response.json()
      if (result.success) {
        setUniversities(result.data)
        if (result.data.length > 0) {
          setViewUniversity(result.data[0].id)
        }
      }
    } catch (error) {
      console.error('获取大学列表失败:', error)
    }
  }

  const fetchResources = async () => {
    if (!viewUniversity) return

    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(
        `/api/admin/books/${bookId}/resources?universityId=${viewUniversity}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const result = await response.json()
      if (result.success) {
        setResources(result.data)
      }
    } catch (error) {
      console.error('获取资源列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      const token = localStorage.getItem('authToken')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'book-resources')
      formData.append('isPublic', 'false') // 资源文件上传到私有 Bucket

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

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedUniversities.length === 0) {
      alert('请至少选择一个大学')
      return
    }

    if (!formData.fileUrl) {
      alert('请上传文件')
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/books/${bookId}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          universityIds: selectedUniversities, // 改为数组
          name: formData.name,
          description: formData.description || null,
          fileUrl: formData.fileUrl,
          fileType: formData.fileType,
          fileSize: formData.fileSize,
          allowReading: formData.allowReading, // 是否支持预览
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert(`成功为 ${selectedUniversities.length} 个大学创建资源`)
        setShowAddForm(false)
        setFormData({ name: '', description: '', fileUrl: '', fileType: '', fileSize: 0, allowReading: false })
        setSelectedUniversities([]) // 清空选择
        fetchResources()
      } else {
        alert(result.message || '添加失败')
      }
    } catch (error) {
      console.error('添加资源失败:', error)
      alert('添加资源失败')
    }
  }

  // 切换大学选择
  const toggleUniversity = (universityId: string) => {
    setSelectedUniversities((prev) =>
      prev.includes(universityId)
        ? prev.filter((id) => id !== universityId)
        : [...prev, universityId]
    )
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedUniversities.length === universities.length) {
      setSelectedUniversities([])
    } else {
      setSelectedUniversities(universities.map((uni) => uni.id))
    }
  }

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('确定要删除这个资源吗？')) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/books/${bookId}/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        alert('资源删除成功')
        fetchResources()
      } else {
        alert(result.message || '删除失败')
      }
    } catch (error) {
      console.error('删除资源失败:', error)
      alert('删除资源失败')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      // 获取签名 URL
      const response = await fetch('/api/oss/sign-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath: fileUrl }),
      })

      const result = await response.json()
      if (result.success) {
        // 使用签名 URL 下载文件
        window.open(result.data.url, '_blank')
      } else {
        alert('获取下载链接失败')
      }
    } catch (error) {
      console.error('下载失败:', error)
      alert('下载失败')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            管理资源 - {bookName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 查看资源的大学选择器 */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">查看大学资源：</label>
            <select
              value={viewUniversity}
              onChange={(e) => setViewUniversity(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {universities.map((uni) => (
                <option key={uni.id} value={uni.id}>
                  {uni.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showAddForm ? '取消添加' : '+ 添加资源'}
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 添加资源表单 */}
          {showAddForm && (
            <div className="mb-6 p-4 border rounded-lg bg-blue-50">
              <h3 className="text-lg font-medium mb-4">添加新资源</h3>
              <form onSubmit={handleAddResource} className="space-y-4">
                {/* 大学多选 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      选择大学 * （已选 {selectedUniversities.length} 个）
                    </label>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {selectedUniversities.length === universities.length ? '取消全选' : '全选'}
                    </button>
                  </div>
                  <div className="border rounded-lg p-3 bg-white max-h-40 overflow-y-auto">
                    {universities.length === 0 ? (
                      <p className="text-sm text-gray-500">暂无大学</p>
                    ) : (
                      <div className="space-y-2">
                        {universities.map((uni) => (
                          <label
                            key={uni.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedUniversities.includes(uni.id)}
                              onChange={() => toggleUniversity(uni.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{uni.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    资源名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：第一章课件"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    资源描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="资源的详细描述（可选）"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    上传文件 *
                  </label>
                  <FileUpload
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
                    onUpload={async (file) => {
                      const uploadedFile = await handleFileUpload(file)
                      setFormData({
                        ...formData,
                        fileUrl: uploadedFile.url,
                        fileType: uploadedFile.type,
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

                {/* 是否支持预览选项 */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowReading}
                      onChange={(e) => setFormData({ ...formData, allowReading: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      允许在线预览
                      <span className="text-gray-500 ml-1">（支持 PDF、图片等格式的在线查看）</span>
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    添加资源
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setFormData({ name: '', description: '', fileUrl: '', fileType: '', fileSize: 0, allowReading: false })
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 资源列表 */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : resources.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              该大学暂无资源，点击"添加资源"开始添加
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{resource.name}</h4>
                      {resource.description && (
                        <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>类型: {resource.fileType.toUpperCase()}</span>
                        <span>大小: {formatFileSize(resource.fileSize)}</span>
                        <span>
                          上传时间: {new Date(resource.createdAt).toLocaleDateString()}
                        </span>
                        <span className={resource.allowReading ? 'text-green-600' : 'text-gray-400'}>
                          {resource.allowReading ? '✓ 支持预览' : '✗ 不支持预览'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleDownload(resource.fileUrl, resource.name)}
                        className="px-3 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors text-sm"
                      >
                        下载
                      </button>
                      <button
                        onClick={() => handleDeleteResource(resource.id)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

