'use client'

/**
 * 文档模板管理页面
 */

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'

interface DocTemplate {
  id: string
  name: string
  type: string
  category: string
  description?: string
  fileUrl: string
  fileSize: number
  iconUrl?: string
  university?: string
  isEnabled: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export default function TemplatesPage() {
  const { user } = useAuthStore()
  const [templates, setTemplates] = useState<DocTemplate[]>([])
  const [blankTemplates, setBlankTemplates] = useState<DocTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditBlankModal, setShowEditBlankModal] = useState(false)
  const [showCreateBlankModal, setShowCreateBlankModal] = useState(false)
  const [creatingBlankType, setCreatingBlankType] = useState<string>('')
  const [editingBlankTemplate, setEditingBlankTemplate] = useState<DocTemplate | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // 加载模板列表
  const loadTemplates = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      if (!token) return

      const params = new URLSearchParams()
      if (filterType !== 'all') params.append('type', filterType)
      if (filterCategory !== 'all') params.append('category', filterCategory)

      const response = await fetch(`/api/admin/templates?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        // 分离空白模板和普通模板
        const blank = data.data.filter((t: DocTemplate) => t.category === '空白模板')
        const normal = data.data.filter((t: DocTemplate) => t.category !== '空白模板')

        setBlankTemplates(blank)
        setTemplates(normal)
      }
    } catch (error) {
      console.error('加载模板列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [filterType, filterCategory])

  // 切换启用状态
  const toggleEnabled = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`/api/admin/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isEnabled: !currentStatus })
      })

      const data = await response.json()
      if (data.success) {
        loadTemplates()
      }
    } catch (error) {
      console.error('更新模板状态失败:', error)
    }
  }

  // 设置为默认模板
  const setAsDefault = async (id: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`/api/admin/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isDefault: true })
      })

      const data = await response.json()
      if (data.success) {
        loadTemplates()
      }
    } catch (error) {
      console.error('设置默认模板失败:', error)
    }
  }

  // 删除模板
  const deleteTemplate = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return

    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`/api/admin/templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        loadTemplates()
      }
    } catch (error) {
      console.error('删除模板失败:', error)
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  // 类型映射
  const typeMap: Record<string, string> = {
    word: 'Word 文档',
    excel: 'Excel 表格',
    ppt: 'PPT 演示'
  }

  return (
    <div className="space-y-6">
      {/* 空白模板管理区域 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">空白模板管理</h2>
        <p className="text-sm text-gray-600 mb-6">
          管理全局空白模板，每种类型只能有一个。这些模板的可见性由各大学的空白模板开关控制。
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['word', 'excel', 'ppt'].map((type) => {
              const template = blankTemplates.find(t => t.type === type)
              const typeLabel = type === 'word' ? 'Word' : type === 'excel' ? 'Excel' : 'PPT'
              const typeIcon = type === 'word' ? '📝' : type === 'excel' ? '📊' : '📽️'

              return (
                <div key={type} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    {template?.iconUrl ? (
                      <img src={template.iconUrl} alt={typeLabel} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <span className="text-3xl">{typeIcon}</span>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{typeLabel} 空白模板</h3>
                      {template && (
                        <p className="text-xs text-gray-500">{formatFileSize(template.fileSize)}</p>
                      )}
                    </div>
                  </div>

                  {template ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded ${template.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {template.isEnabled ? '已启用' : '已禁用'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingBlankTemplate(template)
                            setShowEditBlankModal(true)
                          }}
                          className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => toggleEnabled(template.id, template.isEnabled)}
                          className="flex-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                        >
                          {template.isEnabled ? '禁用' : '启用'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setCreatingBlankType(type)
                        setShowCreateBlankModal(true)
                      }}
                      className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      + 创建模板
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 文档模板管理区域 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">文档模板管理</h2>
            <p className="text-sm text-gray-600 mt-1">
              管理各类文档模板，可以绑定特定大学或设为全局模板
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 新建模板
          </button>
        </div>

        {/* 筛选器 */}
        <div className="flex items-center gap-4 mb-6">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有类型</option>
            <option value="word">Word 文档</option>
            <option value="excel">Excel 表格</option>
            <option value="ppt">PPT 演示</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有场景</option>
            <option value="实验报告">实验报告</option>
            <option value="课程论文">课程论文</option>
            <option value="商业计划书">商业计划书</option>
            <option value="学习笔记">学习笔记</option>
            <option value="其他">其他</option>
          </select>
        </div>

        {/* 模板列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">暂无文档模板</p>
            <p className="text-gray-400 text-sm mt-2">点击"新建模板"开始添加</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  模板名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  使用场景
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  大学
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  文件大小
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {template.iconUrl ? (
                        <img
                          src={template.iconUrl}
                          alt={template.name}
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <span className="text-2xl flex-shrink-0">
                          {template.type === 'word' ? '📝' : template.type === 'excel' ? '📊' : template.type === 'ppt' ? '📽️' : '📄'}
                        </span>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {template.name}
                          {template.isDefault && (
                            <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                              默认
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <div className="text-sm text-gray-500">{template.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{typeMap[template.type] || template.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{template.category}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{template.university || '全部'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{formatFileSize(template.fileSize)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleEnabled(template.id, template.isEnabled)}
                      className={`px-3 py-1 text-xs rounded-full ${
                        template.isEnabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {template.isEnabled ? '已启用' : '已停用'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {!template.isDefault && (
                      <button
                        onClick={() => setAsDefault(template.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        设为默认
                      </button>
                    )}
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* 新建模板对话框 */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadTemplates()
          }}
        />
      )}

      {/* 创建空白模板对话框 */}
      {showCreateBlankModal && (
        <CreateBlankTemplateModal
          type={creatingBlankType}
          onClose={() => {
            setShowCreateBlankModal(false)
            setCreatingBlankType('')
          }}
          onSuccess={() => {
            setShowCreateBlankModal(false)
            setCreatingBlankType('')
            loadTemplates()
          }}
        />
      )}

      {/* 编辑空白模板对话框 */}
      {showEditBlankModal && editingBlankTemplate && (
        <EditBlankTemplateModal
          template={editingBlankTemplate}
          onClose={() => {
            setShowEditBlankModal(false)
            setEditingBlankTemplate(null)
          }}
          onSuccess={() => {
            setShowEditBlankModal(false)
            setEditingBlankTemplate(null)
            loadTemplates()
          }}
        />
      )}
    </div>
  )
}

