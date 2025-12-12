# PDF.js 版本不匹配问题 - 完整修复总结

## 问题

在 `book-chat-v2?bookId` 页面加载 PDF 时出现错误：
```
The API version "3.4.120" does not match the Worker version "3.11.174".
```

## 根本原因

- 本地安装的 `pdfjs-dist` 版本：**3.4.120**
- CDN 上的 worker 版本：**3.11.174**
- 版本不匹配导致 PDF 加载失败

## 完整修复步骤

### ✅ 步骤 1: 升级 pdfjs-dist 包
```bash
npm install pdfjs-dist@3.11.174 --legacy-peer-deps
```
**结果**: 本地版本升级到 3.11.174，与 CDN 版本一致

### ✅ 步骤 2: 复制 Worker 文件到 Public 目录
```bash
copy node_modules\pdfjs-dist\build\pdf.worker.min.js public\pdf.worker.min.js
```
**结果**: Worker 文件已复制到 `public/pdf.worker.min.js`

### ✅ 步骤 3: 更新 ReactPDFViewer.tsx
**文件**: `components/library/ReactPDFViewer.tsx` (第 565 行)

**修改前**:
```typescript
<Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
```

**修改后**:
```typescript
<Worker workerUrl="/pdf.worker.min.js">
```

### ✅ 步骤 4: 更新 PDFViewer.tsx
**文件**: `components/library/PDFViewer.tsx` (第 60 行)

**修改前**:
```typescript
window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
```

**修改后**:
```typescript
window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
```

### ✅ 步骤 5: 创建 Post-Install 脚本
**文件**: `scripts/copy-pdf-worker.js`

自动在 `npm install` 后复制 worker 文件，确保版本一致性。

### ✅ 步骤 6: 更新 package.json
**文件**: `package.json`

添加 postinstall 脚本：
```json
"postinstall": "node scripts/copy-pdf-worker.js"
```

## 修复验证

### 启动开发服务器
```bash
npm run dev
```

### 测试 PDF 加载
1. 访问 `http://localhost:3000/book-chat-v2?bookId=<书籍ID>`
2. 检查浏览器控制台 (F12)
3. 应该不再出现版本不匹配错误
4. PDF 预览应该正常加载

### 检查 Worker 文件
```bash
# 验证文件是否存在
ls -la public/pdf.worker.min.js
```

## 修复的优势

| 方面 | 之前 | 之后 |
|------|------|------|
| 版本一致性 | ❌ 不匹配 | ✅ 完全一致 |
| 离线支持 | ❌ 依赖 CDN | ✅ 本地文件 |
| 加载速度 | ⚠️ CDN 延迟 | ✅ 本地加载 |
| 可靠性 | ⚠️ CDN 依赖 | ✅ 独立运行 |
| 自动化 | ❌ 手动复制 | ✅ 自动化脚本 |

## 相关文件修改清单

- [x] `package.json` - 添加 postinstall 脚本
- [x] `scripts/copy-pdf-worker.js` - 新建自动化脚本
- [x] `components/library/ReactPDFViewer.tsx` - 更新 worker URL
- [x] `components/library/PDFViewer.tsx` - 更新 worker URL
- [x] `public/pdf.worker.min.js` - 复制的 worker 文件
- [x] `PDFJS_VERSION_FIX.md` - 详细修复文档

## 后续步骤

1. **重新启动开发服务器**
   ```bash
   npm run dev
   ```

2. **测试 PDF 功能**
   - 打开任何包含 PDF 的书籍
   - 验证 PDF 预览正常加载
   - 检查浏览器控制台无错误

3. **提交代码**
   - 提交所有修改的文件
   - 包括 postinstall 脚本

## 常见问题

**Q: 为什么不继续使用 CDN？**
A: CDN 版本可能随时更新，导致版本不匹配。本地文件确保版本一致性。

**Q: 如果 npm install 失败怎么办？**
A: 脚本设计为不会中断安装过程，可以手动运行：
```bash
node scripts/copy-pdf-worker.js
```

**Q: 如何验证修复成功？**
A: 打开浏览器开发者工具 (F12)，查看 Network 标签，确认 `/pdf.worker.min.js` 加载成功。

