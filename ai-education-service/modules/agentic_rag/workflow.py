"""
Agentic RAG Workflow
基于 LlamaIndex Workflows 的智能 Agent 实现
"""

import logging
import json
from typing import List, Dict, Any, Optional

from llama_index.core.workflow import (
    Event,
    StartEvent,
    StopEvent,
    Workflow,
    step,
    Context,
)
import httpx

from config import settings
from .events import (
    QueryType,
    ReflectDecision,
    RouteDecisionEvent,
    PlanEvent,
    SubTask,
    ToolCallEvent,
    ToolResultEvent,
    ReflectEvent,
    RetryEvent,
    SynthesizeEvent,
)
from .tools import ToolRegistry, VectorSearchTool, CalculatorTool, KnowledgeGraphTool

logger = logging.getLogger(__name__)

MAX_RETRY = 3  # 最大重试次数


class AgenticRAGWorkflow(Workflow):
    """
    Agentic RAG 工作流

    流程:
    StartEvent -> route() -> [简单问题] -> execute_tool() -> reflect() -> synthesize() -> StopEvent
                          -> [复杂问题] -> plan() -> execute_tool() -> reflect() -> synthesize() -> StopEvent
                          -> [需澄清]   -> StopEvent (请求澄清)

    反思循环:
    reflect() -> [不满意] -> RetryEvent -> plan() -> execute_tool() -> reflect() -> ...
    """

    def __init__(self, tool_registry: ToolRegistry = None, **kwargs):
        super().__init__(**kwargs)
        self.tool_registry = tool_registry or ToolRegistry()
        self.chat_model = settings.CHAT_MODEL
        logger.info("AgenticRAGWorkflow 初始化完成")

    async def _call_llm(self, messages: List[Dict], temperature: float = 0.3) -> str:
        """调用 LLM"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.chat_model,
                    "messages": messages,
                    "temperature": temperature,
                }
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

    @step
    async def route(self, ctx: Context, ev: StartEvent) -> RouteDecisionEvent | StopEvent:
        """步骤1: 路由决策 - 判断问题类型"""
        query = ev.query
        history = getattr(ev, 'history', None) or []
        user_id = getattr(ev, 'user_id', None)
        book_id = getattr(ev, 'book_id', None)
        filter_expr = getattr(ev, 'filter_expr', None)

        # 构建路由 Prompt
        route_prompt = f"""分析用户问题，判断问题类型并决定处理策略。

用户问题: {query}

历史对话:
{self._format_history(history)}

请判断问题类型（只返回 JSON）:
- simple: 简单问题，一次检索即可回答
- complex: 复杂问题，需要多步骤或多角度检索
- clarify: 问题不清楚，需要用户澄清
- chitchat: 闲聊，无需检索知识库

