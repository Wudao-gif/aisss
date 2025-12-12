'use client'

/**
 * 书籍对话页面 - V2 版本
 * 双栏布局：左侧文件预览（顶部资源下拉菜单）、右侧对话区域
 */

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBookshelfStore } from '@/stores/useBookshelfStore'
import type { BookshelfResource } from '@/types'

// 动态导入 ReactPDFViewer，禁用 SSR
const ReactPDFViewer = dynamic(
  () => import('@/components/library/ReactPDFViewer').then(mod => ({ default: mod.ReactPDFViewer })),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">加载预览组件...</p>
      </div>
    </div>
  )}
)

// Lucide 图标
import {
  ChevronDown,
  FileText,
  Clock,
  X,
  Send,
  History,
  CheckSquare,
  Square,
  Loader2,
  MessageSquarePlus,
  CornerDownLeft,
  Maximize2,
  Minimize2,
  // 右侧工作区图标
  ListTree,
  List,
  SwatchBook,
  SquareKanban,
  NotebookText,
  GitCompare,
} from 'lucide-react'

// LobeHub UI 组件
import {
  ThemeProvider,
  ActionIcon,
  Avatar,
  Markdown,
  Modal,
  Tag,
  DraggablePanel,
  SideNav,
  TextArea,
  Tooltip,
  Dropdown,
  Hotkey,
  Accordion,
  AccordionItem,
} from '@lobehub/ui'

// 步骤状态类型
type StepStatus = 'pending' | 'running' | 'stopped' | 'success'

// 本地 UI 组件（暂时保留，可能其他地方使用）
// import {
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
// } from '@/components/ui/collapsible'

// LobeHub Icons
import { ModelIcon } from '@lobehub/icons'

// ==================== 类型定义 ====================

interface Source {
  id: string
  text: string
  score: number
  document_id?: string
  document_name?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  timestamp?: Date
}

interface HistoryConversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

interface AIModel {
  id: string
  name: string
  modelId: string
  description?: string
  isDefault?: boolean
}

interface AIProvider {
  id: string
  name: string
  code: string
  models: AIModel[]
}

interface ResourceItem {
  id: string
  name: string
  type: string
  url?: string
  isMainBook: boolean
  selected: boolean
  documentId?: string
}

// 思考步骤类型
interface ThinkingStep {
  id: string
  step: string
  message: string
  detail?: string
  status: 'pending' | 'running' | 'done'
  timestamp: Date
  parentStep?: string  // 父步骤类型
  stepLevel: number    // 步骤层级（0=主步骤，1=子步骤）
}

// ==================== 工具函数 ====================

const filterValidSources = (sources: Source[] | undefined): Source[] => {
  if (!sources || !Array.isArray(sources)) return []
  return sources.filter(source => 
    source && 
    typeof source.text === 'string' && 
    source.text.trim().length > 0 &&
    typeof source.score === 'number'
  )
}

const formatTime = (date: string | Date): string => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  
  return d.toLocaleDateString('zh-CN')
}

// ==================== 主组件内容 ====================

