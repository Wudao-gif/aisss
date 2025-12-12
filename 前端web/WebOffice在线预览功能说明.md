# WebOffice 在线预览功能说明

## 🎉 功能概述

已完成专业的文档在线预览功能，支持 PDF、Office 文档（Word、Excel、PowerPoint）和图片的在线预览。

---

## ✅ 支持的文件格式

### 1️⃣ **PDF 文档** ⭐⭐⭐⭐⭐

**技术方案**: react-pdf + PDF.js

**支持格式**: `.pdf`

**功能特性**:
- ✅ 分页浏览（上一页/下一页）
- ✅ 缩放控制（放大/缩小/重置）
- ✅ 文本选择和复制
- ✅ 键盘快捷键支持
- ✅ 页码显示
- ✅ 流畅的加载动画

**快捷键**:
- `←` / `→` - 上一页/下一页
- `+` / `-` - 放大/缩小
- `0` - 重置缩放

---

### 2️⃣ **Office 文档** ⭐⭐⭐⭐

**技术方案**: 微软 Office Online Viewer

**支持格式**:
- 📄 Word: `.doc`, `.docx`
- 📊 Excel: `.xls`, `.xlsx`
- 📽️ PowerPoint: `.ppt`, `.pptx`

**功能特性**:
- ✅ 100% 还原 Office 格式
- ✅ 支持复杂排版
- ✅ 支持图表、公式
- ✅ 免费使用（微软提供）

**注意事项**:
- 需要文件可公网访问（通过 OSS 签名 URL）
- 首次加载可能需要 3-5 秒
- 依赖微软服务，需要网络连接

---

### 3️⃣ **图片文件** ⭐⭐⭐⭐⭐

**技术方案**: 原生 `<img>` 标签

**支持格式**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`

**功能特性**:
- ✅ 高清显示
- ✅ 自适应缩放
- ✅ 快速加载

---

## 📁 文件结构

### 新增文件

```
Desktop/前端web/
├── components/
│   └── library/
│       ├── FilePreviewModal.tsx      ✅ 文件预览弹窗（主组件）
│       ├── PDFViewer.tsx             ✅ PDF 预览组件
│       ├── OfficeViewer.tsx          ✅ Office 文档预览组件
│       └── BookDrawer.tsx            ✅ 已集成预览功能
├── lib/
│   └── pdfjs-config.ts               ✅ PDF.js 配置
├── app/
│   └── api/
│       └── files/
│           └── signed-url/
│               └── route.ts          ✅ 获取签名 URL API
└── WebOffice在线预览功能说明.md      ✅ 本文档
```

---

## 🔧 技术实现

### 1. PDF 预览组件 (`PDFViewer.tsx`)

```tsx
import { PDFViewer } from './PDFViewer'

<PDFViewer fileUrl={signedUrl} fileName={fileName} />
```

**特性**:
- 使用 `react-pdf` 库
- 支持分页、缩放
- 键盘快捷键
- 加载状态和错误处理

---

### 2. Office 预览组件 (`OfficeViewer.tsx`)

```tsx
import { OfficeViewer } from './OfficeViewer'

<OfficeViewer 
  fileUrl={signedUrl} 
  fileName={fileName} 
  fileType="docx" 
/>
```

**特性**:
- 使用微软 Office Online API
- 自动加载状态
- 错误处理和降级方案

---

### 3. 文件预览弹窗 (`FilePreviewModal.tsx`)

```tsx
import { FilePreviewModal } from './FilePreviewModal'

<FilePreviewModal
  isOpen={true}
  onClose={() => {}}
  fileUrl="path/to/file.pdf"
  fileName="文档.pdf"
  fileType="pdf"
/>
```

**功能**:
- 自动识别文件类型
- 获取 OSS 签名 URL
- 根据类型选择预览组件
- 支持下载

---

## 🚀 使用方法

### 在 BookDrawer 中使用

已集成到图书详情抽屉中：

```tsx
// 点击"在线预览"按钮
<button onClick={() => {
  setPreviewFile({
    url: book.fileUrl,
    name: book.name,
    type: 'pdf'
  })
  setPreviewOpen(true)
}}>
  在线预览
</button>

// 预览弹窗
<FilePreviewModal
  isOpen={previewOpen}
  onClose={() => setPreviewOpen(false)}
  fileUrl={previewFile.url}
  fileName={previewFile.name}
  fileType={previewFile.type}
/>
```

---

## 📊 用户体验流程

### PDF 预览流程

```
用户点击"在线预览"
  ↓
前端获取签名 URL（0.1秒）
  ↓
加载 PDF.js 库
  ↓
渲染 PDF 第一页
  ↓
用户可以：
  - 翻页
  - 缩放
  - 选择文本
  - 下载

总耗时：1-2秒 ✅
```

---

### Office 文档预览流程

```
用户点击"在线预览"
  ↓
