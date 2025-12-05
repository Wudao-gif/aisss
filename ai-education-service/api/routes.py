"""
API 路由定义
"""

import json
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, HTMLResponse, FileResponse

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
from modules.rag_workflow import (
    RAGWorkflow, RAGStreamWorkflow,
    get_rag_workflow, get_rag_stream_workflow,
    generate_workflow_diagram, generate_execution_trace
)
from modules.document_workflow import (
    DocumentProcessingWorkflow,
    get_document_workflow
)
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

        # 🔧 最终修正：强制 system_prompt=None，确保引用规则不被覆盖
        result = await retriever.query(
            question=request.question,
            top_k=request.top_k,
            filter_expr=request.filter_expr,
            system_prompt=None,  # ← 强制为 None！禁止覆盖引用规则
            history=history,
            user_id=request.user_id,
            book_id=request.book_id
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
        if summary:
            logger.info(f"已获取对话摘要，长度: {len(summary)}")

        # 2. 查询改写（结合摘要上下文）
        rewrite_context = compressed_history.copy()
        if summary:
            rewrite_context.insert(0, {"role": "system", "content": f"[之前的对话摘要]: {summary}"})
        rewritten_query = await retriever.rewrite_query(request.question, rewrite_context)

        # 3. 使用改写后的查询检索相关文档
        results = retriever.retrieve(
            query=rewritten_query,
            top_k=request.top_k,
            filter_expr=request.filter_expr  # 保留 book_id 过滤，确保不跑题
        )

        # 4. 构建上下文（带引用标记 [来源X]）
        # build_context 返回 (context_str, used_results)
        context, used_results = retriever.build_context(results)
        has_context = len(used_results) > 0

        # 转换来源为响应格式（使用 used_results，包含 citation_id）
        sources = [
            {
                "id": r["id"],
                "text": r["text"],
                "score": r["score"],
                "metadata": r.get("metadata"),
                "citation_id": r.get("citation_id", i + 1)  # 引用编号
            }
            for i, r in enumerate(used_results)
        ]

        async def generate():
            # 先发送 sources
            yield f"event: sources\ndata: {json.dumps({'sources': sources, 'has_context': has_context}, ensure_ascii=False)}\n\n"

            # 🚨 【修改点】移除 "if not has_context" 的拦截判断
            # 无论是否有上下文，都调用 generate_answer_stream
            # 让 LLM 自己根据 System Prompt 决定：是回答"不知道"，还是根据"历史对话"回答
            async for chunk in retriever.generate_answer_stream(
                query=request.question,
                context=context,     # 即使是空字符串也没关系
                system_prompt=None,  # ← 强制为 None！禁止 API 层覆盖引用规则
                history=compressed_history,
                summary=summary      # ← 独立传递，由 retriever 融合到 prompt
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


# ==================== Workflow 可视化接口 ====================

@router.get(
    "/workflow/visualize",
    response_class=HTMLResponse,
    summary="工作流可视化",
    description="生成并返回工作流的可视化图表（HTML 格式）"
)
async def visualize_workflow(
    workflow_type: str = Query(
        default="rag",
        description="工作流类型: rag, rag_stream, document"
    ),
    _: bool = Depends(verify_api_key)
):
    """
    工作流可视化端点

    生成指定工作流的交互式流程图（HTML 格式）。

    支持的工作流类型：
    - rag: RAG 问答工作流
    - rag_stream: RAG 流式问答工作流
    - document: 文档处理工作流
    """
    try:
        workflow_map = {
            "rag": RAGWorkflow,
            "rag_stream": RAGStreamWorkflow,
            "document": DocumentProcessingWorkflow
        }

        if workflow_type not in workflow_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的工作流类型: {workflow_type}，支持: {list(workflow_map.keys())}"
            )

        workflow_class = workflow_map[workflow_type]
        filename = f"workflow_{workflow_type}.html"

        # 生成流程图
        result_path = generate_workflow_diagram(workflow_class, filename)

        if not result_path or not Path(result_path).exists():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="生成流程图失败，请确保已安装 llama-index-utils-workflow"
            )

        # 读取并返回 HTML 内容
        with open(result_path, "r", encoding="utf-8") as f:
            html_content = f.read()

        return HTMLResponse(content=html_content)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成工作流可视化时发生错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get(
    "/workflow/info",
    summary="工作流信息",
    description="获取所有可用工作流的信息"
)
async def workflow_info(
    _: bool = Depends(verify_api_key)
):
    """
    获取工作流信息端点

    返回所有可用工作流的描述和步骤信息。
    """
    return {
        "workflows": [
            {
                "type": "rag",
                "name": "RAG 问答工作流",
                "description": "事件驱动的 RAG 问答流程",
                "steps": [
                    "rewrite_query - 查询改写（解决指代问题）",
                    "retrieve - 向量检索",
                    "rerank - 重排序（可选）",
                    "build_context - 构建上下文",
                    "generate_answer - 生成回答"
                ]
            },
            {
                "type": "rag_stream",
                "name": "RAG 流式问答工作流",
                "description": "支持 SSE 流式输出的 RAG 问答流程",
                "steps": [
                    "rewrite_query - 查询改写",
                    "retrieve - 向量检索",
                    "rerank - 重排序",
                    "build_context - 构建上下文",
                    "prepare_stream - 准备流式生成"
                ]
            },
            {
                "type": "document",
                "name": "文档处理工作流",
                "description": "事件驱动的文档处理流程",
                "steps": [
                    "validate - 验证文件类型",
                    "download - 从 OSS 下载",
                    "process_document - 解析和分块",
                    "store_vectors - 存储向量",
                    "cleanup_success/cleanup_failed - 清理临时文件"
                ]
            }
        ],
        "visualization_url": "/api/workflow/visualize?workflow_type={type}"
    }


