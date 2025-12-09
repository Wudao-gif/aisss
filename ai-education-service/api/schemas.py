"""
API 请求/响应模型
使用 Pydantic 定义数据结构
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ProcessDocumentRequest(BaseModel):
    """文档处理请求"""
    
    oss_key: str = Field(
        ...,
        description="OSS 文件路径/key，例如: book-files/xxx.pdf",
        examples=["book-files/1234567890-abc123.pdf"]
    )
    bucket: Optional[str] = Field(
        None,
        description="OSS Bucket 名称，不指定则使用默认配置"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="额外的元数据，将附加到向量记录中",
        examples=[{"book_id": "uuid-xxx", "title": "高等数学"}]
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "oss_key": "book-files/1234567890-abc123.pdf",
                "bucket": None,
                "metadata": {
                    "book_id": "550e8400-e29b-41d4-a716-446655440000",
                    "title": "高等数学（上册）",
                    "author": "同济大学数学系"
                }
            }
        }


class ProcessDocumentResponse(BaseModel):
    """文档处理响应"""
    
    success: bool = Field(..., description="处理是否成功")
    message: str = Field(..., description="处理结果消息")
    data: Optional[Dict[str, Any]] = Field(None, description="处理结果数据")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "文档处理成功",
                "data": {
                    "status": "completed",
                    "file_key": "book-files/1234567890-abc123.pdf",
                    "chunks_count": 42,
                    "vectors_stored": 42
                }
            }
        }


class HealthResponse(BaseModel):
    """健康检查响应"""
    
    status: str = Field(..., description="服务状态")
    version: str = Field(..., description="服务版本")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "version": "1.0.0"
            }
        }


class ErrorResponse(BaseModel):
    """错误响应"""

    success: bool = Field(False, description="始终为 False")
    message: str = Field(..., description="错误消息")
    error: Optional[str] = Field(None, description="详细错误信息")

    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "message": "文档处理失败",
                "error": "不支持的文件类型: .xyz"
            }
        }


# ==================== RAG 检索相关 ====================

class SearchRequest(BaseModel):
    """向量检索请求"""

    query: str = Field(
        ...,
        description="搜索查询文本",
        min_length=1,
        max_length=1000,
        examples=["什么是微积分？"]
    )
    top_k: int = Field(
        5,
        description="返回结果数量",
        ge=1,
        le=20
    )
    filter_expr: Optional[str] = Field(
        None,
        description="过滤表达式，用于筛选特定文档"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "query": "什么是微积分的基本定理？",
                "top_k": 5,
                "filter_expr": None
            }
        }


class SearchResult(BaseModel):
    """单个检索结果"""

    id: str = Field(..., description="文档片段ID")
    text: str = Field(..., description="文档内容")
    score: float = Field(..., description="相似度分数")
    metadata: Optional[str] = Field(None, description="元数据")


class SearchResponse(BaseModel):
    """向量检索响应"""

    success: bool = Field(..., description="是否成功")
    results: list[SearchResult] = Field(default_factory=list, description="检索结果列表")
    total: int = Field(0, description="结果数量")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "results": [
                    {
                        "id": "node-123",
                        "text": "微积分基本定理是微积分学中最重要的定理之一...",
                        "score": 0.92,
                        "metadata": "{\"source\": \"高等数学.pdf\"}"
                    }
                ],
                "total": 1
            }
        }


class ChatMessage(BaseModel):
    """对话消息"""
    role: str = Field(..., description="角色: user 或 assistant")
    content: str = Field(..., description="消息内容")


class ChatRequest(BaseModel):
    """RAG 问答请求"""

    question: str = Field(
        ...,
        description="用户问题",
        min_length=1,
        max_length=2000,
        examples=["请解释微积分基本定理"]
    )
    user_id: Optional[str] = Field(
        None,
        description="用户 ID，用于长期记忆存储"
    )
    book_id: Optional[str] = Field(
        None,
        description="教材 ID，用于上下文隔离"
    )
    book_name: Optional[str] = Field(
        None,
        description="教材名称，用于AI上下文感知和进度显示"
    )
    top_k: int = Field(
        5,
        description="检索的参考文档数量",
        ge=1,
        le=20
    )
    filter_expr: Optional[str] = Field(
        None,
        description="过滤表达式"
    )
    system_prompt: Optional[str] = Field(
        None,
        description="自定义系统提示词"
    )
    history: Optional[List[ChatMessage]] = Field(
        None,
        description="历史对话记录，用于多轮对话"
    )
    thread_id: Optional[str] = Field(
        None,
        description="对话线程ID，用于短期记忆持久化。不传则自动生成 user_id_book_id"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "question": "那它有什么应用？",
                "user_id": "user_123",
                "book_id": "physics_101",
                "top_k": 5,
                "filter_expr": "book_id = 'physics_101'",
                "system_prompt": None,
                "history": [
                    {"role": "user", "content": "请解释微积分基本定理"},
                    {"role": "assistant", "content": "微积分基本定理是..."}
                ]
            }
        }


class ChatResponse(BaseModel):
    """RAG 问答响应"""

    success: bool = Field(..., description="是否成功")
    answer: str = Field(..., description="AI 生成的回答")
    sources: list[SearchResult] = Field(default_factory=list, description="参考来源")
    has_context: bool = Field(..., description="是否找到相关上下文")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "answer": "微积分基本定理是连接微分和积分的桥梁...",
                "sources": [
                    {
                        "id": "node-123",
                        "text": "微积分基本定理...",
                        "score": 0.92,
                        "metadata": "{}"
                    }
                ],
                "has_context": True
            }
        }