前端获取签名 URL（0.1秒）
  ↓
调用微软 Office Online API
  ↓
微软服务器处理文档（2-5秒）
  ↓
渲染文档
  ↓
用户可以查看（只读）

总耗时：3-6秒 ✅
```

---

## 🎨 UI 设计

### 预览弹窗布局

```
┌─────────────────────────────────────────────────┐
│  [文件图标] 文档名称.pdf    [下载] [关闭]       │  ← 顶部工具栏
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────┐     │
│  │                                       │     │
│  │         文档预览区域                   │     │  ← 预览内容
│  │                                       │     │
│  │  - PDF: 分页 + 缩放工具栏              │     │
│  │  - Office: 微软在线预览                │     │
│  │  - 图片: 自适应显示                    │     │
│  │                                       │     │
│  └───────────────────────────────────────┘     │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### PDF 工具栏

```
┌─────────────────────────────────────────────────┐
│  [<] 第 1 / 10 页 [>]     [-] 100% [+]         │
└─────────────────────────────────────────────────┘
```

---

## 🔐 安全性

### OSS 签名 URL

```typescript
// API: /api/files/signed-url
GET /api/files/signed-url?path=book-files/xxx.pdf

Response:
{
  "success": true,
  "data": {
    "url": "https://oss.aliyuncs.com/...?signature=xxx",
    "expiresIn": 3600  // 1小时有效期
  }
}
```

**安全特性**:
- ✅ 需要用户登录（JWT 验证）
- ✅ 签名 URL 有效期 1 小时
- ✅ 私有文件不可直接访问
- ✅ 每次预览重新生成签名

---

## 📦 依赖包

### 已安装

```json
{
  "dependencies": {
    "react-pdf": "^9.x.x",
    "pdfjs-dist": "^4.x.x"
  }
}
```

### 安装命令

```bash
npm install react-pdf pdfjs-dist --legacy-peer-deps
```

---

## 🧪 测试步骤

### 1. 测试 PDF 预览

1. 访问图书馆页面：`http://localhost:3000/library-new`
2. 点击任意图书
3. 在详情抽屉中点击"在线预览"
4. 验证功能：
   - [ ] PDF 正常加载
   - [ ] 可以翻页
   - [ ] 可以缩放
   - [ ] 快捷键有效
   - [ ] 可以下载

---

### 2. 测试 Office 文档预览

1. 上传 Word/Excel/PPT 文件到图书资源
2. 点击资源的"预览"按钮
3. 验证功能：
   - [ ] 文档正常加载
   - [ ] 格式正确显示
   - [ ] 可以滚动查看
   - [ ] 可以下载

---

### 3. 测试图片预览

1. 上传图片文件
2. 点击"预览"
3. 验证功能：
   - [ ] 图片清晰显示
   - [ ] 自适应窗口大小
   - [ ] 可以下载

---

## ⚠️ 注意事项

### 1. PDF.js Worker 配置

使用 CDN 版本，无需下载到本地：

```typescript
pdfjs.GlobalWorkerOptions.workerSrc = 
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
```

---

### 2. Office Online 限制

- 文件必须可公网访问
- 文件大小建议 < 10MB
- 首次加载较慢（3-5秒）
- 依赖微软服务（需要网络）

---

### 3. OSS 签名 URL

- 有效期 1 小时
- 超时后需要重新获取
- 私有 Bucket 必须使用签名 URL

---

## 🎯 后续优化建议

### 1. 性能优化

- [ ] PDF 分页加载（懒加载）
- [ ] 缓存签名 URL
- [ ] 预加载下一页

---

### 2. 功能增强

- [ ] PDF 全文搜索
- [ ] PDF 批注功能
- [ ] 打印功能
- [ ] 全屏模式

---

### 3. 用户体验

- [ ] 记住上次阅读位置
- [ ] 阅读进度条
- [ ] 夜间模式
- [ ] 字体大小调节

---

## 🐛 故障排查

### PDF 无法加载

**可能原因**:
1. PDF.js worker 未正确配置
2. 文件 URL 无效
3. CORS 问题

**解决方案**:
```typescript
// 检查 worker 配置
console.log(pdfjs.GlobalWorkerOptions.workerSrc)

// 检查文件 URL
console.log('File URL:', fileUrl)
```

---

### Office 文档加载失败

**可能原因**:
1. 文件不可公网访问
2. 微软服务不可用
3. 文件格式不支持

**解决方案**:
- 确保 OSS 签名 URL 有效
- 检查网络连接
- 尝试下载文件查看

---

## 📞 技术支持

如有问题，请检查：
1. 浏览器控制台错误信息
2. 网络请求状态
3. OSS 配置是否正确

---

**🎉 WebOffice 在线预览功能已完成！**

现在用户可以直接在浏览器中预览 PDF、Office 文档和图片，无需下载！