返回格式:
{{"type": "simple|complex|clarify|chitchat", "reasoning": "判断理由", "rewritten_query": "改写后的查询（如需要）"}}
"""

        try:
            result = await self._call_llm([{"role": "user", "content": route_prompt}])
            # 解析 JSON
            result = result.strip()
            if result.startswith("```"):
                result = result.split("```")[1].replace("json", "").strip()
            parsed = json.loads(result)

            query_type = QueryType(parsed.get("type", "simple"))
            reasoning = parsed.get("reasoning", "")
            rewritten = parsed.get("rewritten_query", query)

            logger.info(f"[Route] 类型: {query_type}, 理由: {reasoning[:50]}...")

            # 闲聊直接返回
            if query_type == QueryType.CHITCHAT:
                return StopEvent(result={
                    "answer": await self._generate_chitchat_response(query),
                    "sources": [],
                    "has_context": False,
                    "query_type": "chitchat"
                })

            # 需要澄清
            if query_type == QueryType.CLARIFY:
                return StopEvent(result={
                    "answer": f"您的问题不太清楚，能否详细说明一下？{reasoning}",
                    "sources": [],
                    "has_context": False,
                    "query_type": "clarify"
                })

            return RouteDecisionEvent(
                query=query,
                query_type=query_type,
                reasoning=reasoning,
                rewritten_query=rewritten,
                history=history,
                user_id=user_id,
                book_id=book_id,
                filter_expr=filter_expr
            )

        except Exception as e:
            logger.error(f"[Route] 路由决策失败: {e}, 默认使用 simple")
            return RouteDecisionEvent(
                query=query,
                query_type=QueryType.SIMPLE,
                reasoning=f"路由失败，默认简单处理: {e}",
                rewritten_query=query,
                history=history,
                user_id=user_id,
                book_id=book_id,
                filter_expr=filter_expr
            )

    def _format_history(self, history: List[Dict]) -> str:
        """格式化历史对话"""
        if not history:
            return "(无)"
        return "\n".join([f"{m['role']}: {m['content'][:100]}..." for m in history[-4:]])

    async def _generate_chitchat_response(self, query: str) -> str:
        """生成闲聊回复"""
        return await self._call_llm([
            {"role": "system", "content": "你是一个友好的教育助手，请简短回复用户的闲聊。"},
            {"role": "user", "content": query}
        ])

    @step
    async def plan(self, ctx: Context, ev: RouteDecisionEvent | RetryEvent) -> ToolCallEvent:
        """步骤2: 任务规划 - 分解任务或直接执行"""

        # 处理 RetryEvent
        if isinstance(ev, RetryEvent):
            query = ev.query
            history = ev.history
            filter_expr = ev.filter_expr
            retry_count = ev.retry_count
            previous_info = f"\n之前尝试失败: {ev.reason}\n建议: {ev.suggestions}"
        else:
            query = ev.rewritten_query or ev.query
            history = ev.history
            filter_expr = ev.filter_expr
            retry_count = 0
            previous_info = ""

            # 简单问题直接检索
            if ev.query_type == QueryType.SIMPLE:
                logger.info(f"[Plan] 简单问题，直接检索")
                return ToolCallEvent(
                    query=query,
                    tool_name="vector_search",
                    tool_args={"query": query, "top_k": 5, "filter_expr": filter_expr},
                    subtask_id="simple_search",
                    history=history,
                    user_id=ev.user_id,
                    book_id=ev.book_id
                )

        # 复杂问题规划
        tools_desc = self.tool_registry.get_tools_prompt()
        plan_prompt = f"""将问题分解为检索子任务。{previous_info}

问题: {query}
{tools_desc}

