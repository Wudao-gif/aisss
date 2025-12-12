'use client'

/**
 * 管理后台 - 文件图标管理页面
 */

import { useState, useEffect } from 'react'
import FileUpload from '@/components/admin/FileUpload'

interface FileIcon {
  id: string
  name: string
  extensions: string
  iconUrl: string
  isDefault: boolean
  sortOrder: number
  createdAt: string
}

export default function FileIconsPage() {
  const [fileIcons, setFileIcons] = useState<FileIcon[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingIcon, setEditingIcon] = useState<FileIcon | null>(null)
  const [uploadingIcon, setUploadingIcon] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    extensions: '',
    iconUrl: '',
    isDefault: false,
    sortOrder: 0
  })

  // 加载文件图标列表
  const fetchFileIcons = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/file-icons', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        setFileIcons(result.data)
      } else {
        alert(result.message || '获取文件图标列表失败')
      }
    } catch (error) {
      console.error('获取文件图标列表失败:', error)
      alert('获取文件图标列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFileIcons()
  }, [])

  // 上传图标文件
  const handleIconUpload = async (file: File) => {
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('folder', 'file-icons')
    uploadFormData.append('isPublic', 'true') // 图标上传到公共 Bucket

    const token = localStorage.getItem('authToken')
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: uploadFormData,
    })

    const result = await response.json()
    if (result.success) {
      // 直接更新 formData 的 iconUrl
      setFormData(prev => ({ ...prev, iconUrl: result.data.url }))
    } else {
      throw new Error(result.message || '上传失败')
    }
  }

  // 添加文件图标
  const handleAddIcon = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.iconUrl) {
      alert('请上传图标文件')
      return
    }

    try {
      setUploadingIcon(true)
      const token = localStorage.getItem('authToken')

      const response = await fetch('/api/admin/file-icons', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          extensions: formData.extensions,
          iconUrl: formData.iconUrl,
          isDefault: formData.isDefault,
          sortOrder: formData.sortOrder
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert('文件图标添加成功')
        setShowAddModal(false)
        setFormData({ name: '', extensions: '', iconUrl: '', isDefault: false, sortOrder: 0 })
        fetchFileIcons()
      } else {
        alert(result.message || '添加失败')
      }
    } catch (error) {
      console.error('添加文件图标失败:', error)
      alert('添加文件图标失败')
    } finally {
      setUploadingIcon(false)
    }
  }

  // 打开编辑模态框
  const openEditModal = (icon: FileIcon) => {
    setEditingIcon(icon)
    setFormData({
      name: icon.name,
      extensions: icon.extensions,
      iconUrl: icon.iconUrl,
      isDefault: icon.isDefault,
      sortOrder: icon.sortOrder
    })
    setShowEditModal(true)
  }

  // 更新文件图标
  const handleUpdateIcon = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingIcon) return

    try {
      setUploadingIcon(true)
      const token = localStorage.getItem('authToken')

      const response = await fetch(`/api/admin/file-icons/${editingIcon.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          extensions: formData.extensions,
          iconUrl: formData.iconUrl,
          isDefault: formData.isDefault,
          sortOrder: formData.sortOrder
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert('文件图标更新成功')
        setShowEditModal(false)
        setEditingIcon(null)
        setFormData({ name: '', extensions: '', iconUrl: '', isDefault: false, sortOrder: 0 })
        fetchFileIcons()
      } else {
        alert(result.message || '更新失败')
      }
    } catch (error) {
      console.error('更新文件图标失败:', error)
      alert('更新文件图标失败')
    } finally {
      setUploadingIcon(false)
    }
  }

  // 删除文件图标
  const handleDeleteIcon = async (id: string, isDefault: boolean) => {
    if (isDefault) {
      alert('不能删除默认图标')
      return
    }

    if (!confirm('确定要删除这个文件图标吗？')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/file-icons/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        alert('文件图标删除成功')
        fetchFileIcons()
      } else {
        alert(result.message || '删除失败')
      }
    } catch (error) {
      console.error('删除文件图标失败:', error)
      alert('删除文件图标失败')
    }
  }

  return (
    <div className="space-y-6">
      {/* 顶部说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">📌 使用说明</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 文件图标用于在文件列表中显示不同类型文件的图标</li>
          <li>• 扩展名支持多个，用逗号分隔（如：doc,docx）</li>
          <li>• 必须设置一个默认图标，用于未匹配的文件类型</li>
          <li>• 排序顺序决定在筛选下拉菜单中的显示顺序</li>
        </ul>
      </div>

      {/* 操作栏 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            文件图标列表 ({fileIcons.length})
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + 添加图标
          </button>
        </div>
      </div>

      {/* 文件图标列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : fileIcons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    图标
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    支持的扩展名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    默认图标
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    排序
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
                {fileIcons.map((icon) => (
                  <tr key={icon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <img
                        src={icon.iconUrl}
                        alt={icon.name}
                        className="w-8 h-8 object-contain"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {icon.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {icon.extensions || '(空)'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {icon.isDefault ? (
                        <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs">
                          默认
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {icon.sortOrder}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(icon.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => openEditModal(icon)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteIcon(icon.id, icon.isDefault)}
                        className={`px-3 py-1 rounded transition-colors ${
                          icon.isDefault
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                        disabled={icon.isDefault}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">暂无文件图标</div>
        )}
      </div>

      {/* 添加图标模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">添加文件图标</h3>
            <form onSubmit={handleAddIcon} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图标名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：Word文档"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文件扩展名
                </label>
                <input
                  type="text"
                  value={formData.extensions}
                  onChange={(e) => setFormData({ ...formData, extensions: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：doc,docx（多个用逗号分隔，默认图标留空）"
                />
                <p className="text-xs text-gray-500 mt-1">
                  多个扩展名用逗号分隔，默认图标请留空
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  上传图标 *
                </label>
                <FileUpload
                  accept="image/*"
                  onUpload={handleIconUpload}
                />
                {formData.iconUrl && (
                  <div className="mt-2">
                    <img src={formData.iconUrl} alt="预览" className="w-16 h-16 object-contain border rounded" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序顺序
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
                  设为默认图标（用于未匹配的文件类型）
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={uploadingIcon}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {uploadingIcon ? '上传中...' : '添加'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setFormData({ name: '', extensions: '', iconUrl: '', isDefault: false, sortOrder: 0 })
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

      {/* 编辑图标模态框 */}
      {showEditModal && editingIcon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">编辑文件图标</h3>
            <form onSubmit={handleUpdateIcon} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  图标名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文件扩展名
                </label>
                <input
                  type="text"
                  value={formData.extensions}
                  onChange={(e) => setFormData({ ...formData, extensions: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：doc,docx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  当前图标
                </label>
                {formData.iconUrl && (
                  <img src={formData.iconUrl} alt="当前图标" className="w-16 h-16 object-contain border rounded mb-2" />
                )}
                <FileUpload
                  accept="image/*"
                  onUpload={handleIconUpload}
                />
                <p className="text-xs text-gray-500 mt-1">
                  上传新图标将替换当前图标
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序顺序
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isDefaultEdit"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isDefaultEdit" className="ml-2 text-sm text-gray-700">
                  设为默认图标
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={uploadingIcon}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {uploadingIcon ? '更新中...' : '更新'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingIcon(null)
                    setFormData({ name: '', extensions: '', iconUrl: '', isDefault: false, sortOrder: 0 })
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
