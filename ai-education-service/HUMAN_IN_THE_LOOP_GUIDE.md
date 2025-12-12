# Human-in-the-Loop (HITL) 使用指南

## 概述

Deep Agent 现已支持 **Human-in-the-loop** 功能，允许对敏感操作进行人工审批。

## 配置

### 当前配置

在 `deep_agent.py` 中已配置：

```python
interrupt_on = {
    # 高风险：修改用户学习记录
    "memory_write": {
        "allowed_decisions": ["approve", "edit", "reject"],
        "description": "需要审批保存的学习记录"
    },
    
    # 低风险：读取信息（无需中断）
    "memory_read": False,
}
```

## 工作流程

### 1. 调用 Agent

```python
from langgraph.types import Command
import uuid

# 创建配置（包含 thread_id 用于状态持久化）
config = {"configurable": {"thread_id": str(uuid.uuid4())}}

# 调用 Agent
result = agent.invoke({
    "messages": [{"role": "user", "content": "保存我的学习笔记"}]
}, config=config)
```

### 2. 检查中断

```python
if result.get("__interrupt__"):
    # 有待审批的操作
    from modules.langgraph.hitl_handler import extract_interrupt_info, format_interrupt_for_display
    
    interrupt_info = extract_interrupt_info(result)
    actions = format_interrupt_for_display(interrupt_info)
    
    # 展示给用户
    for action in actions:
        print(f"工具: {action['tool_name']}")
        print(f"参数: {action['arguments']}")
        print(f"允许的决策: {action['allowed_decisions']}")
```

### 3. 收集用户决策

```python
# 用户决策示例
decisions = [
    {"type": "approve"}  # 批准操作
]

# 或者编辑参数后执行
decisions = [
    {
        "type": "edit",
        "edited_action": {
            "name": "memory_write",
            "args": {
                "user_id": "user123",
                "content": "修改后的笔记内容",
                "memory_type": "learning_notes"
            }
        }
    }
]

# 或者拒绝操作
decisions = [
    {"type": "reject"}
]
```

### 4. 恢复执行

```python
from langgraph.types import Command

# 恢复执行（必须使用相同的 config）
result = agent.invoke(
    Command(resume={"decisions": decisions}),
    config=config  # 使用相同的 config！
)
```

## 决策类型

| 决策 | 说明 |
|------|------|
| `approve` | 批准操作，使用原始参数执行 |
| `edit` | 编辑参数后执行 |
| `reject` | 拒绝操作，跳过此工具调用 |

## 最佳实践

### ✅ 必须做的事

1. **始终使用 checkpointer** - HITL 需要状态持久化
2. **保存 config** - 恢复时必须使用相同的 config
3. **验证决策顺序** - 决策顺序必须与操作顺序一致
4. **处理多个操作** - 如果有多个待审批操作，决策数量必须匹配

### ❌ 不要做的事

1. **不要改变 thread_id** - 会导致状态丢失
2. **不要跳过决策** - 每个操作都需要一个决策
3. **不要乱序决策** - 顺序错误会应用到错误的操作

## 工具函数

### `extract_interrupt_info(result)`
从 Agent 结果中提取中断信息

### `format_interrupt_for_display(interrupt_info)`
格式化中断信息用于前端展示

### `validate_decisions(decisions, action_requests, config_map)`
验证用户决策是否有效

## 示例：完整流程

```python
from modules.langgraph.deep_agent import get_deep_agent
from modules.langgraph.hitl_handler import (
    extract_interrupt_info,
    format_interrupt_for_display,
    validate_decisions,
    create_resume_command
)
from langgraph.types import Command
import uuid

# 获取 Agent
agent = get_deep_agent()

# 创建配置
config = {"configurable": {"thread_id": str(uuid.uuid4())}}

# 调用 Agent
result = agent.invoke({
    "messages": [{"role": "user", "content": "保存学习进度"}]
}, config=config)

# 检查中断
if result.get("__interrupt__"):
    interrupt_info = extract_interrupt_info(result)
    actions = format_interrupt_for_display(interrupt_info)
    
    # 展示操作
    for action in actions:
        print(f"待审批: {action['tool_name']}")
    
    # 用户决策
    decisions = [{"type": "approve"}]
    
    # 验证决策
    is_valid, error = validate_decisions(
        decisions,
        interrupt_info["action_requests"],
        interrupt_info["config_map"]
    )
    
    if is_valid:
        # 恢复执行
        result = agent.invoke(
            Command(resume={"decisions": decisions}),
            config=config
        )
    else:
        print(f"决策验证失败: {error}")
else:
    # 没有中断，直接获取结果
    print(result["messages"][-1].content)
```

## 相关文件

- `modules/langgraph/deep_agent.py` - Deep Agent 主模块（已添加 HITL 配置）
- `modules/langgraph/hitl_handler.py` - HITL 处理工具函数
- `HUMAN_IN_THE_LOOP_GUIDE.md` - 本文档

