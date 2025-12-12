'use client'

/**
 * 管理后台 - 应用图标管理页面
 * 用于上传和管理应用中使用的各种图标资源
 */

import { useState, useEffect } from 'react'

interface IconResource {
  id: string
  name: string
  category: string
  iconUrl: string
  createdAt: string
}

export default function IconsManagePage() {
  const [icons, setIcons] = useState<IconResource[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    category: 'university',
    file: null as File | null,
  })

  // 图标分类
  const categories = [
    { value: 'university', label: '大学图标' },
    { value: 'filetype', label: '文件类型图标' },
    { value: 'other', label: '其他图标' },
  ]

  // 加载图标列表
  const loadIcons = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch('/api/admin/icons', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setIcons(data.data)
      }
    } catch (error) {
      console.error('加载图标列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIcons()
  }, [])

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, file })
    }
  }

  // 上传图标
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.file || !formData.name) {
      alert('请填写完整信息')
      return
    }

    try {
      setUploading(true)
      const token = localStorage.getItem('authToken')
      if (!token) return

      // 1. 上传文件到 OSS（公共 Bucket）
      const uploadFormData = new FormData()
      uploadFormData.append('file', formData.file)
      uploadFormData.append('folder', 'icons')
      uploadFormData.append('isPublic', 'true')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      })

      const uploadData = await uploadResponse.json()
      if (!uploadData.success) {
        throw new Error(uploadData.message || '文件上传失败')
      }

      // 2. 保存图标信息到数据库
      const saveResponse = await fetch('/api/admin/icons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          iconUrl: uploadData.data.url
        })
      })

      const saveData = await saveResponse.json()
      if (saveData.success) {
        alert('图标上传成功！')
        setShowUploadModal(false)
        setFormData({ name: '', category: 'university', file: null })
        loadIcons()
      } else {
        throw new Error(saveData.message || '保存失败')
      }
    } catch (error) {
      console.error('上传失败:', error)
      alert(error instanceof Error ? error.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  // 删除图标
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个图标吗？')) return

    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`/api/admin/icons/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        alert('删除成功！')
        loadIcons()
      }
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败')
    }
  }

  // 过滤图标
  const filteredIcons = categoryFilter === 'all'
    ? icons
    : icons.filter(icon => icon.category === categoryFilter)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 头部 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">应用图标管理</h1>
          <p className="text-gray-600 mt-1">管理应用中使用的各种图标资源</p>
        </div>

        {/* 操作栏 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            {/* 分类筛选 */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">分类筛选：</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* 上传按钮 */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ➕ 上传图标
            </button>
          </div>
        </div>

        {/* 图标列表 */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : filteredIcons.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500">暂无图标</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredIcons.map((icon) => (
              <div
                key={icon.id}
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  <img
                    src={icon.iconUrl}
                    alt={icon.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-sm font-medium text-gray-900 truncate mb-1">{icon.name}</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {categories.find(c => c.value === icon.category)?.label}
                </p>
                <button
                  onClick={() => handleDelete(icon.id)}
                  className="w-full px-3 py-1.5 text-xs text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 上传模态框 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">上传图标</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图标名称 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：北京大学"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类 *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图标文件 *
                </label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  支持 PNG、JPG、SVG 等图片格式，建议尺寸 256x256px
                </p>
              </div>

              {formData.file && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    预览
                  </label>
                  <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={URL.createObjectURL(formData.file)}
                      alt="预览"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uploading ? '上传中...' : '上传'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    setFormData({ name: '', category: 'university', file: null })
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
    </div>
  )
}

