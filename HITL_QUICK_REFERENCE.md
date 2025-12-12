# Human-in-the-Loop 快速参考

## 🚀 快速开始

### 1. 导入必要模块
```python
from modules.langgraph.deep_agent import get_deep_agent
from modules.langgraph.hitl_handler import extract_interrupt_info
from langgraph.types import Command
import uuid
```

### 2. 创建配置
```python
config = {"configurable": {"thread_id": str(uuid.uuid4())}}
```

### 3. 调用 Agent
```python
agent = get_deep_agent()
result = agent.invoke({
    "messages": [{"role": "user", "content": "你的问题"}]
}, config=config)
```

### 4. 检查中断
```python
if result.get("__interrupt__"):
    interrupt_info = extract_interrupt_info(result)
    # 处理中断...
```

### 5. 恢复执行
```python
result = agent.invoke(
    Command(resume={"decisions": decisions}),
    config=config
)
```

---

## 📊 决策类型速查表

| 决策 | 代码 | 说明 |
|------|------|------|
| 批准 | `{"type": "approve"}` | 使用原始参数执行 |
| 编辑 | `{"type": "edit", "edited_action": {...}}` | 修改参数后执行 |
| 拒绝 | `{"type": "reject"}` | 跳过此工具调用 |

---

## 🛠️ 工具函数速查表

### extract_interrupt_info(result)
```python
interrupt_info = extract_interrupt_info(result)
# 返回: {
#     "action_requests": [...],
#     "review_configs": [...],
#     "config_map": {...}
# }
```

### format_interrupt_for_display(interrupt_info)
```python
actions = format_interrupt_for_display(interrupt_info)
# 返回: [
#     {
#         "index": 0,
#         "tool_name": "memory_write",
#         "arguments": {...},
#         "allowed_decisions": ["approve", "edit", "reject"],
#         "description": "..."
#     }
# ]
```

### validate_decisions(decisions, action_requests, config_map)
```python
is_valid, error = validate_decisions(decisions, action_requests, config_map)
if not is_valid:
    print(f"错误: {error}")
```

---

## ⚠️ 常见错误

### ❌ 错误 1: 使用不同的 config
```python
# 错误
config1 = {"configurable": {"thread_id": "thread1"}}
result = agent.invoke(input, config=config1)

config2 = {"configurable": {"thread_id": "thread2"}}
result = agent.invoke(Command(resume={...}), config=config2)  # 错误！

# 正确
result = agent.invoke(Command(resume={...}), config=config1)  # 使用相同的 config
```

### ❌ 错误 2: 决策顺序不匹配
```python
# 错误
# action_requests: [delete_file, send_email]
decisions = [
    {"type": "reject"},    # 这会被应用到 delete_file（错误！）
    {"type": "approve"}    # 这会被应用到 send_email（错误！）
]

# 正确
decisions = [
    {"type": "approve"},   # 对应 delete_file
    {"type": "reject"}     # 对应 send_email
]
```

### ❌ 错误 3: 决策数量不匹配
```python
# 错误
# 有 2 个操作，但只提供 1 个决策
decisions = [{"type": "approve"}]

# 正确
decisions = [
    {"type": "approve"},
    {"type": "reject"}
]
```

---

## ✅ 最佳实践

1. **始终保存 config** - 恢复时需要使用
2. **验证决策** - 使用 `validate_decisions()` 检查
3. **处理错误** - 检查 `extract_interrupt_info()` 的返回值
4. **记录日志** - 记录所有中断和决策

---

## 📚 详细文档

- `HUMAN_IN_THE_LOOP_GUIDE.md` - 完整使用指南
- `HITL_IMPLEMENTATION_SUMMARY.md` - 实现总结
- `HITL_FINAL_REPORT.md` - 最终报告

---

## 🔗 相关文件

- `modules/langgraph/deep_agent.py` - Deep Agent 主模块
- `modules/langgraph/hitl_handler.py` - HITL 处理函数
- `test_hitl.py` - 测试脚本

