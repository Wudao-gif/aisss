"""
Deep Agent 主模块
作为主系统替代原有的 LangGraph Supervisor 架构

配置项：
- model: 主 LLM 模型
- tools: 自定义工具（检索、记忆等）
- system_prompt: 系统提示词
- subagents: 子代理列表（后续逐个接入）
- checkpointer: 短期记忆持久化
- store: 长期记忆持久化
- backend: 文件系统后端
- middleware: 中间件
- interrupt_on: 人机协作中断配置
"""

import logging
from typing import Dict, Any, Optional, List, AsyncGenerator

from deepagents import create_deep_agent, SubAgent
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.store.base import BaseStore

from config import settings
from .tools import memory_read, memory_write
from .retrieval_subagent import create_retrieval_subagent

logger = logging.getLogger(__name__)


# ==================== 系统提示词 ====================

EDUCATION_SYSTEM_PROMPT = """你是一个专业的 AI 教育辅导助手，专门帮助学生学习教材内容。

## 核心工作方式：先规划，后执行

你的工作流程应该是：
1. **意图澄清** - 理解用户的真实需求
2. **信息收集** - 询问必要的背景信息
3. **任务规划** - 使用 write_todos 制定详细计划
4. **逐步执行** - 按计划逐个完成子任务
5. **记忆保存** - 使用 memory_write 记录学习成果

## 重要原则

⚠️ **不要直接给出答案！** 除非用户的问题非常明确且简单。

对于大多数问题，你应该：
- 先询问用户的学习目标
- 了解用户的当前水平
- 询问用户需要什么形式的帮助（讲解/练习/总结等）
- 然后制定学习计划
- 最后按计划逐步执行

## 你的能力

### 1. 记忆管理工具
- **memory_read** - 读取用户的学习记忆（学习历史、知识理解、用户画像）
- **memory_write** - 保存重要的学习信息到用户记忆库

### 2. 任务规划工具 ⭐ 最重要
- **write_todos** - 创建和管理任务清单，用于学习任务的分解和规划
  - 用于制定学习计划
  - 用于分解复杂问题
  - 用于规划复习策略
  - 支持多层级任务结构（主任务 + 子任务）

### 3. 文件系统工具
- **write_file** - 创建学习笔记、总结文档
- **edit_file** - 编辑现有文件
- **read_file** - 读取文件内容
- **ls** - 列出文件列表

### 4. 子代理工具
- **task** - 为特定任务生成专业子代理

## 工具使用指南

### memory_read 工具
- 在对话开始时使用，了解用户背景
- 参数：user_id、query、memory_type（可选）

### write_todos 工具 ⭐ 关键
- 用户提问时，**立即使用**此工具制定计划
- 即使是简单问题，也要分解为子任务
- 示例：
  ```
  用户："什么是极限？"
  你的行动：
  1. 使用 write_todos 创建计划：
     - 主任务：理解极限概念
       - 子任务1：学习极限的定义
       - 子任务2：理解极限的性质
       - 子任务3：做练习题
  2. 按计划逐步讲解
  ```

### memory_write 工具
- **当用户明确要求保存时，立即使用**（例如："保存我的笔记"、"记录学习进度"）
- 在对话结束时使用
- 保存用户的理解程度、学习进度
- 参数：user_id、memory_text、memory_type（profile/understanding/learning_track）

## 特殊情况处理

### 用户要求保存笔记或记录学习进度时
当用户说"保存我的笔记"、"记录学习进度"、"保存学习记录"等时：
1. **立即调用 memory_write 工具**，不要询问或延迟
2. 使用用户提供的内容作为 memory_text
3. 根据内容选择合适的 memory_type：
   - "learning_track" - 学习历史、进度、笔记
   - "understanding" - 知识理解、掌握情况
   - "profile" - 用户画像、学习风格

## 输出要求

- 使用中文回答
- 条理清晰，重点突出
- 根据学生水平调整表达方式
- 对于数学公式使用 LaTeX 格式
- **主动使用 write_todos 进行任务规划**
- **先规划，后执行**
- **当用户明确要求保存时，立即调用 memory_write，不要延迟**

## 当前上下文

用户ID: {user_id}
教材ID: {book_id}
教材名称: {book_name}
学科: {book_subject}
"""


# ==================== 全局实例 ====================

_deep_agent = None
_checkpointer: Optional[BaseCheckpointSaver] = None
_store: Optional[BaseStore] = None


def set_deep_agent_checkpointer(checkpointer: Optional[BaseCheckpointSaver]) -> None:
    """设置 Checkpointer（由 main.py 调用）"""
    global _checkpointer, _deep_agent
    _checkpointer = checkpointer
    _deep_agent = None  # 重置，下次调用时重新创建
    logger.info(f"Deep Agent Checkpointer 已设置: {checkpointer is not None}")


