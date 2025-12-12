/**
 * PDF.js 配置
 * 设置 worker 路径
 */

import { pdfjs } from 'react-pdf'

// 配置 PDF.js worker
// 使用本地 node_modules 中的 worker，避免版本不匹配
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
}

export { pdfjs }

