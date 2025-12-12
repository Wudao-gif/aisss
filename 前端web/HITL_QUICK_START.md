# 前端 HITL 快速开始

## ⚡ 5 分钟快速集成

### 1️⃣ 导入 Hook 和组件
```typescript
import { useHITL } from '@/hooks/useHITL'
import { HITLApprovalModal } from '@/components/modals/HITLApprovalModal'
import { Decision } from '@/lib/hitl-utils'
```

### 2️⃣ 初始化 Hook
```typescript
const [hitlState, hitlActions] = useHITL()
const [currentThreadId, setCurrentThreadId] = useState<string>()
```

### 3️⃣ 在 SSE 处理中检查中断
```typescript
// 在 handleSendMessage 的 SSE 循环中
const data = JSON.parse(dataStr)

// 检查中断
if (hitlActions.handleInterrupt(data)) {
  return  // 停止处理，等待用户决策
}

// 继续处理其他事件...
```

### 4️⃣ 添加模态框
```typescript
<HITLApprovalModal
  isOpen={hitlState.isInterrupted}
  actions={hitlState.formattedActions}
  onApprove={handleApprove}
  onCancel={() => hitlActions.clearInterrupt()}
  isLoading={isLoading}
/>
```

### 5️⃣ 实现恢复逻辑
```typescript
async function handleApprove(decisions: Decision[]) {
  // 验证决策
  const result = hitlActions.submitDecisions()
  if (!result.valid) {
    console.error(result.error)
    return
  }

  // 发送到后端
  const response = await fetch('/api/ai/chat/resume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      thread_id: currentThreadId,
      decisions: decisions
    })
  })

  // 处理恢复后的流...
  hitlActions.clearInterrupt()
}
```

## 📦 文件结构

```
前端web/
├── lib/
│   └── hitl-utils.ts              # 工具函数
├── hooks/
│   └── useHITL.ts                 # Hook
├── components/modals/
│   └── HITLApprovalModal.tsx       # 模态框
├── app/api/ai/chat/
│   └── resume/route.ts             # 恢复 API
└── HITL_*.md                       # 文档
```

## 🎯 核心概念

### 中断 (Interrupt)
```typescript
// 检查是否有中断
if (hitlActions.handleInterrupt(data)) {
  // 显示审批模态框
}
```

### 决策 (Decision)
```typescript
// 三种决策类型
{ type: 'approve' }                    // 批准
{ type: 'reject' }                     // 拒绝
{ type: 'edit', edited_action: {...} } // 编辑
```

### 恢复 (Resume)
```typescript
// 发送决策恢复执行
await fetch('/api/ai/chat/resume', {
  body: JSON.stringify({ thread_id, decisions })
})
```

## 🔍 调试

### 查看中断信息
```typescript
console.log('中断信息:', hitlState.interruptInfo)
console.log('格式化操作:', hitlState.formattedActions)
console.log('用户决策:', hitlState.decisions)
```

### 查看验证错误
```typescript
const result = hitlActions.submitDecisions()
if (!result.valid) {
  console.error('验证失败:', result.error)
}
```

## ✅ 检查清单

- [ ] 导入 Hook 和组件
- [ ] 初始化 Hook
- [ ] 在 SSE 处理中添加中断检测
- [ ] 添加模态框
- [ ] 实现恢复逻辑
- [ ] 测试完整流程

## 🚀 测试

### 触发中断
1. 发送会触发 memory_write 的消息
2. 观察模态框显示

### 测试决策
1. 点击"批准"按钮
2. 点击"提交决策"
3. 观察 AI 继续执行

### 测试编辑
1. 点击"编辑"按钮
2. 修改 JSON 参数
3. 点击"保存编辑"
4. 点击"提交决策"

## 📚 更多文档

- `HITL_INTEGRATION_GUIDE.md` - 详细指南
- `HITL_INTEGRATION_EXAMPLE.tsx` - 完整示例
- `HITL_TESTING_GUIDE.md` - 测试指南

## 💡 常见问题

**Q: 如何保存 thread_id？**
```typescript
// 在调用 /api/ai/chat 时获取
const response = await fetch('/api/ai/chat', {...})
// 从响应中提取 thread_id
setCurrentThreadId(response.thread_id)
```

**Q: 决策顺序重要吗？**
是的！决策顺序必须与 action_requests 顺序一致。

**Q: 如何处理多个操作？**
为每个操作创建一个决策，按顺序提交。

---

**快速开始完成！** 🎉

