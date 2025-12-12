'use client'

/**
 * 阿里云 IMM WebOffice 在线预览组件
 * 使用阿里云 IMM 的 WebOffice 服务
 * 支持水印、权限控制等高级功能
 */

import { useState, useEffect, useRef } from 'react'

// 声明全局 aliyun 对象
declare global {
  interface Window {
    aliyun?: {
      config: (options: { mount: HTMLElement; url: string }) => {
        setToken: (options: { token: string }) => void
      }
    }
  }
}

interface WebOfficeViewerProps {
  fileUrl: string
  fileName: string
  fileType: string
  // WebOffice 预览选项
  readonly?: boolean
  allowExport?: boolean
  allowPrint?: boolean
  allowCopy?: boolean
  watermarkText?: string
}

export function WebOfficeViewer({
  fileUrl,
  fileName,
  fileType,
  readonly = true, // 默认只读预览
  allowExport = true,
  allowPrint = true,
  allowCopy = true,
  watermarkText,
}: WebOfficeViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [tokenData, setTokenData] = useState<{
    accessToken: string
    webofficeURL: string
    refreshToken: string
  } | null>(null)
  const mountRef = useRef<HTMLDivElement>(null)

  // 加载 WebOffice SDK
  useEffect(() => {
    // 检查 SDK 是否已加载
    if (window.aliyun) {
      console.log('📄 [WebOffice] SDK 已存在')
      setSdkLoaded(true)
      return
    }

    // 动态加载 SDK
    const script = document.createElement('script')
    script.src = 'https://g.alicdn.com/IMM/office-js/1.1.19/aliyun-web-office-sdk.min.js'
    script.async = true

    script.onload = () => {
      console.log('📄 [WebOffice] SDK 已加载')
      setSdkLoaded(true)
    }

    script.onerror = () => {
      console.error('📄 [WebOffice] SDK 加载失败')
      setError('加载预览组件失败')
      setLoading(false)
    }

    document.body.appendChild(script)

    return () => {
      // 清理：移除 script 标签
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  // 获取 WebOffice 凭证
  useEffect(() => {
    if (!sdkLoaded) return

    const fetchToken = async () => {
      setLoading(true)
      setError(null)

      try {
        const token = localStorage.getItem('authToken')
        if (!token) {
          console.error('❌ [WebOffice] 未找到 authToken')
          setError('请先登录后再预览文件')
          setLoading(false)
          return
        }

        console.log('📄 [WebOffice] 请求预览凭证:', {
          filePath: fileUrl,
          tokenPrefix: token.substring(0, 20) + '...'
        })

        const response = await fetch('/api/oss/imm-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filePath: fileUrl,
            fileName, // 传递文件名
            readonly,
            allowExport,
            allowPrint,
            allowCopy,
            watermarkText,
          }),
        })

        console.log('📄 [WebOffice] API 响应状态:', response.status)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || '获取预览凭证失败')
        }

        const result = await response.json()
        console.log('📄 [WebOffice] API 响应数据:', result)

        if (result.success && result.data) {
          setTokenData({
            accessToken: result.data.accessToken,
            webofficeURL: result.data.webofficeURL,
            refreshToken: result.data.refreshToken,
          })
          console.log('📄 [WebOffice] ✅ 凭证已获取')
        } else {
          throw new Error(result.message || '获取预览凭证失败')
        }
      } catch (err) {
        console.error('获取预览凭证失败:', err)
        setError(err instanceof Error ? err.message : '获取预览凭证失败')
        setLoading(false)
      }
    }

    fetchToken()
  }, [sdkLoaded, fileUrl, fileName, readonly, allowExport, allowPrint, allowCopy, watermarkText])

  // 初始化 WebOffice SDK
  useEffect(() => {
    if (!sdkLoaded || !tokenData || !mountRef.current) {
      return
    }

    try {
      console.log('📄 [WebOffice] 初始化 SDK')
      
      if (!window.aliyun) {
        throw new Error('WebOffice SDK 未加载')
      }

      const instance = window.aliyun.config({
        mount: mountRef.current,
        url: tokenData.webofficeURL,
      })

      instance.setToken({ token: tokenData.accessToken })
      
      console.log('📄 [WebOffice] ✅ SDK 初始化成功')
      setLoading(false)
    } catch (err) {
      console.error('初始化 WebOffice SDK 失败:', err)
      setError(err instanceof Error ? err.message : '初始化预览失败')
      setLoading(false)
    }
  }, [sdkLoaded, tokenData])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-2">预览失败</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">正在加载预览...</p>
          </div>
        </div>
      )}

      {/* WebOffice 挂载点 */}
      <div
        ref={mountRef}
        id="weboffice-zone"
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      />
    </div>
  )
}

