"""
RAG Workflow 模块
使用 LlamaIndex Workflows 实现事件驱动的 RAG 流程
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from llama_index.core.workflow import (
    Event,
    StartEvent,
    StopEvent,
    Workflow,
    step,
    Context,
)

from config import settings
from .vector_store import VectorStore
from .document_processor import get_embedding_model
from .conversation_memory import get_memory
from .rag_retriever import RAGRetriever, RERANK_ENABLED, RERANK_TOP_N, CONTEXT_CHAR_LIMIT

logger = logging.getLogger(__name__)


# ============ 事件定义 ============

@dataclass
class QueryRewriteEvent(Event):
    """查询改写完成事件"""
    original_query: str
    rewritten_query: str
    history: Optional[List[Dict[str, str]]] = None
    summary: Optional[str] = None
    filter_expr: Optional[str] = None
    top_k: int = 5
    enable_rerank: bool = True


@dataclass
class RetrievalEvent(Event):
    """检索完成事件"""
    original_query: str
    rewritten_query: str
    results: List[Dict[str, Any]]
    history: Optional[List[Dict[str, str]]] = None
    summary: Optional[str] = None
    enable_rerank: bool = True


@dataclass
class RerankEvent(Event):
    """重排序完成事件"""
    original_query: str
    rewritten_query: str
    results: List[Dict[str, Any]]
    history: Optional[List[Dict[str, str]]] = None
    summary: Optional[str] = None


@dataclass
class ContextBuiltEvent(Event):
    """上下文构建完成事件"""
    original_query: str
    context: str
    sources: List[Dict[str, Any]]
    history: Optional[List[Dict[str, str]]] = None
    summary: Optional[str] = None


@dataclass
class RetryEvent(Event):
    """重试事件（用于失败重试场景）"""
    reason: str
    retry_count: int
    original_query: str


# ============ RAG Workflow ============

class RAGWorkflow(Workflow):
    """
    事件驱动的 RAG 工作流
    
    流程：StartEvent -> 查询改写 -> 检索 -> 重排序 -> 构建上下文 -> 生成回答 -> StopEvent
    """
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.retriever = RAGRetriever()
        logger.info("RAGWorkflow 初始化完成")
    
    @step
    async def rewrite_query(self, ctx: Context, ev: StartEvent) -> QueryRewriteEvent:
        """步骤1: 查询改写"""
        query = ev.query
        history = getattr(ev, 'history', None)
        user_id = getattr(ev, 'user_id', None)
        book_id = getattr(ev, 'book_id', None)
        filter_expr = getattr(ev, 'filter_expr', None)
        top_k = getattr(ev, 'top_k', 5)
        enable_rerank = getattr(ev, 'enable_rerank', RERANK_ENABLED)
        
        # 处理记忆
        compressed_history = history or []
        summary = None
        
        if user_id and book_id and history:
            try:
                compressed_history, summary = await self.retriever.memory.check_and_compress(
                    user_id=user_id, book_id=book_id, history=history
                )
                logger.info(f"[Workflow] 记忆处理：{len(history)} -> {len(compressed_history)} 条")
            except Exception as e:
                logger.error(f"[Workflow] 记忆处理失败: {e}")
                compressed_history = history
        elif user_id and book_id:
            try:
                summary = await self.retriever.memory.get_summary(user_id, book_id)
            except Exception as e:
                logger.warning(f"[Workflow] 获取摘要失败: {e}")
        
        # 改写查询
        rewritten = await self.retriever.rewrite_query(query, compressed_history)
        logger.info(f"[Workflow] 查询改写完成: '{query[:30]}...' -> '{rewritten[:30]}...'")
        
        return QueryRewriteEvent(
            original_query=query,
            rewritten_query=rewritten,
            history=compressed_history,
            summary=summary,
            filter_expr=filter_expr,
            top_k=top_k,
            enable_rerank=enable_rerank
        )
    
    @step
    async def retrieve(self, ctx: Context, ev: QueryRewriteEvent) -> RetrievalEvent:
        """步骤2: 向量检索"""
        results = self.retriever.retrieve(
            query=ev.rewritten_query,
            top_k=ev.top_k,
            filter_expr=ev.filter_expr
        )
        logger.info(f"[Workflow] 检索完成: 找到 {len(results)} 个片段")
        
        return RetrievalEvent(
            original_query=ev.original_query,
            rewritten_query=ev.rewritten_query,
            results=results,
            history=ev.history,
            summary=ev.summary,
            enable_rerank=ev.enable_rerank
        )

    @step
    async def rerank(self, ctx: Context, ev: RetrievalEvent) -> RerankEvent:
        """步骤3: 重排序（可选）"""
        results = ev.results

        if ev.enable_rerank and RERANK_ENABLED and results:
            results = await self.retriever.rerank(
                query=ev.rewritten_query,
                results=results,
                top_n=RERANK_TOP_N
            )
            logger.info(f"[Workflow] 重排序完成: {len(ev.results)} -> {len(results)}")
        else:
            logger.info(f"[Workflow] 跳过重排序")

        return RerankEvent(
            original_query=ev.original_query,
            rewritten_query=ev.rewritten_query,
            results=results,
            history=ev.history,
            summary=ev.summary
        )

    @step
    async def build_context(self, ctx: Context, ev: RerankEvent) -> ContextBuiltEvent:
        """步骤4: 构建上下文"""
        context, sources = self.retriever.build_context(
            results=ev.results,
            max_chars=CONTEXT_CHAR_LIMIT
        )
        logger.info(f"[Workflow] 上下文构建完成: {len(sources)} 个来源")

        return ContextBuiltEvent(
            original_query=ev.original_query,
            context=context,
            sources=sources,
            history=ev.history,
            summary=ev.summary
        )

    @step
    async def generate_answer(self, ctx: Context, ev: ContextBuiltEvent) -> StopEvent:
        """步骤5: 生成回答"""
        answer = await self.retriever.generate_answer(
            query=ev.original_query,
            context=ev.context,
            system_prompt=None,
            history=ev.history,
            summary=ev.summary
        )

        # 提取引用
        citations = self.retriever._extract_citations(answer, ev.sources)
        logger.info(f"[Workflow] 回答生成完成: {len(answer)} 字符, {len(citations)} 个引用")

        return StopEvent(result={
            "answer": answer,
            "sources": ev.sources,
            "citations": citations,
            "has_context": bool(ev.context)
        })


# ============ 流式 RAG Workflow ============

class RAGStreamWorkflow(Workflow):
    """
    流式 RAG 工作流（用于 SSE 流式响应）
    与 RAGWorkflow 类似，但最后一步返回生成器而非完整回答
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.retriever = RAGRetriever()
        logger.info("RAGStreamWorkflow 初始化完成")

    @step
    async def rewrite_query(self, ctx: Context, ev: StartEvent) -> QueryRewriteEvent:
        """步骤1: 查询改写"""
        query = ev.query
        history = getattr(ev, 'history', None)
        user_id = getattr(ev, 'user_id', None)
        book_id = getattr(ev, 'book_id', None)
        filter_expr = getattr(ev, 'filter_expr', None)
        top_k = getattr(ev, 'top_k', 5)
        enable_rerank = getattr(ev, 'enable_rerank', RERANK_ENABLED)

        compressed_history = history or []
        summary = None

        if user_id and book_id and history:
            try:
                compressed_history, summary = await self.retriever.memory.check_and_compress(
                    user_id=user_id, book_id=book_id, history=history
                )
            except Exception as e:
                logger.error(f"[StreamWorkflow] 记忆处理失败: {e}")
                compressed_history = history
        elif user_id and book_id:
            try:
                summary = await self.retriever.memory.get_summary(user_id, book_id)
            except Exception as e:
                logger.warning(f"[StreamWorkflow] 获取摘要失败: {e}")

        rewritten = await self.retriever.rewrite_query(query, compressed_history)

        return QueryRewriteEvent(
            original_query=query,
            rewritten_query=rewritten,
            history=compressed_history,
            summary=summary,
            filter_expr=filter_expr,
            top_k=top_k,
            enable_rerank=enable_rerank
        )

    @step
    async def retrieve(self, ctx: Context, ev: QueryRewriteEvent) -> RetrievalEvent:
        """步骤2: 向量检索"""
        results = self.retriever.retrieve(
            query=ev.rewritten_query,
            top_k=ev.top_k,
            filter_expr=ev.filter_expr
        )

        return RetrievalEvent(
            original_query=ev.original_query,
            rewritten_query=ev.rewritten_query,
            results=results,
            history=ev.history,
            summary=ev.summary,
            enable_rerank=ev.enable_rerank
        )

    @step
    async def rerank(self, ctx: Context, ev: RetrievalEvent) -> RerankEvent:
        """步骤3: 重排序"""
        results = ev.results

        if ev.enable_rerank and RERANK_ENABLED and results:
            results = await self.retriever.rerank(
                query=ev.rewritten_query,
                results=results,
                top_n=RERANK_TOP_N
            )

        return RerankEvent(
            original_query=ev.original_query,
            rewritten_query=ev.rewritten_query,
            results=results,
            history=ev.history,
            summary=ev.summary
        )

    @step
    async def build_context(self, ctx: Context, ev: RerankEvent) -> ContextBuiltEvent:
        """步骤4: 构建上下文"""
        context, sources = self.retriever.build_context(
            results=ev.results,
            max_chars=CONTEXT_CHAR_LIMIT
        )

        return ContextBuiltEvent(
            original_query=ev.original_query,
            context=context,
            sources=sources,
            history=ev.history,
            summary=ev.summary
        )

    @step
    async def prepare_stream(self, ctx: Context, ev: ContextBuiltEvent) -> StopEvent:
        """步骤5: 准备流式生成（返回生成器和元数据）"""
        # 返回流式生成所需的所有信息，实际流式生成在路由层处理
        return StopEvent(result={
            "query": ev.original_query,
            "context": ev.context,
            "sources": ev.sources,
            "history": ev.history,
            "summary": ev.summary,
            "retriever": self.retriever  # 传递 retriever 用于流式生成
        })


