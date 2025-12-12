'use client'

/**
 * 管理后台 - AI模型配置页面（供应商 + 模型两级管理）
 * 使用 @lobehub/icons 显示供应商图标和模型头像
 */

import { useState, useEffect, useRef } from 'react'
import { ProviderIcon, ModelIcon } from '@lobehub/icons'

// Lobe Icons 支持的供应商列表
const LOBE_PROVIDERS = [
  { code: 'openai', name: 'OpenAI' },
  { code: 'anthropic', name: 'Anthropic' },
  { code: 'google', name: 'Google' },
  { code: 'xai', name: 'xAI' },
  { code: 'deepseek', name: 'DeepSeek' },
  { code: 'qwen', name: '通义千问' },
  { code: 'zhipu', name: '智谱 AI' },
  { code: 'moonshot', name: 'Moonshot' },
  { code: 'baichuan', name: '百川' },
  { code: 'minimax', name: 'MiniMax' },
  { code: 'mistral', name: 'Mistral' },
  { code: 'cohere', name: 'Cohere' },
  { code: 'groq', name: 'Groq' },
  { code: 'perplexity', name: 'Perplexity' },
  { code: 'ollama', name: 'Ollama' },
  { code: 'azure', name: 'Azure' },
  { code: 'bedrock', name: 'AWS Bedrock' },
  { code: 'huggingface', name: 'Hugging Face' },
  { code: 'openrouter', name: 'OpenRouter' },
  { code: 'togetherai', name: 'Together AI' },
  { code: 'fireworksai', name: 'Fireworks AI' },
  { code: 'siliconcloud', name: 'SiliconCloud' },
  { code: 'stepfun', name: '阶跃星辰' },
  { code: 'spark', name: '讯飞星火' },
  { code: 'hunyuan', name: '腾讯混元' },
  { code: 'doubao', name: '豆包' },
  { code: 'wenxin', name: '文心一言' },
]

interface AIModel {
  id: string
  name: string
  modelId: string
  description: string | null
  isEnabled: boolean
  isDefault: boolean
  providerId: string
}

interface AIProvider {
  id: string
  name: string
  code: string
  icon: string | null
  description: string | null
  isEnabled: boolean
  models: AIModel[]
}

