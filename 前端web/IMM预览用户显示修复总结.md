# 📄 IMM WebOffice 预览用户显示修复总结

**完成时间**: 2025-11-11  
**修复内容**: IMM WebOffice 预览界面显示当前登录用户的脱敏邮箱，移除"所有者"概念

---

## 🎯 **需求说明**

### **原需求**
1. ✅ 文件（图书和资源）都是公共资源，无所有者
2. ✅ 需要登录才能访问预览
3. ✅ IMM WebOffice 预览界面右上角显示当前登录用户的脱敏邮箱
4. ✅ 不显示"所有者"字样
5. ✅ 传递正确的文件名给 IMM

### **邮箱脱敏规则**
- `324433@qq.com` → `324***@qq.com`
- `abcdefg@gmail.com` → `abc***@gmail.com`
- 规则：保留前3位 + `***` + `@` + 域名

---

## 📊 **数据库结构确认**

### **图书（Book）表**
```prisma
model Book {
  id           String   @id @default(uuid())
  name         String
  author       String
  isbn         String   @unique
  publisher    String
  coverUrl     String?
  fileUrl      String?
  fileSize     Int?
  allowReading Boolean  @default(false)
  // ❌ 没有 userId 或 ownerId 字段
}
```

### **图书资源（BookResource）表**
```prisma
model BookResource {
  id           String   @id @default(uuid())
  bookId       String
  universityId String   // 只有大学ID，没有用户ID
  name         String
  fileUrl      String
  fileType     String
  fileSize     Int
  allowReading Boolean  @default(false)
  // ❌ 没有 userId 或 ownerId 字段
}
```

### **书架（BookshelfItem）表**
```prisma
model BookshelfItem {
  id        String   @id @default(uuid())
  userId    String   // ✅ 用户收藏关系，不是所有权
  bookId    String
  addedAt   DateTime @default(now())
}
```

**结论**: 文件确实是公共资源，没有所有者概念。

---

## 🔧 **修改内容**

### **1. 修改 `/app/api/oss/imm-preview/route.ts`**

#### **新增邮箱脱敏函数**
```typescript
/**
 * 邮箱脱敏函数
 * 例如：324433@qq.com → 324***@qq.com
 *      abcdefg@gmail.com → abc***@gmail.com
 */
function maskEmail(email: string): string {
  const [username, domain] = email.split('@')
  if (!username || !domain) return email
  
  if (username.length <= 3) {
    return `${username[0]}***@${domain}`
  }
  return `${username.slice(0, 3)}***@${domain}`
}
```

#### **修改 API 逻辑**
```typescript
const body = await request.json()
const {
  filePath,
  fileName, // 新增：文件名（用于 IMM 显示）
  readonly = true,
  allowExport = false,
  allowPrint = false,
  allowCopy = true,
  watermarkText,
  // ❌ 移除：userName 参数
} = body

// 获取当前登录用户的邮箱并脱敏
const maskedEmail = maskEmail(decoded.email)

// 生成 WebOffice 预览凭证
const result = await generateWebOfficeToken(filePath, {
  fileName, // ✅ 传递文件名
  permission: { readonly, print: allowPrint, copy: allowCopy, export: allowExport },
  watermark: watermarkText ? { /* ... */ } : undefined,
  // ✅ 始终传递当前登录用户的脱敏邮箱
  user: {
    id: decoded.userId,
    name: maskedEmail, // 显示脱敏后的邮箱
  },
})
```

**关键变化**:
- ❌ **移除** `userName` 参数（之前根据是否传递来决定是否显示用户）
- ✅ **新增** `fileName` 参数（传递给 IMM 显示正确的文件名）
- ✅ **始终传递** 当前登录用户的脱敏邮箱

---

### **2. 修改 `/lib/imm.ts`**

#### **新增 fileName 参数支持**
```typescript
export async function generateWebOfficeToken(
  fileUrl: string,
  options: {
    fileName?: string   // ✅ 新增：文件名（用于 IMM 显示）
    permission?: { /* ... */ }
    watermark?: { /* ... */ }
    user?: {
      id?: string
      name?: string
      avatar?: string
    }
  } = {}
): Promise<{ /* ... */ }> {
  // ...
  
  const request = new $Imm.GenerateWebofficeTokenRequest({
    projectName: process.env.IMM_PROJECT_NAME,
    sourceURI: ossUri,
    ...(options.fileName && { fileName: options.fileName }), // ✅ 传递文件名
    permission: new $Imm.WebofficePermission({ /* ... */ }),
    // ...
  })
  
  console.log('🔧 [IMM] 请求参数:', {
    projectName: process.env.IMM_PROJECT_NAME,
    sourceURI: ossUri,
    fileName: options.fileName, // ✅ 日志输出
    permission: request.permission,
    user: options.user, // ✅ 日志输出
  })
}
```

---

### **3. 修改 `/components/library/ImmOfficeViewer.tsx`**

#### **移除 userName 参数**
```typescript
interface WebOfficeViewerProps {
  fileUrl: string
  fileName: string
  fileType: string
  readonly?: boolean
  allowExport?: boolean
  allowPrint?: boolean
  allowCopy?: boolean
  watermarkText?: string
  // ❌ 移除：userName?: string
}

export function WebOfficeViewer({
  fileUrl,
  fileName,
  fileType,
  readonly = true,
  allowExport = true,
  allowPrint = true,
  allowCopy = true,
  watermarkText,
  // ❌ 移除：userName
}: WebOfficeViewerProps) {
```

