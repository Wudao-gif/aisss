# 🚀 项目重构设置指南

## ✅ 第一阶段已完成

我已经为你完成了以下工作：

### 1. 修复 TypeScript 配置 ✅
- ✅ 启用严格类型检查
- ✅ 添加环境变量配置

### 2. 创建核心类型定义 ✅
- ✅ `types/index.ts` - 包含所有核心数据类型
- ✅ User, Book, Conversation 等类型
- ✅ API 响应类型

### 3. 搭建 API 层 ✅
- ✅ `lib/api/client.ts` - HTTP 客户端
- ✅ `lib/api/auth.ts` - 认证 API
- ✅ `lib/api/books.ts` - 图书 API
- ✅ 支持后期无缝对接真实后端

### 4. 状态管理 ✅
- ✅ `stores/useAuthStore.ts` - 认证状态
- ✅ `stores/useBookshelfStore.ts` - 书架状态
- ✅ 使用 Zustand（需要安装）

### 5. 错误处理 ✅
- ✅ `components/ErrorBoundary.tsx` - 错误边界组件

### 6. 文档 ✅
- ✅ `README.md` - 项目文档
- ✅ `.env.example` - 环境变量示例

---

## 📦 接下来你需要做的

### 步骤 1：安装 Zustand

```bash
# 如果你有 pnpm
pnpm add zustand

# 或者使用 npm
npm install zustand

# 或者使用 yarn
yarn add zustand
```

### 步骤 2：验证安装

运行开发服务器，检查是否有错误：

```bash
pnpm dev
# 或
npm run dev
```

**预期结果**：
- ❌ 会有很多 TypeScript 错误（因为我们启用了严格检查）
- ✅ 这是正常的！我们会在第二阶段修复

### 步骤 3：查看新创建的文件

打开以下文件，熟悉新的架构：

1. **类型定义**
   ```
   types/index.ts
   ```

2. **API 层**
   ```
   lib/api/client.ts
   lib/api/auth.ts
   lib/api/books.ts
   ```

3. **状态管理**
   ```
   stores/useAuthStore.ts
   stores/useBookshelfStore.ts
   ```

4. **错误处理**
   ```
   components/ErrorBoundary.tsx
   ```

---

## 🎯 第二阶段：组件拆分（下一步）

### 目标
将 1700 行的 `app/page.tsx` 拆分成可维护的小组件。

### 计划拆分的组件

```
app/page.tsx (1700行)
↓ 拆分成
├── components/home/
│   ├── HomePage.tsx          # 主容器（100行）
│   ├── Sidebar.tsx           # 侧边栏（150行）
│   ├── ChatInput.tsx         # 聊天输入框（100行）
│   ├── BookshelfSection.tsx  # 书架区域（100行）
│   ├── UserDropdown.tsx      # 用户下拉菜单（100行）
│   └── Navigation.tsx        # 顶部导航（80行）
└── components/auth/
    ├── LoginModal.tsx        # 登录模态框（200行）
    ├── EmailLogin.tsx        # 邮箱登录（100行）
    ├── WeChatLogin.tsx       # 微信登录（80行）
    └── RegisterForm.tsx      # 注册表单（150行）
```

### 如何使用新的 API 和状态管理

#### 示例 1：在组件中使用认证状态

```typescript
'use client'

import { useAuthStore } from '@/stores/useAuthStore'

export function UserProfile() {
  const { user, logout } = useAuthStore()
  
  if (!user) return null
  
  return (
    <div>
      <p>欢迎，{user.realName}</p>
      <button onClick={logout}>登出</button>
    </div>
  )
}
```

#### 示例 2：使用 API 登录

```typescript
'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useAuthStore((state) => state.login)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = await login(email, password)
    
    if (result.success) {
      alert(result.message)
    } else {
      alert(result.message)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">登录</button>
    </form>
  )
}
```

#### 示例 3：使用书架状态

```typescript
'use client'

import { useEffect } from 'react'
import { useBookshelfStore } from '@/stores/useBookshelfStore'

export function BookshelfList() {
  const { books, loadBookshelf, removeBook } = useBookshelfStore()
  
  useEffect(() => {
    loadBookshelf()
  }, [loadBookshelf])
  
  return (
    <div>
      {books.map((book) => (
        <div key={book.id}>
          <h3>{book.name}</h3>
          <button onClick={() => removeBook(book.id)}>
            移除
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

## 🔧 常见问题

### Q1: TypeScript 报错太多怎么办？
**A**: 这是正常的！我们在第二阶段会逐步修复。如果暂时想运行项目，可以临时改回：
```typescript
// next.config.mjs
typescript: {
  ignoreBuildErrors: true, // 临时改回 true
}
```

### Q2: Zustand 安装失败？
**A**: 确保你的 Node.js 版本 >= 16，然后重试：
```bash
node --version  # 检查版本
pnpm install    # 重新安装所有依赖
```

### Q3: 如何对接真实后端？
**A**: 只需要修改 `.env.local` 中的 API 地址，然后更新 `lib/api/` 中的函数即可。详见 README.md。

### Q4: 现在可以删除旧代码吗？
**A**: **不要！** 等第二阶段完成后再删除。现在保留旧代码作为参考。

---

## 📊 进度追踪

- [x] 第一阶段：基础架构（已完成）
  - [x] TypeScript 配置
  - [x] 类型定义
  - [x] API 层
  - [x] 状态管理
  - [x] 错误处理

- [ ] 第二阶段：组件拆分（进行中）
  - [ ] 拆分主页面
  - [ ] 拆分登录模块
  - [ ] 拆分图书馆页面
  - [ ] 创建共享组件
  - [ ] 性能优化

- [ ] 第三阶段：工程化（待开始）
  - [ ] ESLint + Prettier
  - [ ] 测试框架
  - [ ] Git Hooks
  - [ ] CI/CD

---

## 💡 下一步建议

1. **立即做**：安装 Zustand
   ```bash
   pnpm add zustand
   ```

2. **今天做**：熟悉新的架构
   - 阅读 `types/index.ts`
   - 理解 `lib/api/` 的设计
   - 查看 `stores/` 的用法

3. **明天做**：开始第二阶段
   - 我会帮你拆分 `app/page.tsx`
   - 创建小组件
   - 迁移状态到 Zustand

---

## 🎉 恭喜！

你已经完成了重构的第一步！项目现在有了：
- ✅ 清晰的类型系统
- ✅ 统一的 API 层
- ✅ 现代的状态管理
- ✅ 完善的错误处理
- ✅ 详细的文档

准备好继续第二阶段了吗？告诉我，我会继续帮你！🚀

