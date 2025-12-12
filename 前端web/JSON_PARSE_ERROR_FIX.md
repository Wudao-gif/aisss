# JSON Parse Error 修复指南

## 问题描述

启动应用时出现以下错误：
```
Console SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

这表示某个 API 调用返回了 HTML 而不是 JSON。

## 常见原因

1. **数据库连接失败** - API 端点无法连接到数据库，返回 500 错误页面
2. **环境变量配置错误** - API URL 或数据库连接字符串不正确
3. **API 端点不存在** - 请求的 API 路由不存在
4. **服务未启动** - 依赖的后端服务（如 Letta、AI Service）未启动

## 解决步骤

### 1. 检查数据库连接

```bash
# 验证数据库是否运行
docker ps | grep postgres

# 如果数据库未运行，启动它
docker run -d \
  --name my-auth-postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=user_auth_db \
  -p 5432:5432 \
  postgres:15
```

### 2. 检查环境变量

确保 `.env.local` 中的配置正确：
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
DATABASE_URL="postgresql://postgres:mysecretpassword@127.0.0.1:5432/user_auth_db?schema=public"
```

### 3. 检查浏览器控制台

打开浏览器开发者工具（F12），查看：
- **Network 标签**：找到返回 HTML 的请求
- **Console 标签**：查看完整的错误堆栈

### 4. 检查 API 端点

常见的 API 端点：
- `GET /api/books` - 获取图书列表
- `GET /api/universities` - 获取大学列表
- `GET /api/bookshelf` - 获取书架（需要认证）

### 5. 禁用自动 API 调用

如果数据库暂时不可用，可以临时禁用某些 API 调用：

在 `lib/api/books.ts` 中，修改 `getBooks()` 函数：
```typescript
export async function getBooks(): Promise<Book[]> {
  // 临时返回空数组，避免 API 调用
  return []
}
```

## 快速诊断

在浏览器控制台运行：
```javascript
// 测试 API 连接
fetch('/api/books')
  .then(r => r.json())
  .then(d => console.log('✅ API 正常:', d))
  .catch(e => console.error('❌ API 错误:', e))
```

## 相关文件

- `.env.local` - 本地环境配置
- `.env` - 生产环境配置
- `app/api/books/route.ts` - 图书 API 端点
- `lib/api/books.ts` - 图书 API 客户端

## 更多帮助

如果问题仍未解决，请检查：
1. 数据库日志：`docker logs my-auth-postgres`
2. Next.js 开发服务器日志：查看终端输出
3. 浏览器网络请求：F12 → Network 标签

