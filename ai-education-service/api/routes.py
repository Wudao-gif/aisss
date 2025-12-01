"""
API 路由定义
"""

import json
import logging
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
from modules.conversation_memory import get_memory
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
    description="从 OSS 下载文档，进行解析、分块、向量化，并存储到向量数据库"
)
async def process_document(
    request: ProcessDocumentRequest,
    _: bool = Depends(verify_api_key)
):
    """
    处理文档端点
    
    接收 OSS 文件信息，执行完整的处理流程：
    1. 从 OSS 下载文件
    2. 使用 LlamaIndex 解析文档
    3. 文本分块
    4. 生成向量（通过 OpenRouter）
    5. 存储到 DashVector
    """
    try:
        logger.info(f"收到处理请求: {request.oss_key}")
        
        pipeline = get_pipeline()
        result = pipeline.process(
            oss_key=request.oss_key,
            bucket=request.bucket,
            metadata=request.metadata
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
        logger.error(f"处理文档时发生错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post(
    "/process-document/async",
    response_model=ProcessDocumentResponse,
    summary="异步处理文档",
    description="异步处理文档，立即返回，后台执行处理"
)
async def process_document_async(
    request: ProcessDocumentRequest,
    background_tasks: BackgroundTasks,
    _: bool = Depends(verify_api_key)
):
    """
    异步处理文档端点
    
    立即返回响应，在后台执行处理任务。
    适用于大文件处理场景。
    """
    def background_process():
        try:
            pipeline = get_pipeline()
            result = pipeline.process(
                oss_key=request.oss_key,
                bucket=request.bucket,
                metadata=request.metadata
            )
            logger.info(f"后台处理完成: {request.oss_key}, 结果: {result.success}")
        except Exception as e:
            logger.error(f"后台处理失败: {request.oss_key}, 错误: {e}")
    
    background_tasks.add_task(background_process)
    
    return ProcessDocumentResponse(
        success=True,
        message="任务已提交，正在后台处理",
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


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="RAG 问答",
    description="基于检索增强生成（RAG）的智能问答"
)
async def chat(
    request: ChatRequest,
    _: bool = Depends(verify_api_key)
):
    """
    RAG 问答端点

    完整的 RAG 流程：
    1. 根据问题检索相关文档
    2. 构建上下文
    3. 调用大模型生成回答
    """
    try:
        logger.info(f"收到问答请求: {request.question[:50]}...")

        retriever = get_retriever()

        # 转换历史对话格式
        history = None
        if request.history:
            history = [{"role": msg.role, "content": msg.content} for msg in request.history]

        result = await retriever.query(
            question=request.question,
            top_k=request.top_k,
            filter_expr=request.filter_expr,
            system_prompt=request.system_prompt,
            history=history
        )

        # 转换来源为响应格式
        sources = [
            SearchResult(
                id=s["id"],
                text=s["text"],
                score=s["score"],
                metadata=s.get("metadata")
            )
            for s in result.get("sources", [])
        ]

        return ChatResponse(
            success=True,
            answer=result["answer"],
            sources=sources,
            has_context=result["has_context"]
        )

    except Exception as e:
        logger.error(f"问答时发生错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post(
    "/chat/stream",
    summary="RAG 流式问答",
    description="基于检索增强生成（RAG）的智能问答，流式输出，支持多轮对话和长期记忆"
)
async def chat_stream(
    request: ChatRequest,
    _: bool = Depends(verify_api_key)
):
    """
    RAG 流式问答端点（支持多轮对话 + 长期记忆）

    返回 SSE 格式的流式响应：
    - event: sources - 检索到的参考来源
    - event: content - AI 生成的内容片段
    - event: done - 完成标记

    多轮对话特性：
    - 懒惰压缩：历史超过阈值时自动生成摘要
    - 查询改写：解决指代不清问题（如"它"、"这个"）
    - 上下文隔离：通过 book_id 隔离不同学科的记忆
    - 长期记忆：摘要存储在 Redis/内存中，Key: summary_{user_id}_{book_id}
    """
    try:
        retriever = get_retriever()
        memory = get_memory()

        # 转换历史对话格式
        history = []
        if request.history:
            history = [{"role": msg.role, "content": msg.content} for msg in request.history]

        # 获取 user_id 和 book_id（用于长期记忆）
        user_id = request.user_id or "anonymous"
        book_id = request.book_id or "default"

        logger.info(f"收到流式问答请求: {request.question[:50]}..., user={user_id}, book={book_id}, 历史: {len(history)} 条")

        # 1. 检查并压缩对话历史（懒惰模式）
        compressed_history, summary = await memory.check_and_compress(user_id, book_id, history)

        # 2. 构建增强的系统提示词（注入摘要）
        enhanced_system_prompt = request.system_prompt or ""
        if summary:
            enhanced_system_prompt = f"""[对话背景摘要]
{summary}

---
{enhanced_system_prompt}"""
            logger.info(f"已注入对话摘要，长度: {len(summary)}")

        # 3. 查询改写（结合摘要上下文）
        rewrite_context = compressed_history.copy()
        if summary:
            rewrite_context.insert(0, {"role": "system", "content": f"[之前的对话摘要]: {summary}"})
        rewritten_query = await retriever.rewrite_query(request.question, rewrite_context)

        # 4. 使用改写后的查询检索相关文档
        results = retriever.retrieve(
            query=rewritten_query,
            top_k=request.top_k,
            filter_expr=request.filter_expr  # 保留 book_id 过滤，确保不跑题
        )

        # 5. 构建上下文
        context = retriever.build_context(results)
        has_context = len(results) > 0

        # 转换来源为响应格式
        sources = [
            {
                "id": r["id"],
                "text": r["text"],
                "score": r["score"],
                "metadata": r.get("metadata")
            }
            for r in results
        ]

        async def generate():
            # 先发送 sources
            yield f"event: sources\ndata: {json.dumps({'sources': sources, 'has_context': has_context}, ensure_ascii=False)}\n\n"

            if not has_context:
                # 没有上下文，直接返回提示
                yield f"event: content\ndata: {json.dumps({'content': '抱歉，没有找到相关的参考资料来回答您的问题。'}, ensure_ascii=False)}\n\n"
            else:
                # 流式生成回答（传入压缩后的历史对话）
                async for chunk in retriever.generate_answer_stream(
                    query=request.question,  # 使用原始问题
                    context=context,
                    system_prompt=enhanced_system_prompt,  # 使用增强的系统提示词
                    history=compressed_history  # 传入压缩后的历史
                ):
                    yield f"event: content\ndata: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

            # 发送完成标记
            yield f"event: done\ndata: {json.dumps({'done': True})}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    except Exception as e:
        logger.error(f"流式问答时发生错误: {e}")
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
