"""
LangGraph 图定义
构建 Supervisor + 专业智能体的协作图

新架构流程：
1. intent_clarify: 意图澄清（可能返回澄清选项）
2. task_plan: 任务规划（确定需要哪些智能体）
3. retrieval_agent: 检索专家
4. reasoning_agent / generation_agent / expression_agent: 专业智能体
5. quality_agent: 质量检查
6. supervisor_exit: 输出和存储记忆
"""

import logging
from typing import Dict, Any, AsyncGenerator, Literal

from langgraph.graph import StateGraph, END

from .state import AgentState, create_initial_state
from .supervisor import get_supervisor
from .retrieval_agent import retrieval_agent_node
from .reasoning_agent import reasoning_agent_node
from .generation_agent import generation_agent_node
from .expression_agent import expression_agent_node
from .quality_agent import quality_agent_node
from .message_utils import (
    create_cleanup_messages,
    should_cleanup_messages,
    should_summarize_messages,
    build_summary_prompt,
    get_messages_to_remove_after_summary,
    SUMMARY_KEEP
)

logger = logging.getLogger(__name__)


def route_after_intent_clarify(state: AgentState) -> Literal["task_plan", "end_clarify"]:
    """意图澄清后的路由"""
    if state.get("intent_clear", False):
        return "task_plan"
    else:
        # 需要澄清，直接返回澄清选项
        return "end_clarify"


def route_after_task_plan(state: AgentState) -> str:
    """任务规划后的路由"""
    task_plan = state.get("task_plan", [])
    if not task_plan:
        return "supervisor_exit"

    # 找到第一个待执行的任务
    for task in task_plan:
        if task.get("status") == "pending":
            agent = task.get("agent", "")
            return f"{agent}_agent"

    return "supervisor_exit"


def route_by_next_node(state: AgentState) -> str:
    """根据 next_node 字段路由"""
    next_node = state.get("next_node", "supervisor_exit")

    # 验证节点名称
    valid_nodes = [
        "retrieval_agent", "reasoning_agent", "generation_agent",
        "expression_agent", "quality_agent", "supervisor_exit"
    ]

    if next_node in valid_nodes:
        return next_node

    return "supervisor_exit"


