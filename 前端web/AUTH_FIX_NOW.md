# 🔐 添加书架认证问题 - 立即解决

**问题**: `{"success":false,"message":"未提供认证令牌"}`

---

## 🚀 立即测试（3步）

### 步骤 1: 访问测试页面

```
http://localhost:3000/test-auth.html
```

### 步骤 2: 点击"刷新状态"

查看当前状态：
- ✅ Token 存在？
- ✅ Token 是否过期？
- ✅ 用户信息存在？

### 步骤 3: 根据结果操作

#### 情况 A: Token 不存在或已过期
**解决方案**: 在测试页面上：
1. 输入邮箱和密码
2. 点击"测试登录"
3. 登录成功后，点击"测试添加书架"

#### 情况 B: Token 存在但添加书架失败
**解决方案**: 点击"运行完整测试"按钮
- 这会清除所有数据，重新登录，然后测试添加书架
- 查看详细的错误信息

---

## 🎯 最可能的原因

### 原因 1: 未登录
**症状**: localStorage 中没有 `authToken`

**解决方案**:
1. 访问 `http://localhost:3000/library-new`
2. 点击"登录"按钮
3. 输入邮箱和密码
4. 登录成功后再试

### 原因 2: Token 已过期
**症状**: Token 存在，但过期时间已过

**解决方案**:
1. 在测试页面点击"清除所有数据"
2. 重新登录

### 原因 3: Zustand 状态不同步
**症状**: localStorage 有 Token，但 `isAuthenticated` 为 false

**解决方案**:
1. 刷新页面
2. 或者清除数据重新登录

---

## 🔍 手动检查

在浏览器控制台（F12）运行：

```javascript
// 1. 检查 Token
console.log('Token:', localStorage.getItem('authToken'))

// 2. 检查用户
console.log('User:', localStorage.getItem('loggedInUser'))

// 3. 检查 Zustand
console.log('Auth Storage:', localStorage.getItem('auth-storage'))

// 4. 手动测试添加书架
const token = localStorage.getItem('authToken')
fetch('/api/bookshelf', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ bookId: 'test-id' })
})
.then(r => r.json())
.then(data => {
  console.log('结果:', data)
  if (data.success) {
    console.log('✅ 成功')
  } else {
    console.log('❌ 失败:', data.message)
  }
})
```

---

## 📝 测试账号

如果你没有测试账号，可以使用以下命令创建：

```bash
npx tsx scripts/create-test-user.ts
```

或者在数据库中查找现有用户：

```bash
npx tsx scripts/list-users.ts
```

---

## 🎯 快速修复步骤

### 方案 1: 使用测试页面（推荐）

1. 访问 `http://localhost:3000/test-auth.html`
2. 点击"运行完整测试"
3. 查看结果

### 方案 2: 在图书馆页面重新登录

1. 访问 `http://localhost:3000/library-new`
2. 打开浏览器控制台（F12）
3. 运行 `localStorage.clear()`
4. 刷新页面
5. 重新登录
6. 尝试添加书架

### 方案 3: 使用无痕模式

1. 打开无痕窗口（Ctrl + Shift + N）
2. 访问 `http://localhost:3000/library-new`
3. 登录
4. 尝试添加书架

---

## 🔧 如果测试页面显示登录成功但添加书架失败

这说明后端 API 有问题。请检查：

### 1. 后端是否正确验证 Token

查看 `app/api/bookshelf/route.ts`：

```typescript
// 应该有类似的代码
const authHeader = request.headers.get('authorization')
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return NextResponse.json({
    success: false,
    message: '未提供认证令牌'
  }, { status: 401 })
}

const token = authHeader.substring(7)
const decoded = verifyToken(token)
```

### 2. Token 验证函数是否正常

查看 `lib/auth-utils.ts` 中的 `verifyToken` 函数。

---

## 📊 诊断清单

- [ ] 访问测试页面
- [ ] 检查 Token 是否存在
- [ ] 检查 Token 是否过期
- [ ] 测试登录功能
- [ ] 测试添加书架功能
- [ ] 运行完整流程测试
- [ ] 查看详细错误信息

---

## 💡 常见错误和解决方案

### 错误 1: "未提供认证令牌"
**原因**: 
- Token 不存在
- Token 格式错误
- 请求头没有正确设置

**解决**: 重新登录

### 错误 2: "Token 已过期"
**原因**: Token 超过有效期（默认 7 天）

**解决**: 重新登录

### 错误 3: "无效的 Token"
**原因**: 
- Token 被篡改
- JWT 密钥不匹配

**解决**: 清除数据，重新登录

---

## 🎉 预期结果

### 成功的登录流程

1. **登录请求**
   ```json
   POST /api/auth/login
   {
     "email": "test@example.com",
     "password": "password123",
     "loginMethod": "password"
   }
   ```

2. **登录响应**
   ```json
   {
     "success": true,
     "data": {
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "user": {
         "id": "xxx",
         "email": "test@example.com",
         "name": "Test User"
       }
     }
   }
   ```

3. **保存 Token**
   ```javascript
   localStorage.setItem('authToken', token)
   localStorage.setItem('loggedInUser', JSON.stringify(user))
   ```

4. **添加书架请求**
   ```json
   POST /api/bookshelf
   Headers: {
     "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "Content-Type": "application/json"
   }
   Body: {
     "bookId": "xxx"
   }
   ```

5. **添加书架响应**
   ```json
   {
     "success": true,
     "message": "添加成功"
   }
   ```

---

## 📞 还是不行？

如果按照上述步骤还是失败，请提供：

1. **测试页面截图**
   - `http://localhost:3000/test-auth.html`
   - 点击"刷新状态"后的完整截图

2. **完整测试结果**
   - 点击"运行完整测试"
   - 截图结果

3. **浏览器控制台**
   - F12 → Console 标签页
   - F12 → Network 标签页（筛选 /api/bookshelf）

---

**🎯 现在就访问测试页面！**

```
http://localhost:3000/test-auth.html
```

这个页面会告诉你：
- ✅ Token 是否存在
- ✅ Token 是否过期
- ✅ 登录是否成功
- ✅ 添加书架是否成功
- ✅ 详细的错误信息

