"""
API 路由定义

统一使用 LangGraph 多智能体架构 (v4)
"""

import json
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse

from .schemas import (
    ProcessDocumentRequest,
    ProcessDocumentResponse,
    HealthResponse,
    ErrorResponse,
    SearchRequest,
    SearchResponse,
    SearchResult,
    ChatRequest,
    ChatResponse,
)
from .dependencies import verify_api_key
from modules import ProcessingPipeline, RAGRetriever
from modules.document_workflow import get_document_workflow
from modules.langgraph import run_graph, run_graph_stream
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# 全局实例（延迟初始化）
_pipeline: ProcessingPipeline = None
_retriever: RAGRetriever = None


def get_pipeline() -> ProcessingPipeline:
    """获取处理管道实例"""
    global _pipeline
    if _pipeline is None:
        _pipeline = ProcessingPipeline()
    return _pipeline


def get_retriever() -> RAGRetriever:
    """获取 RAG 检索器实例"""
    global _retriever
    if _retriever is None:
        _retriever = RAGRetriever()
    return _retriever


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="健康检查",
    description="检查服务是否正常运行"
)
async def health_check():
    """健康检查端点"""
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION
    )


@router.post(
    "/process-document",
    response_model=ProcessDocumentResponse,
    responses={
        200: {"model": ProcessDocumentResponse, "description": "处理成功"},
        400: {"model": ErrorResponse, "description": "请求参数错误"},
        401: {"model": ErrorResponse, "description": "认证失败"},
        500: {"model": ErrorResponse, "description": "服务器内部错误"}
    },
    summary="处理文档",
    description="从 OSS 下载文档，进行解析、分块、向量化，存储到向量数据库，并提取知识图谱"
)
async def process_document(
    request: ProcessDocumentRequest,
    _: bool = Depends(verify_api_key)
):
    """
    处理文档端点（使用 Workflow）

    接收 OSS 文件信息，执行完整的处理流程：
    1. 从 OSS 下载文件
    2. 使用 LlamaIndex 解析文档
    3. 文本分块
    4. 生成向量并存储到 DashVector
    5. 提取知识图谱并存储到 Neo4j
    """
    try:
        logger.info(f"[Workflow] 收到处理请求: {request.oss_key}")

        workflow = get_document_workflow()
        result = await workflow.run(
            oss_key=request.oss_key,
            bucket=request.bucket,
            metadata=request.metadata or {}
        )

        if result.success:
            return ProcessDocumentResponse(
                success=True,
                message=result.message,
                data=result.to_dict()
            )
        else:
            return ProcessDocumentResponse(
                success=False,
                message=result.message,
                data=result.to_dict()
            )

    except Exception as e:
        logger.error(f"[Workflow] 处理文档时发生错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post(
    "/process-document/async",
    response_model=ProcessDocumentResponse,
    summary="异步处理文档",
    description="异步处理文档，立即返回，后台执行处理（使用 Workflow，包含知识图谱提取）"
)
async def process_document_async(
    request: ProcessDocumentRequest,
    background_tasks: BackgroundTasks,
    _: bool = Depends(verify_api_key)
):
    """
    异步处理文档端点（使用 Workflow）

    立即返回响应，在后台执行处理任务。
    包含知识图谱提取功能。
    """
    import asyncio

    async def background_process_async():
        try:
            logger.info(f"[Workflow] 后台开始处理: {request.oss_key}")
            workflow = get_document_workflow()
            result = await workflow.run(
                oss_key=request.oss_key,
                bucket=request.bucket,
                metadata=request.metadata or {}
            )
            logger.info(f"[Workflow] 后台处理完成: {request.oss_key}, 结果: {result.success}, KG: {result.kg_entities} 实体, {result.kg_relations} 关系")
        except Exception as e:
            logger.error(f"[Workflow] 后台处理失败: {request.oss_key}, 错误: {e}")

    def background_process():
        # 在新的事件循环中运行异步任务
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(background_process_async())
        finally:
            loop.close()

    background_tasks.add_task(background_process)

    return ProcessDocumentResponse(
        success=True,
        message="任务已提交，正在后台处理（包含知识图谱提取）",
        data={
            "status": "pending",
            "file_key": request.oss_key
        }
    )


# ==================== RAG 检索接口 ====================

