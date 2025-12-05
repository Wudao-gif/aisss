"""
模块包
包含所有核心处理模块
"""

from .oss_downloader import OSSDownloader
from .document_processor import (
    DocumentProcessor,
    OpenRouterEmbedding,
    DashScopeEmbedding,
    Qwen25VLEmbedding,
    get_embedding_model,
)
from .vector_store import VectorStore
from .pipeline import ProcessingPipeline
from .rag_retriever import RAGRetriever

# LlamaIndex Workflows
from .rag_workflow import (
    RAGWorkflow,
    RAGStreamWorkflow,
    get_rag_workflow,
    get_rag_stream_workflow,
    generate_workflow_diagram,
    generate_execution_trace,
)
from .document_workflow import (
    DocumentProcessingWorkflow,
    get_document_workflow,
)

__all__ = [
    # 原有模块
    "OSSDownloader",
    "DocumentProcessor",
    "OpenRouterEmbedding",
    "DashScopeEmbedding",
    "Qwen25VLEmbedding",
    "get_embedding_model",
    "VectorStore",
    "ProcessingPipeline",
    "RAGRetriever",
    # Workflow 模块
    "RAGWorkflow",
    "RAGStreamWorkflow",
    "get_rag_workflow",
    "get_rag_stream_workflow",
    "generate_workflow_diagram",
    "generate_execution_trace",
    "DocumentProcessingWorkflow",
    "get_document_workflow",
]

