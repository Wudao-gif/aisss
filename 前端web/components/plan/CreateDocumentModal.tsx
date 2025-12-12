'use client'

/**
 * 新建文档下拉菜单组件
 */

import { useState, useEffect, useRef } from 'react'

interface DocTemplate {
  id: string
  name: string
  type: string
  category: string
  description?: string
  fileUrl: string
  fileSize: number
  iconUrl?: string
  isDefault: boolean
}

interface CreateDocumentModalProps {
  planId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateDocumentModal({
  planId,
  open,
  onClose,
  onSuccess
}: CreateDocumentModalProps) {
  const [templates, setTemplates] = useState<DocTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // 加载所有模板
  useEffect(() => {
    if (open) {
      loadAllTemplates()
    }
  }, [open])

  // 空白文档类型选项
  const blankDocumentTypes = [
    { value: 'word', label: '文字', icon: '📝', ext: '.docx' },
    { value: 'excel', label: '表格', icon: '📊', ext: '.xlsx' },
    { value: 'ppt', label: '演示', icon: '📽️', ext: '.pptx' }
  ]

  // 加载所有模板
  const loadAllTemplates = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch('/api/templates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        console.log('📋 [CreateDocumentModal] 加载的模板数据:', data.data)
        console.log('📋 [CreateDocumentModal] 模板图标URLs:', data.data.map((t: any) => ({ name: t.name, iconUrl: t.iconUrl })))
        setTemplates(data.data)
      }
    } catch (error) {
      console.error('加载模板列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 创建文档（通过模板ID）
  const handleCreateFromTemplate = async (templateId: string, docType: string, ext: string) => {
    try {
      setCreating(true)
      const token = localStorage.getItem('authToken')
      if (!token) return

      // 生成默认文件名
      const timestamp = new Date().toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(/\//g, '-').replace(/:/g, '-').replace(/\s/g, '_')
      const fileName = `新建${docType}_${timestamp}${ext}`

      const response = await fetch(`/api/plans/${planId}/files/create-from-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateId,
          fileName
        })
      })

      const data = await response.json()
      if (data.success) {
        // 关闭弹窗
        handleClose()
        // 刷新文件列表
        onSuccess()
        // 在新标签页打开文件
        const fileId = data.data.id
        window.open(`/plan/${planId}/file/${fileId}`, '_blank')
      } else {
        throw new Error(data.message || '创建文档失败')
      }
    } catch (error) {
      console.error('创建文档失败:', error)
      alert(error instanceof Error ? error.message : '创建文档失败')
    } finally {
      setCreating(false)
    }
  }

  // 关闭菜单
  const handleClose = () => {
    setTemplates([])
    setCreating(false)
    onClose()
  }

  if (!open) return null

  // 分离空白模板和普通模板
  const blankTemplates = templates.filter(t => t.category === '空白模板')
  const regularTemplates = templates.filter(t => t.category !== '空白模板')

  console.log('📋 [CreateDocumentModal] 空白模板列表:', blankTemplates)
  console.log('📋 [CreateDocumentModal] 空白模板类型:', blankTemplates.map(t => ({ name: t.name, type: t.type, category: t.category })))

  return (
    <div
      ref={menuRef}
      className="absolute right-full top-0 mr-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 w-80"
      style={{ maxHeight: '70vh', overflowY: 'auto' }}
    >
      <div className="p-3">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b">
          <h3 className="text-base font-semibold text-gray-900">新建</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37322F] mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">加载中...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Office 文档区域 */}
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-2 px-1">Office 文档</div>
              <div className="grid grid-cols-4 gap-2">
                {blankDocumentTypes.map((type) => {
                  // 查找对应的空白模板
                  const template = blankTemplates.find(t => t.type === type.value)

                  console.log(`🔍 [匹配] 查找 ${type.label} (${type.value}) 模板:`, template ? `找到 - ${template.name}` : '未找到')

                  return (
                    <button
                      key={type.value}
                      onClick={() => {
                        if (template) {
                          handleCreateFromTemplate(template.id, type.label, type.ext)
                        } else {
                          alert(`暂无${type.label}空白模板，请在后台上传`)
                        }
                      }}
                      disabled={!template || creating}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                        template && !creating
                          ? 'hover:bg-gray-100 cursor-pointer'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {template?.iconUrl ? (
                        <img
                          src={template.iconUrl}
                          alt={type.label}
                          className="w-8 h-8 object-cover rounded"
                        />
                      ) : (
                        <span className="text-2xl">{type.icon}</span>
                      )}
                      <span className="text-xs font-medium text-gray-900">{type.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 模板文档区域 */}
            {regularTemplates.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2 px-1 pt-2 border-t">模板文档</div>
                <div className="space-y-1">
                  {regularTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        const typeInfo = blankDocumentTypes.find(t => t.value === template.type)
                        handleCreateFromTemplate(template.id, template.name, typeInfo?.ext || '.docx')
                      }}
                      disabled={creating}
                      className="w-full flex items-start gap-2 p-2.5 rounded-lg hover:bg-gray-100 transition-colors text-left disabled:opacity-50"
                    >
                      {template.iconUrl ? (
                        <img
                          src={template.iconUrl}
                          alt={template.name}
                          className="w-6 h-6 object-cover rounded flex-shrink-0 mt-0.5"
                        />
                      ) : (
                        <span className="text-lg mt-0.5">
                          {template.type === 'word' ? '📝' : template.type === 'ppt' ? '📽️' : '📊'}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{template.name}</span>
                          {template.isDefault && (
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded flex-shrink-0">
                              推荐
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{template.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">{template.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

