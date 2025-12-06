"""
文档处理 Workflow 模块
使用 LlamaIndex Workflows 实现事件驱动的文档处理流程
"""

import logging
from pathlib import Path
from typing import Optional, Dict, Any

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
# 使用 Pydantic 风格的类型注解（Event 基于 Pydantic）

class ValidationEvent(Event):
    """文件验证完成事件"""
    oss_key: str
    bucket: str
    metadata: Dict[str, Any]
    is_valid: bool
    error: Optional[str] = None


class DownloadEvent(Event):
    """文件下载完成事件"""
    oss_key: str
    local_path: Path
    metadata: Dict[str, Any]


class ProcessEvent(Event):
    """文档处理完成事件"""
    oss_key: str
    local_path: Path
    nodes: list
    metadata: Dict[str, Any]


class StoreEvent(Event):
    """向量存储完成事件"""
    oss_key: str
    local_path: Path
    nodes_count: int
    vectors_stored: int
    nodes: Optional[list] = None  # 传递给知识图谱提取


class KGExtractEvent(Event):
    """知识图谱提取完成事件"""
    oss_key: str
    local_path: Path
    nodes_count: int
    vectors_stored: int
    kg_entities: int = 0
    kg_relations: int = 0


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

            # 调试：打印收到的原始 metadata
            logger.info(f"[Workflow] 收到的原始 metadata: {ev.metadata}")

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
                vectors_stored=vectors_stored,
                nodes=ev.nodes  # 传递给知识图谱提取
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
    async def extract_knowledge_graph(self, ctx: Context, ev: StoreEvent) -> KGExtractEvent:
        """步骤5: 提取知识图谱（可选，失败不影响主流程）"""
        kg_entities, kg_relations = 0, 0

        try:
            # 从 nodes 提取 metadata
            metadata = {}
            book_id = None
            if ev.nodes:
                first_node = ev.nodes[0]
                if hasattr(first_node, 'metadata'):
                    metadata = first_node.metadata
                    book_id = metadata.get("book_id")

            # 兼容两种字段名: type/document_type, name/document_name
            doc_type = metadata.get("document_type") or metadata.get("type")
            resource_id = metadata.get("resource_id")
            resource_name = metadata.get("document_name") or metadata.get("name")
            book_name = metadata.get("book_name")

            # 调试日志
            logger.info(f"[Workflow] KG metadata: type={doc_type}, book_id={book_id}, resource_id={resource_id}")

            # 处理学习资源：提取结构并关联到章节
            if doc_type in ["resource", "user_resource"] and book_id and resource_id:
                from .entity_extractor import (
                    analyze_resource_to_chapters,
                    extract_resource_sections,
                    analyze_sections_to_chapters
                )

                # 转换 nodes 为 chunks 格式
                chunks = [{"text": n.get_content(), "metadata": n.metadata} for n in ev.nodes if hasattr(n, 'get_content')]

                # 1. 建立 Book -> Resource 关系
                result = await analyze_resource_to_chapters(
                    chunks=chunks,
                    book_id=book_id,
                    resource_id=resource_id,
                    resource_name=resource_name
                )

                if result.get("book_resource_relation"):
                    kg_relations = 1
                    logger.info(f"[Workflow] 建立教材-资源关系: {book_id} -> {resource_id}")

                # 2. 提取资料结构
                sections = await extract_resource_sections(chunks, resource_id)

                if sections:
                    logger.info(f"[Workflow] 提取资料结构: {len(sections)} 个部分")

                    # 3. 分析资料结构与章节的关联
                    section_result = await analyze_sections_to_chapters(sections, book_id, resource_id)

                    sections_saved = section_result.get("sections_saved", 0)
                    section_links = section_result.get("section_chapter_links", [])

                    kg_entities = sections_saved
                    kg_relations += len(section_links)

                    if section_links:
                        logger.info(f"[Workflow] 资料结构关联到 {len(section_links)} 个章节")
                        for link in section_links[:5]:  # 只打印前5个
                            logger.info(f"  - {link['section_title']} -> {link['chapter_title']}")

                    unlinked = section_result.get("unlinked_sections", [])
                    if unlinked:
                        logger.info(f"[Workflow] {len(unlinked)} 个部分未关联到章节")
                else:
                    # 回退到旧逻辑：整体资源关联到章节
                    chapter_count = len(result.get("chapter_relations", []))
                    if chapter_count > 0:
                        kg_relations += chapter_count
                        logger.info(f"[Workflow] 资源关联到 {chapter_count} 个章节")
                    elif result.get("unlinked"):
                        logger.info(f"[Workflow] 资源未匹配到章节，保持为未关联状态")

            # 处理教材：提取章节结构和实体关系
            elif book_id and ev.nodes:
                from .entity_extractor import extract_and_save, extract_book_chapters, save_book_chapters

                # 转换 nodes 为 chunks 格式
                chunks = [{"text": n.get_content(), "metadata": n.metadata} for n in ev.nodes if hasattr(n, 'get_content')]

                if chunks:
                    # 1. 尝试从前几页提取章节结构（目录通常在前面）
                    toc_text = "\n".join([c.get("text", "")[:2000] for c in chunks[:10]])
                    chapters = await extract_book_chapters(toc_text, book_id)

                    if chapters:
                        chapter_result = await save_book_chapters(chapters, book_id)
                        logger.info(f"[Workflow] 章节结构提取完成: {chapter_result.get('chapters', 0)} 个章节")

                    # 2. 提取实体和关系
                    result = await extract_and_save(chunks, book_id)
                    kg_entities = result.get("saved", {}).get("entities", 0)
                    kg_relations = result.get("saved", {}).get("relations", 0)
                    logger.info(f"[Workflow] 知识图谱提取完成: {kg_entities} 实体, {kg_relations} 关系")

        except Exception as e:
            logger.warning(f"[Workflow] 知识图谱提取失败（不影响主流程）: {e}")

        return KGExtractEvent(
            oss_key=ev.oss_key,
            local_path=ev.local_path,
            nodes_count=ev.nodes_count,
            vectors_stored=ev.vectors_stored,
            kg_entities=kg_entities,
            kg_relations=kg_relations
        )

    @step
    async def cleanup_success(self, ctx: Context, ev: KGExtractEvent) -> StopEvent:
        """步骤6a: 成功后清理临时文件"""
        self.downloader.cleanup(ev.local_path)
        logger.info(f"[Workflow] 处理完成: {ev.oss_key}")

        result = ProcessingResult(
            success=True,
            status=ProcessingStatus.COMPLETED,
            message="文档处理成功",
            file_key=ev.oss_key,
            chunks_count=ev.nodes_count,
            vectors_stored=ev.vectors_stored,
            nodes_count=ev.nodes_count,
            kg_entities=ev.kg_entities,
            kg_relations=ev.kg_relations
        )
        return StopEvent(result=result)

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
        _document_workflow = DocumentProcessingWorkflow(timeout=1200, verbose=False)
    return _document_workflow

