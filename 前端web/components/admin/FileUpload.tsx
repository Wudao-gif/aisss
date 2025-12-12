'use client'

/**
 * 文件上传组件
 * 支持图片和文档上传
 */

import { useState, useRef } from 'react'

interface SimpleFileUploadProps {
  accept?: string
  onUpload: (file: File) => Promise<void>
}

// 简单的文件上传组件（用于图书管理）
export default function FileUpload({ accept, onUpload }: SimpleFileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await onUpload(file)
    } catch (error) {
      console.error('上传失败:', error)
      alert('上传失败，请重试')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={uploading}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-lg file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100
          disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {uploading && (
        <p className="mt-2 text-sm text-blue-600">上传中...</p>
      )}
    </div>
  )
}

// 原有的完整功能组件（保留兼容性）
interface FileUploadProps {
  accept?: string
  folder?: string
  onSuccess: (data: { url: string; size: number; type: string; name: string }) => void
  onError?: (error: string) => void
  label?: string
  preview?: boolean
  currentUrl?: string | null
}

export function FileUploadFull({
  accept = 'image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx',
  folder = 'uploads',
  onSuccess,
  onError,
  label = '选择文件',
  preview = false,
  currentUrl,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 文件大小不限制（已移除 100MB 限制）
    // 注意：阿里云 OSS 单个文件最大支持 5GB

    // 如果是图片，显示预览
    if (preview && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }

    // 上传文件
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      })

      const result = await response.json()
      if (result.success) {
        onSuccess(result.data)
      } else {
        onError?.(result.message || '上传失败')
        setPreviewUrl(currentUrl || null)
      }
    } catch (error) {
      console.error('上传失败:', error)
      onError?.('上传失败')
      setPreviewUrl(currentUrl || null)
    } finally {
      setUploading(false)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {preview && previewUrl && (
        <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
          <img src={previewUrl} alt="预览" className="w-full h-full object-cover" />
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? '上传中...' : label}
      </button>

      {currentUrl && !preview && (
        <div className="text-sm text-gray-600">
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            查看当前文件
          </a>
        </div>
      )}
    </div>
  )
}