返回 JSON: {{"subtasks": [{{"id": "1", "query": "子查询", "tool": "vector_search"}}]}}"""

        try:
            result = await self._call_llm([{"role": "user", "content": plan_prompt}])
            if "```" in result:
                result = result.split("```")[1].replace("json", "").strip()
            parsed = json.loads(result)

            subtasks = [
                SubTask(id=str(t.get("id", i)), description=t.get("query", query),
                       tool=t.get("tool", "vector_search"),
                       tool_args={"query": t.get("query", query), "top_k": 5})
                for i, t in enumerate(parsed.get("subtasks", [{"query": query}]))
            ]

            logger.info(f"[Plan] 规划 {len(subtasks)} 个子任务")

            # 保存计划到上下文
            plan = PlanEvent(query=query, subtasks=subtasks, reasoning="",
                           history=history, filter_expr=filter_expr, retry_count=retry_count)
            await ctx.store.set("plan", plan)
            await ctx.store.set("all_results", [])
            await ctx.store.set("current_task_idx", 0)

            first = subtasks[0]
            return ToolCallEvent(
                query=query, tool_name=first.tool,
                tool_args={**first.tool_args, "filter_expr": filter_expr},
                subtask_id=first.id, plan=plan, history=history
            )
        except Exception as e:
            logger.error(f"[Plan] 失败: {e}")
            return ToolCallEvent(
                query=query, tool_name="vector_search",
                tool_args={"query": query, "top_k": 5, "filter_expr": filter_expr},
                subtask_id="fallback", history=history
            )



    @step
    async def execute_tool(self, ctx: Context, ev: ToolCallEvent) -> ToolResultEvent:
        """步骤3: 执行工具"""
        tool = self.tool_registry.get(ev.tool_name)

        if tool is None:
            logger.warning(f"[Execute] 工具不存在: {ev.tool_name}, 使用默认向量检索")
            tool = self.tool_registry.get("vector_search")

        if tool is None:
            return ToolResultEvent(
                query=ev.query, tool_name=ev.tool_name, tool_args=ev.tool_args,
                result={"error": "无可用工具"}, success=False, error="工具未注册",
                subtask_id=ev.subtask_id, plan=ev.plan, history=ev.history
            )

        try:
            result = await tool.execute(**ev.tool_args)
            logger.info(f"[Execute] {ev.tool_name} 完成, 结果数: {result.get('count', 0)}")

            # 收集所有结果
            all_results = await ctx.store.get("all_results", [])
            all_results.append({"tool": ev.tool_name, "result": result, "subtask_id": ev.subtask_id})
            await ctx.store.set("all_results", all_results)

            return ToolResultEvent(
                query=ev.query, tool_name=ev.tool_name, tool_args=ev.tool_args,
                result=result, success=result.get("success", True),
                subtask_id=ev.subtask_id, plan=ev.plan,
                all_results=all_results, history=ev.history
            )
        except Exception as e:
            logger.error(f"[Execute] 工具执行失败: {e}")
            return ToolResultEvent(
                query=ev.query, tool_name=ev.tool_name, tool_args=ev.tool_args,
                result={}, success=False, error=str(e),
                subtask_id=ev.subtask_id, plan=ev.plan, history=ev.history
            )

    @step
    async def reflect(self, ctx: Context, ev: ToolResultEvent) -> SynthesizeEvent | ToolCallEvent | RetryEvent:
        """步骤4: 反思 - 用 LLM 评估结果质量，决定下一步"""
        plan = ev.plan or await ctx.store.get("plan")
        all_results = ev.all_results or await ctx.store.get("all_results", [])
        retry_count = plan.retry_count if plan else 0

        # 检查是否还有未执行的子任务
        if plan and plan.subtasks:
            current_idx = await ctx.store.get("current_task_idx", 0)
            if current_idx + 1 < len(plan.subtasks):
                await ctx.store.set("current_task_idx", current_idx + 1)
                next_task = plan.subtasks[current_idx + 1]
                logger.info(f"[Reflect] 继续执行子任务 {next_task.id}")
                return ToolCallEvent(
                    query=ev.query, tool_name=next_task.tool,
                    tool_args={**next_task.tool_args, "filter_expr": plan.filter_expr},
                    subtask_id=next_task.id, plan=plan, history=ev.history
                )

        # 构建上下文用于评估
        context, sources = self._build_context(all_results)

        # 用 LLM 智能评估结果质量
        evaluation = await self._evaluate_results_with_llm(ev.query, context, retry_count)

        if evaluation["decision"] == "retry" and retry_count < MAX_RETRY:
            logger.info(f"[Reflect] LLM 判断需重试: {evaluation['reason']}")
            return RetryEvent(
                query=ev.query,
                reason=evaluation["reason"],
                previous_results=all_results,
                suggestions=evaluation["suggestions"],
                retry_count=retry_count + 1,
                history=ev.history,
                filter_expr=plan.filter_expr if plan else None
            )

        if evaluation["decision"] == "give_up":
            logger.info(f"[Reflect] LLM 判断无法回答: {evaluation['reason']}")
            # 仍然尝试回答，但标记为低置信度

        logger.info(f"[Reflect] LLM 判断结果充足，准备合成答案")
        return SynthesizeEvent(
            query=ev.query, results=all_results, context=context,
            sources=sources, history=ev.history
        )

    async def _evaluate_results_with_llm(self, query: str, context: str, retry_count: int) -> Dict[str, Any]:
        """用 LLM 评估检索结果是否足够回答问题"""
        if not context.strip():
            return {
                "decision": "retry" if retry_count < MAX_RETRY else "give_up",
                "reason": "没有找到任何相关内容",
                "suggestions": "尝试使用更宽泛的关键词"
            }

        eval_prompt = f"""评估以下检索结果是否足够回答用户问题。

用户问题: {query}

检索到的内容:
{context[:3000]}

请判断（只返回 JSON）:
1. 这些内容是否包含回答问题所需的关键信息？
2. 信息是否完整，还是只有部分相关？
3. 是否需要补充检索？

返回格式:
{{"decision": "sufficient|retry|give_up", "reason": "判断理由", "suggestions": "如需重试的建议", "confidence": 0.0-1.0}}

- sufficient: 信息足够，可以回答
- retry: 信息不足但可能通过改写查询获得更好结果
- give_up: 知识库中可能没有相关内容"""

        try:
            result = await self._call_llm([{"role": "user", "content": eval_prompt}], temperature=0.1)
            if "```" in result:
                result = result.split("```")[1].replace("json", "").strip()
            parsed = json.loads(result)

            return {
                "decision": parsed.get("decision", "sufficient"),
                "reason": parsed.get("reason", ""),
                "suggestions": parsed.get("suggestions", ""),
                "confidence": parsed.get("confidence", 0.5)
            }
        except Exception as e:
            logger.warning(f"[Reflect] LLM 评估失败: {e}, 默认继续")
            return {"decision": "sufficient", "reason": "评估失败，默认继续", "suggestions": ""}

    def _build_context(self, all_results: List[Dict]) -> tuple[str, List[Dict]]:
        """从所有结果构建上下文"""
        sources = []
        context_parts = []

        for r in all_results:
            results = r.get("result", {}).get("results", [])
            for i, item in enumerate(results):
                sources.append(item)
                context_parts.append(f"[来源{len(sources)}] {item.get('text', '')[:500]}")

        return "\n\n".join(context_parts), sources

    @step
    async def synthesize(self, ctx: Context, ev: SynthesizeEvent) -> StopEvent:
        """步骤5: 合成最终答案"""

        if not ev.context:
            answer = "抱歉，我没有找到相关信息来回答您的问题。"
        else:
            prompt = f"""基于以下参考资料回答问题。请在回答中标注来源，如 [来源1]。

参考资料:
{ev.context}

问题: {ev.query}

请给出准确、有帮助的回答:"""

            messages = [{"role": "system", "content": "你是一个专业的教育助手，基于提供的资料回答问题。"}]
            if ev.history:
                messages.extend(ev.history[-4:])
            messages.append({"role": "user", "content": prompt})

            answer = await self._call_llm(messages)

        logger.info(f"[Synthesize] 生成答案完成，长度: {len(answer)}")

        return StopEvent(result={
            "answer": answer,
            "sources": ev.sources,
            "has_context": bool(ev.context),
            "query_type": "agentic"
        })


# ============ 工厂函数 ============

_agentic_workflow: Optional[AgenticRAGWorkflow] = None


def get_agentic_workflow() -> AgenticRAGWorkflow:
    """获取 AgenticRAGWorkflow 单例"""
    global _agentic_workflow
    if _agentic_workflow is None:
        from ..vector_store import VectorStore
        from ..document_processor import get_embedding_model

        # 初始化工具
        registry = ToolRegistry()
        vector_store = VectorStore()
        embedding_model = get_embedding_model()

        # 注册所有工具
        registry.register(VectorSearchTool(vector_store, embedding_model))
        registry.register(CalculatorTool())
        registry.register(KnowledgeGraphTool())

        _agentic_workflow = AgenticRAGWorkflow(
            tool_registry=registry,
            timeout=180,
            verbose=False
        )
        logger.info(f"AgenticRAGWorkflow 初始化完成，已注册 {len(registry._tools)} 个工具")
    return _agentic_workflow