# ============ 可视化辅助函数 ============

def generate_workflow_diagram(workflow_class, filename: str = "workflow.html") -> str:
    """
    生成工作流的可视化图表

    Args:
        workflow_class: Workflow 类（RAGWorkflow 或 RAGStreamWorkflow）
        filename: 输出文件名

    Returns:
        生成的 HTML 文件路径
    """
    try:
        from llama_index.utils.workflow import draw_all_possible_flows
        draw_all_possible_flows(workflow_class, filename=filename)
        logger.info(f"[Workflow] 流程图已生成: {filename}")
        return filename
    except ImportError:
        logger.warning("需要安装 llama-index-utils-workflow 才能生成可视化图表")
        return ""
    except Exception as e:
        logger.error(f"[Workflow] 生成流程图失败: {e}")
        return ""


def generate_execution_trace(workflow_instance, filename: str = "execution_trace.html") -> str:
    """
    生成最近一次执行的追踪图

    Args:
        workflow_instance: Workflow 实例
        filename: 输出文件名

    Returns:
        生成的 HTML 文件路径
    """
    try:
        from llama_index.utils.workflow import draw_most_recent_execution
        draw_most_recent_execution(workflow_instance, filename=filename)
        logger.info(f"[Workflow] 执行追踪图已生成: {filename}")
        return filename
    except ImportError:
        logger.warning("需要安装 llama-index-utils-workflow 才能生成执行追踪图")
        return ""
    except Exception as e:
        logger.error(f"[Workflow] 生成执行追踪图失败: {e}")
        return ""


# ============ 工厂函数 ============

_rag_workflow: Optional[RAGWorkflow] = None
_rag_stream_workflow: Optional[RAGStreamWorkflow] = None


def get_rag_workflow() -> RAGWorkflow:
    """获取 RAGWorkflow 单例"""
    global _rag_workflow
    if _rag_workflow is None:
        _rag_workflow = RAGWorkflow(timeout=120, verbose=False)
    return _rag_workflow


def get_rag_stream_workflow() -> RAGStreamWorkflow:
    """获取 RAGStreamWorkflow 单例"""
    global _rag_stream_workflow
    if _rag_stream_workflow is None:
        _rag_stream_workflow = RAGStreamWorkflow(timeout=120, verbose=False)
    return _rag_stream_workflow

