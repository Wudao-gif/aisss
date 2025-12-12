'use client'

/**
 * PDF 预览组件
 * 使用原生 PDF.js 实现在线预览（避免 SSR 问题）
 */

import { useState, useEffect, useRef } from 'react'

// 声明全局 pdfjsLib 对象
declare global {
  interface Window {
    pdfjsLib?: any
  }
}

interface PDFViewerProps {
  fileUrl: string
  fileName: string
}

export function PDFViewer({ fileUrl, fileName }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  // 🎯 scale 只控制显示大小，清晰度由 devicePixelRatio 保证
  const [scale, setScale] = useState<number>(1.5)
  const [loading, setLoading] = useState<boolean>(true)
  // 🆕 显示模式：single（单页）/ continuous（连续滚动）
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('single')
  const [error, setError] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 🆕 渐进式加载相关状态
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set()) // 已加载的页面
  const pageCache = useRef<Map<number, HTMLCanvasElement>>(new Map()) // 页面缓存（Canvas 元素）
  const INITIAL_LOAD_PAGES = 10 // 初始加载页数
  const PRELOAD_RANGE = 5 // 预加载范围（当前页 ±5 页）

  // 加载 PDF.js SDK（仅在客户端）
  useEffect(() => {
    if (window.pdfjsLib) {
      setSdkLoaded(true)
      return
    }

    console.log('📄 [PDF] 开始加载 PDF.js SDK')

    // 加载 PDF.js 库
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true

    script.onload = () => {
      console.log('📄 [PDF] SDK 加载成功')
      if (window.pdfjsLib) {
        // 配置 worker
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        setSdkLoaded(true)
      }
    }

    script.onerror = () => {
      console.error('📄 [PDF] SDK 加载失败')
      setError('加载 PDF 查看器失败')
      setLoading(false)
    }

    document.body.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  // 加载 PDF 文档
  useEffect(() => {
    if (!sdkLoaded || !fileUrl || !window.pdfjsLib) return

    console.log('📄 [PDF] 开始加载文档')
    setLoading(true)
    setError(null)

    // 获取认证 token
    const token = localStorage.getItem('authToken')

    // 启用 Range Request（分段请求），只下载需要的页面
    const loadingTask = window.pdfjsLib.getDocument({
      url: fileUrl,
      rangeChunkSize: 65536, // 每次请求 64KB
      disableAutoFetch: true, // 禁用自动获取所有页面
      disableStream: false,   // 启用流式传输
      // 添加认证头（用于代理 API）
      httpHeaders: token ? {
        'Authorization': `Bearer ${token}`
      } : {},
    })

    loadingTask.promise
      .then((pdf: any) => {
        console.log('📄 [PDF] 文档加载成功，共', pdf.numPages, '页')
        setPdfDoc(pdf)
        setNumPages(pdf.numPages)

        // 初始只加载前 10 页
        const pagesToLoad = Math.min(INITIAL_LOAD_PAGES, pdf.numPages)
        console.log(`📄 [PDF] 🚀 开始渐进式加载，首次加载前 ${pagesToLoad} 页`)

        setLoading(false)
      })
      .catch((err: Error) => {
        console.error('📄 [PDF] 文档加载失败:', err)
        setError('PDF 加载失败，请稍后重试')
        setLoading(false)
      })

    return () => {
      if (pdfDoc) {
        pdfDoc.destroy()
      }
      // 清理缓存
      pageCache.current.clear()
      setLoadedPages(new Set())
    }
  }, [sdkLoaded, fileUrl])

  // 🆕 渲染指定页面到缓存（后台异步）
  const renderPageToCache = async (pageNum: number) => {
    if (!pdfDoc || loadedPages.has(pageNum)) {
      return
    }

    try {
      console.log(`📄 [PDF] 🎨 渲染第 ${pageNum} 页`)

      const page = await pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale })

      // 🎯 使用设备像素比提高清晰度
      const dpr = window.devicePixelRatio || 1
      const outputScale = dpr

      // 创建离屏 Canvas - 使用高分辨率
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!

      // Canvas 实际像素 = 显示尺寸 × 设备像素比
      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)

      // CSS 显示尺寸保持不变
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      // 缩放绘图上下文以匹配高分辨率
      context.scale(outputScale, outputScale)

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise

      // 缓存 Canvas
      pageCache.current.set(pageNum, canvas)
      setLoadedPages((prev) => new Set(prev).add(pageNum))

      console.log(`📄 [PDF] ✅ 第 ${pageNum} 页完成 (DPR: ${dpr}, Canvas: ${canvas.width}x${canvas.height}, Display: ${viewport.width}x${viewport.height})`)
    } catch (err) {
      console.error(`📄 [PDF] ❌ 第 ${pageNum} 页失败`)
    }
  }

  // 🆕 预加载当前页附近的页面（后台异步，不阻塞）
  const preloadNearbyPages = (currentPage: number) => {
    if (!pdfDoc) return

    const startPage = Math.max(1, currentPage - PRELOAD_RANGE)
    const endPage = Math.min(numPages, currentPage + PRELOAD_RANGE)

    console.log(`📄 [PDF] 📦 预加载第 ${startPage}-${endPage} 页`)

    // 🆕 后台异步加载，不阻塞主线程
    setTimeout(() => {
      // 优先加载当前页前后各 2 页
      const priorityPages = [
        currentPage - 1,
        currentPage + 1,
        currentPage - 2,
        currentPage + 2,
      ].filter(p => p >= startPage && p <= endPage && !loadedPages.has(p))

      priorityPages.forEach(pageNum => {
        renderPageToCache(pageNum)
      })

      // 然后加载其他页面
      setTimeout(() => {
        for (let i = startPage; i <= endPage; i++) {
          if (!loadedPages.has(i) && !priorityPages.includes(i)) {
            renderPageToCache(i)
          }
        }
      }, 500)
    }, 100)
  }

  // 🆕 渲染当前页（从缓存或实时渲染）
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext('2d')!

    // 检查缓存
    const cachedCanvas = pageCache.current.get(pageNumber)
    if (cachedCanvas) {
      console.log(`📄 [PDF] 💨 缓存命中`)
      canvas.width = cachedCanvas.width
      canvas.height = cachedCanvas.height
      canvas.style.width = cachedCanvas.style.width
      canvas.style.height = cachedCanvas.style.height
      context.drawImage(cachedCanvas, 0, 0)

      // 🆕 立即触发预加载（不阻塞渲染）
      preloadNearbyPages(pageNumber)
    } else {
      console.log(`📄 [PDF] 🔄 实时渲染`)

      // 🆕 显示加载提示
      canvas.width = 800
      canvas.height = 600
      context.fillStyle = '#f3f4f6'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = '#6b7280'
      context.font = '16px sans-serif'
      context.textAlign = 'center'
      context.fillText('加载中...', canvas.width / 2, canvas.height / 2)

      // 实时渲染
      pdfDoc.getPage(pageNumber).then((page: any) => {
        const viewport = page.getViewport({ scale })

        // 🎯 使用设备像素比提高清晰度
        const dpr = window.devicePixelRatio || 1
        const outputScale = dpr

        // Canvas 实际像素 = 显示尺寸 × 设备像素比
        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)

        // CSS 显示尺寸保持不变
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`

        // 缩放绘图上下文以匹配高分辨率
        context.scale(outputScale, outputScale)

        console.log(`📄 [PDF] Canvas 实际像素: ${canvas.width} x ${canvas.height}, 显示尺寸: ${viewport.width} x ${viewport.height}, DPR: ${dpr}`)

        page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise.then(() => {
          // 渲染完成后缓存
          const cacheCanvas = document.createElement('canvas')
          cacheCanvas.width = canvas.width
          cacheCanvas.height = canvas.height
          cacheCanvas.style.width = canvas.style.width
          cacheCanvas.style.height = canvas.style.height
          cacheCanvas.getContext('2d')!.drawImage(canvas, 0, 0)
          pageCache.current.set(pageNumber, cacheCanvas)
          setLoadedPages((prev) => new Set(prev).add(pageNumber))

          console.log(`📄 [PDF] ✅ 渲染完成`)

          // 🆕 渲染完成后触发预加载
          preloadNearbyPages(pageNumber)
        })
      })
    }
  }, [pdfDoc, pageNumber, scale])

  // 🆕 连续滚动模式：渲染所有页面
  useEffect(() => {
    if (!pdfDoc || viewMode !== 'continuous') return

    const renderAllPages = async () => {
      // 🎯 使用设备像素比提高清晰度
      const dpr = window.devicePixelRatio || 1
      const outputScale = dpr

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const canvas = document.getElementById(`pdf-page-${pageNum}`) as HTMLCanvasElement
        if (!canvas) continue

        const context = canvas.getContext('2d')!

        // 检查缓存
        const cachedCanvas = pageCache.current.get(pageNum)
        if (cachedCanvas) {
          canvas.width = cachedCanvas.width
          canvas.height = cachedCanvas.height
          canvas.style.width = cachedCanvas.style.width
          canvas.style.height = cachedCanvas.style.height
          context.drawImage(cachedCanvas, 0, 0)
        } else {
          // 渲染页面
          try {
            const page = await pdfDoc.getPage(pageNum)
            const viewport = page.getViewport({ scale })

            // Canvas 实际像素 = 显示尺寸 × 设备像素比
            canvas.width = Math.floor(viewport.width * outputScale)
            canvas.height = Math.floor(viewport.height * outputScale)

            // CSS 显示尺寸保持不变
            canvas.style.width = `${viewport.width}px`
            canvas.style.height = `${viewport.height}px`

            // 缩放绘图上下文以匹配高分辨率
            context.scale(outputScale, outputScale)

            await page.render({
              canvasContext: context,
              viewport: viewport,
            }).promise

            // 缓存
            const cacheCanvas = document.createElement('canvas')
            cacheCanvas.width = canvas.width
            cacheCanvas.height = canvas.height
            cacheCanvas.style.width = canvas.style.width
            cacheCanvas.style.height = canvas.style.height
            cacheCanvas.getContext('2d')!.drawImage(canvas, 0, 0)
            pageCache.current.set(pageNum, cacheCanvas)
            setLoadedPages((prev) => new Set(prev).add(pageNum))
          } catch (err) {
            console.error(`📄 [PDF] ❌ 第 ${pageNum} 页渲染失败`)
          }
        }
      }
    }

    renderAllPages()
  }, [pdfDoc, viewMode, scale, numPages])

  // 页面控制
  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages))
  }

  // 缩放控制
  const zoomIn = () => {
    pageCache.current.clear() // 🆕 清空缓存
    setLoadedPages(new Set()) // 🆕 清空已加载页面记录
    setScale((prev) => Math.min(prev + 0.2, 3.0))
  }

  const zoomOut = () => {
    pageCache.current.clear() // 🆕 清空缓存
    setLoadedPages(new Set()) // 🆕 清空已加载页面记录
    setScale((prev) => Math.max(prev - 0.2, 0.5))
  }

  const resetZoom = () => {
    pageCache.current.clear() // 🆕 清空缓存
    setLoadedPages(new Set()) // 🆕 清空已加载页面记录
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1
    setScale(Math.min(Math.max(1.5, dpr * 1.25), 3.0)) // 重置到自动计算的缩放比例
  }

  // 🆕 适应宽度：根据容器宽度自动调整缩放
  const fitToWidth = () => {
    if (!pdfDoc || !canvasRef.current) {
      console.log('📄 [PDF] fitToWidth: pdfDoc 或 canvasRef 未就绪')
      return
    }

    pdfDoc.getPage(pageNumber).then((page: any) => {
      const viewport = page.getViewport({ scale: 1.0 })

      // 获取容器宽度（向上查找到 overflow-auto 的容器）
      let container = canvasRef.current?.parentElement
      while (container && !container.classList.contains('overflow-auto')) {
        container = container.parentElement
      }

      const containerWidth = container?.clientWidth || 800
      const padding = 64 // 左右各 32px padding
      const optimalScale = (containerWidth - padding) / viewport.width

      console.log('📄 [PDF] 适应宽度计算:', {
        containerWidth,
        pdfWidth: viewport.width,
        optimalScale: optimalScale.toFixed(2),
      })

      pageCache.current.clear() // 🆕 清空缓存
      setLoadedPages(new Set()) // 🆕 清空已加载页面记录
      setScale(Math.max(0.5, Math.min(optimalScale, 3.0))) // 范围 0.5-3.0
    })
  }

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          setPageNumber((prev) => Math.max(prev - 1, 1))
          break
        case 'ArrowRight':
          setPageNumber((prev) => Math.min(prev + 1, numPages))
          break
        case '+':
        case '=':
          setScale((prev) => Math.min(prev + 0.2, 3.0))
          break
        case '-':
        case '_':
          setScale((prev) => Math.max(prev - 0.2, 0.5))
          break
        case '0':
          pageCache.current.clear()
          setLoadedPages(new Set())
          const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1
          setScale(Math.min(Math.max(1.5, dpr * 1.25), 3.0)) // 重置到自动计算的缩放比例
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [numPages])

  // SDK 未加载时显示加载状态
  if (!sdkLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#37322F] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">加载 PDF 查看器...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-600 text-lg mb-2">{error}</p>
          <p className="text-gray-500 text-sm">请检查文件格式或网络连接</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        {/* 左侧：页码控制 */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="上一页"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-sm text-gray-700 min-w-[100px] text-center">
            {loading ? (
              '加载中...'
            ) : (
              <>
                第 {pageNumber} / {numPages} 页
              </>
            )}
          </span>

          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="下一页"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 中间：视图模式切换 + 加载进度 */}
        <div className="flex items-center gap-4">
          {/* 🆕 视图模式切换 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded p-1">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'single'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="单页模式"
            >
              单页
            </button>
            <button
              onClick={() => setViewMode('continuous')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                viewMode === 'continuous'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="连续滚动"
            >
              连续
            </button>
          </div>

          {/* 加载进度 */}
          <div className="text-xs text-gray-500">
            {numPages > 0 && (
              <span>已缓存: {loadedPages.size} / {numPages} 页</span>
            )}
          </div>
        </div>

        {/* 右侧：缩放控制 */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="缩小"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>

          <button
            onClick={resetZoom}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="重置缩放"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="放大"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>

          {/* 🆕 适应宽度按钮 */}
          <button
            onClick={fitToWidth}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors border border-gray-300"
            title="适应宽度"
          >
            <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            适应宽度
          </button>
        </div>
      </div>

      {/* PDF 内容区 */}
      <div className="flex-1 overflow-auto p-4 flex justify-center bg-gray-100">
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-[#37322F] border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">加载 PDF 中...</p>
            </div>
          </div>
        ) : viewMode === 'single' ? (
          // 🆕 单页模式
          <div className="inline-block">
            <canvas
              ref={canvasRef}
              className="shadow-lg bg-white"
              style={{ display: 'block' }}
            />
          </div>
        ) : (
          // 🆕 连续滚动模式
          <div className="flex flex-col gap-4">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <div key={pageNum} className="inline-block">
                <canvas
                  id={`pdf-page-${pageNum}`}
                  className="shadow-lg bg-white"
                  style={{ display: 'block' }}
                />
                <div className="text-center text-xs text-gray-500 mt-2">
                  第 {pageNum} / {numPages} 页
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部信息栏 */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
        <span>快捷键：← 上一页 | → 下一页 | + 放大 | - 缩小</span>
        <span className="text-blue-600">
          🚀 渐进式加载：翻页时自动加载附近内容
        </span>
      </div>
    </div>
  )
}