def set_deep_agent_store(store: Optional[BaseStore]) -> None:
    """设置 Store（由 main.py 调用）"""
    global _store, _deep_agent
    _store = store
    _deep_agent = None  # 重置，下次调用时重新创建
    logger.info(f"Deep Agent Store 已设置: {store is not None}")


def _get_model() -> ChatOpenAI:
    """获取 LLM 模型"""
    if settings.CHAT_PROVIDER == "dashscope":
        return ChatOpenAI(
            model=settings.CHAT_MODEL,
            api_key=settings.DASHSCOPE_API_KEY,
            base_url=settings.DASHSCOPE_BASE_URL,
        )
    else:
        return ChatOpenAI(
            model=settings.OPENROUTER_CHAT_MODEL,
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
        )


def get_deep_agent():
    """获取 Deep Agent 单例"""
    global _deep_agent

    if _deep_agent is not None:
        return _deep_agent

    logger.info("创建 Deep Agent...")

    # 获取模型
    model = _get_model()

    # 定义工具（主系统只用记忆工具，检索工具由子智能体使用）
    tools = [
        memory_read,
        memory_write,
    ]

    # 配置 Human-in-the-loop：根据风险等级定制审批策略
    interrupt_on = {
        # 高风险：修改用户学习记录，允许完全控制（批准、编辑、拒绝）
        "memory_write": {
            "allowed_decisions": ["approve", "edit", "reject"],
            "description": "需要审批保存的学习记录"
        },

        # 低风险：读取信息，无需中断（自动执行）
        "memory_read": False,
    }

    # 子代理列表（逐个接入）
    subagents: List[SubAgent] = [
        # ✅ 检索专家 - 从教材和知识图谱中检索信息
        create_retrieval_subagent(),
        # TODO: 接入 reasoning_expert
        # TODO: 接入 generation_expert
        # TODO: 接入 expression_expert
        # TODO: 接入 quality_expert
    ]

    # 创建 Deep Agent（包含 Human-in-the-loop 支持）
    _deep_agent = create_deep_agent(
        model=model,
        tools=tools,
        system_prompt=EDUCATION_SYSTEM_PROMPT,
        subagents=subagents if subagents else None,
        interrupt_on=interrupt_on,  # ✅ 添加 Human-in-the-loop 配置
        checkpointer=_checkpointer,  # ✅ Checkpointer 是 HITL 必需的
        store=_store,
        debug=settings.DEBUG,
        name="education_agent",
    )

    logger.info("Deep Agent 创建完成（已启用 Human-in-the-loop）")
    return _deep_agent


# ==================== 运行函数 ====================

async def run_deep_agent(
    query: str,
    user_id: str,
    book_id: str,
    book_name: str = "",
    book_subject: str = "",
    history: list = None,
    thread_id: str = None,
) -> Dict[str, Any]:
    """
    运行 Deep Agent（非流式）

    Args:
        query: 用户问题
        user_id: 用户ID
        book_id: 教材ID
        book_name: 教材名称
        book_subject: 教材学科
        history: 对话历史
        thread_id: 对话线程ID

    Returns:
        {
            "answer": "最终回答",
            "error": None
        }
    """
    logger.info(f"运行 Deep Agent: query={query[:50]}..., thread_id={thread_id}")

    agent = get_deep_agent()

    # 构建消息
    messages = []

    # 添加历史消息
    if history:
        for msg in history:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })

    # 添加当前问题
    messages.append({"role": "user", "content": query})

    # 构建配置
    effective_thread_id = thread_id or f"{user_id}_{book_id}"
    config = {
        "configurable": {
            "thread_id": effective_thread_id,
            "user_id": user_id,
        }
    }

    # 格式化系统提示词（注入上下文）
    # Deep Agent 会自动处理 system_prompt，这里通过消息传递上下文
    context_msg = f"[上下文] 用户ID: {user_id}, 教材ID: {book_id}, 教材: {book_name}, 学科: {book_subject}"
    messages.insert(0, {"role": "system", "content": context_msg})

    try:
        # 运行 Agent
        result = await agent.ainvoke({"messages": messages}, config)

        # 提取最终回答
        final_message = result.get("messages", [])[-1] if result.get("messages") else None
        answer = final_message.content if final_message else ""

        return {
            "answer": answer,
            "error": None
        }

    except Exception as e:
        logger.error(f"Deep Agent 运行失败: {e}")
        return {
            "answer": "",
            "error": str(e)
        }