// 新建模板对话框组件
function CreateTemplateModal({
  onClose,
  onSuccess
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'word',
    category: '实验报告',
    description: '',
    university: '',
    isEnabled: true,
    isDefault: false
  })
  const [file, setFile] = useState<File | null>(null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      alert('请选择文件')
      return
    }

    try {
      setUploading(true)
      const token = localStorage.getItem('authToken')
      if (!token) return

      // 1. 上传文件到 OSS
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'templates')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      })

      const uploadData = await uploadResponse.json()
      console.log('📤 上传响应:', uploadData)
      console.log('📤 上传数据详情:', {
        hasData: !!uploadData.data,
        url: uploadData.data?.url,
        size: uploadData.data?.size,
        type: uploadData.data?.type,
        name: uploadData.data?.name
      })

      if (!uploadData.success) {
        throw new Error(uploadData.message || '文件上传失败')
      }

      // 验证上传数据
      if (!uploadData.data) {
        console.error('❌ 上传数据为空:', uploadData)
        throw new Error('上传数据为空')
      }

      if (!uploadData.data.url) {
        console.error('❌ 缺少文件URL:', uploadData.data)
        throw new Error('缺少文件URL')
      }

      if (!uploadData.data.size && uploadData.data.size !== 0) {
        console.error('❌ 缺少文件大小:', uploadData.data)
        throw new Error('缺少文件大小')
      }

      // 2. 上传图标（如果有）
      let iconUrl = null
      if (iconFile) {
        console.log('📤 [上传图标] 开始上传图标文件:', iconFile.name)
        const iconFormData = new FormData()
        iconFormData.append('file', iconFile)
        iconFormData.append('folder', 'icons')
        iconFormData.append('isPublic', 'true')

        const iconResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: iconFormData
        })

        const iconData = await iconResponse.json()
        console.log('📤 [上传图标] 上传响应:', iconData)
        if (iconData.success) {
          iconUrl = iconData.data.url
          console.log('✅ [上传图标] 图标URL:', iconUrl)
        } else {
          console.error('❌ [上传图标] 上传失败:', iconData.message)
        }
      } else {
        console.log('⚠️ [上传图标] 未选择图标文件')
      }

      // 3. 创建模板记录
      const requestBody = {
        name: formData.name,
        type: formData.type,
        category: formData.category,
        description: formData.description,
        fileUrl: uploadData.data.url,
        fileSize: uploadData.data.size,
        iconUrl: iconUrl,
        university: formData.university || null,
        isEnabled: formData.isEnabled,
        isDefault: formData.isDefault
      }

      console.log('📝 创建模板请求:', requestBody)

      const createResponse = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      })

      const createData = await createResponse.json()
      console.log('✅ 创建模板响应:', createData)

      if (createData.success) {
        alert('模板创建成功')
        onSuccess()
      } else {
        console.error('❌ 创建模板失败:', createData)
        throw new Error(createData.message || '创建模板失败')
      }
    } catch (error) {
      console.error('❌ 创建模板失败:', error)
      alert(error instanceof Error ? error.message : '创建模板失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">新建模板</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模板名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模板类型 *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="word">Word 文档</option>
                <option value="excel">Excel 表格</option>
                <option value="ppt">PPT 演示</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                使用场景 *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="实验报告">实验报告</option>
                <option value="课程论文">课程论文</option>
                <option value="商业计划书">商业计划书</option>
                <option value="学习笔记">学习笔记</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模板描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              绑定大学（留空表示所有大学可用）
            </label>
            <input
              type="text"
              value={formData.university}
              onChange={(e) => setFormData({ ...formData, university: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如：四川大学"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上传文件 *
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".docx,.xlsx,.pptx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              支持格式：.docx, .xlsx, .pptx
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模板图标（可选）
            </label>
            <input
              type="file"
              onChange={(e) => setIconFile(e.target.files?.[0] || null)}
              accept="image/*"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              支持 PNG、JPG、SVG 等图片格式，建议尺寸 64x64px
            </p>
            {iconFile && (
              <div className="mt-2">
                <img
                  src={URL.createObjectURL(iconFile)}
                  alt="图标预览"
                  className="w-16 h-16 rounded object-cover border"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isEnabled}
                onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">启用模板</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">设为默认模板</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={uploading}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? '创建中...' : '创建模板'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 编辑空白模板对话框组件
function EditBlankTemplateModal({
  template,
  onClose,
  onSuccess
}: {
  template: DocTemplate
  onClose: () => void
  onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setUploading(true)
      const token = localStorage.getItem('authToken')
      if (!token) return

      let fileUrl = template.fileUrl
      let fileSize = template.fileSize
      let iconUrl = template.iconUrl

      // 1. 如果有新文件，上传文件
      if (file) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('folder', 'templates')

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

        fileUrl = uploadData.data.url
        fileSize = uploadData.data.size
      }

      // 2. 如果有新图标，上传图标
      if (iconFile) {
        const iconFormData = new FormData()
        iconFormData.append('file', iconFile)
        iconFormData.append('folder', 'icons')
        iconFormData.append('isPublic', 'true')

        const iconResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: iconFormData
        })

        const iconData = await iconResponse.json()
        if (iconData.success) {
          iconUrl = iconData.data.url
        }
      }

      // 3. 更新模板
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileUrl,
          fileSize,
          iconUrl
        })
      })

      const data = await response.json()
      if (data.success) {
        alert('更新成功')
        onSuccess()
      } else {
        throw new Error(data.message || '更新失败')
      }
    } catch (error) {
      console.error('更新空白模板失败:', error)
      alert(error instanceof Error ? error.message : '更新失败')
    } finally {
      setUploading(false)
    }
  }

  const typeLabel = template.type === 'word' ? 'Word' : template.type === 'excel' ? 'Excel' : template.type === 'ppt' ? 'PPT' : '其他'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6">编辑 {typeLabel} 空白模板</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              当前模板文件
            </label>
            <div className="text-sm text-gray-600 mb-2">
              {template.name} ({(template.fileSize / 1024).toFixed(2)} KB)
            </div>
            <label className="block">
              <span className="sr-only">选择新文件</span>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模板图标
            </label>
            {template.iconUrl && (
              <div className="mb-2">
                <img src={template.iconUrl} alt="当前图标" className="w-16 h-16 rounded object-cover" />
              </div>
            )}
            <label className="block">
              <span className="sr-only">选择新图标</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setIconFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={uploading}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? '更新中...' : '保存更改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 创建空白模板对话框组件