def create_graph() -> StateGraph:
    """
    创建 LangGraph 图

    新流程：
    START -> intent_clarify -> (条件) -> task_plan -> retrieval_agent
          -> [reasoning/generation/expression] -> quality_agent -> supervisor_exit -> END
    """

    # 创建图
    graph = StateGraph(AgentState)

    # 获取 Supervisor
    supervisor = get_supervisor()

    # ==================== 添加节点 ====================

    # Supervisor 节点
    graph.add_node("intent_clarify", supervisor.intent_clarify_node)
    graph.add_node("task_plan", supervisor.task_plan_node)
    graph.add_node("supervisor_exit", supervisor.exit_node)

    # 专业智能体节点
    graph.add_node("retrieval_agent", retrieval_agent_node)
    graph.add_node("reasoning_agent", reasoning_agent_node)
    graph.add_node("generation_agent", generation_agent_node)
    graph.add_node("expression_agent", expression_agent_node)
    graph.add_node("quality_agent", quality_agent_node)

    # 澄清结束节点（直接返回澄清选项）
    async def end_clarify_node(state: AgentState) -> AgentState:
        """澄清结束节点 - 构建澄清响应"""
        state["current_node"] = "end_clarify"
        # 构建澄清响应作为最终回答
        options = state.get("clarification_options", [])
        if options:
            response = "请确认您的需求：\n\n"
            for opt in options:
                response += f"**{opt.get('label', '')}**\n"
                for choice in opt.get("options", []):
                    response += f"  - {choice}\n"
                response += "\n"
            state["final_answer"] = response
            state["clarification_needed"] = True
        return state

    graph.add_node("end_clarify", end_clarify_node)

    # 消息管理节点（摘要 + 清理）
    async def manage_messages_node(state: AgentState) -> AgentState:
        """
        消息管理节点 - 摘要和清理消息历史

        策略（按优先级）：
        1. 摘要策略（优先）：消息数 > 20 时，生成摘要并保留最近 4 条
        2. 清理策略（备用）：消息数 > 30 时，直接删除最早的消息

        摘要会保留关键信息（用户姓名、偏好、讨论话题等）
        """
        import httpx
        from config import settings

        state["current_node"] = "manage_messages"
        messages = state.get("messages", [])
        existing_summary = state.get("summary", "")

        # 策略1：摘要（优先）
        if should_summarize_messages(messages):
            logger.info(f"触发消息摘要: {len(messages)} 条消息")

            try:
                # 构建摘要提示词
                summary_prompt = build_summary_prompt(messages, existing_summary)

                # 调用 LLM 生成摘要
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": settings.CHAT_MODEL,
                            "messages": [{"role": "user", "content": summary_prompt}],
                            "temperature": 0.3,
                            "max_tokens": 300,
                        }
                    )
                    response.raise_for_status()
                    data = response.json()
                    new_summary = data["choices"][0]["message"]["content"].strip()

                # 获取需要删除的消息
                remove_messages = get_messages_to_remove_after_summary(messages, keep=SUMMARY_KEEP)

                logger.info(f"摘要生成成功: {len(new_summary)} 字符，删除 {len(remove_messages)} 条消息")

                return {
                    "summary": new_summary,
                    "messages": remove_messages
                }

            except Exception as e:
                logger.error(f"摘要生成失败: {e}，降级为简单清理")
                # 降级为简单清理
                if should_cleanup_messages(messages):
                    remove_messages = create_cleanup_messages(messages)
                    if remove_messages:
                        return {"messages": remove_messages}

        # 策略2：简单清理（备用）
        elif should_cleanup_messages(messages):
            logger.info(f"触发消息清理: {len(messages)} 条消息")
            remove_messages = create_cleanup_messages(messages)
            if remove_messages:
                return {"messages": remove_messages}

        return state

    graph.add_node("manage_messages", manage_messages_node)

    # ==================== 添加边 ====================

    # 设置入口点
    graph.set_entry_point("intent_clarify")

    # 意图澄清 -> 条件路由
    graph.add_conditional_edges(
        "intent_clarify",
        route_after_intent_clarify,
        {
            "task_plan": "task_plan",
            "end_clarify": "end_clarify"
        }
    )

    # 澄清结束 -> END
    graph.add_edge("end_clarify", END)

    # 任务规划 -> 条件路由到第一个智能体
    graph.add_conditional_edges(
        "task_plan",
        route_after_task_plan,
        {
            "retrieval_agent": "retrieval_agent",
            "reasoning_agent": "reasoning_agent",
            "generation_agent": "generation_agent",
            "expression_agent": "expression_agent",
            "supervisor_exit": "supervisor_exit"
        }
    )

    # 检索专家 -> 条件路由
    graph.add_conditional_edges(
        "retrieval_agent",
        route_by_next_node,
        {
            "reasoning_agent": "reasoning_agent",
            "generation_agent": "generation_agent",
            "expression_agent": "expression_agent",
            "quality_agent": "quality_agent",
            "supervisor_exit": "supervisor_exit"
        }
    )

    # 推理专家 -> 条件路由
    graph.add_conditional_edges(
        "reasoning_agent",
        route_by_next_node,
        {
            "generation_agent": "generation_agent",
            "expression_agent": "expression_agent",
            "quality_agent": "quality_agent",
            "supervisor_exit": "supervisor_exit"
        }
    )

    # 生成专家 -> 条件路由
    graph.add_conditional_edges(
        "generation_agent",
        route_by_next_node,
        {
            "expression_agent": "expression_agent",
            "quality_agent": "quality_agent",
            "supervisor_exit": "supervisor_exit"
        }
    )

    # 表达专家 -> 条件路由
    graph.add_conditional_edges(
        "expression_agent",
        route_by_next_node,
        {
            "quality_agent": "quality_agent",
            "supervisor_exit": "supervisor_exit"
        }
    )

    # 质量检查 -> 条件路由（可能重试）
    graph.add_conditional_edges(
        "quality_agent",
        route_by_next_node,
        {
            "expression_agent": "expression_agent",
            "supervisor_exit": "supervisor_exit"
        }
    )

    # Supervisor 出口 -> 消息管理（摘要+清理） -> 结束
    graph.add_edge("supervisor_exit", "manage_messages")
    graph.add_edge("manage_messages", END)

    logger.info("LangGraph 图创建完成（新架构，含消息摘要和清理）")

    return graph


# 全局 Checkpointer（短期记忆，由 main.py lifespan 初始化）
_checkpointer = None

# 全局 Store（长期记忆，由 main.py lifespan 初始化）
_store = None


def set_checkpointer(checkpointer):
    """设置全局 Checkpointer（由 main.py 调用）"""
    global _checkpointer, _compiled_graph
    _checkpointer = checkpointer
    # 重置编译后的图，下次调用时会重新编译
    _compiled_graph = None
    logger.info(f"Checkpointer 已设置: {checkpointer is not None}")


def get_checkpointer():
    """获取全局 Checkpointer"""
    return _checkpointer


def set_store(store):
    """设置全局 Store（由 main.py 调用）"""
    global _store, _compiled_graph
    _store = store
    # 重置编译后的图，下次调用时会重新编译
    _compiled_graph = None
    logger.info(f"Store 已设置: {store is not None}")


def get_store():
    """获取全局 Store"""
    return _store


