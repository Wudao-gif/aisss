# 🔍 认证问题调试指南

**问题**: 添加书架失败 - `{"success":false,"message":"未提供认证令牌"}`

---

## 📋 问题分析

这个错误说明：
1. 前端没有正确发送 Token 到后端
2. 或者 Token 格式不正确
3. 或者用户根本没有登录

---

## 🛠️ 调试步骤

### 步骤 1: 使用调试工具检查状态

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **访问调试页面**
   ```
   http://localhost:3000/debug-auth.html
   ```

3. **查看状态**
   - ✅ Token 存在？
   - ✅ 用户信息存在？
   - ✅ Zustand 认证状态？
   - ✅ Token 是否过期？

4. **测试 API**
   - 点击"测试添加书架"按钮
   - 查看响应结果

---

### 步骤 2: 手动检查 localStorage

打开浏览器控制台（F12），运行以下命令：

```javascript
// 1. 检查 Token
console.log('Token:', localStorage.getItem('authToken'))

// 2. 检查用户信息
console.log('User:', localStorage.getItem('loggedInUser'))

// 3. 检查 Zustand 存储
console.log('Auth Storage:', localStorage.getItem('auth-storage'))

// 4. 解析 Token
const token = localStorage.getItem('authToken')
if (token) {
  const parts = token.split('.')
  if (parts.length === 3) {
    const payload = JSON.parse(atob(parts[1]))
    console.log('Token Payload:', payload)
    
    // 检查过期时间
    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000)
      const now = new Date()
      console.log('过期时间:', expDate)
      console.log('当前时间:', now)
      console.log('是否过期:', expDate < now)
    }
  }
}
```

---

### 步骤 3: 检查网络请求

1. **打开开发者工具**
   - 按 F12
   - 切换到 Network 标签页

2. **尝试添加书架**
   - 点击图书卡片的"+"按钮
   - 查看 `/api/bookshelf` 请求

3. **检查请求头**
   ```
   Headers:
     Authorization: Bearer <token>
     Content-Type: application/json
   ```

4. **检查请求体**
   ```json
   {
     "bookId": "xxx"
   }
   ```

5. **查看响应**
   - 状态码: 401 = 未授权
   - 响应体: `{"success":false,"message":"未提供认证令牌"}`

---

## 🔧 常见问题和解决方案

### 问题 1: Token 不存在

**症状**:
```javascript
localStorage.getItem('authToken') // null
```

**原因**: 用户未登录

**解决方案**:
1. 访问 `http://localhost:3000/library-new`
2. 点击"登录"按钮
3. 输入邮箱和密码
4. 登录成功后再试

---

### 问题 2: Token 已过期

**症状**:
```javascript
// Token 存在，但过期时间已过
const payload = JSON.parse(atob(token.split('.')[1]))
new Date(payload.exp * 1000) < new Date() // true
```

**原因**: Token 默认有效期 7 天

**解决方案**:
1. 退出登录
2. 重新登录
3. 获取新的 Token

---

### 问题 3: Zustand 状态不同步

**症状**:
```javascript
// localStorage 有 Token，但 Zustand 显示未登录
localStorage.getItem('authToken') // 有值
JSON.parse(localStorage.getItem('auth-storage')).state.isAuthenticated // false
```

**原因**: Zustand 状态没有正确初始化

**解决方案**:
1. 刷新页面
2. 或者清除所有认证信息重新登录
   ```javascript
   localStorage.removeItem('authToken')
   localStorage.removeItem('loggedInUser')
   localStorage.removeItem('auth-storage')
   ```

---

### 问题 4: Token 格式错误

**症状**:
```javascript
const token = localStorage.getItem('authToken')
token.split('.').length !== 3 // true
```

**原因**: Token 被损坏或格式不正确

**解决方案**:
1. 清除认证信息
2. 重新登录

---

### 问题 5: 请求头没有 Authorization

**症状**: Network 标签页显示请求头中没有 `Authorization: Bearer <token>`

**原因**: 前端代码没有正确添加请求头

**检查代码**:
```typescript
// lib/api/books.ts - addToBookshelf 函数
const token = localStorage.getItem('authToken')
if (!token) {
  return { success: false, message: '请先登录' }
}

const response = await fetch('/api/bookshelf', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`, // 确保这行存在
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ bookId }),
})
```

---

## 🧪 测试脚本

### 测试 1: 手动测试添加书架 API

```javascript
// 在浏览器控制台运行
const token = localStorage.getItem('authToken')

fetch('/api/bookshelf', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    bookId: 'test-book-id'
  })
})
.then(r => r.json())
.then(data => {
  console.log('响应:', data)
  if (data.success) {
    console.log('✅ 成功')
  } else {
    console.log('❌ 失败:', data.message)
  }
})
.catch(err => {
  console.error('❌ 错误:', err)
})
```

### 测试 2: 检查 Token 有效性

```javascript
// 在浏览器控制台运行
const token = localStorage.getItem('authToken')

