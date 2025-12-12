# PDF.js 版本不匹配修复

## 问题描述

在 `book-chat-v2?bookId` 页面加载 PDF 时出现错误：
```
The API version "3.4.120" does not match the Worker version "3.11.174".
```

这是因为本地安装的 `pdfjs-dist` 版本（3.4.120）与 CDN 上的 worker 版本（3.11.174）不匹配。

## 修复方案

### 1. 升级 pdfjs-dist 版本 ✅
```bash
npm install pdfjs-dist@3.11.174 --legacy-peer-deps
```

### 2. 复制 Worker 文件到 Public 目录 ✅
```bash
copy node_modules\pdfjs-dist\build\pdf.worker.min.js public\pdf.worker.min.js
```

### 3. 更新 Worker 配置 ✅

**ReactPDFViewer.tsx (第 565 行)**
```typescript
// 之前：使用 CDN 版本
<Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">

// 之后：使用本地文件
<Worker workerUrl="/pdf.worker.min.js">
```

**PDFViewer.tsx (第 60 行)**
```typescript
// 之前：使用 CDN 版本
window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

// 之后：使用本地文件
window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
```

### 4. 自动化 Post-Install 脚本 ✅

添加了 `scripts/copy-pdf-worker.js` 脚本，在 `npm install` 后自动复制 worker 文件。

在 `package.json` 中添加：
```json
"postinstall": "node scripts/copy-pdf-worker.js"
```

## 修复完成清单

- [x] 升级 pdfjs-dist 到 3.11.174
- [x] 复制 worker 文件到 public 目录
- [x] 更新 ReactPDFViewer.tsx 中的 worker URL
- [x] 更新 PDFViewer.tsx 中的 worker URL
- [x] 创建 post-install 脚本自动化复制过程
- [x] 更新 package.json 添加 postinstall 脚本

## 验证

1. 重新启动开发服务器：
```bash
npm run dev
```

2. 访问 `book-chat-v2?bookId=<某个书籍ID>` 页面

3. 检查浏览器控制台，应该不再出现版本不匹配错误

4. PDF 预览应该正常加载

## 相关文件

- `package.json` - 添加了 postinstall 脚本
- `scripts/copy-pdf-worker.js` - 自动复制 worker 文件
- `components/library/ReactPDFViewer.tsx` - 更新 worker URL
- `components/library/PDFViewer.tsx` - 更新 worker URL
- `public/pdf.worker.min.js` - 复制的 worker 文件

## 为什么使用本地 Worker？

1. **版本一致性** - 确保 API 和 Worker 版本完全匹配
2. **离线支持** - 不依赖 CDN，可离线使用
3. **性能** - 本地文件加载速度更快
4. **可靠性** - 不受 CDN 可用性影响

