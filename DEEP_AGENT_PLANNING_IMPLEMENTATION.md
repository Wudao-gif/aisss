# Deep Agent 任务规划与分解实现总结

## 问题

用户指出：Deep Agent 应该**先进行任务规划和分解**，而不是直接给出答案。

例如：
- 用户说："你好"
- ❌ 错误做法：AI 直接回答
- ✅ 正确做法：AI 询问用户的学习目标、当前水平，然后制定计划

## 解决方案

### 1. 更新系统提示词

修改 `ai-education-service/modules/langgraph/deep_agent.py` 中的 `EDUCATION_SYSTEM_PROMPT`：

**核心改变**：
- 强制 AI **先规划，后执行**
- 添加了"不要直接给出答案"的明确指示
- 强调 `write_todos` 工具的重要性
- 提供了具体的工作流程

**新的工作流程**：
```
1. 意图澄清 - 理解用户的真实需求
2. 信息收集 - 询问必要的背景信息
3. 任务规划 - 使用 write_todos 制定详细计划
4. 逐步执行 - 按计划逐个完成子任务
5. 记忆保存 - 使用 memory_write 记录学习成果
```

### 2. Deep Agent 的内置工具

Deep Agent 已经内置了以下工具（无需自定义）：

#### 任务规划工具
- **write_todos** ⭐ 最重要
  - 创建和管理任务清单
  - 支持多层级任务结构
  - 自动跟踪任务进度

#### 记忆管理工具
- **memory_read** - 读取用户学习记忆
- **memory_write** - 保存学习信息

#### 文件系统工具
- **write_file** - 创建文件
- **edit_file** - 编辑文件
- **read_file** - 读取文件
- **ls** - 列出文件

#### 子代理工具
- **task** - 生成专业子代理

### 3. 使用示例

#### 示例1：简单问候
```
用户："你好"

AI 的行动：
1. 询问用户的学习目标和背景
2. 使用 write_todos 制定学习计划
3. 按计划逐步执行
```

#### 示例2：简单问题
```
用户："什么是极限？"

AI 的行动：
1. 先询问用户的水平和需求
2. 使用 write_todos 创建计划：
   - 主任务：理解极限概念
     - 子任务1：学习定义
     - 子任务2：理解性质
     - 子任务3：学习计算方法
     - 子任务4：做练习题
3. 按计划逐步讲解
4. 使用 memory_write 记录学习成果
```

## 关键改变

| 方面 | 之前 | 之后 |
|------|------|------|
| 工作方式 | 直接回答 | 先规划，后执行 |
| 用户交互 | 被动接收 | 主动询问信息 |
| 任务处理 | 直接处理 | 分解为子任务 |
| 工具使用 | 很少使用 write_todos | 主动使用 write_todos |
| 学习效果 | 快速但浅层 | 深入且系统 |

## 文件修改

### 修改的文件
1. `ai-education-service/modules/langgraph/deep_agent.py`
   - 更新 `EDUCATION_SYSTEM_PROMPT`
   - 添加了详细的工作流程指导
   - 强调任务规划的重要性

### 创建的文档
1. `DEEP_AGENT_TOOLS_GUIDE.md` - 工具使用指南
2. `DEEP_AGENT_PLANNING_IMPLEMENTATION.md` - 本文档

## 验证

要验证 Deep Agent 是否正确实现了任务规划：

1. 发送简单问题给 Deep Agent
2. 观察 AI 是否：
   - ✅ 先询问用户信息
   - ✅ 使用 `write_todos` 创建计划
   - ✅ 按计划逐步执行
   - ✅ 使用 `memory_write` 保存信息

## 下一步

- [ ] 测试 Deep Agent 的任务规划功能
- [ ] 根据实际效果调整系统提示词
- [ ] 接入子代理（retrieval_expert, reasoning_expert 等）
- [ ] 优化任务分解的粒度