fetch('/api/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  }
})
.then(r => r.json())
.then(data => {
  console.log('当前用户:', data)
  if (data.success) {
    console.log('✅ Token 有效')
  } else {
    console.log('❌ Token 无效:', data.message)
  }
})
```

---

## 📝 完整的登录流程

### 1. 用户点击登录

```typescript
// components/auth/LoginModal.tsx
const handleLogin = async () => {
  const result = await login(email, password)
  if (result.success) {
    // 登录成功
  }
}
```

### 2. 调用登录 API

```typescript
// lib/api/auth.ts
export async function login(credentials) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  
  const data = await response.json()
  
  // 保存 Token
  setAuthToken(data.data.token) // localStorage.setItem('authToken', token)
  
  // 保存用户信息
  localStorage.setItem('loggedInUser', JSON.stringify(data.data.user))
  
  return { success: true, user: data.data.user }
}
```

### 3. 更新 Zustand 状态

```typescript
// stores/useAuthStore.ts
login: async (email, password) => {
  const response = await authApi.login({ email, password })
  
  if (response.success && response.user) {
    set({
      user: response.user,
      isAuthenticated: true, // 设置为已登录
    })
  }
}
```

### 4. 使用 Token 调用 API

```typescript
// lib/api/books.ts
export async function addToBookshelf(bookId: string) {
  const token = localStorage.getItem('authToken')
  
  const response = await fetch('/api/bookshelf', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`, // 发送 Token
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bookId }),
  })
  
  return await response.json()
}
```

---

## 🎯 快速修复清单

如果添加书架失败，按顺序尝试：

- [ ] **步骤 1**: 访问 `http://localhost:3000/debug-auth.html`
- [ ] **步骤 2**: 检查 Token 是否存在
- [ ] **步骤 3**: 检查 Token 是否过期
- [ ] **步骤 4**: 如果没有 Token 或已过期，重新登录
- [ ] **步骤 5**: 登录后，点击"测试添加书架"按钮
- [ ] **步骤 6**: 如果测试成功，返回图书馆页面再试
- [ ] **步骤 7**: 如果还是失败，查看 Network 标签页的详细错误

---

## 🔗 相关文件

### 前端
- `lib/api/auth.ts` - 认证 API
- `lib/api/books.ts` - 图书 API（包含 addToBookshelf）
- `stores/useAuthStore.ts` - 认证状态管理
- `app/library-new/page.tsx` - 图书馆页面

### 后端
- `app/api/auth/login/route.ts` - 登录接口
- `app/api/bookshelf/route.ts` - 书架接口
- `lib/auth-utils.ts` - Token 验证工具

---

## 💡 调试技巧

### 1. 添加日志

在 `app/library-new/page.tsx` 的 `handleAddToBookshelf` 函数中添加日志：

```typescript
const handleAddToBookshelf = async (book: Book) => {
  console.log('=== 添加书架调试 ===')
  console.log('1. 认证状态:', isAuthenticated)
  console.log('2. Token:', localStorage.getItem('authToken'))
  console.log('3. 图书ID:', book.id)
  
  if (!isAuthenticated) {
    console.log('❌ 未登录')
    setLoginModalOpen(true)
    return
  }

  try {
    const { addToBookshelf } = await import('@/lib/api/books')
    console.log('4. 调用 API...')
    
    const result = await addToBookshelf(book.id)
    console.log('5. API 响应:', result)

    if (result.success) {
      console.log('✅ 添加成功')
      addBook({ ...book, addedAt: new Date().toISOString() })
    } else {
      console.log('❌ 添加失败:', result.message)
      alert(result.message || '添加失败')
    }
  } catch (error) {
    console.error('❌ 异常:', error)
    alert('添加失败，请重试')
  }
}
```

### 2. 查看完整的请求和响应

```javascript
// 在 lib/api/books.ts 中添加日志
export async function addToBookshelf(bookId: string) {
  const token = localStorage.getItem('authToken')
  console.log('Token:', token ? '存在' : '不存在')
  
  const response = await fetch('/api/bookshelf', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bookId }),
  })
  
  console.log('响应状态:', response.status)
  const data = await response.json()
  console.log('响应数据:', data)
  
  return data
}
```

---

## 📞 还是不行？

如果按照上述步骤还是无法解决：

1. **截图以下信息**:
   - `http://localhost:3000/debug-auth.html` 的完整页面
   - 浏览器控制台的错误信息
   - Network 标签页的请求详情

2. **提供以下信息**:
   - 使用的浏览器和版本
   - 是否能成功登录
   - 登录后 localStorage 中是否有 authToken

3. **尝试清除所有数据重新开始**:
   ```javascript
   // 清除所有 localStorage
   localStorage.clear()
   
   // 刷新页面
   location.reload()
   
   // 重新登录
   ```

---

**🎉 祝调试顺利！**