def compile_graph():
    """编译图（带 Checkpointer 和 Store 支持记忆）"""
    graph = create_graph()
    checkpointer = get_checkpointer()
    store = get_store()

    compile_kwargs = {}
    if checkpointer:
        compile_kwargs["checkpointer"] = checkpointer
    if store:
        compile_kwargs["store"] = store

    if compile_kwargs:
        compiled = graph.compile(**compile_kwargs)
        features = []
        if checkpointer:
            features.append("短期记忆")
        if store:
            features.append("长期记忆")
        logger.info(f"LangGraph 图编译完成（{', '.join(features)}）")
    else:
        compiled = graph.compile()
        logger.info("LangGraph 图编译完成（无记忆）")
    return compiled


# 全局编译后的图
_compiled_graph = None


def get_compiled_graph():
    """获取编译后的图（单例）"""
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = compile_graph()
    return _compiled_graph


async def run_graph(
    query: str,
    user_id: str,
    book_id: str,
    book_name: str = "",
    book_subject: str = "",
    history: list = None,
    clarification_response: str = None,
    thread_id: str = None
) -> Dict[str, Any]:
    """
    运行图（非流式）

    Args:
        query: 用户问题
        user_id: 用户ID
        book_id: 教材ID
        book_name: 教材名称
        book_subject: 教材学科
        history: 对话历史
        clarification_response: 用户对澄清问题的回复
        thread_id: 对话线程ID（用于短期记忆持久化）

    Returns:
        {
            "answer": "最终回答",
            "citations": [...],
            "sources": [...],
            "intent_type": "review_summary",
            "clarification_needed": False,
            "clarification_options": [...],
            ...
        }
    """
    logger.info(f"运行 LangGraph: query={query[:50]}..., thread_id={thread_id}")

    # 创建初始状态
    initial_state = create_initial_state(
        query=query,
        user_id=user_id,
        book_id=book_id,
        book_name=book_name,
        book_subject=book_subject,
        history=history
    )

    # 如果有澄清回复，添加到状态
    if clarification_response:
        initial_state["clarification_response"] = clarification_response

    # 获取编译后的图
    compiled = get_compiled_graph()

    # 构建配置（包含 thread_id 用于短期记忆）
    # 如果没有提供 thread_id，使用 user_id + book_id 作为默认值
    effective_thread_id = thread_id or f"{user_id}_{book_id}"
    config = {"configurable": {"thread_id": effective_thread_id, "user_id": user_id}}

    # 运行图
    final_state = await compiled.ainvoke(initial_state, config)

    # 返回结果
    return {
        "answer": final_state.get("final_answer", ""),
        "citations": final_state.get("citations", []),
        "sources": final_state.get("sources", []),
        "intent_type": final_state.get("intent_type", ""),
        "evidence_source": final_state.get("evidence_source", ""),
        "clarification_needed": final_state.get("clarification_needed", False),
        "clarification_options": final_state.get("clarification_options", []),
        "attachments": final_state.get("attachments", []),
        "quality_passed": final_state.get("quality_passed", True),
        "error": final_state.get("error")
    }


async def run_graph_stream(
    query: str,
    user_id: str,
    book_id: str,
    book_name: str = "",
    book_subject: str = "",
    history: list = None,
    clarification_response: str = None,
    thread_id: str = None
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    运行图（流式）

    Args:
        thread_id: 对话线程ID（用于短期记忆持久化）

    Yields:
        每个节点的状态更新
    """
    logger.info(f"流式运行 LangGraph: query={query[:50]}..., thread_id={thread_id}")

    # 创建初始状态
    initial_state = create_initial_state(
        query=query,
        user_id=user_id,
        book_id=book_id,
        book_name=book_name,
        book_subject=book_subject,
        history=history
    )

    # 如果有澄清回复，添加到状态
    if clarification_response:
        initial_state["clarification_response"] = clarification_response

    # 获取编译后的图
    compiled = get_compiled_graph()

    # 构建配置（包含 thread_id 用于短期记忆）
    # 如果没有提供 thread_id，使用 user_id + book_id 作为默认值
    effective_thread_id = thread_id or f"{user_id}_{book_id}"
    config = {"configurable": {"thread_id": effective_thread_id, "user_id": user_id}}

    # 流式运行
    async for event in compiled.astream(initial_state, config):
        # event 是 {node_name: state} 的字典
        for node_name, state in event.items():
            yield {
                "node": node_name,
                "current_node": state.get("current_node", ""),
                "intent_type": state.get("intent_type", ""),
                "intent_clear": state.get("intent_clear", False),
                "has_context": state.get("has_sufficient_context", False),
                "answer": state.get("final_answer", ""),
                "clarification_needed": state.get("clarification_needed", False),
                "clarification_options": state.get("clarification_options", []),
                "attachments": state.get("attachments", []),
                "error": state.get("error")
            }

