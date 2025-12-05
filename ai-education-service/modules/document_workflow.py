"""
文档处理 Workflow 模块
使用 LlamaIndex Workflows 实现事件驱动的文档处理流程
"""

import logging
from pathlib import Path
from typing import Optional, Dict, Any
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
from .oss_downloader import OSSDownloader
from .document_processor import DocumentProcessor
from .vector_store import VectorStore
from .pipeline import ProcessingStatus, ProcessingResult

logger = logging.getLogger(__name__)


# ============ 事件定义 ============

@dataclass
class ValidationEvent(Event):
    """文件验证完成事件"""
    oss_key: str
    bucket: str
    metadata: Dict[str, Any]
    is_valid: bool
    error: Optional[str] = None


@dataclass
class DownloadEvent(Event):
    """文件下载完成事件"""
    oss_key: str
    local_path: Path
    metadata: Dict[str, Any]


@dataclass
class ProcessEvent(Event):
    """文档处理完成事件"""
    oss_key: str
    local_path: Path
    nodes: list
    metadata: Dict[str, Any]


@dataclass
class StoreEvent(Event):
    """向量存储完成事件"""
    oss_key: str
    local_path: Path
    nodes_count: int
    vectors_stored: int


@dataclass
class FailedEvent(Event):
    """处理失败事件"""
    oss_key: str
    status: ProcessingStatus
    error: str
    local_path: Optional[Path] = None


# ============ 文档处理 Workflow ============

class DocumentProcessingWorkflow(Workflow):
    """
    事件驱动的文档处理工作流
    
    流程：StartEvent -> 验证 -> 下载 -> 处理 -> 存储 -> 清理 -> StopEvent
                          ↓ (失败)
                       FailedEvent -> 清理 -> StopEvent
    """
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.downloader = OSSDownloader()
        self.processor = DocumentProcessor()
        self.vector_store = VectorStore()
        logger.info("DocumentProcessingWorkflow 初始化完成")
    
    @step
    async def validate(self, ctx: Context, ev: StartEvent) -> ValidationEvent | FailedEvent:
        """步骤1: 验证文件类型"""
        oss_key = ev.oss_key
        bucket = getattr(ev, 'bucket', None) or settings.OSS_BUCKET
        metadata = getattr(ev, 'metadata', {}) or {}
        
        suffix = Path(oss_key).suffix.lower().lstrip(".")
        is_valid = suffix in settings.supported_extensions
        
        if not is_valid:
            logger.warning(f"[Workflow] 不支持的文件类型: {oss_key}")
            return FailedEvent(
                oss_key=oss_key,
                status=ProcessingStatus.FAILED,
                error=f"不支持的文件类型，支持: {settings.SUPPORTED_FILE_TYPES}"
            )
        
        logger.info(f"[Workflow] 文件验证通过: {oss_key}")
        return ValidationEvent(
            oss_key=oss_key,
            bucket=bucket,
            metadata=metadata,
            is_valid=True
        )
    
    @step
    async def download(self, ctx: Context, ev: ValidationEvent) -> DownloadEvent | FailedEvent:
        """步骤2: 从 OSS 下载文件"""
        try:
            local_path = self.downloader.download(ev.oss_key)
            
            file_metadata = {
                "oss_key": ev.oss_key,
                "bucket": ev.bucket,
                "file_name": Path(ev.oss_key).name,
                **ev.metadata
            }
            
            logger.info(f"[Workflow] 文件下载完成: {ev.oss_key} -> {local_path}")
            return DownloadEvent(
                oss_key=ev.oss_key,
                local_path=local_path,
                metadata=file_metadata
            )
        except Exception as e:
            logger.error(f"[Workflow] 文件下载失败: {ev.oss_key}, 错误: {e}")
            return FailedEvent(
                oss_key=ev.oss_key,
                status=ProcessingStatus.FAILED,
                error=f"下载失败: {str(e)}"
            )
    
    @step
    async def process_document(self, ctx: Context, ev: DownloadEvent) -> ProcessEvent | FailedEvent:
        """步骤3: 解析和分块文档"""
        try:
            nodes = self.processor.process(ev.local_path, metadata=ev.metadata)
            
            if not nodes:
                return FailedEvent(
                    oss_key=ev.oss_key,
                    status=ProcessingStatus.FAILED,
                    error="文档处理失败：未生成任何节点",
                    local_path=ev.local_path
                )
            
            logger.info(f"[Workflow] 文档处理完成: {len(nodes)} 个节点")
            return ProcessEvent(
                oss_key=ev.oss_key,
                local_path=ev.local_path,
                nodes=nodes,
                metadata=ev.metadata
            )
        except Exception as e:
            logger.error(f"[Workflow] 文档处理失败: {e}")
            return FailedEvent(
                oss_key=ev.oss_key,
                status=ProcessingStatus.FAILED,
                error=f"处理失败: {str(e)}",
                local_path=ev.local_path
            )

    @step
    async def store_vectors(self, ctx: Context, ev: ProcessEvent) -> StoreEvent | FailedEvent:
        """步骤4: 存储向量"""
        try:
            vectors_stored = self.vector_store.insert(ev.nodes)

            logger.info(f"[Workflow] 向量存储完成: {vectors_stored} 个向量")
            return StoreEvent(
                oss_key=ev.oss_key,
                local_path=ev.local_path,
                nodes_count=len(ev.nodes),
                vectors_stored=vectors_stored
            )
        except Exception as e:
            logger.error(f"[Workflow] 向量存储失败: {e}")
            return FailedEvent(
                oss_key=ev.oss_key,
                status=ProcessingStatus.FAILED,
                error=f"存储失败: {str(e)}",
                local_path=ev.local_path
            )

    @step
    async def cleanup_success(self, ctx: Context, ev: StoreEvent) -> StopEvent:
        """步骤5a: 成功后清理临时文件"""
        self.downloader.cleanup(ev.local_path)
        logger.info(f"[Workflow] 处理完成: {ev.oss_key}")

        result = ProcessingResult(
            success=True,
            status=ProcessingStatus.COMPLETED,
            message="文档处理成功",
            file_key=ev.oss_key,
            chunks_count=ev.nodes_count,
            vectors_stored=ev.vectors_stored
        )
        return StopEvent(result=result.to_dict())

    @step
    async def cleanup_failed(self, ctx: Context, ev: FailedEvent) -> StopEvent:
        """步骤5b: 失败后清理临时文件"""
        if ev.local_path:
            self.downloader.cleanup(ev.local_path)

        logger.error(f"[Workflow] 处理失败: {ev.oss_key}, 错误: {ev.error}")

        result = ProcessingResult(
            success=False,
            status=ev.status,
            message="文档处理失败",
            file_key=ev.oss_key,
            error=ev.error
        )
        return StopEvent(result=result.to_dict())


# ============ 工厂函数 ============

_document_workflow: Optional[DocumentProcessingWorkflow] = None


def get_document_workflow() -> DocumentProcessingWorkflow:
    """获取 DocumentProcessingWorkflow 单例"""
    global _document_workflow
    if _document_workflow is None:
        _document_workflow = DocumentProcessingWorkflow(timeout=300, verbose=False)
    return _document_workflow

