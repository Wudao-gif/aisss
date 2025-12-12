/**
 * PDF.js 配置
 * 设置 worker 路径
 */

import { pdfjs } from 'react-pdf'

// 配置 PDF.js worker
// 使用 CDN 版本，无需下载到本地
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
}

export { pdfjs }