#### **修改 API 调用**
```typescript
const response = await fetch('/api/oss/imm-preview', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    filePath: fileUrl,
    fileName, // ✅ 传递文件名
    readonly,
    allowExport,
    allowPrint,
    allowCopy,
    watermarkText,
    // ❌ 移除：userName
  }),
})
```

#### **修改依赖数组**
```typescript
useEffect(() => {
  // ...
  fetchToken()
}, [sdkLoaded, fileUrl, fileName, readonly, allowExport, allowPrint, allowCopy, watermarkText])
// ❌ 移除：userName
```

---

### **4. 修改 `/components/library/BookDrawer.tsx`**

#### **修复预览按钮错误**
```typescript
// ❌ 错误代码（之前）
<button
  onClick={() => {
    setPreviewFile({  // ❌ 未定义的状态
      url: resource.fileUrl,
      name: resource.title,
      type: resource.fileType,
    })
    setPreviewOpen(true)  // ❌ 未定义的状态
  }}
>
  预览
</button>

// ✅ 正确代码（现在）
<button
  onClick={() => {
    handlePreview({  // ✅ 使用已定义的函数
      url: resource.fileUrl,
      name: resource.title,
      type: resource.fileType,
    })
  }}
>
  预览
</button>
```

**说明**: 之前的代码使用了未定义的 `setPreviewFile` 和 `setPreviewOpen`，现在统一使用 `handlePreview` 函数打开新页面预览。

---

## 📝 **修改文件清单**

| 文件 | 修改内容 | 行数变化 |
|------|---------|---------|
| `app/api/oss/imm-preview/route.ts` | 新增邮箱脱敏函数，修改用户信息传递逻辑 | 93 → 118 (+25) |
| `lib/imm.ts` | 新增 fileName 参数支持 | 171 → 175 (+4) |
| `components/library/ImmOfficeViewer.tsx` | 移除 userName 参数，传递 fileName | 222 → 220 (-2) |
| `components/library/BookDrawer.tsx` | 修复预览按钮错误 | 457 → 457 (0) |

---

## 🧪 **测试步骤**

### **1. 访问图书馆**
```
http://localhost:3001/library-new
```

### **2. 测试预览功能**
1. 点击任意图书，打开详情抽屉
2. 点击资源的"预览"按钮
3. 预览页面应在新标签页打开

### **3. 检查 IMM WebOffice 预览界面**
- ✅ 右上角显示当前登录用户的脱敏邮箱（例如：`324***@qq.com`）
- ✅ 不显示"所有者"字样
- ✅ 文件名显示正确

### **4. 检查控制台日志**
```javascript
// 预期日志
📄 [IMM Preview] 用户信息: {
  userId: "xxx-xxx-xxx",
  email: "324433@qq.com",
  maskedEmail: "324***@qq.com"
}

🔧 [IMM] 请求参数: {
  projectName: "xxx",
  sourceURI: "oss://bucket/path/to/file.docx",
  fileName: "文档名称.docx",
  permission: { readonly: true, print: false, copy: true, export: false },
  user: { id: "xxx-xxx-xxx", name: "324***@qq.com" }
}
```

---

## 🎯 **预期效果**

### **IMM WebOffice 预览界面**
```
┌─────────────────────────────────────────────────┐
│  [Word图标] 文档名称.docx   [下载] [×]          │
│                                                 │
│  右上角头像：324***@qq.com  ← 脱敏邮箱          │
│  （不显示"所有者"字样）                         │
├─────────────────────────────────────────────────┤
│                                                 │
│         Office 文档内容                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### **用户体验**
- ✅ 用户看到自己的脱敏邮箱，知道是自己在预览
- ✅ 不会误以为文件归属某个用户
- ✅ 文件名显示正确，便于识别
- ✅ 隐私保护：邮箱中间部分被隐藏

---

## 📚 **技术总结**

### **核心原则**
1. **文件无所有者**: 图书和资源都是公共资源，数据库中没有 `userId` 或 `ownerId` 字段
2. **显示当前用户**: IMM 预览界面显示当前登录用户的信息，而不是文件所有者
3. **隐私保护**: 邮箱脱敏处理，保护用户隐私
4. **文件名传递**: 确保 IMM 显示正确的文件名

### **邮箱脱敏算法**
```typescript
function maskEmail(email: string): string {
  const [username, domain] = email.split('@')
  if (!username || !domain) return email
  
  // 用户名 ≤ 3 位：保留第1位
  if (username.length <= 3) {
    return `${username[0]}***@${domain}`
  }
  // 用户名 > 3 位：保留前3位
  return `${username.slice(0, 3)}***@${domain}`
}
```

### **API 调用流程**
```
用户点击预览
  ↓
前端调用 /api/oss/imm-preview
  ↓
API 验证 JWT token
  ↓
API 获取用户邮箱并脱敏
  ↓
API 调用 IMM SDK 生成预览凭证
  ↓
IMM 返回 accessToken 和 webofficeURL
  ↓
前端加载 WebOffice SDK
  ↓
WebOffice 显示预览界面（右上角显示脱敏邮箱）
```

---

## ✅ **完成状态**

- [x] 邮箱脱敏函数实现
- [x] API 修改：始终传递当前用户脱敏邮箱
- [x] IMM SDK 调用：支持 fileName 参数
- [x] 组件修改：移除 userName 参数
- [x] 修复 BookDrawer 预览按钮错误
- [x] 测试文档编写

---

## 🚀 **下一步**

请测试以下功能：
1. 图书馆资源预览
2. 我的书架资源预览
3. 检查 IMM 预览界面右上角显示
4. 检查文件名是否正确显示
5. 检查邮箱是否正确脱敏

如有问题，请查看浏览器控制台日志。

