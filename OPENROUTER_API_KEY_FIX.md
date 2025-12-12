# OpenRouter API Key 修复

## 问题描述

当用户在 book-chat-v2 页面保存对话时，系统尝试使用 AI 生成对话标题，但出现以下错误：

```
❌ AI生成标题请求失败: 401 {"error":{"message":"User not found.","code":401}}
```

## 根本原因

前端 `app/api/conversations/route.ts` 中的 `generateTitle()` 函数调用 OpenRouter API 生成对话标题，但使用的 API Key 已过期或被禁用。

## 解决方案

✅ **已更新 OpenRouter API Key**

### 修改的文件

**前端web/.env.local** (第 42 行)

```diff
- OPENROUTER_API_KEY=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
+ OPENROUTER_API_KEY=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
```

## 验证

✅ 新的 API Key 已测试，可以正常工作：

```
状态码: 200
模型: openai/gpt-4o-mini
成本: $0.0000126
```

## 功能恢复

现在用户可以：
1. ✅ 在 book-chat-v2 页面提问
2. ✅ 获取 AI 回答
3. ✅ 保存对话（自动生成标题）
4. ✅ 查看对话历史

## 相关代码

### 对话标题生成流程

```typescript
// 前端web/app/api/conversations/route.ts

async function generateTitle(userMessage: string, assistantMessage: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Book Chat',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: '你是一个标题生成助手...' },
        { role: 'user', content: `用户问题：${userMessage}...` }
      ],
      max_tokens: 30,
      temperature: 0.3,
    }),
  })

  // 处理响应...
}
```

## 环境变量

```bash
# OpenRouter 配置（用于生成对话标题）
OPENROUTER_API_KEY=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
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o-mini
```

## 故障排查

如果仍然出现 401 错误：

1. **检查 API Key 是否正确**
   ```bash
   echo $OPENROUTER_API_KEY
   ```

2. **检查 API Key 是否有效**
   - 访问 https://openrouter.ai/keys
   - 确认 API Key 未过期

3. **检查前端日志**
   ```bash
   # 查看浏览器控制台
   # 或查看 Next.js 服务器日志
   npm run dev
   ```

4. **手动测试 API**
   ```bash
   curl -X POST https://openrouter.ai/api/v1/chat/completions \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}'
   ```

