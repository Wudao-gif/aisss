'use client'

/**
 * React PDF Viewer 组件
 * 使用 @react-pdf-viewer/core 实现 PDF 预览
 *
 * 功能配置：
 * 1. defaultScale - 默认缩放级别（适应页面宽度）
 * 2. initialPage - 初始页面（从第一页开始）
 * 3. scrollMode - 滚动模式（垂直滚动）
 * 4. viewMode - 视图模式（单页连续）
 * 5. theme - 主题（跟随系统）
 * 6. plugins - 默认布局插件（工具栏、侧边栏、缩略图等）
 * 7. localization - 中文本地化
 * 8. 阅读记忆 - 记住用户上次阅读位置
 * 9. 密码保护 - 处理加密 PDF
 * 10. 文本高亮 - 选中文本后点击高亮按钮保存，点击已高亮区域可取消
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Viewer,
  Worker,
  SpecialZoomLevel,
  ScrollMode,
  ViewMode,
  PasswordStatus,
  type DocumentLoadEvent,
  type PageChangeEvent,
  type DocumentAskPasswordEvent,
  type RenderProtectedViewProps
} from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import {
  highlightPlugin,
  type HighlightArea,
  type RenderHighlightTargetProps,
  type RenderHighlightContentProps,
  type RenderHighlightsProps,
  Trigger,
} from '@react-pdf-viewer/highlight'
import zh_CN from '@react-pdf-viewer/locales/lib/zh_CN.json'
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'
import '@react-pdf-viewer/highlight/lib/styles/index.css'

// 高亮数据类型
interface HighlightData {
  id: string
  pageIndex: number
  content: string
  color: string
  highlightAreas: HighlightArea[]
  note?: string
}

// 阅读记忆存储 key 前缀
const READING_POSITION_KEY = 'pdf_reading_position_'

interface ReactPDFViewerProps {
  fileUrl: string
  fileName?: string
  /** 书籍ID（用于阅读记忆和高亮） */
  bookId?: string
  /** 初始页面（从0开始） */
  initialPage?: number
  /** 默认缩放级别 */
  defaultScale?: number | SpecialZoomLevel
  /** 滚动模式 */
  scrollMode?: ScrollMode
  /** 视图模式 */
  viewMode?: ViewMode
  /** 主题 */
  theme?: 'auto' | 'dark' | 'light'
  /** 是否启用阅读记忆 */
  enableReadingMemory?: boolean
  /** 是否启用高亮功能 */
  enableHighlight?: boolean
  /** 文档加载完成回调 */
  onDocumentLoad?: (numPages: number) => void
  /** 页面切换回调 */
  onPageChange?: (currentPage: number) => void
}