function BookChatV2Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = searchParams.get('bookId')

  const { user, isAuthenticated, initialize } = useAuthStore()
  const { books, loadBookshelf } = useBookshelfStore()

  // 从 localStorage 获取 token
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken')
    }
    return null
  }

  // 当前书籍状态
  const [currentBook, setCurrentBook] = useState<any>(null)
  const [bookshelfItemId, setBookshelfItemId] = useState<string>('')

  // 消息相关状态
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [sendWithEnter, setSendWithEnter] = useState(true) // true: Enter发送, false: Ctrl+Enter发送
  const [inputExpanded, setInputExpanded] = useState(false) // 输入框是否展开
  
  // 资源相关状态
  const [resourceMenuOpen, setResourceMenuOpen] = useState(false)
  const [currentPreviewResource, setCurrentPreviewResource] = useState<ResourceItem | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  
  // 模型相关状态
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null)
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  
  // 对话相关状态
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [historyConversations, setHistoryConversations] = useState<HistoryConversation[]>([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [progressMessage, setProgressMessage] = useState<string>('')  // AI思考进度
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])  // 思考步骤列表

  // 引用来源状态
  const [clickedSource, setClickedSource] = useState<{source: Source, x: number, y: number} | null>(null)

  // 资源状态
  const [resources, setResources] = useState<ResourceItem[]>([])

  // 初始化状态
  const [isInitialized, setIsInitialized] = useState(false)
  const [inputHovered, setInputHovered] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<Message[]>([]) // 避免闭包陷阱

  // ==================== 数据加载函数 ====================

  const loadAvailableModels = async () => {
    try {
      const response = await fetch('/api/models')
      const result = await response.json()
      if (result.success && result.data && result.data.length > 0) {
        const providersData: AIProvider[] = result.data
        setProviders(providersData)

        // 找到默认模型
        let defaultModel: AIModel | null = null
        let defaultProvider: AIProvider | null = null

        for (const provider of providersData) {
          const foundDefault = provider.models.find(m => m.isDefault)
          if (foundDefault) {
            defaultModel = foundDefault
            defaultProvider = provider
            break
          }
        }

        // 如果没有默认模型，使用第一个
        if (!defaultModel && providersData[0]?.models?.length > 0) {
          defaultModel = providersData[0].models[0]
        }

        if (defaultProvider) setSelectedProvider(defaultProvider)
        if (defaultModel) setSelectedModel(defaultModel)
      }
    } catch (error) {
      console.error('加载模型失败:', error)
    }
  }

  const loadResources = async () => {
    const token = getToken()
    if (!currentBook || !bookshelfItemId || !token) return

    const resourceList: ResourceItem[] = []

      // 添加主教材（只要有 fileUrl 就可以预览）
    if (currentBook.fileUrl) {
      resourceList.push({
        id: currentBook.id,
        name: currentBook.name,
        type: currentBook.fileType || 'pdf',
        url: currentBook.fileUrl,
        isMainBook: true,
        selected: true,
        documentId: currentBook.documentId || ''
      })
    }

    // 加载附加资源（使用 bookshelfItemId）
    try {
      const response = await fetch(`/api/bookshelf/${bookshelfItemId}/resources`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.resources) {
          data.resources.forEach((res: any) => {
            if (res.document_id) {
              resourceList.push({
                id: res.id,
                name: res.name,
                type: res.file_type || 'file',
                url: res.oss_url,
                isMainBook: false,
                selected: true,
                documentId: res.document_id
              })
            }
          })
        }
      }
    } catch (error) {
      console.error('加载资源失败:', error)
    }

    setResources(resourceList)

    // 默认预览主教材
    const mainBook = resourceList.find(r => r.isMainBook)
    if (mainBook) {
      setCurrentPreviewResource(mainBook)
      setPreviewUrl(mainBook.url || '')
    }
  }

  const loadHistoryConversations = async () => {
    const token = getToken()
    if (!currentBook || !token) return
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/ai/conversations?book_id=${currentBook.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setHistoryConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('加载历史对话失败:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const loadConversation = async (conversationId: string) => {
    const token = getToken()
    if (!token) return
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.messages) {
          const loadedMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id || crypto.randomUUID(),
            role: msg.role,
            content: msg.content,
            sources: msg.sources,
            timestamp: new Date(msg.created_at)
          }))
          setMessages(loadedMessages)
          setCurrentConversationId(conversationId)
        }
      }
    } catch (error) {
      console.error('加载对话失败:', error)
    }
    setShowHistoryModal(false)
  }

  // ==================== 事件处理函数 ====================

  const startNewConversation = () => {
    setMessages([])
    setCurrentConversationId(null)
  }

  const toggleResourceSelection = (resourceId: string) => {
    setResources(prev => prev.map(r =>
      r.id === resourceId ? { ...r, selected: !r.selected } : r
    ))
  }

  const toggleSelectAll = () => {
    const allSelected = resources.every(r => r.selected)
    setResources(prev => prev.map(r => ({ ...r, selected: !allSelected })))
  }

  const handleResourcePreview = (resource: ResourceItem) => {
    setCurrentPreviewResource(resource)
    setPreviewUrl(resource.url || '')
    setResourceMenuOpen(false)
  }

  const buildFilterExpression = (): string | null => {
    const conditions: string[] = []

    // 添加书籍过滤
    if (currentBook?.id) {
      conditions.push(`book_id = '${currentBook.id}'`)
    }

    // 添加选中资源过滤
    const selectedResources = resources.filter(r => r.selected && r.id)
    if (selectedResources.length > 0) {
      const resourceIdList = selectedResources.map(r => `'${r.id}'`).join(', ')
      conditions.push(`resource_id IN (${resourceIdList})`)
    }

    return conditions.length > 0 ? conditions.join(' OR ') : null
  }

  const handleSendMessage = async () => {
    const token = getToken()
    if (!inputValue.trim() || isTyping || !token) return

    const question = inputValue.trim()
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)
    setThinkingSteps([])  // 清空思考步骤

    const assistantMessageId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }])

    // 临时存储 sources，等回答完成后再显示
    let pendingSources: Source[] = []
    // 累积AI回复内容，用于保存到数据库
    let accumulatedContent = ''

    try {
      // 构建历史对话（最近 20 条）
      const historyMessages = messagesRef.current
        .filter(m => m.content.trim().length > 0)
        .slice(-20)
        .map(m => ({
          role: m.role,
          content: m.content
        }))

      // 构建过滤表达式
      const filterExpr = buildFilterExpression()

      console.log('🤖 发送 AI 请求:', {
        question,
        user_id: user?.id,
        book_id: currentBook?.id,
        book_name: currentBook?.name,  // 新增：传递教材名称
        filter_expr: filterExpr,
        historyCount: historyMessages.length,
      })

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question,
          user_id: user?.id,
          book_id: currentBook?.id,
        book_name: currentBook?.name,  // 新增：传递教材名称
          filter_expr: filterExpr,
          top_k: 5,
          history: historyMessages,
        })
      })

      console.log('📡 响应状态:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ 请求失败:', errorText)
        throw new Error(`请求失败: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应')

      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          // 调试：打印每一行
          if (line.trim()) {
            console.log('📡 SSE 行:', line.substring(0, 80))
          }

          // 解析 event 类型
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
            console.log('🏷️ 事件类型:', currentEvent)
            continue
          }

          // 解析 data
          if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim()
            if (!dataStr) continue

            try {
              const data = JSON.parse(dataStr)
            console.log('📦 解析数据:', { currentEvent, dataKeys: Object.keys(data) })

              // 根据 event 类型处理
              if (currentEvent === 'sources' && data.sources) {
                const validSources = filterValidSources(data.sources)
            console.log('📚 收到 sources:', data.sources?.length, '有效:', validSources.length)
                pendingSources = validSources
              }

              // 处理进度事件
              if (currentEvent === 'progress' && data.message) {
                console.log('⏳ 进度:', data.step, data.message, 'level:', data.step_level, 'parent:', data.parent_step)
                console.log('📊 完整数据:', JSON.stringify(data, null, 2))
                setProgressMessage(data.message)

                // 只显示真实的处理步骤，不显示 STREAMING 类型的事件（LLM 流式输出）
                if (data.step !== 'streaming') {
                  // 添加或更新思考步骤
                  setThinkingSteps(prev => {
                    const stepId = data.step || `step-${prev.length}`
                    const stepLevel = data.step_level ?? 0
                    const parentStep = data.parent_step

                    // 如果是主步骤（level=0），将之前的主步骤标记为完成
                    if (stepLevel === 0) {
                      const updated = prev.map(s => s.stepLevel === 0 ? { ...s, status: 'done' as const } : s)
                      return [...updated, {
                        id: crypto.randomUUID(),
                        step: stepId,
                        message: data.message,
                        detail: data.detail,
                        status: 'running' as const,
                        timestamp: new Date(),
                        parentStep: undefined,
                        stepLevel: 0
                      }]
                    }

                    // 如果是子步骤（level=1），添加到对应的主步骤下
                    if (stepLevel === 1) {
                      const updated = [...prev]
                      // 找到对应的主步骤
                      const parentIndex = updated.findIndex(s => s.step === parentStep && s.stepLevel === 0)

                      if (parentIndex >= 0) {
                        // 将同一主步骤下的其他子步骤标记为完成
                        for (let i = parentIndex + 1; i < updated.length; i++) {
                          if (updated[i].stepLevel === 1 && updated[i].parentStep === parentStep) {
                            updated[i].status = 'done'
                          } else if (updated[i].stepLevel === 0) {
                            break
                          }
                        }
                      }

                      return [...updated, {
                        id: crypto.randomUUID(),
                        step: stepId,
                        message: data.message,
                        detail: data.detail,
                        status: 'running' as const,
                        timestamp: new Date(),
                        parentStep: parentStep,
                        stepLevel: 1
                      }]
                    }

                    return prev
                  })
                }
              }

              if (currentEvent === 'content' && data.content) {
                console.log('💬 收到 content:', data.content)
                // 收到内容后清除进度消息，将所有步骤标记为完成
                setProgressMessage('')
                setThinkingSteps(prev => prev.map(s => ({ ...s, status: 'done' as const })))
                accumulatedContent += data.content
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + data.content }
                    : msg
                ))
              }

              if (currentEvent === 'done' || data.done) {
                setProgressMessage('')  // 清除进度消息
                setThinkingSteps(prev => prev.map(s => ({ ...s, status: 'done' as const })))  // 标记所有步骤完成
                // 回答完成，现在显示 sources
                console.log('✅ 回答完成，设置 sources:', pendingSources.length, '个, 累积内容长度:', accumulatedContent.length)
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, sources: pendingSources.length > 0 ? pendingSources : undefined }
                    : msg
                ))

                // 保存对话到数据库
                try {
                  const saveResponse = await fetch('/api/conversations', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      conversationId: currentConversationId,
                      bookId: currentBook?.id,
                      userMessage: question,
                      assistantMessage: accumulatedContent,
                    }),
                  })
                  const saveData = await saveResponse.json()
                  if (saveData.success) {
                    if (!currentConversationId) {
                      setCurrentConversationId(saveData.data.conversationId)
                    }
                    console.log('💾 对话已保存:', saveData.data.conversationId)
                  }
                } catch (saveError) {
                  console.error('保存对话失败:', saveError)
                }

                break
              }

              currentEvent = ''
            } catch (e) {
          console.warn('SSE 解析错误:', e, 'data:', dataStr)
            }
          }
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
            ? { ...msg, content: '抱歉，AI 服务暂时不可用，请稍后重试。' }
          : msg
      ))
    } finally {
      setIsTyping(false)
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleHistoryClick = () => {
    loadHistoryConversations()
    setShowHistoryModal(true)
  }

  const closeCitationCard = () => setClickedSource(null)

  const handleCitationClick = (source: Source, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setClickedSource({
      source,
      x: event.clientX,
      y: event.clientY
    })
  }

  // ==================== useEffect ====================

  // 同步 messages 到 ref（避免闭包陷阱）
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // 初始化认证状态和书架
  useEffect(() => {
    const init = async () => {
      console.log('🔄 初始化认证状态和书架...')
      await initialize()
      await loadBookshelf()
      loadAvailableModels()
      setIsInitialized(true)
      console.log('✅ 初始化完成')
    }
    init()
  }, [initialize, loadBookshelf])

  // 未登录跳转（只在初始化完成后）
  useEffect(() => {
    if (!isInitialized) {
      console.log('⏳ 等待初始化完成...')
      return
    }
    if (!isAuthenticated) {
      console.log('❌ 未登录，跳转到主页')
      router.push('/new')
    } else {
      console.log('✅ 已登录')
    }
  }, [isAuthenticated, router, isInitialized])

  // 加载书籍信息（只在初始化完成后）
  useEffect(() => {
      console.log('📚 书籍加载检查 - isInitialized:', isInitialized, '| isAuthenticated:', isAuthenticated, '| bookId:', bookId)

    if (!isInitialized || !isAuthenticated) return

    if (!bookId) {
        console.log('❌ 没有 bookId，跳转到主页')
      router.push('/new')
      return
    }

    if (books.length === 0) {
      console.log('⏳ 书架为空，等待加载...')
      return
    }

      // 使用 bookId 字段查找（不是 id 字段）
    const bookshelfItem = books.find(b => b.bookId?.toString() === bookId)
      console.log('📖 查找书籍结果:', bookshelfItem ? bookshelfItem.book?.name : '未找到')

    if (bookshelfItem && bookshelfItem.book) {
      setCurrentBook(bookshelfItem.book)
      setBookshelfItemId(bookshelfItem.id) // 保存书架项目 ID
    } else {
        console.log('❌ 书籍未找到，bookId:', bookId)
      router.push('/new')
    }
  }, [bookId, books, isInitialized, isAuthenticated, router])

  // 加载资源和模型
  useEffect(() => {
    if (currentBook && bookshelfItemId) {
      loadResources()
    }
  }, [currentBook, bookshelfItemId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ==================== 渲染内容处理 ====================

  // 获取步骤状态标签配置
  const getStepStatusTag = (status: StepStatus) => {
    const statusConfig: Record<StepStatus, { label: string; color: string }> = {
      pending: { label: '待执行', color: 'default' },
      running: { label: '执行中', color: 'processing' },
      stopped: { label: '执行终止', color: 'error' },
      success: { label: '执行成功', color: 'success' },
    }
    return statusConfig[status]
  }

  const renderContentWithCitations = (content: string, sources: Source[]) => {
    const validSources = filterValidSources(sources)

    // 增强的 Markdown 组件配置
    const markdownComponent = (
      <Markdown
        // 启用代码块高亮和复制功能
        style={{
          // 代码块样式
          code: {
            backgroundColor: '#f5f5f5',
            borderRadius: '6px',
            padding: '2px 6px',
            fontSize: 'clamp(0.75em, 2vw, 0.875em)',
            fontFamily: 'monospace',
          },
          // 代码块容器 - 响应式处理
          pre: {
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: 'clamp(8px, 2vw, 12px)',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: 'clamp(0.75em, 2vw, 0.875em)',
            lineHeight: '1.5',
            marginTop: '8px',
            marginBottom: '8px',
            maxWidth: '100%',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          },
          // 表格样式 - 响应式处理
          table: {
            borderCollapse: 'collapse',
            width: '100%',
            marginTop: '8px',
            marginBottom: '8px',
            fontSize: 'clamp(0.75em, 2vw, 0.875em)',
            overflowX: 'auto',
            display: 'block',
          },
          // 表格单元格 - 响应式 padding
          td: {
            border: '1px solid #e5e7eb',
            padding: 'clamp(4px, 1vw, 8px) clamp(6px, 1.5vw, 12px)',
            textAlign: 'left',
            wordBreak: 'break-word',
          },
          th: {
            border: '1px solid #e5e7eb',
            padding: 'clamp(4px, 1vw, 8px) clamp(6px, 1.5vw, 12px)',
            backgroundColor: '#f9fafb',
            fontWeight: '600',
            textAlign: 'left',
            wordBreak: 'break-word',
          },
          // 引用块样式
          blockquote: {
            borderLeft: '4px solid #3b82f6',
            paddingLeft: '12px',
            marginLeft: '0',
            marginTop: '8px',
            marginBottom: '8px',
            color: '#6b7280',
            fontStyle: 'italic',
          },
          // 链接样式
          a: {
            color: '#3b82f6',
            textDecoration: 'underline',
            cursor: 'pointer',
            transition: 'color 0.2s',
            wordBreak: 'break-word',
          },
          // 标题样式 - 响应式字体大小
          h1: { fontSize: 'clamp(1.5em, 4vw, 1.875em)', fontWeight: '700', marginTop: '16px', marginBottom: '8px' },
          h2: { fontSize: 'clamp(1.25em, 3.5vw, 1.5em)', fontWeight: '700', marginTop: '14px', marginBottom: '8px' },
          h3: { fontSize: 'clamp(1.1em, 3vw, 1.25em)', fontWeight: '600', marginTop: '12px', marginBottom: '6px' },
          // 列表样式 - 响应式 margin
          ul: { marginLeft: 'clamp(12px, 3vw, 20px)', marginTop: '8px', marginBottom: '8px' },
          ol: { marginLeft: 'clamp(12px, 3vw, 20px)', marginTop: '8px', marginBottom: '8px' },
          li: { marginBottom: '4px' },
          // 段落样式
          p: { marginTop: '8px', marginBottom: '8px', lineHeight: '1.6', wordBreak: 'break-word' },
        } as any}
        // 配置链接组件以处理外部链接
        componentProps={{
          a: {
            onClick: ((e: any, link: any) => {
              const href = link?.href || (e.currentTarget as HTMLAnchorElement).href
              if (href && href.startsWith('http')) {
                e.preventDefault?.()
                window.open(href, '_blank')
              }
            }) as any,
          },
        }}
      >
        {content}
      </Markdown>
    )

    // 如果没有有效的来源，直接返回 Markdown
    if (!validSources || validSources.length === 0) {
      return markdownComponent
    }

    // 返回 Markdown + 参考来源
    return (
      <div className="space-y-3">
        {markdownComponent}
        {/* 参考来源部分 */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-200">
          <span className="text-xs font-medium text-gray-600 w-full">📚 参考来源:</span>
          {validSources.slice(0, 5).map((source, index) => (
            <button
              key={source.id || index}
              onClick={(e) => handleCitationClick(source, e)}
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full hover:from-blue-100 hover:to-blue-200 transition-all duration-200 shadow-sm hover:shadow-md"
              title={source.document_name || '来源'}
            >
              <span className="inline-flex items-center justify-center w-4 h-4 mr-1 text-xs font-bold bg-blue-500 text-white rounded-full">
                {index + 1}
              </span>
              {Math.round(source.score * 100)}%
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ==================== 加载状态 ====================

  // 等待初始化完成（使用简单 div，避免等待动态组件加载）
  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">初始化中...</p>
        </div>
      </div>
    )
  }

  // 等待书籍加载
  if (!currentBook) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">加载书籍中...</p>
        </div>
      </div>
    )
  }

  const canPreview = currentPreviewResource?.type &&
    ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(currentPreviewResource.type.toLowerCase())

  // ==================== 主界面渲染 ====================
  return (
    <ThemeProvider>
      <div className="h-screen flex overflow-hidden">
          {/* 左侧 SideNav - 资源导航 */}
        <SideNav
          avatar={
            currentBook.coverUrl || currentBook.cover ? (
              <img
                src={currentBook.coverUrl || currentBook.cover}
                alt={currentBook.name}
                style={{
                  width: 40,
                  height: 40,
                  objectFit: 'cover',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
                onClick={() => {
                  const mainBook = resources.find(r => r.isMainBook)
                  if (mainBook) handleResourcePreview(mainBook)
                }}
              />
            ) : (
              <Avatar
                shape="square"
                size={40}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  const mainBook = resources.find(r => r.isMainBook)
                  if (mainBook) handleResourcePreview(mainBook)
                }}
              >
                {currentBook.name?.charAt(0) || '书'}
              </Avatar>
            )
          }
          topActions={
            <>
              {/* 其他资源（非主教材） */}
              {resources.filter(r => !r.isMainBook).map(resource => (
                <ActionIcon
                  key={resource.id}
                  icon={FileText}
                  active={currentPreviewResource?.id === resource.id}
                  onClick={() => handleResourcePreview(resource)}
                  title={resource.name}
                  size="large"
                  style={{
                    color: resource.selected ? '#2563eb' : undefined,
                    opacity: resource.selected ? 1 : 0.5
                  }}
                />
              ))}
            </>
          }
          bottomActions={
            <ActionIcon
              icon={resources.length > 0 && resources.every(r => r.selected) ? CheckSquare : Square}
              onClick={toggleSelectAll}
              title={resources.every(r => r.selected) ? '取消全选' : '全选'}
              size="large"
            />
          }
        />

        {/* 主内容区域 - 双栏布局 */}
        <div className="flex-1 flex overflow-hidden relative flex-col lg:flex-row">
          {/* 左侧：可拖动预览面板 */}
          <DraggablePanel
            mode="fixed"
            placement="left"
            defaultSize={{ width: 'clamp(300px, 50vw, 700px)' }}
            minWidth={300}
            maxWidth={1200}
            style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'auto' }}
          >
              {/* 预览区域 */}
            <div className="flex-1 overflow-hidden bg-gray-50 min-h-[200px] lg:min-h-0">
              {canPreview && previewUrl ? (
                // PDF 文件使用 ReactPDFViewer
                currentPreviewResource?.type?.toLowerCase() === 'pdf' ? (
                  <ReactPDFViewer
                    fileUrl={previewUrl}
                    fileName={currentPreviewResource?.name || '文件预览'}
                  />
                ) : (
                  // 其他 Office 文件使用 iframe
                  <iframe
                    src={`/api/preview?url=${encodeURIComponent(previewUrl)}`}
                    className="w-full h-full border-0"
                    title="文件预览"
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500 px-4">
                    <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-4 opacity-30" />
                <p className="text-xs sm:text-sm">{currentPreviewResource ? '该资源暂不支持预览' : '请选择一个资源进行预览'}</p>
                  </div>
                </div>
              )}
            </div>
          </DraggablePanel>

          {/* 右侧：对话面板 */}
          <div className="flex-1 flex flex-col bg-white relative">
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
              {messages.length === 0 ? (
                <div className="pt-6 text-center">
                  <p className="text-lg sm:text-xl md:text-2xl font-medium text-gray-800 px-2">
                    {(() => {
                      const hour = new Date().getHours()
                      if (hour >= 5 && hour < 12) return '早上好，'
                      if (hour >= 12 && hour < 18) return '中午好，'
                      return '晚上好，'
                    })()}
                    有什么可以帮你的吗？
                  </p>
                </div>
              ) : (
                messages.map((message, messageIndex) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 sm:gap-3 px-1 sm:px-0 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 flex flex-col items-start gap-2">
                        {/* AI 头像 */}
                        <div className="mt-1 hidden sm:block">
                          <ModelIcon
                            model={selectedModel?.modelId || selectedProvider?.code || 'openai'}
                            size={32}
                            type="avatar"
                          />
                        </div>
                      </div>
                    )}
                    {/* 消息内容容器 */}
                    <div className={`flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {/* 处理进度（在最后一条 AI 消息时显示，在内容上方） */}
                      {message.role === 'assistant' && messageIndex === messages.length - 1 && thinkingSteps.length > 0 && (
                        <div className="max-w-[90%] sm:max-w-[80%] md:max-w-[75%]">
                          <div className="space-y-3">
                            {thinkingSteps.map((step, index) => {
                              // 只显示主步骤（level=0）
                              if (step.stepLevel !== 0) return null

                              // 获取该主步骤下的所有子步骤
                              const childSteps = thinkingSteps.filter(s => s.parentStep === step.step && s.stepLevel === 1)

                              // 根据步骤状态判断
                              let status: StepStatus = 'pending'
                              if (step.status === 'done') {
                                status = 'success'
                              } else if (step.status === 'running') {
                                status = 'running'
                              }
                              const statusConfig = getStepStatusTag(status)

                              // 获取主步骤的显示消息
                              // 执行中显示主步骤的消息，执行成功显示最后一条子步骤的消息（结果）
                              let mainMessage = step.message
                              if (status === 'success' && childSteps.length > 0) {
                                mainMessage = childSteps[childSteps.length - 1].message
                              }

                              return (
                                <div key={step.id} className="border-l-2 border-gray-200 pl-3">
                                  {/* 主步骤标题和状态 */}
                                  <div className="flex items-start gap-2 mb-2">
                                    <Tag
                                      color={statusConfig.color}
                                      size="small"
                                      variant="outlined"
                                      className="flex-shrink-0 mt-0.5"
                                    >
                                      {statusConfig.label}
                                    </Tag>
                                    <p className="text-xs font-medium text-gray-700">
                                      {mainMessage}
                                    </p>
                                  </div>

                                  {/* 子步骤 */}
                                  {childSteps.length > 0 && status === 'running' && (
                                    <div className="space-y-2 ml-2">
                                      {childSteps.map((childStep, childIndex) => {
                                        let childStatus: StepStatus = 'pending'
                                        if (childStep.status === 'done') {
                                          childStatus = 'success'
                                        } else if (childStep.status === 'running') {
                                          childStatus = 'running'
                                        }
                                        const childStatusConfig = getStepStatusTag(childStatus)

                                        return (
                                          <div key={childStep.id} className="flex items-start gap-2">
                                            <Tag
                                              color={childStatusConfig.color}
                                              size="small"
                                              variant="outlined"
                                              className="flex-shrink-0 mt-0.5"
                                            >
                                              {childStatusConfig.label}
                                            </Tag>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs break-words text-gray-700">
                                                {childIndex + 1}. {childStep.message}
                                              </p>
                                              {childStep.detail && (
                                                <p className="text-xs text-gray-500 mt-1 break-words">
                                                  {childStep.detail}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* 消息内容 */}
                      <div className={`max-w-[90%] sm:max-w-[80%] md:max-w-[75%] overflow-hidden ${message.role === 'user' ? 'bg-blue-500 text-white rounded-2xl px-3 sm:px-4 py-2' : ''}`}>
                        {message.role === 'user' ? (
                          <p className="text-xs sm:text-sm whitespace-normal break-words">{message.content}</p>
                        ) : (
                          <div className="overflow-x-auto">
                            {renderContentWithCitations(message.content, message.sources || [])}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 输入区域 */}
            <div
              className="bg-white"
              style={inputExpanded ? {
                position: 'absolute',
                bottom: 8,
                left: 8,
                right: 8,
                top: 60,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 12,
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                padding: 12,
              } : { padding: '12px' }}
            >
              <div
                className="relative group"
                onMouseEnter={() => setInputHovered(true)}
                onMouseLeave={() => setInputHovered(false)}
                style={inputExpanded ? { flex: 1, display: 'flex', flexDirection: 'column' } : {}}
              >
                <TextArea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (sendWithEnter) {
                      // Enter 发送模式
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    } else {
                      // Ctrl+Enter 发送模式
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }
                  }}
                  placeholder={`向《${currentBook.name}》提问...`}
                  variant="filled"
                  resize={false}
                  disabled={isTyping}
                  style={{
                    width: '100%',
                    paddingRight: 100,
                    minHeight: inputExpanded ? '100%' : 'clamp(60px, 15vw, 80px)',
                    height: inputExpanded ? '100%' : 'auto',
                    flex: inputExpanded ? 1 : 'none',
                    fontSize: 'clamp(12px, 2vw, 14px)',
                  }}
                />
                <div style={{ position: 'absolute', right: 4, bottom: 4, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {(inputHovered || inputExpanded) && (
                    <Tooltip title={inputExpanded ? "收起" : "展开"}>
                      <ActionIcon
                        icon={inputExpanded ? Minimize2 : Maximize2}
                        onClick={() => setInputExpanded(!inputExpanded)}
                        size="small"
                      />
                    </Tooltip>
                  )}
                  <Tooltip title="创建新话题">
                    <ActionIcon
                      icon={MessageSquarePlus}
                      onClick={startNewConversation}
                      size="small"
                    />
                  </Tooltip>
                    {/* 发送按钮组 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: inputValue.trim() && !isTyping ? '#3b82f6' : 'transparent',
                      borderRadius: 6,
                    }}
                  >
                    <ActionIcon
                      icon={isTyping ? Loader2 : Send}
                      onClick={handleSendMessage}
                      loading={isTyping}
                      size="small"
                      style={{
                        backgroundColor: 'transparent',
                        color: inputValue.trim() && !isTyping ? 'white' : '#9ca3af'
                      }}
                    />
                    <div
                      style={{
                        width: 1,
                        height: 16,
                        backgroundColor: inputValue.trim() && !isTyping ? 'rgba(255,255,255,0.3)' : 'rgba(156,163,175,0.3)',
                      }}
                    />
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'enter',
                            label: (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span>发送</span>
                                <Hotkey keys="enter" />
                              </div>
                            ),
                            onClick: () => setSendWithEnter(true),
                          },
                          {
                            key: 'ctrl-enter',
                            label: (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span>发送</span>
                                <Hotkey keys="ctrl+enter" />
                              </div>
                            ),
                            onClick: () => setSendWithEnter(false),
                          },
                        ],
                        selectedKeys: [sendWithEnter ? 'enter' : 'ctrl-enter'],
                      }}
                      trigger={['hover']}
                    >
                      <ActionIcon
                        icon={ChevronDown}
                        size="small"
                        style={{
                          backgroundColor: 'transparent',
                          color: inputValue.trim() && !isTyping ? 'white' : '#9ca3af'
                        }}
                      />
                    </Dropdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

            {/* 右侧 SideNav - 工作区 */}
        <SideNav
          topActions={
            <>
              <Tooltip title="思维导图" placement="left">
                <ActionIcon icon={ListTree} size="large" />
              </Tooltip>
              <Tooltip title="知识大纲" placement="left">
                <ActionIcon icon={List} size="large" />
              </Tooltip>
              <Tooltip title="姒傚康鎷嗚В" placement="left">
                <ActionIcon icon={SwatchBook} size="large" />
              </Tooltip>
              <Tooltip title="定理讲解" placement="left">
                <ActionIcon icon={SquareKanban} size="large" />
              </Tooltip>
                <Tooltip title="自动笔记" placement="left">
                <ActionIcon icon={NotebookText} size="large" />
              </Tooltip>
                <Tooltip title="误区与易错点提醒" placement="left">
                <ActionIcon icon={GitCompare} size="large" />
              </Tooltip>
            </>
          }
          bottomActions={<></>}
        />

        {/* 寮曠敤鍗＄墖寮圭獥 */}
        {clickedSource && (
          <>
            <div className="fixed inset-0 z-[99998]" onClick={closeCitationCard} />
            <div
              className="fixed w-80 bg-white rounded-xl shadow-2xl border overflow-hidden z-[99999]"
              style={{
                left: Math.min(Math.max(clickedSource.x, 170), window.innerWidth - 170),
                top: Math.min(clickedSource.y, window.innerHeight - 280),
                transform: 'translateX(-50%)'
              }}
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-50 to-blue-100/50 border-b">
                <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-blue-700">📖 参考来源</span>
                  <Tag size="small" color="blue">
                    鐩稿叧搴?{Math.round(clickedSource.source.score * 100)}%
                  </Tag>
                </div>
                <ActionIcon icon={X} onClick={closeCitationCard} size="small" />
              </div>
              <div className="p-4 max-h-48 overflow-y-auto">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {clickedSource.source.text}
                </p>
              </div>
            </div>
          </>
        )}

        {/* 历史对话弹窗 */}
        <Modal
          open={showHistoryModal}
          onCancel={() => setShowHistoryModal(false)}
          title="历史对话"
          footer={null}
          width={480}
        >
          {isLoadingHistory ? (
            <div className="py-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-3"></div>
              加载中...
            </div>
          ) : historyConversations.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无历史对话</p>
              <p className="text-xs mt-1 opacity-60">开始一段新对话吧</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {historyConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    currentConversationId === conv.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900 truncate">
                      {conv.title || '未命名对话'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {conv.message_count} 条消息 · {formatTime(conv.updated_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      </div>
    </ThemeProvider>
  )
}

// ==================== 瀵煎嚭缁勪欢 ====================

export default function BookChatV2Page() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">加载页面...</p>
        </div>
      </div>
    }>
      <BookChatV2Content />
    </Suspense>
  )
}




