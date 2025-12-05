"""
处理管道模块
串联各模块形成完整的文档处理流程
"""

import logging
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum

from .oss_downloader import OSSDownloader
from .document_processor import DocumentProcessor
from .vector_store import VectorStore
from config import settings

logger = logging.getLogger(__name__)


class ProcessingStatus(str, Enum):
    """处理状态枚举"""
    PENDING = "pending"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    VECTORIZING = "vectorizing"
    STORING = "storing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ProcessingResult:
    """处理结果"""
    success: bool
    status: ProcessingStatus
    message: str
    file_key: str
    chunks_count: int = 0
    vectors_stored: int = 0
    nodes_count: int = 0  # 别名，与 chunks_count 相同
    kg_entities: int = 0  # 知识图谱实体数
    kg_relations: int = 0  # 知识图谱关系数
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "status": self.status.value,
            "message": self.message,
            "file_key": self.file_key,
            "chunks_count": self.chunks_count,
            "vectors_stored": self.vectors_stored,
            "nodes_count": self.nodes_count,
            "kg_entities": self.kg_entities,
            "kg_relations": self.kg_relations,
            "error": self.error
        }


class ProcessingPipeline:
    """文档处理管道"""
    
    def __init__(self):
        """初始化处理管道"""
        self.downloader = OSSDownloader()
        self.processor = DocumentProcessor()
        self.vector_store = VectorStore()
        logger.info("处理管道初始化完成")
    
    def _validate_file_type(self, file_key: str) -> bool:
        """验证文件类型是否支持"""
        suffix = Path(file_key).suffix.lower().lstrip(".")
        return suffix in settings.supported_extensions
    
    def process(
        self,
        oss_key: str,
        bucket: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ProcessingResult:
        """
        执行完整的处理流程
        
        Args:
            oss_key: OSS 文件路径
            bucket: 可选的 bucket 名称（默认使用配置中的）
            metadata: 额外的元数据
            
        Returns:
            处理结果
        """
        local_file = None
        
        try:
            # 0. 验证文件类型
            if not self._validate_file_type(oss_key):
                return ProcessingResult(
                    success=False,
                    status=ProcessingStatus.FAILED,
                    message=f"不支持的文件类型",
                    file_key=oss_key,
                    error=f"支持的类型: {settings.SUPPORTED_FILE_TYPES}"
                )
            
            # 1. 下载文件
            logger.info(f"[Pipeline] 开始处理: {oss_key}")
            local_file = self.downloader.download(oss_key)
            
            # 2. 准备元数据
            file_metadata = {
                "oss_key": oss_key,
                "bucket": bucket or settings.OSS_BUCKET,
                "file_name": Path(oss_key).name,
                **(metadata or {})
            }
            
            # 3. 处理文档（解析 + 分块 + 向量化）
            nodes = self.processor.process(local_file, metadata=file_metadata)
            
            if not nodes:
                return ProcessingResult(
                    success=False,
                    status=ProcessingStatus.FAILED,
                    message="文档处理失败：未生成任何节点",
                    file_key=oss_key,
                    error="文档可能为空或格式不正确"
                )
            
            # 4. 存储向量
            vectors_stored = self.vector_store.insert(nodes)
            
            # 5. 清理临时文件
            self.downloader.cleanup(local_file)
            
            logger.info(f"[Pipeline] 处理完成: {oss_key}, 节点: {len(nodes)}, 存储: {vectors_stored}")
            
            return ProcessingResult(
                success=True,
                status=ProcessingStatus.COMPLETED,
                message="文档处理成功",
                file_key=oss_key,
                chunks_count=len(nodes),
                vectors_stored=vectors_stored
            )
            
        except Exception as e:
            logger.error(f"[Pipeline] 处理失败: {oss_key}, 错误: {e}")
            
            # 清理临时文件
            if local_file:
                self.downloader.cleanup(local_file)
            
            return ProcessingResult(
                success=False,
                status=ProcessingStatus.FAILED,
                message="文档处理失败",
                file_key=oss_key,
                error=str(e)
            )

