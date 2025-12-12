# 📡 Brillance API 文档

**创建时间**: 2025-11-07  
**后端技术**: Next.js 14 API Routes + TypeScript  
**数据库**: PostgreSQL (Docker)  
**ORM**: Prisma

---

## ✅ 已完成的 API

### 1️⃣ 用户认证

#### POST `/api/auth/register` - 用户注册

**请求体**:
```json
{
  "email": "test@example.com",
  "password": "12345678",
  "realName": "张三",
  "university": "四川大学",
  "verificationCode": "123456"
}
```

**成功响应** (201):
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "realName": "张三",
      "university": "四川大学",
      "isBanned": false
    },
    "token": "jwt-token-here"
  }
}
```

**错误响应** (400):
```json
{
  "success": false,
  "message": "该邮箱已被注册"
}
```

---

#### POST `/api/auth/login` - 用户登录

**请求体（密码登录）**:
```json
{
  "email": "test@example.com",
  "password": "12345678",
  "loginMethod": "password"
}
```

**请求体（验证码登录）**:
```json
{
  "email": "test@example.com",
  "verificationCode": "123456",
  "loginMethod": "verification"
}
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "realName": "张三",
      "university": "四川大学",
      "isBanned": false,
      "wechatOpenId": null
    },
    "token": "jwt-token-here"
  }
}
```

**错误响应** (400):
```json
{
  "success": false,
  "message": "密码错误"
}
```

---

#### GET `/api/auth/me` - 获取当前用户信息

**请求头**:
```
Authorization: Bearer <token>
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "test@example.com",
    "realName": "张三",
    "university": "四川大学",
    "isBanned": false,
    "wechatOpenId": null,
    "createdAt": "2025-11-07T10:00:00.000Z"
  }
}
```

**错误响应** (401):
```json
{
  "success": false,
  "message": "无效的认证令牌"
}
```

---

### 2️⃣ 大学管理

#### GET `/api/universities` - 获取大学列表

**成功响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "四川大学",
      "logoUrl": null,
      "createdAt": "2025-11-07T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "name": "清华大学",
      "logoUrl": null,
      "createdAt": "2025-11-07T10:00:00.000Z"
    }
  ]
}
```

---

#### POST `/api/universities` - 创建大学（管理员）

**请求体**:
```json
{
  "name": "北京大学",
  "logoUrl": "https://example.com/logo.png"
}
```

**成功响应** (201):
```json
{
  "success": true,
  "message": "大学创建成功",
  "data": {
    "id": "uuid",
    "name": "北京大学",
    "logoUrl": "https://example.com/logo.png",
    "createdAt": "2025-11-07T10:00:00.000Z"
  }
}
```

---

### 3️⃣ 图书管理

#### GET `/api/books` - 获取图书列表

**查询参数**:
- `universityId` (可选): 按大学筛选
- `search` (可选): 搜索关键词（书名、作者、ISBN）

**示例**:
```
GET /api/books?universityId=uuid&search=数学
```

