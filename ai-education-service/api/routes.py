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
from modules.langgraph import run_deep_agent, run_deep_agent_stream
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
    description="基于 Deep Agent 主系统的智能问答，支持记忆、任务规划、子代理委托"
)
async def chat(
    request: ChatRequest,
    _: bool = Depends(verify_api_key)
):
    """
    智能问答接口（Deep Agent 主系统）

    特性：
    - Deep Agent 作为主系统
    - 自动任务规划（TodoListMiddleware）
    - 文件系统访问（FilesystemMiddleware）
    - 子代理委托（SubAgentMiddleware）
    - 长期记忆（memory_read/memory_write）
    """
    try:
        logger.info(f"[Deep Agent] 收到问答请求: {request.question[:50]}...")

        # 转换历史对话格式
        history = None
        if request.history:
            history = [{"role": msg.role, "content": msg.content} for msg in request.history]

        # 构建 thread_id（用于短期记忆持久化）
        user_id = request.user_id or "anonymous"
        book_id = request.book_id or "default"
        thread_id = request.thread_id or f"{user_id}_{book_id}"

        # 运行 Deep Agent
        result = await run_deep_agent(
            query=request.question,
            user_id=user_id,
            book_id=book_id,
            book_name=request.book_name or "",
            book_subject="",
            history=history,
            thread_id=thread_id
        )

        # Deep Agent 返回格式：{"answer": "...", "error": None}
        if result.get("error"):
            raise Exception(result["error"])

        return ChatResponse(
            success=True,
            answer=result.get("answer", ""),
            sources=[],  # Deep Agent 暂不返回来源
            has_context=False
        )

    except Exception as e:
        logger.error(f"[Deep Agent] 问答时发生错误: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post(
    "/chat/stream",
    summary="智能流式问答",
    description="基于 Deep Agent 主系统的流式问答，输出处理进度和答案"
)
async def chat_stream(
    request: ChatRequest,
    _: bool = Depends(verify_api_key)
):
    """
    智能流式问答接口（Deep Agent 主系统）

    SSE 事件格式:
    - start: 开始处理
    - progress: 处理进度（来自工具的自定义进度）
    - node: 节点状态更新
    - token: LLM token 流式输出（逐字）
    - answer: 完整回答
    - error: 错误信息
    - done: 完成标记
    """
    async def generate_stream():
        try:
            logger.info(f"[Deep Agent Stream] 问题: {request.question[:50]}...")

            # 转换历史对话格式
            history = None
            if request.history:
                history = [{"role": msg.role, "content": msg.content} for msg in request.history]

            # 构建 thread_id（用于短期记忆持久化）
            user_id = request.user_id or "anonymous"
            book_id = request.book_id or "default"
            thread_id = request.thread_id or f"{user_id}_{book_id}"

            # 流式运行 Deep Agent
            async for event in run_deep_agent_stream(
                query=request.question,
                user_id=user_id,
                book_id=book_id,
                book_name=request.book_name or "",
                book_subject="",
                history=history,
                thread_id=thread_id
            ):
                event_type = event.get("event_type", "")

                if event_type == "start":
                    # 开始事件
                    yield f"data: {json.dumps({'type': 'start', 'message': event.get('message', '开始处理...')}, ensure_ascii=False)}\n\n"

                elif event_type == "node":
                    # 节点状态更新 - 忽略，不发送虚假的进度消息
                    # 只有当工具发送自定义进度时，才显示步骤
                    pass

                elif event_type == "progress":
                    # 自定义进度（来自工具的真实进度）
                    yield f"data: {json.dumps({'type': 'progress', 'step': event.get('step', ''), 'status': event.get('status', ''), 'message': event.get('message', ''), 'icon': event.get('icon', '')}, ensure_ascii=False)}\n\n"

                elif event_type == "token":
                    # LLM token 流式输出（逐字）
                    content = event.get("content", "")
                    if content:
                        yield f"data: {json.dumps({'type': 'token', 'data': content}, ensure_ascii=False)}\n\n"

                elif event_type == "answer":
                    # 完整回答（备用，用于非流式场景）
                    content = event.get("content", "")
                    if content:
                        yield f"data: {json.dumps({'type': 'answer', 'data': content}, ensure_ascii=False)}\n\n"

                elif event_type == "error":
                    # 错误
                    yield f"data: {json.dumps({'type': 'error', 'message': event.get('error', '未知错误')}, ensure_ascii=False)}\n\n"
                    break

            # 完成
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"[Deep Agent Stream] 错误: {e}")
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