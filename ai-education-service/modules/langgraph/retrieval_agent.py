"""
检索专家智能体 (Agentic RAG)
按照 LangGraph Agentic RAG 文档实现
让 LLM 决定是否需要检索，而不是硬编码逻辑

参考: https://docs.langchain.com/oss/python/langgraph/agentic-rag

流程：
1. LLM 分析用户问题，决定是否需要检索
2. 如果需要 → 调用检索工具 → 获取上下文
3. 如果不需要 → 直接进入下一个智能体
"""

import logging
from typing import Dict, Any, List, Literal

import httpx
from langchain_core.messages import AIMessage, ToolMessage, HumanMessage

from config import settings
from .state import AgentState, MemoryType, EvidenceSource
from .tools import retrieve_from_textbook, search_knowledge_graph, retrieval_tools
from .memory_store import get_memory_manager

logger = logging.getLogger(__name__)


class RetrievalAgent:
    """
    检索专家智能体 (Agentic RAG)

    使用 LLM 决定是否需要检索，而不是硬编码逻辑
    """

    def __init__(self):
        # 工具定义（用于 LLM function calling）
        self.tools = retrieval_tools
        self.tool_map = {
            "retrieve_from_textbook": retrieve_from_textbook,
            "search_knowledge_graph": search_knowledge_graph,
        }
        logger.info("RetrievalAgent (Agentic RAG) 初始化完成")

    async def run(self, state: AgentState) -> AgentState:
        """
        执行检索任务 (Agentic RAG 模式)

        流程：
        1. 获取所需记忆
        2. LLM 决定是否需要检索
        3. 如果需要，执行工具调用
        4. 处理检索结果
        """
        logger.info(f"检索专家开始 (Agentic RAG): query={state.get('query', '')[:50]}...")
        state["current_node"] = "retrieval_agent"

        try:
            # 1. 获取所需记忆
            await self._fetch_required_memories(state)

            # 2. LLM 决定是否需要检索
            should_retrieve, tool_calls = await self._decide_retrieval(state)

            if should_retrieve and tool_calls:
                # 3. 执行工具调用
                context = await self._execute_tools(tool_calls, state)
                state["context"] = context
                state["has_sufficient_context"] = bool(context.strip())
                state["evidence_source"] = EvidenceSource.TEXTBOOK.value if context else EvidenceSource.NONE.value
                logger.info(f"检索完成: {len(context)} 字符上下文")
            else:
                # 不需要检索，直接使用已有上下文或空上下文
                logger.info("LLM 决定不需要检索")
                state["context"] = state.get("context", "")
                state["has_sufficient_context"] = False
                state["evidence_source"] = EvidenceSource.NONE.value

            # 4. 构建检索输出
            state["retrieval_output"] = {
                "context": state["context"],
                "has_sufficient": state["has_sufficient_context"],
                "evidence_source": state["evidence_source"],
                "tool_calls": [tc.get("name") for tc in tool_calls] if tool_calls else [],
                "memory_used": state.get("required_memories", [])
            }

            # 5. 更新任务计划状态
            self._update_task_status(state, "done")

            # 6. 设置下一个节点
            state["next_node"] = self._get_next_agent(state)

            logger.info(f"检索专家完成，下一节点: {state['next_node']}")

        except Exception as e:
            logger.error(f"检索专家失败: {e}")
            state["error"] = str(e)
            state["retrieval_output"] = {"error": str(e)}
            self._update_task_status(state, "failed")
            state["next_node"] = "supervisor_exit"

        return state

    async def _decide_retrieval(self, state: AgentState) -> tuple[bool, List[Dict]]:
        """
        让 LLM 决定是否需要检索

        Returns:
            (should_retrieve, tool_calls): 是否需要检索，以及工具调用列表
        """
        query = state.get("query", "")
        book_id = state.get("book_id", "")
        book_name = state.get("book_name", "")

        # 构建工具定义（OpenAI function calling 格式）
        tools_schema = [
            {
                "type": "function",
                "function": {
                    "name": "retrieve_from_textbook",
                    "description": "从教材中检索相关内容。当用户询问与教材内容相关的问题时使用此工具。",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "用户的问题或查询"
                            },
                            "book_id": {
                                "type": "string",
                                "description": "教材ID"
                            }
                        },
                        "required": ["query", "book_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_knowledge_graph",
                    "description": "从知识图谱中搜索实体和关系。当需要查找概念之间的关系或定义时使用。",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "要搜索的概念或问题"
                            },
                            "book_id": {
                                "type": "string",
                                "description": "教材ID"
                            }
                        },
                        "required": ["query", "book_id"]
                    }
                }
            }
        ]

        system_prompt = f"""你是一个智能检索助手。根据用户的问题，决定是否需要从教材中检索信息。

当前教材：{book_name} (ID: {book_id})

决策规则：
1. 如果问题涉及教材内容、概念解释、知识点 → 调用 retrieve_from_textbook
2. 如果问题涉及概念关系、知识结构 → 调用 search_knowledge_graph
3. 如果是简单问候、闲聊、与教材无关的问题 → 不调用任何工具
4. 可以同时调用多个工具获取更全面的信息"""

        try:
            # 根据配置选择 API
            if settings.CHAT_PROVIDER == "dashscope":
                api_url = f"{settings.DASHSCOPE_BASE_URL}/chat/completions"
                api_key = settings.DASHSCOPE_API_KEY
            else:
                api_url = f"{settings.OPENROUTER_BASE_URL}/chat/completions"
                api_key = settings.OPENROUTER_API_KEY

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    api_url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.CHAT_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": query}
                        ],
                        "tools": tools_schema,
                        "tool_choice": "auto",
                        "temperature": 0.1,
                    }
                )
                response.raise_for_status()
                data = response.json()

                message = data["choices"][0]["message"]
                tool_calls = message.get("tool_calls", [])

                if tool_calls:
                    # 解析工具调用
                    parsed_calls = []
                    for tc in tool_calls:
                        import json
                        func = tc.get("function", {})
                        parsed_calls.append({
                            "id": tc.get("id"),
                            "name": func.get("name"),
                            "arguments": json.loads(func.get("arguments", "{}"))
                        })
                    logger.info(f"LLM 决定调用工具: {[c['name'] for c in parsed_calls]}")
                    return True, parsed_calls
                else:
                    logger.info("LLM 决定不需要检索")
                    return False, []

        except Exception as e:
            logger.error(f"LLM 决策失败: {e}")
            # 失败时默认执行检索
            return True, [{
                "id": "fallback",
                "name": "retrieve_from_textbook",
                "arguments": {"query": query, "book_id": book_id}
            }]

    async def _execute_tools(self, tool_calls: List[Dict], state: AgentState) -> str:
        """执行工具调用并返回合并的上下文"""
        results = []

        for tc in tool_calls:
            tool_name = tc.get("name")
            args = tc.get("arguments", {})

            # 确保 book_id 存在
            if "book_id" not in args or not args["book_id"]:
                args["book_id"] = state.get("book_id", "")

            logger.info(f"执行工具: {tool_name}, args={args}")

            try:
                if tool_name == "retrieve_from_textbook":
                    result = retrieve_from_textbook.invoke(args)
                elif tool_name == "search_knowledge_graph":
                    result = await search_knowledge_graph.ainvoke(args)
                else:
                    result = f"未知工具: {tool_name}"

                results.append(f"【{tool_name}】\n{result}")

            except Exception as e:
                logger.error(f"工具执行失败 {tool_name}: {e}")
                results.append(f"【{tool_name}】执行失败: {str(e)}")

        return "\n\n".join(results)

    async def _fetch_required_memories(self, state: AgentState) -> None:
        """获取所需的记忆（使用 LangGraph Store）"""
        required = state.get("required_memories", [])

        if not required:
            logger.info("不需要获取记忆")
            return

        memory_manager = get_memory_manager()
        if not memory_manager:
            logger.warning("MemoryManager 未初始化，跳过记忆获取")
            return

        try:
            user_id = state.get("user_id", "anonymous")
            book_id = state.get("book_id", "default")
            query = state.get("query", "")

            # 获取用户上下文
            context = await memory_manager.get_user_context(
                user_id=user_id,
                book_id=book_id,
                query=query
            )

            if MemoryType.PROFILE.value in required and context.get("profile"):
                state["user_profile"] = context["profile"]
                logger.info("已获取用户画像")

            if MemoryType.UNDERSTANDING.value in required and context.get("understanding"):
                state["user_understanding"] = context["understanding"]
                logger.info("已获取知识理解")

            # 将事实也作为用户信息
            if context.get("facts"):
                state["user_facts"] = context["facts"]
                logger.info(f"已获取用户事实: {len(context['facts'])} 条")

        except Exception as e:
            logger.warning(f"获取记忆失败: {e}")

    def _update_task_status(self, state: AgentState, status: str) -> None:
        """更新任务计划中的状态"""
        task_plan = state.get("task_plan", [])
        for task in task_plan:
            if task.get("agent") == "retrieval":
                task["status"] = status
                break

    def _get_next_agent(self, state: AgentState) -> str:
        """根据任务计划确定下一个智能体"""
        task_plan = state.get("task_plan", [])
        current_step = state.get("current_step", 0)

        # 找到下一个待执行的任务
        for i, task in enumerate(task_plan):
            if task.get("status") == "pending" and i > current_step:
                agent = task.get("agent", "")
                state["current_step"] = i
                return f"{agent}_agent"

        # 没有更多任务，进入出口
        return "supervisor_exit"


# 全局实例
_retrieval_agent: RetrievalAgent = None


def get_retrieval_agent() -> RetrievalAgent:
    """获取检索专家单例"""
    global _retrieval_agent
    if _retrieval_agent is None:
        _retrieval_agent = RetrievalAgent()
    return _retrieval_agent


async def retrieval_agent_node(state: AgentState) -> AgentState:
    """检索专家节点函数"""
    agent = get_retrieval_agent()
    return await agent.run(state)
