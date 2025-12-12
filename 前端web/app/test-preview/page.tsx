'use client'

/**
 * 文件预览测试页面
 * 用于测试 PDF、Office 文档预览功能
 */

import { useState } from 'react'
import { FilePreviewModal } from '@/components/library/FilePreviewModal'

export default function TestPreviewPage() {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<{
    url: string
    name: string
    type: string
  } | null>(null)

  // 测试文件列表
  const testFiles = [
    {
      name: 'PDF 示例文档',
      url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
      type: 'pdf',
      icon: '📄',
      color: 'bg-red-100 text-red-600',
    },
    {
      name: 'Word 示例文档',
      url: 'https://calibre-ebook.com/downloads/demos/demo.docx',
      type: 'docx',
      icon: '📝',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      name: 'Excel 示例表格',
      url: 'https://go.microsoft.com/fwlink/?LinkID=521962',
      type: 'xlsx',
      icon: '📊',
      color: 'bg-green-100 text-green-600',
    },
    {
      name: 'PowerPoint 示例演示',
      url: 'https://go.microsoft.com/fwlink/?LinkID=521963',
      type: 'pptx',
      icon: '📽️',
      color: 'bg-orange-100 text-orange-600',
    },
  ]

  const handlePreview = (file: { url: string; name: string; type: string }) => {
    setPreviewFile(file)
    setPreviewOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📄 文件预览测试
          </h1>
          <p className="text-gray-600 text-lg">
            测试 PDF、Office 文档在线预览功能
          </p>
        </div>

        {/* 功能说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            ✨ 支持的功能
          </h2>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">✓</span>
              <span>
                <strong>PDF 预览</strong>：分页浏览、缩放控制、键盘快捷键（← → + -）
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">✓</span>
              <span>
                <strong>Office 文档</strong>：Word、Excel、PowerPoint 在线预览
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">✓</span>
              <span>
                <strong>图片预览</strong>：JPG、PNG、GIF、WebP、SVG
              </span>
            </li>
          </ul>
        </div>

        {/* 测试文件列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testFiles.map((file, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start gap-4">
                {/* 文件图标 */}
                <div
                  className={`flex-shrink-0 w-16 h-16 ${file.color} rounded-lg flex items-center justify-center text-3xl`}
                >
                  {file.icon}
                </div>

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {file.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    格式：{file.type.toUpperCase()}
                  </p>

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreview(file)}
                      className="px-4 py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors text-sm font-medium"
                    >
                      在线预览
                    </button>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      新窗口打开
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 使用说明 */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📖 使用说明
          </h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                PDF 预览快捷键：
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">←</kbd>{' '}
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">→</kbd>{' '}
                  - 上一页/下一页
                </li>
                <li>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">+</kbd>{' '}
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">-</kbd>{' '}
                  - 放大/缩小
                </li>
                <li>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">0</kbd>{' '}
                  - 重置缩放
                </li>
                <li>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd>{' '}
                  - 关闭预览
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">注意事项：</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Office 文档首次加载可能需要 3-5 秒</li>
                <li>Office 预览由微软 Office Online 提供</li>
                <li>PDF 预览使用 PDF.js，支持离线使用</li>
                <li>所有预览均在浏览器中完成，无需下载</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 返回按钮 */}
        <div className="mt-8 text-center">
          <a
            href="/library-new"
            className="inline-block px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            ← 返回图书馆
          </a>
        </div>
      </div>

      {/* 预览弹窗 */}
      {previewFile && (
        <FilePreviewModal
          isOpen={previewOpen}
          onClose={() => {
            setPreviewOpen(false)
            setTimeout(() => setPreviewFile(null), 300)
          }}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type}
        />
      )}
    </div>
  )
}

