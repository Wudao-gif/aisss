'use client'

/**
 * 文件编辑页面
 * 在新标签页中打开和编辑计划中的文件
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { WebOfficeViewer } from '@/components/library/ImmOfficeViewer'

interface PlanFile {
  id: string
  name: string
  description?: string
  fileUrl: string
  fileType: string
  fileSize: number
  allowReading: boolean
  createdAt: string
}

export default function FileEditPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.planId as string
  const fileId = params.fileId as string

  // 文件相关状态
  const [file, setFile] = useState<PlanFile | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载文件详情
  useEffect(() => {
    // 检查 token 而不是 isAuthenticated 状态，避免初始化延迟导致的跳转
    const token = localStorage.getItem('authToken')
    if (!token) {
      router.push('/new')
      return
    }

    if (fileId) {
      loadFileDetail()
    }
  }, [fileId])

  const loadFileDetail = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch(`/api/plans/${planId}/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setFile(data.data)
      } else {
        alert('加载文件失败: ' + data.message)
      }
    } catch (error) {
      console.error('加载文件失败:', error)
      alert('加载文件失败')
    } finally {
      setLoading(false)
    }
  }

  // 返回计划页面
  const handleBackToPlan = () => {
    router.push(`/plan/${planId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7F5F3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#37322F] mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  // 获取文件类型
  const getFileType = () => {
    if (!file) return ''
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    return ext
  }

  const fileType = getFileType()
  const isOfficeFile = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileType)

  return (
    <div className="w-full min-h-screen relative bg-white overflow-x-hidden">
      {/* 主内容区 - 无侧边栏和顶部导航 */}
      <div className="flex-1 flex flex-col w-full h-screen">

        {/* 主要内容区域 - 文件编辑器 */}
        <div className="relative flex flex-col w-full h-screen">
          {!file ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-600 mb-4">文件不存在</p>
                <button
                  onClick={handleBackToPlan}
                  className="px-4 py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#4a4540]"
                >
                  返回计划
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 文件编辑器 - 全屏显示 */}
              <div className="w-full h-full overflow-hidden bg-white">
                {isOfficeFile ? (
                  <WebOfficeViewer
                    fileUrl={file.fileUrl}
                    fileName={file.name}
                    fileType={fileType}
                    readonly={false}
                    allowExport={true}
                    allowPrint={true}
                    allowCopy={true}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">此文件类型不支持在线编辑</p>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#4a4540] inline-block"
                      >
                        下载文件
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