@router.post(
    "/search",
    response_model=SearchResponse,
    summary="向量检索",
    description="根据查询文本检索相关文档片段"
)
async def search(
    request: SearchRequest,
    _: bool = Depends(verify_api_key)
):
    """
    向量检索端点

    根据用户查询生成向量，在向量数据库中检索相似文档片段。
    """
    try:
        logger.info(f"收到检索请求: {request.query[:50]}...")

        retriever = get_retriever()
        results = retriever.retrieve(
            query=request.query,
            top_k=request.top_k,
            filter_expr=request.filter_expr
        )

        # 转换为响应格式
        search_results = [
            SearchResult(
                id=r["id"],
                text=r["text"],
                score=r["score"],
                metadata=r.get("metadata")
            )
            for r in results
        ]

        return SearchResponse(
            success=True,
            results=search_results,
            total=len(search_results)
        )

    except Exception as e:
        logger.error(f"检索时发生错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==================== 向量管理接口 ====================

@router.delete(
    "/vectors/{book_id}",
    summary="删除图书向量",
    description="删除指定图书的所有向量数据"
)
async def delete_vectors(
    book_id: str,
    _: bool = Depends(verify_api_key)
):
    """
    删除图书向量端点

    根据 book_id 删除该图书的所有向量数据。
    用于图书删除或更新时清理旧数据。
    """
    try:
        logger.info(f"收到删除向量请求: book_id={book_id}")

        retriever = get_retriever()
        success = retriever.vector_store.delete_by_filter(f"book_id = '{book_id}'")

        return {
            "success": success,
            "message": "向量删除成功" if success else "向量删除失败",
            "book_id": book_id
        }

    except Exception as e:
        logger.error(f"删除向量时发生错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==================== 智能问答接口 (LangGraph 多智能体) ====================

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="智能问答",
    description="基于 LangGraph 多智能体架构的智能问答，支持记忆、混合检索、个性化回答"
)
async def chat(
    request: ChatRequest,
    _: bool = Depends(verify_api_key)
):
    """
    智能问答接口（LangGraph 多智能体）

    特性：
    - Supervisor 协调多个专业智能体
    - Letta 长期记忆（用户画像、知识理解、学习轨迹）
    - 混合检索（向量 + 知识图谱）
    - 个性化回答调整
    """
    try:
        logger.info(f"[LangGraph] 收到问答请求: {request.question[:50]}...")

        # 转换历史对话格式
        history = None
        if request.history:
            history = [{"role": msg.role, "content": msg.content} for msg in request.history]

        # 构建 thread_id（用于短期记忆持久化）
        user_id = request.user_id or "anonymous"
        book_id = request.book_id or "default"
        thread_id = request.thread_id or f"{user_id}_{book_id}"

        # 运行 LangGraph
        result = await run_graph(
            query=request.question,
            user_id=user_id,
            book_id=book_id,
            book_name=request.book_name or "",
            book_subject="",
            history=history,
            thread_id=thread_id
        )

        # 转换来源为响应格式
        sources = [
            SearchResult(
                id=f"source-{i}",
                text=s.get("text", "")[:500],
                score=s.get("score", 0),
                metadata=s.get("metadata")
            )
            for i, s in enumerate(result.get("sources", []))
        ]

        return ChatResponse(
            success=True,
            answer=result.get("answer", ""),
            sources=sources,
            has_context=len(sources) > 0
        )

    except Exception as e:
        logger.error(f"[LangGraph] 问答时发生错误: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post(
    "/chat/stream",
    summary="智能流式问答",
    description="基于 LangGraph 多智能体的流式问答，输出处理进度和答案"
)
async def chat_stream(
    request: ChatRequest,
    _: bool = Depends(verify_api_key)
):
    """
    智能流式问答接口（LangGraph 多智能体）

    SSE 事件格式:
    - progress: 处理进度
    - clarify: 需要澄清意图（返回选项）
    - content: 答案内容
    - attachments: 附件（导图等）
    - done: 完成标记
    """
    async def generate_stream():
        try:
            logger.info(f"[LangGraph Stream] 问题: {request.question[:50]}...")

            # 转换历史对话格式
            history = None
            if request.history:
                history = [{"role": msg.role, "content": msg.content} for msg in request.history]

            # 构建 thread_id（用于短期记忆持久化）
            user_id = request.user_id or "anonymous"
            book_id = request.book_id or "default"
            thread_id = request.thread_id or f"{user_id}_{book_id}"

            # 节点进度消息映射
            progress_messages = {
                "intent_clarify": "正在理解您的问题...",
                "task_plan": "正在规划任务...",
                "retrieval_agent": "正在检索相关资料...",
                "reasoning_agent": "正在进行推理分析...",
                "generation_agent": "正在生成内容...",
                "expression_agent": "正在优化表达...",
                "quality_agent": "正在检查回答质量...",
                "supervisor_exit": "正在整理回答...",
                "end_clarify": "需要确认您的需求..."
            }

            # 流式运行
            async for event in run_graph_stream(
                query=request.question,
                user_id=user_id,
                book_id=book_id,
                book_name=request.book_name or "",
                book_subject="",
                history=history,
                thread_id=thread_id
            ):
                node = event.get("node", "")

                # 发送进度
                if node:
                    progress_msg = progress_messages.get(node, f"处理中: {node}")
                    yield f"data: {json.dumps({'type': 'progress', 'step': node, 'message': progress_msg}, ensure_ascii=False)}\n\n"

                # 如果需要澄清
                if event.get("clarification_needed"):
                    options = event.get("clarification_options", [])
                    yield f"data: {json.dumps({'type': 'clarify', 'options': options}, ensure_ascii=False)}\n\n"

                # 如果有最终答案
                answer = event.get("answer", "")
                if answer and node in ["supervisor_exit", "end_clarify"]:
                    # 逐字发送
                    for char in answer:
                        yield f"data: {json.dumps({'type': 'content', 'data': char}, ensure_ascii=False)}\n\n"

                # 如果有附件
                attachments = event.get("attachments", [])
                if attachments:
                    yield f"data: {json.dumps({'type': 'attachments', 'data': attachments}, ensure_ascii=False)}\n\n"

            # 完成
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"[LangGraph Stream] 错误: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )