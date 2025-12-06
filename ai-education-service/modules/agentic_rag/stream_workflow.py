"""
Agentic RAG 流式工作流
支持实时输出 Agent 思考过程
"""

import logging
import json
from typing import List, Dict, Any, Optional, AsyncGenerator

from llama_index.core.workflow import (
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
    ProgressType,
    ProgressEvent,
    RouteDecisionEvent,
    PlanEvent,
    SubTask,
    ToolCallEvent,
    ToolResultEvent,
    RetryEvent,
    SynthesizeEvent,
)
from .tools import ToolRegistry, VectorSearchTool, CalculatorTool, KnowledgeGraphTool
from .query_transform import get_query_transformer

logger = logging.getLogger(__name__)

MAX_RETRY = 3


class AgenticStreamWorkflow(Workflow):
    """
    流式 Agentic RAG 工作流

    特点:
    - 每个步骤都发送 ProgressEvent
    - 最终答案流式输出
    - 前端可实时显示 Agent 思考过程
    """

    def __init__(self, tool_registry: ToolRegistry = None, **kwargs):
        super().__init__(**kwargs)
        self.tool_registry = tool_registry or ToolRegistry()
        self.chat_model = settings.CHAT_MODEL

    async def _call_llm(self, messages: List[Dict], temperature: float = 0.3) -> str:
        """调用 LLM"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"model": self.chat_model, "messages": messages, "temperature": temperature}
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

    async def _stream_llm(self, messages: List[Dict]) -> AsyncGenerator[str, None]:
        """流式调用 LLM"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"model": self.chat_model, "messages": messages, "temperature": 0.7, "stream": True}
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            content = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue

    @step
    async def route(self, ctx: Context, ev: StartEvent) -> RouteDecisionEvent | StopEvent:
        """步骤1: 路由决策 + HyDE 查询转换"""
        query = ev.query
        history = getattr(ev, 'history', None) or []
        book_name = getattr(ev, 'book_name', None)

        # 存储 book_name 供后续步骤使用
        await ctx.store.set("book_name", book_name)

        # 构建进度消息
        if book_name:
            progress_msg = f"🎯 正在分析您关于《{book_name}》的问题..."
        else:
            progress_msg = "🤔 正在分析您的问题..."

        # 发送进度事件
        ctx.write_event_to_stream(ProgressEvent(
            progress_type=ProgressType.ROUTING,
            message=progress_msg,
            detail=f"问题: {query[:50]}..."
        ))

        # ========== 使用 HyDE 进行查询转换 ==========
        ctx.write_event_to_stream(ProgressEvent(
            progress_type=ProgressType.ROUTING,
            message="🔄 正在优化查询（HyDE）..."
        ))

        try:
            query_transformer = get_query_transformer()
            hyde_result = query_transformer.transform_with_hyde(query)
            # 获取用于检索的字符串（包含假设性文档）
            hyde_queries = query_transformer.get_embedding_strings(hyde_result)
            await ctx.store.set("hyde_queries", hyde_queries)

            ctx.write_event_to_stream(ProgressEvent(
                progress_type=ProgressType.ROUTING,
                message=f"✅ 查询优化完成，生成 {len(hyde_queries)} 个检索向量"
            ))
            logger.info(f"HyDE 转换: 原始查询 -> {len(hyde_queries)} 个检索字符串")
        except Exception as e:
            logger.warning(f"HyDE 转换失败，使用原始查询: {e}")
            await ctx.store.set("hyde_queries", [query])

        # ========== 路由决策 ==========
        route_prompt = f"""分析问题类型（返回JSON）:
问题: {query}
{{"type": "simple|complex|clarify|chitchat", "reasoning": "理由"}}"""

        try:
            result = await self._call_llm([{"role": "user", "content": route_prompt}])
            if "```" in result:
                result = result.split("```")[1].replace("json", "").strip()
            parsed = json.loads(result)

            query_type = QueryType(parsed.get("type", "simple"))

            # 发送路由结果
            type_names = {"simple": "简单问题", "complex": "复杂问题", "chitchat": "闲聊", "clarify": "需澄清"}
            ctx.write_event_to_stream(ProgressEvent(
                progress_type=ProgressType.ROUTING,
                message=f"📋 问题类型: {type_names.get(query_type.value, query_type.value)}",
                detail=parsed.get("reasoning", "")
            ))

            if query_type == QueryType.CHITCHAT:
                answer = await self._call_llm([
                    {"role": "system", "content": "你是友好的教育助手"},
                    {"role": "user", "content": query}
                ])
                return StopEvent(result={"answer": answer, "sources": [], "query_type": "chitchat"})

            if query_type == QueryType.CLARIFY:
                return StopEvent(result={
                    "answer": f"您的问题不太清楚，能否详细说明？{parsed.get('reasoning', '')}",
                    "sources": [], "query_type": "clarify"
                })

            return RouteDecisionEvent(
                query=query, query_type=query_type,
                reasoning=parsed.get("reasoning", ""),
                rewritten_query=query,  # 使用原始查询，HyDE 结果存在 ctx.store
                history=history,
                filter_expr=getattr(ev, 'filter_expr', None)
            )
        except Exception as e:
            logger.error(f"路由失败: {e}")
            return RouteDecisionEvent(
                query=query, query_type=QueryType.SIMPLE,
                reasoning=f"默认处理", rewritten_query=query,
                history=history, filter_expr=getattr(ev, 'filter_expr', None)
            )

    @step
    async def plan(self, ctx: Context, ev: RouteDecisionEvent | RetryEvent) -> ToolCallEvent:
        """步骤2: 任务规划（使用 HyDE 优化后的查询）"""
        if isinstance(ev, RetryEvent):
            query, retry_count = ev.query, ev.retry_count
            filter_expr, history = ev.filter_expr, ev.history
            ctx.write_event_to_stream(ProgressEvent(
                progress_type=ProgressType.RETRYING,
                message=f"🔄 第 {retry_count} 次重试: {ev.suggestions[:30]}..."
            ))
            # 重试时重新获取 HyDE 查询
            hyde_queries = await ctx.store.get("hyde_queries", [query])
        else:
            query = ev.rewritten_query or ev.query
            retry_count, filter_expr, history = 0, ev.filter_expr, ev.history
            # 获取 HyDE 转换后的查询列表
            hyde_queries = await ctx.store.get("hyde_queries", [query])

            if ev.query_type == QueryType.SIMPLE:
                # 获取 book_name 用于进度显示
                book_name = await ctx.store.get("book_name", default=None)
                if book_name:
                    search_msg = f"🔍 正在查阅《{book_name}》相关资料（HyDE 优化）..."
                else:
                    search_msg = "🔍 正在检索相关资料（HyDE 优化）..."
                ctx.write_event_to_stream(ProgressEvent(
                    progress_type=ProgressType.SEARCHING,
                    message=search_msg
                ))
                # 使用 HyDE 查询进行检索（使用第一个假设性文档）
                search_query = hyde_queries[0] if hyde_queries else query
                return ToolCallEvent(
                    query=query, tool_name="vector_search",
                    tool_args={"query": search_query, "top_k": 5, "filter_expr": filter_expr},
                    subtask_id="simple", history=history
                )

        ctx.write_event_to_stream(ProgressEvent(
            progress_type=ProgressType.PLANNING, message="📝 正在规划检索策略..."
        ))

        try:
            plan_prompt = f"""分解问题: {query}
{self.tool_registry.get_tools_prompt()}
返回: {{"subtasks": [{{"id": "1", "query": "子查询", "tool": "vector_search"}}]}}"""
            result = await self._call_llm([{"role": "user", "content": plan_prompt}])
            if "```" in result:
                result = result.split("```")[1].replace("json", "").strip()
            parsed = json.loads(result)

            subtasks = [SubTask(id=str(i), description=t.get("query", query),
                       tool=t.get("tool", "vector_search"),
                       tool_args={"query": t.get("query", query), "top_k": 5})
                for i, t in enumerate(parsed.get("subtasks", [{"query": query}]))]

            ctx.write_event_to_stream(ProgressEvent(
                progress_type=ProgressType.PLANNING,
                message=f"📋 已规划 {len(subtasks)} 个任务"
            ))

            plan = PlanEvent(query=query, subtasks=subtasks, reasoning="",
                           history=history, filter_expr=filter_expr, retry_count=retry_count)
            await ctx.store.set("plan", plan)
            await ctx.store.set("all_results", [])
            await ctx.store.set("current_task_idx", 0)

            first = subtasks[0]
            ctx.write_event_to_stream(ProgressEvent(
                progress_type=ProgressType.SEARCHING,
                message=f"🔍 执行任务 1/{len(subtasks)}: {first.description[:25]}..."
            ))
            return ToolCallEvent(query=query, tool_name=first.tool,
                tool_args={**first.tool_args, "filter_expr": filter_expr},
                subtask_id=first.id, plan=plan, history=history)
        except Exception as e:
            logger.error(f"规划失败: {e}")
            return ToolCallEvent(query=query, tool_name="vector_search",
                tool_args={"query": query, "top_k": 5, "filter_expr": filter_expr},
                subtask_id="fallback", history=history)

    @step
    async def execute_tool(self, ctx: Context, ev: ToolCallEvent) -> ToolResultEvent:
        """步骤3: 执行工具"""
        tool = self.tool_registry.get(ev.tool_name) or self.tool_registry.get("vector_search")
        if not tool:
            return ToolResultEvent(query=ev.query, tool_name=ev.tool_name, tool_args=ev.tool_args,
                result={"error": "无工具"}, success=False, subtask_id=ev.subtask_id,
                plan=ev.plan, history=ev.history)

        try:
            result = await tool.execute(**ev.tool_args)
            all_results = await ctx.store.get("all_results", [])
            all_results.append({"tool": ev.tool_name, "result": result, "subtask_id": ev.subtask_id})
            await ctx.store.set("all_results", all_results)

            ctx.write_event_to_stream(ProgressEvent(
                progress_type=ProgressType.SEARCHING,
                message=f"✅ 找到 {result.get('count', 0)} 条内容"
            ))
            return ToolResultEvent(query=ev.query, tool_name=ev.tool_name, tool_args=ev.tool_args,
                result=result, success=result.get("success", True), subtask_id=ev.subtask_id,
                plan=ev.plan, all_results=all_results, history=ev.history)
        except Exception as e:
            return ToolResultEvent(query=ev.query, tool_name=ev.tool_name, tool_args=ev.tool_args,
                result={}, success=False, error=str(e), subtask_id=ev.subtask_id,
                plan=ev.plan, history=ev.history)



    @step
    async def reflect(self, ctx: Context, ev: ToolResultEvent) -> SynthesizeEvent | ToolCallEvent | RetryEvent:
        """步骤4: 反思"""
        plan = ev.plan or await ctx.store.get("plan")
        all_results = ev.all_results or await ctx.store.get("all_results", [])
        retry_count = plan.retry_count if plan else 0

        # 检查是否还有子任务
        if plan and plan.subtasks:
            idx = await ctx.store.get("current_task_idx", 0)
            if idx + 1 < len(plan.subtasks):
                await ctx.store.set("current_task_idx", idx + 1)
                next_task = plan.subtasks[idx + 1]
                ctx.write_event_to_stream(ProgressEvent(
                    progress_type=ProgressType.SEARCHING,
                    message=f"🔍 执行任务 {idx+2}/{len(plan.subtasks)}: {next_task.description[:25]}..."
                ))
                return ToolCallEvent(query=ev.query, tool_name=next_task.tool,
                    tool_args={**next_task.tool_args, "filter_expr": plan.filter_expr},
                    subtask_id=next_task.id, plan=plan, history=ev.history)

        # 反思评估
        book_name = await ctx.get("book_name", default=None)
        if book_name:
            reflect_msg = f"🧐 正在评估《{book_name}》的检索结果..."
        else:
            reflect_msg = "🧐 正在评估检索结果..."
        ctx.write_event_to_stream(ProgressEvent(
            progress_type=ProgressType.REFLECTING, message=reflect_msg
        ))

        context, sources = self._build_context(all_results)

        # LLM 评估
        if context:
            eval_result = await self._evaluate_with_llm(ev.query, context)
            if eval_result["decision"] == "retry" and retry_count < MAX_RETRY:
                ctx.write_event_to_stream(ProgressEvent(
                    progress_type=ProgressType.REFLECTING,
                    message=f"⚠️ 结果不够充分，准备重试..."
                ))
                return RetryEvent(query=ev.query, reason=eval_result["reason"],
                    previous_results=all_results, suggestions=eval_result["suggestions"],
                    retry_count=retry_count + 1, history=ev.history,
                    filter_expr=plan.filter_expr if plan else None)

        ctx.write_event_to_stream(ProgressEvent(
            progress_type=ProgressType.REFLECTING,
            message=f"✅ 找到 {len(sources)} 条相关资料，准备生成答案"
        ))
        return SynthesizeEvent(query=ev.query, results=all_results, context=context,
            sources=sources, history=ev.history)

    async def _evaluate_with_llm(self, query: str, context: str) -> Dict[str, Any]:
        """LLM 评估结果质量"""
        prompt = f"""评估检索结果是否足够回答问题（返回JSON）:
问题: {query}
内容: {context[:2000]}
{{"decision": "sufficient|retry", "reason": "理由", "suggestions": "建议"}}"""
        try:
            result = await self._call_llm([{"role": "user", "content": prompt}], 0.1)
            if "```" in result:
                result = result.split("```")[1].replace("json", "").strip()
            return json.loads(result)
        except:
            return {"decision": "sufficient", "reason": "", "suggestions": ""}

    def _build_context(self, all_results: List[Dict]) -> tuple:
        """构建上下文"""
        sources, parts = [], []
        for r in all_results:
            for item in r.get("result", {}).get("results", []):
                sources.append(item)
                parts.append(f"[来源{len(sources)}] {item.get('text', '')[:500]}")
        return "\n\n".join(parts), sources

    @step
    async def synthesize(self, ctx: Context, ev: SynthesizeEvent) -> StopEvent:
        """步骤5: 流式生成答案"""
        book_name = await ctx.get("book_name", default=None)
        if book_name:
            synth_msg = f"✨ 正在基于《{book_name}》生成答案..."
        else:
            synth_msg = "✨ 正在生成答案..."
        ctx.write_event_to_stream(ProgressEvent(
            progress_type=ProgressType.SYNTHESIZING, message=synth_msg
        ))

        if not ev.context:
            ctx.write_event_to_stream(ProgressEvent(
                progress_type=ProgressType.DONE, message="完成"
            ))
            return StopEvent(result={"answer": "抱歉，没有找到相关信息。", "sources": []})

        prompt = f"""基于资料回答问题，标注来源如[来源1]。
资料:
{ev.context}
问题: {ev.query}"""

        messages = [{"role": "system", "content": "你是专业教育助手"}]
        if ev.history:
            messages.extend(ev.history[-4:])
        messages.append({"role": "user", "content": prompt})

        # 流式生成
        answer_parts = []
        async for chunk in self._stream_llm(messages):
            answer_parts.append(chunk)
            ctx.write_event_to_stream(ProgressEvent(
                progress_type=ProgressType.STREAMING,
                message=chunk  # 每个 chunk 作为消息发送
            ))

        answer = "".join(answer_parts)

        ctx.write_event_to_stream(ProgressEvent(
            progress_type=ProgressType.DONE, message="✅ 回答完成"
        ))

        return StopEvent(result={"answer": answer, "sources": ev.sources, "has_context": True})


# ============ 工厂函数 ============

_stream_workflow: Optional[AgenticStreamWorkflow] = None


def get_agentic_stream_workflow() -> AgenticStreamWorkflow:
    """获取流式 AgenticRAGWorkflow 单例"""
    global _stream_workflow
    if _stream_workflow is None:
        from ..vector_store import VectorStore
        from ..document_processor import get_embedding_model

        registry = ToolRegistry()
        vector_store = VectorStore()
        embedding_model = get_embedding_model()

        registry.register(VectorSearchTool(vector_store, embedding_model))
        registry.register(CalculatorTool())
        registry.register(KnowledgeGraphTool())

        _stream_workflow = AgenticStreamWorkflow(
            tool_registry=registry, timeout=180, verbose=False
        )
        logger.info(f"AgenticStreamWorkflow 初始化完成，{len(registry._tools)} 个工具")
    return _stream_workflow
