'use client'

/**
 * 文件预览弹窗组件
 * 支持 PDF 在线预览、Office 文档预览
 */

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// 动态导入 PDFViewer，禁用 SSR
const PDFViewer = dynamic(
  () => import('./PDFViewer').then((mod) => ({ default: mod.PDFViewer })),
  { ssr: false }
)

// 动态导入 WebOfficeViewer，禁用 SSR
const WebOfficeViewer = dynamic(
  () => import('./ImmOfficeViewer').then((mod) => ({ default: mod.WebOfficeViewer })),
  { ssr: false }
)

interface FilePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  fileUrl: string
  fileName: string
  fileType?: string
}

export function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
}: FilePreviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signedUrl, setSignedUrl] = useState<string>('')

  // 获取签名 URL
  useEffect(() => {
    if (!isOpen || !fileUrl) return

    const fetchSignedUrl = async () => {
      setLoading(true)
      setError(null)

      try {
        // 如果是完整 URL，直接使用
        if (fileUrl.startsWith('http')) {
          console.log('使用完整 URL:', fileUrl)
          setSignedUrl(fileUrl)
          setLoading(false)
          return
        }

        // 检查是否已登录
        const token = localStorage.getItem('authToken')
        if (!token) {
          console.error('未找到 authToken，用户可能未登录')
          setError('请先登录后再预览文件')
          setLoading(false)
          return
        }

        console.log('请求签名 URL:', {
          filePath: fileUrl,
          tokenPrefix: token.substring(0, 20) + '...'
        })

        // 否则通过 API 获取签名 URL
        const response = await fetch('/api/oss/sign-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filePath: fileUrl,
            expiresIn: 3600,
          }),
        })

        console.log('API 响应状态:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API 错误响应:', errorText)

          if (response.status === 401) {
            setError('登录已过期，请重新登录')
          } else {
            setError(`获取文件失败 (${response.status})`)
          }
          setLoading(false)
          return
        }

        const result = await response.json()
        console.log('API 响应数据:', result)

        if (result.success) {
          setSignedUrl(result.data.url)
        } else {
          setError(result.message || '获取文件失败')
        }
      } catch (err) {
        console.error('获取签名 URL 失败:', err)
        setError('获取文件失败: ' + (err instanceof Error ? err.message : '未知错误'))
      } finally {
        setLoading(false)
      }
    }

    fetchSignedUrl()
  }, [isOpen, fileUrl])

  // 判断文件类型
  const getFileType = () => {
    if (fileType) return fileType.toLowerCase()
    const ext = fileName.split('.').pop()?.toLowerCase()
    return ext || ''
  }

  const type = getFileType()

  // 渲染预览内容
  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#37322F] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">加载中...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
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
            <p className="text-gray-500 text-sm">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )
    }

    // PDF 预览 - 使用专业的 PDFViewer 组件
    if (type === 'pdf') {
      return <PDFViewer fileUrl={signedUrl} fileName={fileName} />
    }

    // Office 文档预览 - 使用阿里云 WebOffice
    if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(type)) {
      // 从环境变量读取配置
      const readonly = process.env.NEXT_PUBLIC_WEBOFFICE_READONLY !== 'false' // 默认只读
      const watermarkText = process.env.NEXT_PUBLIC_WEBOFFICE_WATERMARK_TEXT || ''
      const allowExport = process.env.NEXT_PUBLIC_WEBOFFICE_ALLOW_EXPORT !== 'false'
      const allowPrint = process.env.NEXT_PUBLIC_WEBOFFICE_ALLOW_PRINT !== 'false'
      const allowCopy = process.env.NEXT_PUBLIC_WEBOFFICE_ALLOW_COPY !== 'false'

      return (
        <WebOfficeViewer
          fileUrl={fileUrl} // 使用原始路径，不是签名 URL
          fileName={fileName}
          fileType={type}
          readonly={readonly}
          allowExport={allowExport}
          allowPrint={allowPrint}
          allowCopy={allowCopy}
          watermarkText={watermarkText}
        />
      )
    }

    // 图片预览
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type)) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 p-8">
          <img src={signedUrl} alt={fileName} className="max-w-full max-h-full object-contain" />
        </div>
      )
    }

    // 不支持预览的文件类型
    return (
      <div className="flex items-center justify-center h-full">
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
          <p className="text-gray-500 text-sm mb-4">请下载文件后查看</p>
          <a
            href={signedUrl}
            download={fileName}
            className="inline-block px-6 py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors"
          >
            下载文件
          </a>
        </div>
      </div>
    )
  }

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] transition-opacity"
        onClick={onClose}
      />

      {/* 预览窗口 */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* 文件图标 */}
              <div className="flex-shrink-0">
                {type === 'pdf' ? (
                  <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                    <path d="M14 2v6h6M10 13h4M10 17h4M10 9h1" />
                  </svg>
                ) : ['doc', 'docx'].includes(type) ? (
                  <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                  </svg>
                ) : ['xls', 'xlsx'].includes(type) ? (
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                  </svg>
                ) : ['ppt', 'pptx'].includes(type) ? (
                  <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                  </svg>
                )}
              </div>

              {/* 文件名 */}
              <h2 className="text-lg font-semibold text-gray-900 truncate">{fileName}</h2>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* 下载按钮 */}
              {signedUrl && !loading && !error && (
                <a
                  href={signedUrl}
                  download={fileName}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="下载"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </a>
              )}

              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="关闭 (Esc)"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 预览内容 */}
          <div className="flex-1 overflow-hidden">{renderPreview()}</div>
        </div>
      </div>
    </>
  )
}

