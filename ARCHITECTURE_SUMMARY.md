# 系统架构总结

## 当前状态 ✅

应用已成功修复，所有服务正常运行。

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     前端 (Next.js)                          │
│                  http://localhost:3000                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                    /api/ai/chat
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              后端 AI Education Service                       │
│                  http://localhost:8000                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Deep Agent (LangGraph 主系统)                │  │
│  │                                                      │  │
│  │  ├─ Retrieval Agent (检索知识)                      │  │
│  │  ├─ Reasoning Agent (推理分析)                      │  │
│  │  ├─ Expression Agent (表达生成)                     │  │
│  │  └─ Memory Tools (记忆管理)                         │  │
│  │     ├─ memory_read (读取学习轨迹)                  │  │
│  │     └─ memory_write (保存学习轨迹)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   DashVector      PostgreSQL         Neo4j
   (向量库)        (对话历史)         (知识图谱)
```

## 关键组件

### 1. 前端 (Next.js)
- **地址**: http://localhost:3000
- **主要页面**: book-chat-v2
- **功能**: 用户界面、对话交互

### 2. 后端 (AI Education Service)
- **地址**: http://localhost:8000
- **核心**: Deep Agent (LangGraph)
- **功能**: 智能问答、学习轨迹管理

### 3. 数据存储
- **DashVector**: 学习轨迹向量库
- **PostgreSQL**: 对话历史、LangGraph 检查点
- **Neo4j**: 知识图谱

## 学习轨迹流程

1. 用户在前端提问
2. 前端调用 `/api/ai/chat`
3. Deep Agent 处理问题
4. Deep Agent 自动调用 `memory_write` 工具
5. 学习轨迹保存到 DashVector
6. 返回答案给前端

## 已禁用的组件

- **Letta Memory Agent** (端口 8283)
  - 原因: 功能已由 Deep Agent 替代
  - 状态: 运行中但不使用
  - 前端 Letta Sync API 已禁用

## 环境变量

### 前端 (.env.local)
```
NEXT_PUBLIC_DISABLE_LETTA_SYNC=true
```

### 后端 (.env)
```
OPENROUTER_API_KEY=sk-or-v1-xxxxx
DASHVECTOR_API_KEY=sk-AqAOv6Z03Mhlld28foH5YHHdIO5lY89C826E5CC4911F0B9EF4E3A839ACE20
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

## 故障排查

### 如果 Deep Agent 不保存学习轨迹
1. 检查后端日志: `docker logs ai-education-service`
2. 确认 DashVector 连接正常
3. 检查 memory_write 工具是否被调用

### 如果前端无法连接后端
1. 检查后端是否运行: `docker ps | grep ai-education`
2. 检查端口 8000 是否开放
3. 查看后端日志: `docker logs ai-education-service`

## 相关文档

- `前端web/LETTA_DISABLED_SUMMARY.md` - Letta 禁用详情
- `ai-education-service/modules/langgraph/tools/memory.py` - 记忆工具实现
- `ai-education-service/modules/memory_store.py` - 向量库存储

