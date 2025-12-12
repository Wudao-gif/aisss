'use client'

/**
 * 管理后台 - 大学管理页面
 */

import { useState, useEffect } from 'react'

interface University {
  id: string
  name: string
  logoUrl: string | null
  enableWordBlank: boolean
  enableExcelBlank: boolean
  enablePptBlank: boolean
  createdAt: string
  userCount: number
  _count: {
    books: number
  }
}

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    logoFile: null as File | null,
    enableWordBlank: true,
    enableExcelBlank: true,
    enablePptBlank: true,
  })

  const fetchUniversities = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams()
      if (search) params.append('search', search)

      const response = await fetch(`/api/admin/universities?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        setUniversities(result.data)
      } else {
        alert(result.message || '获取大学列表失败')
      }
    } catch (error) {
      console.error('获取大学列表失败:', error)
      alert('获取大学列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUniversities()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUniversities()
  }

  // 处理 Logo 文件上传
  const handleLogoUpload = async (file: File): Promise<string> => {
    const token = localStorage.getItem('authToken')
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('folder', 'icons')
    uploadFormData.append('isPublic', 'true')

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: uploadFormData
    })

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.message || '上传失败')
    }

    return data.data.url
  }

  const handleAddUniversity = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setUploadingLogo(true)
      const token = localStorage.getItem('authToken')

      // 如果有上传的 Logo 文件，先上传
      let logoUrl = formData.logoUrl
      if (formData.logoFile) {
        logoUrl = await handleLogoUpload(formData.logoFile)
      }

      const response = await fetch('/api/admin/universities', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          logoUrl: logoUrl || null
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert('大学添加成功')
        setShowAddModal(false)
        setFormData({ name: '', logoUrl: '', logoFile: null, enableWordBlank: true, enableExcelBlank: true, enablePptBlank: true })
        fetchUniversities()
      } else {
        alert(result.message || '添加失败')
      }
    } catch (error) {
      console.error('添加大学失败:', error)
      alert(error instanceof Error ? error.message : '添加大学失败')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleEditUniversity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUniversity) return

    try {
      setUploadingLogo(true)
      const token = localStorage.getItem('authToken')

      // 如果有上传的 Logo 文件，先上传
      let logoUrl = formData.logoUrl
      if (formData.logoFile) {
        logoUrl = await handleLogoUpload(formData.logoFile)
      }

      const response = await fetch(`/api/admin/universities/${editingUniversity.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          logoUrl: logoUrl || null,
          enableWordBlank: formData.enableWordBlank,
          enableExcelBlank: formData.enableExcelBlank,
          enablePptBlank: formData.enablePptBlank,
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert('大学更新成功')
        setEditingUniversity(null)
        setFormData({
          name: '',
          logoUrl: '',
          logoFile: null,
          enableWordBlank: true,
          enableExcelBlank: true,
          enablePptBlank: true,
        })
        fetchUniversities()
      } else {
        alert(result.message || '更新失败')
      }
    } catch (error) {
      console.error('更新大学失败:', error)
      alert(error instanceof Error ? error.message : '更新大学失败')
    } finally {
      setUploadingLogo(false)
    }
  }

  const openEditModal = (university: University) => {
    setEditingUniversity(university)
    setFormData({
      name: university.name,
      logoUrl: university.logoUrl || '',
      logoFile: null,
      enableWordBlank: university.enableWordBlank,
      enableExcelBlank: university.enableExcelBlank,
      enablePptBlank: university.enablePptBlank,
    })
  }

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索大学名称..."
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
            + 添加大学
          </button>
        </form>
      </div>

      {/* 大学列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : universities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Logo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    大学名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    绑定用户数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    图书数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {universities.map((university) => (
                  <tr key={university.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {university.logoUrl ? (
                        <img
                          src={university.logoUrl}
                          alt={university.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400">
                          🏫
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {university.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {university.userCount} 人
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {university._count.books} 本
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(university.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => openEditModal(university)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">暂无大学</div>
        )}
      </div>

      {/* 添加大学模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">添加大学</h3>
            <form onSubmit={handleAddUniversity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  大学名称 *
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
                  Logo 图标（可选）
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setFormData({ ...formData, logoFile: file, logoUrl: '' })
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  支持 PNG、JPG、SVG 等图片格式，建议尺寸 256x256px
                </p>
                {formData.logoFile && (
                  <div className="mt-2">
                    <img
                      src={URL.createObjectURL(formData.logoFile)}
                      alt="Logo 预览"
                      className="w-20 h-20 rounded object-cover border"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={uploadingLogo}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uploadingLogo ? '上传中...' : '添加'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setFormData({ name: '', logoUrl: '', logoFile: null, enableWordBlank: true, enableExcelBlank: true, enablePptBlank: true })
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

      {/* 编辑大学模态框 */}
      {editingUniversity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">编辑大学</h3>
            <form onSubmit={handleEditUniversity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  大学名称 *
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
                  Logo 图标（可选）
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setFormData({ ...formData, logoFile: file, logoUrl: '' })
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  支持 PNG、JPG、SVG 等图片格式，建议尺寸 256x256px
                </p>
              </div>
              {(formData.logoFile || formData.logoUrl) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo 预览
                  </label>
                  <img
                    src={formData.logoFile ? URL.createObjectURL(formData.logoFile) : formData.logoUrl}
                    alt="Logo 预览"
                    className="w-20 h-20 rounded object-cover border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}

              {/* 空白模板开关 */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  空白模板设置
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  控制该大学的学生是否可以使用各类型的空白模板创建文档
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.enableWordBlank}
                      onChange={(e) => setFormData({ ...formData, enableWordBlank: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">启用 Word 空白模板</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.enableExcelBlank}
                      onChange={(e) => setFormData({ ...formData, enableExcelBlank: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">启用 Excel 空白模板</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.enablePptBlank}
                      onChange={(e) => setFormData({ ...formData, enablePptBlank: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">启用 PPT 空白模板</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={uploadingLogo}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {uploadingLogo ? '上传中...' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingUniversity(null)
                    setFormData({
                      name: '',
                      logoUrl: '',
                      logoFile: null,
                      enableWordBlank: true,
                      enableExcelBlank: true,
                      enablePptBlank: true,
                    })
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