async def run_deep_agent_stream(
    query: str,
    user_id: str,
    book_id: str,
    book_name: str = "",
    book_subject: str = "",
    history: list = None,
    thread_id: str = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    运行 Deep Agent（流式）

    使用多模式流式输出：
    - updates: 节点状态更新
    - messages: LLM token 流式输出
    - custom: 自定义进度信息（来自工具）

    Yields:
        不同类型的流式事件：
        - {"event_type": "node", "node": "agent", "status": "start/end"}
        - {"event_type": "token", "content": "..."}
        - {"event_type": "progress", "step": "memory_read", "message": "..."}
        - {"event_type": "error", "error": "..."}
    """
    logger.info(f"流式运行 Deep Agent: query={query[:50]}..., thread_id={thread_id}")

    agent = get_deep_agent()

    # 构建消息
    messages = []

    if history:
        for msg in history:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })

    messages.append({"role": "user", "content": query})

    # 构建配置
    effective_thread_id = thread_id or f"{user_id}_{book_id}"
    config = {
        "configurable": {
            "thread_id": effective_thread_id,
            "user_id": user_id,
        }
    }

    # 注入上下文
    context_msg = f"[上下文] 用户ID: {user_id}, 教材ID: {book_id}, 教材: {book_name}, 学科: {book_subject}"
    messages.insert(0, {"role": "system", "content": context_msg})

    # 发送开始事件
    yield {
        "event_type": "start",
        "message": "🤔 正在分析问题...",
    }

    try:
        # 使用多模式流式输出：同时获取 updates（节点状态）和 messages（LLM token）
        # 这样可以获得完整的流式体验：进度 + 逐字输出
        async for chunk in agent.astream(
            {"messages": messages},
            config,
            stream_mode=["updates", "messages"]
        ):
            logger.debug(f"[Deep Agent Stream] chunk_type={type(chunk).__name__}")

            # 处理不同的流模式输出
            if isinstance(chunk, tuple) and len(chunk) >= 2:
                # 多模式输出格式：(mode, data) 或 (namespace, mode, data)
                if len(chunk) == 2:
                    mode, data = chunk
                else:
                    # 有命名空间的情况
                    mode, data = chunk[-2], chunk[-1]

                logger.debug(f"[Deep Agent Stream] mode={mode}, data_type={type(data).__name__}")

                # 处理 messages 模式（LLM token 流式输出）
                if mode == "messages":
                    # messages 模式返回 (message, metadata) 元组
                    if isinstance(data, tuple) and len(data) >= 1:
                        message = data[0]
                        if hasattr(message, 'content') and message.content:
                            yield {
                                "event_type": "token",
                                "content": message.content,
                            }
                    elif hasattr(data, 'content') and data.content:
                        yield {
                            "event_type": "token",
                            "content": data.content,
                        }

                # 处理 updates 模式（节点状态更新）
                elif mode == "updates" and isinstance(data, dict):
                    for node_name, state in data.items():
                        logger.debug(f"[Deep Agent Stream] node={node_name}, state_type={type(state).__name__}")

                        if state is None:
                            continue

                        # 检查是否有中断（HITL）
                        if isinstance(state, dict) and "__interrupt__" in state:
                            logger.info(f"🛑 [Deep Agent] 检测到 HITL 中断")
                            interrupt_data = state.get("__interrupt__", [])
                            if interrupt_data:
                                yield {
                                    "event_type": "interrupt",
                                    "interrupt": interrupt_data[0].value if hasattr(interrupt_data[0], 'value') else interrupt_data[0],
                                }
                            return  # 停止流式处理，等待用户决策

                        # 发送节点进度
                        yield {
                            "event_type": "node",
                            "node": node_name,
                            "status": "update",
                        }

            # 处理单一模式输出（兼容性）
            elif isinstance(chunk, dict):
                for node_name, state in chunk.items():
                    logger.debug(f"[Deep Agent Stream] node={node_name}, state_type={type(state).__name__}")

                    if state is None:
                        continue

                    # 检查是否有中断（HITL）
                    if isinstance(state, dict) and "__interrupt__" in state:
                        logger.info(f"🛑 [Deep Agent] 检测到 HITL 中断")
                        interrupt_data = state.get("__interrupt__", [])
                        if interrupt_data:
                            yield {
                                "event_type": "interrupt",
                                "interrupt": interrupt_data[0].value if hasattr(interrupt_data[0], 'value') else interrupt_data[0],
                            }
                        return  # 停止流式处理，等待用户决策

                    # 发送节点进度
                    yield {
                        "event_type": "node",
                        "node": node_name,
                        "status": "update",
                    }

    except Exception as e:
        logger.error(f"Deep Agent 流式运行失败: {e}")
        yield {
            "event_type": "error",
            "error": str(e),
        }