export default function ModelsPage() {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'providers' | 'models'>('providers')

  // 供应商表单
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null)
  const [providerForm, setProviderForm] = useState({ name: '', code: '', icon: '', description: '' })
  const [showProviderSelector, setShowProviderSelector] = useState(false) // 供应商选择器下拉
  
  // 模型表单
  const [showModelModal, setShowModelModal] = useState(false)
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)
  const [modelForm, setModelForm] = useState({ name: '', modelId: '', providerId: '', description: '', isDefault: false })

  const fetchProviders = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/providers', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (result.success) {
        setProviders(result.data)
      }
    } catch (error) {
      console.error('获取供应商列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProviders()
  }, [])

  // 选择 Lobe Icons 供应商
  const handleSelectLobeProvider = (lobeProvider: typeof LOBE_PROVIDERS[0]) => {
    setProviderForm({
      ...providerForm,
      code: lobeProvider.code,
      name: lobeProvider.name,
      icon: lobeProvider.code, // 存储 code 作为图标标识
    })
    setShowProviderSelector(false)
  }

  // 供应商操作
  const handleProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('authToken')
      const url = editingProvider ? `/api/admin/providers/${editingProvider.id}` : '/api/admin/providers'
      const method = editingProvider ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(providerForm),
      })

      const result = await response.json()
      if (result.success) {
        alert(editingProvider ? '供应商更新成功' : '供应商添加成功')
        setShowProviderModal(false)
        setEditingProvider(null)
        setProviderForm({ name: '', code: '', icon: '', description: '' })
        fetchProviders()
      } else {
        alert(result.message || '操作失败')
      }
    } catch (error) {
      console.error('操作失败:', error)
      alert('操作失败')
    }
  }

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('确定要删除这个供应商吗？')) return
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/providers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (result.success) {
        alert('删除成功')
        fetchProviders()
      } else {
        alert(result.message || '删除失败')
      }
    } catch (error) {
      alert('删除失败')
    }
  }

  // 模型操作
  const handleModelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('authToken')
      const url = editingModel ? `/api/admin/models/${editingModel.id}` : '/api/admin/models'
      const method = editingModel ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(modelForm),
      })

      const result = await response.json()
      if (result.success) {
        alert(editingModel ? '模型更新成功' : '模型添加成功')
        setShowModelModal(false)
        setEditingModel(null)
        setModelForm({ name: '', modelId: '', providerId: '', description: '', isDefault: false })
        fetchProviders()
      } else {
        alert(result.message || '操作失败')
      }
    } catch (error) {
      alert('操作失败')
    }
  }

  const handleDeleteModel = async (id: string) => {
    if (!confirm('确定要删除这个模型吗？')) return
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/models/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (result.success) {
        alert('删除成功')
        fetchProviders()
      } else {
        alert(result.message || '删除失败')
      }
    } catch (error) {
      alert('删除失败')
    }
  }

  const allModels = providers.flatMap(p => p.models.map(m => ({ ...m, providerName: p.name })))

  return (
    <div className="space-y-6">
      {/* Tab 切换 */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'providers' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            供应商管理
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'models' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            模型管理
          </button>
        </div>
        <button
          onClick={() => {
            if (activeTab === 'providers') {
              setEditingProvider(null)
              setProviderForm({ name: '', code: '', icon: '', description: '' })
              setShowProviderModal(true)
            } else {
              setEditingModel(null)
              setModelForm({ name: '', modelId: '', providerId: providers[0]?.id || '', description: '', isDefault: false })
              setShowModelModal(true)
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + {activeTab === 'providers' ? '添加供应商' : '添加模型'}
        </button>
      </div>

      {/* 供应商列表 */}
      {activeTab === 'providers' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : providers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无供应商，请添加</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">图标</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">代码</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模型数量</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {providers.map((provider) => (
                  <tr key={provider.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {/* 使用 Lobe Icons ProviderIcon 组件 */}
                      <ProviderIcon provider={provider.code || provider.icon || 'openai'} size={32} type="avatar" />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{provider.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono">{provider.code}</td>
                    <td className="px-6 py-4 text-gray-500">{provider.models.length} 个</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${provider.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {provider.isEnabled ? '已启用' : '已禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => {
                          setEditingProvider(provider)
                          setProviderForm({ name: provider.name, code: provider.code, icon: provider.icon || '', description: provider.description || '' })
                          setShowProviderModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >编辑</button>
                      <button onClick={() => handleDeleteProvider(provider.id)} className="text-red-600 hover:text-red-800">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 模型列表 */}
      {activeTab === 'models' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : providers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">请先添加供应商</div>
          ) : allModels.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无模型，请添加</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模型名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模型ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">默认</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allModels.map((model) => (
                  <tr key={model.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-500">{model.providerName}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{model.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-sm">{model.modelId}</td>
                    <td className="px-6 py-4">
                      {model.isDefault && <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">默认</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${model.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {model.isEnabled ? '已启用' : '已禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => {
                          setEditingModel(model)
                          setModelForm({ name: model.name, modelId: model.modelId, providerId: model.providerId, description: model.description || '', isDefault: model.isDefault })
                          setShowModelModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >编辑</button>
                      <button onClick={() => handleDeleteModel(model.id)} className="text-red-600 hover:text-red-800">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 供应商弹窗 */}
      {showProviderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium mb-4">{editingProvider ? '编辑供应商' : '添加供应商'}</h3>
            <form onSubmit={handleProviderSubmit} className="space-y-4">
              {/* 供应商选择器 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择供应商 *</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowProviderSelector(!showProviderSelector)}
                    className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between hover:bg-gray-50"
                    disabled={!!editingProvider}
                  >
                    <div className="flex items-center gap-3">
                      {providerForm.code ? (
                        <>
                          <ProviderIcon provider={providerForm.code} size={28} type="avatar" />
                          <span>{providerForm.name || providerForm.code}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">点击选择供应商...</span>
                      )}
                    </div>
                    {!editingProvider && (
                      <svg className={`w-4 h-4 transition-transform ${showProviderSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>

                  {/* 供应商下拉列表 */}
                  {showProviderSelector && !editingProvider && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                      {LOBE_PROVIDERS.map((lp) => (
                        <button
                          key={lp.code}
                          type="button"
                          onClick={() => handleSelectLobeProvider(lp)}
                          className={`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-gray-50 ${
                            providerForm.code === lp.code ? 'bg-blue-50' : ''
                          }`}
                        >
                          <ProviderIcon provider={lp.code} size={24} type="avatar" />
                          <span className="flex-1">{lp.name}</span>
                          <span className="text-xs text-gray-400 font-mono">{lp.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 图标预览 */}
              {providerForm.code && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">图标预览</label>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <ProviderIcon provider={providerForm.code} size={48} type="avatar" />
                      <p className="text-xs text-gray-500 mt-1">头像</p>
                    </div>
                    <div className="text-center">
                      <ProviderIcon provider={providerForm.code} size={48} type="mono" />
                      <p className="text-xs text-gray-500 mt-1">单色</p>
                    </div>
                    <div className="text-center">
                      <ProviderIcon provider={providerForm.code} size={48} type="color" />
                      <p className="text-xs text-gray-500 mt-1">彩色</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 自定义名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
                <input type="text" value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                  placeholder="可自定义显示名称" className="w-full px-3 py-2 border rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={providerForm.description} onChange={(e) => setProviderForm({ ...providerForm, description: e.target.value })}
                  placeholder="供应商描述" className="w-full px-3 py-2 border rounded-lg" rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => { setShowProviderModal(false); setShowProviderSelector(false) }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                <button type="submit" disabled={!providerForm.code} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{editingProvider ? '保存' : '添加'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 模型弹窗 */}
      {showModelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium mb-4">{editingModel ? '编辑模型' : '添加模型'}</h3>
            <form onSubmit={handleModelSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">供应商 *</label>
                <select value={modelForm.providerId} onChange={(e) => setModelForm({ ...modelForm, providerId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg" required>
                  <option value="">选择供应商</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* 模型头像预览 - 显示三种动画状态 */}
              {modelForm.providerId && (() => {
                const selectedProvider = providers.find(p => p.id === modelForm.providerId)
                if (!selectedProvider) return null
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">AI 头像预览（动态状态）</label>
                    <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="w-12 h-12 flex items-center justify-center">
                          <ModelIcon model={modelForm.modelId || selectedProvider.code} size={40} type="avatar" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">静止</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 flex items-center justify-center animate-pulse">
                          <ModelIcon model={modelForm.modelId || selectedProvider.code} size={40} type="avatar" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">加载中</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 flex items-center justify-center animate-bounce" style={{ animationDuration: '1s' }}>
                          <ModelIcon model={modelForm.modelId || selectedProvider.code} size={40} type="avatar" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">回复中</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">* 头像会根据 AI 状态自动切换动画效果</p>
                  </div>
                )
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型名称 *</label>
                <input type="text" value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                  placeholder="如：GPT-4o" className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型ID *</label>
                <input type="text" value={modelForm.modelId} onChange={(e) => setModelForm({ ...modelForm, modelId: e.target.value })}
                  placeholder="如：openai/gpt-4o" className="w-full px-3 py-2 border rounded-lg" required />
                <p className="text-xs text-gray-500 mt-1">OpenRouter格式，如：openai/gpt-4o、anthropic/claude-3.5-sonnet</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={modelForm.description} onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                  placeholder="模型描述" className="w-full px-3 py-2 border rounded-lg" rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={modelForm.isDefault} onChange={(e) => setModelForm({ ...modelForm, isDefault: e.target.checked })} />
                <span className="text-sm text-gray-700">设为默认模型</span>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModelModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingModel ? '保存' : '添加'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