function CreateBlankTemplateModal({
  type,
  onClose,
  onSuccess
}: {
  type: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const typeLabel = type === 'word' ? 'Word' : type === 'excel' ? 'Excel' : type === 'ppt' ? 'PPT' : '其他'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      alert('请选择模板文件')
      return
    }

    try {
      setUploading(true)
      const token = localStorage.getItem('authToken')
      if (!token) return

      // 1. 上传文件
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'templates')

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

      // 2. 上传图标（如果有）
      let iconUrl = null
      if (iconFile) {
        const iconFormData = new FormData()
        iconFormData.append('file', iconFile)
        iconFormData.append('folder', 'icons')
        iconFormData.append('isPublic', 'true')

        const iconResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: iconFormData
        })

        const iconData = await iconResponse.json()
        if (iconData.success) {
          iconUrl = iconData.data.url
        }
      }

      // 3. 创建模板
      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `空白${typeLabel}`,
          type: type,
          category: '空白模板',
          description: `${typeLabel}空白模板`,
          fileUrl: uploadData.data.url,
          fileSize: uploadData.data.size,
          iconUrl: iconUrl,
          university: null,  // 空白模板不绑定大学
          isEnabled: true,
          isDefault: false
        })
      })

      const data = await response.json()
      if (data.success) {
        alert('创建成功')
        onSuccess()
      } else {
        throw new Error(data.message || '创建失败')
      }
    } catch (error) {
      console.error('创建空白模板失败:', error)
      alert(error instanceof Error ? error.message : '创建失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6">创建 {typeLabel} 空白模板</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模板文件 *
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模板图标
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setIconFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={uploading}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? '创建中...' : '创建模板'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