# ==================== Workflow 版本的接口（可选启用）====================

@router.post(
    "/v2/chat",
    response_model=ChatResponse,
    summary="RAG 问答 (Workflow 版本)",
    description="使用 LlamaIndex Workflows 实现的 RAG 问答"
)
async def chat_v2(
    request: ChatRequest,
    _: bool = Depends(verify_api_key)
):
    """
    Workflow 版本的 RAG 问答端点

    使用事件驱动的工作流架构，提供更好的可观测性和错误处理。
    """
    try:
        logger.info(f"[Workflow] 收到问答请求: {request.question[:50]}...")

        workflow = get_rag_workflow()

        # 转换历史对话格式
        history = None
        if request.history:
            history = [{"role": msg.role, "content": msg.content} for msg in request.history]

        # 运行工作流
        result = await workflow.run(
            query=request.question,
            history=history,
            user_id=request.user_id,
            book_id=request.book_id,
            filter_expr=request.filter_expr,
            top_k=request.top_k
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
        logger.error(f"[Workflow] 问答时发生错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post(
    "/v2/chat/stream",
    summary="RAG 流式问答 (Workflow 版本)",
    description="使用 LlamaIndex Workflows 实现的流式 RAG 问答"
)
async def chat_stream_v2(
    request: ChatRequest,
    _: bool = Depends(verify_api_key)
):
    """
    Workflow 版本的流式 RAG 问答端点

    使用事件驱动的工作流架构，返回 SSE 格式的流式响应。
    """
    try:
        logger.info(f"[Workflow] 收到流式问答请求: {request.question[:50]}...")

        workflow = get_rag_stream_workflow()

        # 转换历史对话格式
        history = None
        if request.history:
            history = [{"role": msg.role, "content": msg.content} for msg in request.history]

        # 运行工作流获取准备好的数据
        prep_result = await workflow.run(
            query=request.question,
            history=history,
            user_id=request.user_id,
            book_id=request.book_id,
            filter_expr=request.filter_expr,
            top_k=request.top_k
        )

        # 提取流式生成所需的数据
        retriever = prep_result["retriever"]
        query = prep_result["query"]
        context = prep_result["context"]
        sources = prep_result["sources"]
        history = prep_result["history"]
        summary = prep_result["summary"]
        has_context = bool(context)

        # 转换来源格式
        sources_data = [
            {
                "id": s["id"],
                "text": s["text"],
                "score": s["score"],
                "metadata": s.get("metadata"),
                "citation_id": s.get("citation_id", i + 1)
            }
            for i, s in enumerate(sources)
        ]

        async def generate():
            # 发送 sources
            yield f"event: sources\ndata: {json.dumps({'sources': sources_data, 'has_context': has_context}, ensure_ascii=False)}\n\n"

            # 流式生成回答
            async for chunk in retriever.generate_answer_stream(
                query=query,
                context=context,
                system_prompt=None,
                history=history,
                summary=summary
            ):
                yield f"event: content\ndata: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

            # 完成标记
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
        logger.error(f"[Workflow] 流式问答时发生错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