export function ReactPDFViewer({
  fileUrl,
  fileName,
  bookId,
  initialPage = 0,
  defaultScale = SpecialZoomLevel.PageWidth,
  scrollMode = ScrollMode.Vertical,
  viewMode = ViewMode.SinglePage,
  theme = 'auto',
  enableReadingMemory = true,
  enableHighlight = true,
  onDocumentLoad,
  onPageChange
}: ReactPDFViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [savedInitialPage, setSavedInitialPage] = useState<number>(initialPage)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 高亮相关状态
  const [highlights, setHighlights] = useState<HighlightData[]>([])
  const [highlightsLoaded, setHighlightsLoaded] = useState(false)

  // 生成存储 key（使用 bookId 或 fileUrl 的 hash）
  const getStorageKey = useCallback(() => {
    const identifier = bookId || fileUrl
    return `${READING_POSITION_KEY}${identifier}`
  }, [bookId, fileUrl])

  // 从 localStorage 读取上次阅读位置
  useEffect(() => {
    if (!enableReadingMemory) return

    try {
      const key = getStorageKey()
      const saved = localStorage.getItem(key)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.page !== undefined) {
          console.log('📖 [PDF] 恢复阅读位置：第', data.page + 1, '页')
          setSavedInitialPage(data.page)
        }
      }
    } catch (err) {
      console.warn('读取阅读位置失败:', err)
    }
  }, [enableReadingMemory, getStorageKey])

  // 保存阅读位置到 localStorage（防抖）
  const saveReadingPosition = useCallback((page: number) => {
    if (!enableReadingMemory) return

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // 延迟 500ms 保存，避免频繁写入
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const key = getStorageKey()
        const data = {
          page,
          timestamp: Date.now(),
          bookId,
          fileName
        }
        localStorage.setItem(key, JSON.stringify(data))
        console.log('💾 [PDF] 保存阅读位置：第', page + 1, '页')
      } catch (err) {
        console.warn('保存阅读位置失败:', err)
      }
    }, 500)
  }, [enableReadingMemory, getStorageKey, bookId, fileName])

  // ========== 高亮功能 ==========

  // 从数据库加载高亮
  useEffect(() => {
    if (!enableHighlight) return

    const loadHighlights = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) return

        const params = new URLSearchParams()
        if (bookId) {
          params.set('bookId', bookId)
        } else {
          params.set('fileUrl', fileUrl)
        }

        const response = await fetch(`/api/pdf-highlights?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setHighlights(data.data.map((h: HighlightData) => ({
              id: h.id,
              pageIndex: h.pageIndex,
              content: h.content,
              color: h.color,
              highlightAreas: h.highlightAreas,
              note: h.note,
            })))
            console.log('🖍️ [PDF] 加载高亮:', data.data.length, '条')
          }
        }
      } catch (err) {
        console.warn('加载高亮失败:', err)
      } finally {
        setHighlightsLoaded(true)
      }
    }

    loadHighlights()
  }, [enableHighlight, bookId, fileUrl])

  // 保存高亮到数据库
  const saveHighlight = useCallback(async (
    pageIndex: number,
    content: string,
    highlightAreas: HighlightArea[],
    color: string = '#FFEB3B'
  ) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        console.warn('未登录，无法保存高亮')
        return null
      }

      const response = await fetch('/api/pdf-highlights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bookId: bookId || null,
          fileUrl: bookId ? null : fileUrl,
          pageIndex,
          content,
          color,
          highlightAreas,
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          console.log('🖍️ [PDF] 保存高亮成功:', data.data.id)
          return data.data
        }
      }
      return null
    } catch (err) {
      console.error('保存高亮失败:', err)
      return null
    }
  }, [bookId, fileUrl])

  // 删除高亮
  const deleteHighlight = useCallback(async (highlightId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return false

      const response = await fetch(`/api/pdf-highlights/${highlightId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        console.log('🗑️ [PDF] 删除高亮成功:', highlightId)
        return true
      }
      return false
    } catch (err) {
      console.error('删除高亮失败:', err)
      return false
    }
  }, [])

  // 渲染高亮按钮（选中文本后显示）
  const renderHighlightTarget = useCallback((props: RenderHighlightTargetProps) => (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        padding: '4px 8px',
        position: 'absolute',
        left: `${props.selectionRegion.left}%`,
        top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
        transform: 'translateY(8px)',
        zIndex: 1000,
        display: 'flex',
        gap: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <button
        onClick={async () => {
          const saved = await saveHighlight(
            props.highlightAreas[0].pageIndex,
            props.selectedText,
            props.highlightAreas,
            '#FFEB3B'
          )
          if (saved) {
            setHighlights(prev => [...prev, {
              id: saved.id,
              pageIndex: saved.pageIndex,
              content: saved.content,
              color: saved.color,
              highlightAreas: saved.highlightAreas,
              note: saved.note,
            }])
          }
          props.cancel()
        }}
        style={{
          background: '#FFEB3B',
          border: 'none',
          borderRadius: '3px',
          padding: '4px 12px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
        }}
      >
        🖍️ 高亮
      </button>
    </div>
  ), [saveHighlight])

  // 渲染已保存的高亮区域
  const renderHighlights = useCallback((props: RenderHighlightsProps) => (
    <div>
      {highlights
        .filter(h => h.pageIndex === props.pageIndex)
        .map(highlight => (
          <div key={highlight.id}>
            {highlight.highlightAreas
              .filter((area: HighlightArea) => area.pageIndex === props.pageIndex)
              .map((area: HighlightArea, idx: number) => (
                <div
                  key={idx}
                  className="highlight-area"
                  style={{
                    background: highlight.color,
                    opacity: 0.4,
                    position: 'absolute',
                    left: `${area.left}%`,
                    top: `${area.top}%`,
                    width: `${area.width}%`,
                    height: `${area.height}%`,
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (window.confirm('确定要取消这个高亮吗？')) {
                      const success = await deleteHighlight(highlight.id)
                      if (success) {
                        setHighlights(prev => prev.filter(h => h.id !== highlight.id))
                      }
                    }
                  }}
                  title="点击取消高亮"
                />
              ))}
          </div>
        ))}
    </div>
  ), [highlights, deleteHighlight])

  // 高亮插件实例
  const highlightPluginInstance = highlightPlugin({
    trigger: Trigger.TextSelection,
    renderHighlightTarget,
    renderHighlights,
  })

  // 6. 创建默认布局插件实例（包含工具栏、侧边栏、缩略图等）
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    // 侧边栏配置 - 保留所有默认标签页（缩略图、书签、附件）
    sidebarTabs: (defaultTabs) => defaultTabs,
  })

  // 文档加载完成处理
  const handleDocumentLoad = useCallback((e: DocumentLoadEvent) => {
    console.log('📄 [PDF] 文档加载完成，共', e.doc.numPages, '页')
    onDocumentLoad?.(e.doc.numPages)
  }, [onDocumentLoad])

  // 页面切换处理
  const handlePageChange = useCallback((e: PageChangeEvent) => {
    console.log('📄 [PDF] 切换到第', e.currentPage + 1, '页')
    // 保存阅读位置
    saveReadingPosition(e.currentPage)
    onPageChange?.(e.currentPage)
  }, [onPageChange, saveReadingPosition])

  // 9. 密码保护文档处理
  const handleAskPassword = useCallback((e: DocumentAskPasswordEvent) => {
    console.log('🔐 [PDF] 文档需要密码')
    // 弹出密码输入框
    const password = window.prompt('此文档受密码保护，请输入密码：')
    if (password) {
      e.verifyPassword(password)
    }
  }, [])

  // 自定义密码输入界面
  const renderProtectedView = useCallback((props: RenderProtectedViewProps) => {
    const [password, setPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const handleSubmit = () => {
      if (!password.trim()) {
        setErrorMessage('请输入密码')
        return
      }
      setErrorMessage('')
      props.verifyPassword(password)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit()
      }
    }

    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <svg className="w-16 h-16 mx-auto text-amber-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-800">文档受密码保护</h3>
            <p className="text-gray-500 mt-2">请输入密码以查看此文档</p>
          </div>

          {/* 密码错误提示 */}
          {props.passwordStatus === PasswordStatus.WrongPassword && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">密码错误，请重新输入</p>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入密码"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              autoFocus
            />
            <button
              onClick={handleSubmit}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    )
  }, [])

  // 获取签名 URL
  useEffect(() => {
    if (!fileUrl) {
      setError('未提供文件 URL')
      setLoading(false)
      return
    }

    const fetchSignedUrl = async () => {
      try {
        setLoading(true)
        setError(null)

        // 如果已经是完整的 HTTP URL，直接使用
        if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
          setSignedUrl(fileUrl)
          setLoading(false)
          return
        }

        const token = localStorage.getItem('authToken')
        if (!token) {
          throw new Error('请先登录')
        }

        // 使用 POST 请求获取签名 URL
        const response = await fetch('/api/oss/sign-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            filePath: fileUrl,
            expiresIn: 3600
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || '获取签名 URL 失败')
        }

        const data = await response.json()
        if (data.success && data.data?.url) {
          setSignedUrl(data.data.url)
        } else {
          throw new Error(data.message || '签名 URL 为空')
        }
      } catch (err) {
        console.error('获取签名 URL 失败:', err)
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }

    fetchSignedUrl()
  }, [fileUrl])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">加载 PDF 中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-600 mb-2">加载失败</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!signedUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-gray-500">无法加载 PDF</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden bg-gray-100">
      <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
        <Viewer
          fileUrl={signedUrl}
          // 1. 默认缩放级别 - 适应页面宽度
          defaultScale={defaultScale}
          // 2. 初始页面 - 从指定页开始（优先使用保存的阅读位置）
          initialPage={savedInitialPage}
          // 3. 滚动模式 - 垂直/水平/单页/包裹
          scrollMode={scrollMode}
          // 4. 视图模式 - 单页/双页/带封面双页
          viewMode={viewMode}
          // 5. 主题 - auto/dark/light
          theme={theme}
          // 6. 插件 - 默认布局插件 + 高亮插件
          plugins={enableHighlight
            ? [defaultLayoutPluginInstance, highlightPluginInstance]
            : [defaultLayoutPluginInstance]
          }
          // 7. 中文本地化
          localization={zh_CN}
          // 8. 密码保护文档处理
          renderProtectedView={renderProtectedView}
          onDocumentAskPassword={handleAskPassword}
          // 回调函数
          onDocumentLoad={handleDocumentLoad}
          onPageChange={handlePageChange}
        />
      </Worker>
    </div>
  )
}

export default ReactPDFViewer