**成功响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "高等数学（上册）",
      "author": "同济大学数学系",
      "isbn": "9787040396621",
      "publisher": "高等教育出版社",
      "universityId": "uuid",
      "coverUrl": null,
      "createdAt": "2025-11-07T10:00:00.000Z",
      "university": {
        "id": "uuid",
        "name": "四川大学",
        "logoUrl": null
      }
    }
  ]
}
```

---

#### POST `/api/books` - 创建图书（管理员）

**请求体**:
```json
{
  "name": "高等数学（上册）",
  "author": "同济大学数学系",
  "isbn": "9787040396621",
  "publisher": "高等教育出版社",
  "universityId": "uuid",
  "coverUrl": "https://example.com/cover.jpg"
}
```

**成功响应** (201):
```json
{
  "success": true,
  "message": "图书创建成功",
  "data": {
    "id": "uuid",
    "name": "高等数学（上册）",
    "author": "同济大学数学系",
    "isbn": "9787040396621",
    "publisher": "高等教育出版社",
    "universityId": "uuid",
    "coverUrl": "https://example.com/cover.jpg",
    "createdAt": "2025-11-07T10:00:00.000Z",
    "university": {
      "id": "uuid",
      "name": "四川大学",
      "logoUrl": null
    }
  }
}
```

---

### 4️⃣ 书架管理

#### GET `/api/bookshelf` - 获取用户书架

**请求头**:
```
Authorization: Bearer <token>
```

**成功响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "bookId": "uuid",
      "addedAt": "2025-11-07T10:00:00.000Z",
      "book": {
        "id": "uuid",
        "name": "高等数学（上册）",
        "author": "同济大学数学系",
        "isbn": "9787040396621",
        "publisher": "高等教育出版社",
        "coverUrl": null,
        "university": {
          "id": "uuid",
          "name": "四川大学",
          "logoUrl": null
        }
      }
    }
  ]
}
```

---

#### POST `/api/bookshelf` - 添加图书到书架

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "bookId": "uuid"
}
```

**成功响应** (201):
```json
{
  "success": true,
  "message": "添加成功",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "bookId": "uuid",
    "addedAt": "2025-11-07T10:00:00.000Z",
    "book": {
      "id": "uuid",
      "name": "高等数学（上册）",
      "author": "同济大学数学系"
    }
  }
}
```

---

#### DELETE `/api/bookshelf?bookId=uuid` - 从书架移除图书

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `bookId`: 图书 ID

**成功响应** (200):
```json
{
  "success": true,
  "message": "移除成功"
}
```

---

## 🧪 测试 API

### 方法 1: 使用 curl

```bash
# 注册用户
curl -X POST http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "12345678",
    "realName": "张三",
    "university": "四川大学",
    "verificationCode": "123456"
  }'

# 登录
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "12345678",
    "loginMethod": "password"
  }'

# 获取大学列表
curl http://localhost:3002/api/universities

# 获取图书列表
curl http://localhost:3002/api/books

# 获取用户信息（需要 token）
curl http://localhost:3002/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

---

### 方法 2: 使用 Postman 或 Insomnia

1. 导入 API 端点
2. 设置 `Content-Type: application/json`
3. 对于需要认证的接口，添加 `Authorization: Bearer <token>` 头

---

## 📊 数据库状态

### 当前数据:
- ✅ **20 所大学**（已初始化）
- ✅ **3 本示例图书**（已初始化）
- ✅ **0 个用户**（等待注册）
- ✅ **0 个书架项**（等待添加）

---

## 🔐 JWT Token 说明

### Token 生成:
- 注册成功后自动生成
- 登录成功后自动生成
- 有效期：7 天

### Token 使用:
在需要认证的接口中，添加 Header:
```
Authorization: Bearer <token>
```

### Token 包含信息:
```json
{
  "userId": "uuid",
  "email": "test@example.com",
  "iat": 1699363200,
  "exp": 1699968000
}
```

---

## ⚠️ 注意事项

### 1. 验证码功能
目前验证码验证已注释，因为还没有实现发送验证码功能。  
后期需要集成邮件服务（如 SendGrid、阿里云邮件）。

### 2. 密码安全
- 密码使用 bcrypt 加密存储
- 最小长度：8 位
- 建议添加密码强度验证

### 3. CORS 配置
如果前端和后端分离部署，需要配置 CORS。

### 4. 错误处理
所有 API 都有统一的错误响应格式：
```json
{
  "success": false,
  "message": "错误信息"
}
```

---

## 🚀 下一步

1. ✅ 更新前端代码，调用真实 API
2. ✅ 测试完整的注册登录流程
3. ✅ 测试图书和书架功能
4. ⏳ 实现邮件验证码发送
5. ⏳ 实现微信登录功能
6. ⏳ 创建 Python AI 后端（对话功能）

