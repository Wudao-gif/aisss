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

logger = logging.getLogger(__name__)


# ==================== 系统提示词 ====================

EDUCATION_SYSTEM_PROMPT = """你是一个专业的 AI 教育辅导助手，专门帮助学生学习教材内容。

## 你的能力

1. **教材检索** - 使用 retrieve_from_textbook 从教材中找到相关内容
2. **知识图谱** - 使用 search_knowledge_graph 理解概念之间的关系
3. **记忆管理** - 使用 memory_read/memory_write 读写用户记忆
4. **任务规划** - 使用内置的 write_todos 分解复杂任务
5. **子代理委托** - 将专业任务委托给子代理（后续接入）

## 工作流程

1. 分析用户问题，判断意图类型
2. 读取用户记忆，了解用户背景
3. 使用工具检索相关信息
4. 根据需要委托给专业子代理
5. 整合结果，生成最终回答
6. 存储重要信息到用户记忆

## 意图类型

- review_summary: 复习总结（生成知识点总结、思维导图）
- homework_help: 作业辅导（解题、分析、证明）
- concept_explain: 概念解释（定义、原理、例子）
- learning_plan: 学习规划（制定计划、建议）
- question_answer: 问题解答（回答具体问题）
- exercise_practice: 练习训练（生成练习题）

## 输出要求

- 使用中文回答
- 条理清晰，重点突出
- 引用来源时使用 [来源X] 格式
- 根据学生水平调整表达方式
- 对于数学公式使用 LaTeX 格式

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

    # 子代理列表（后续逐个接入）
    subagents: List[SubAgent] = [
        # TODO: 接入 retrieval_expert
        # TODO: 接入 reasoning_expert
        # TODO: 接入 generation_expert
        # TODO: 接入 expression_expert
        # TODO: 接入 quality_expert
    ]
    
    # 创建 Deep Agent
    _deep_agent = create_deep_agent(
        model=model,
        tools=tools,
        system_prompt=EDUCATION_SYSTEM_PROMPT,
        subagents=subagents if subagents else None,
        checkpointer=_checkpointer,
        store=_store,
        debug=settings.DEBUG,
        name="education_agent",
    )
    
    logger.info("Deep Agent 创建完成")
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
        # 使用多模式流式输出
        async for stream_mode, chunk in agent.astream(
            {"messages": messages},
            config,
            stream_mode=["updates", "messages", "custom"]
        ):
            if stream_mode == "updates":
                # 节点状态更新
                for node_name, state in chunk.items():
                    if state is None:
                        continue

                    # 发送节点进度
                    yield {
                        "event_type": "node",
                        "node": node_name,
                        "status": "update",
                    }

                    # 提取最终回答（从 agent 节点）
                    if node_name == "agent" and isinstance(state, dict):
                        current_messages = state.get("messages", [])
                        if hasattr(current_messages, 'value'):
                            current_messages = current_messages.value
                        if isinstance(current_messages, list) and current_messages:
                            last_message = current_messages[-1]
                            if hasattr(last_message, 'content') and last_message.content:
                                yield {
                                    "event_type": "answer",
                                    "content": last_message.content,
                                }

            elif stream_mode == "messages":
                # LLM token 流式输出
                message_chunk, metadata = chunk
                if hasattr(message_chunk, 'content') and message_chunk.content:
                    yield {
                        "event_type": "token",
                        "content": message_chunk.content,
                        "node": metadata.get("langgraph_node", ""),
                    }

            elif stream_mode == "custom":
                # 自定义进度信息（来自工具）
                yield {
                    "event_type": "progress",
                    **chunk,  # 包含 step, status, message, icon 等
                }

    except Exception as e:
        logger.error(f"Deep Agent 流式运行失败: {e}")
        yield {
            "event_type": "error",
            "error": str(e),
        }

