'use client'

/**
 * 文件预览页面
 * 支持 PDF、Word、PPT、Excel 等格式的在线预览
 */

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// 动态导入预览组件，禁用 SSR
const PDFViewer = dynamic(
  () => import('@/components/library/PDFViewer').then((mod) => ({ default: mod.PDFViewer })),
  { ssr: false }
)

const WebOfficeViewer = dynamic(
  () => import('@/components/library/ImmOfficeViewer').then((mod) => ({ default: mod.WebOfficeViewer })),
  { ssr: false }
)

function PreviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signedUrl, setSignedUrl] = useState<string>('')

  // 同步检测是否在 iframe 中（避免初始值为 false 导致的问题）
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top

  // 从 URL 参数获取文件信息
  const fileUrl = searchParams.get('url') || ''
  const fileName = searchParams.get('name') || '未命名文件'
  const fileType = searchParams.get('type') || ''
  const source = searchParams.get('source') || 'library' // library 或 bookshelf

  // 调试日志（不暴露敏感信息）
  useEffect(() => {
    console.log('🖼️ 预览页面 - 是否在 iframe 中:', isInIframe)
    console.log('📄 预览页面 - fileName:', fileName)
    console.log('📄 预览页面 - fileType:', fileType)
  }, [])

  // 安全的返回函数 - 在 iframe 中不执行
  const safeGoBack = () => {
    if (!isInIframe) {
      console.log('✅ 不在 iframe 中，执行 router.back()')
      router.back()
    } else {
      console.log('⚠️ 在 iframe 中，阻止 router.back()')
    }
  }

  // 获取文件扩展名
  const getFileExtension = (url: string, type: string): string => {
    if (type) return type.toLowerCase()
    const match = url.match(/\.([^.?]+)(\?|$)/)
    return match ? match[1].toLowerCase() : ''
  }

  const extension = getFileExtension(fileUrl, fileType)

  // 获取签名 URL（仅 PDF 需要）
  useEffect(() => {
    if (!fileUrl) {
      setError('缺少文件 URL')
      setLoading(false)
      return
    }

    // PDF 使用代理 URL（避免 CORS 问题，开发和生产环境都适用）
    if (extension === 'pdf') {
      const token = localStorage.getItem('authToken')
      if (!token) {
        setError('请先登录')
        setLoading(false)
        return
      }

      // 使用代理 API，避免 CORS 问题
      const proxyUrl = `/api/oss/proxy-pdf?filePath=${encodeURIComponent(fileUrl)}`
      setSignedUrl(proxyUrl)
      setLoading(false)
    } else {
      // Office 文档不需要签名 URL
      setLoading(false)
    }
  }, [fileUrl, extension])

  // 渲染预览内容
  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#37322F] mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-600 text-lg mb-2">加载失败</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            {!isInIframe && (
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                返回
              </button>
            )}
          </div>
        </div>
      )
    }

    // PDF 预览
    if (extension === 'pdf') {
      if (!signedUrl) {
        return (
          <div className="flex items-center justify-center h-screen">
            <p className="text-gray-500">正在加载 PDF...</p>
          </div>
        )
      }
      return <PDFViewer fileUrl={signedUrl} fileName={fileName} />
    }

    // Office 文档预览
    if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(extension)) {
      // 所有资源都是官方公共资源，禁止导出和打印
      const isLibrary = source === 'library'

      return (
        <WebOfficeViewer
          fileUrl={fileUrl}
          fileName={fileName}
          fileType={extension}
          readonly={true} // 始终只读
          allowExport={false} // 禁止导出（官方资源不可导出）
          allowPrint={false} // 禁止打印（官方资源不可打印）
          allowCopy={true} // 允许复制
          watermarkText={isLibrary ? '图书馆资源' : '书架资源'}
        />
      )
    }

    // 图片预览
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <img
            src={signedUrl || fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )
    }

    // 不支持的文件类型
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-600 text-lg mb-2">不支持在线预览</p>
          <p className="text-gray-500 text-sm mb-4">文件类型：{extension || '未知'}</p>
          {!isInIframe && (
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              返回
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen">
      {/* 预览内容区域 - 直接全屏显示，不显示顶部导航栏 */}
      <div className="h-full">
        {renderPreview()}
      </div>
    </div>
  )
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#37322F] mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  )
}

