"""
记忆向量存储模块
专门用于存储用户长期记忆到 DashVector (changqijiyi Collection)
与教材向量库 (Ooo11) 完全独立
"""

import logging
import uuid
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum

import dashvector

from config import settings

logger = logging.getLogger(__name__)


class MemoryType(str, Enum):
    """记忆类型"""
    PROFILE = "profile"
    UNDERSTANDING = "understanding"
    LEARNING_TRACK = "learning_track"


@dataclass
class LettaMemoryOutput:
    """Letta Agent 输出的记忆数据结构"""
    user_id: str
    textbook_id: Optional[str]
    memory_type: MemoryType
    memory_text: str
    language: str
    details: Dict[str, Any]
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LettaMemoryOutput":
        """从字典解析"""
        return cls(
            user_id=data.get("user_id", ""),
            textbook_id=data.get("textbook_id"),
            memory_type=MemoryType(data.get("memory_type", "learning_track")),
            memory_text=data.get("memory_text", ""),
            language=data.get("language", "zh"),
            details=data.get("details", {})
        )


class MemoryVectorStore:
    """
    记忆向量存储
    使用 DashVector changqijiyi Collection (1536维, cosine)
    Embedding: Qwen2.5-VL-Embedding
    """

    def __init__(self):
        """初始化 DashVector 客户端和 Embedding 模型"""
        # 从配置读取
        self.collection_name = getattr(settings, "MEMORY_COLLECTION", "changqijiyi")
        self.dimension = getattr(settings, "MEMORY_EMBEDDING_DIMENSION", 1536)

        self.client = dashvector.Client(
            api_key=settings.DASHVECTOR_API_KEY,
            endpoint=settings.DASHVECTOR_ENDPOINT
        )
        self._collection = None
        self._embedding = None
        logger.info(f"MemoryVectorStore 初始化: collection={self.collection_name}")
    
    def _get_collection(self):
        """获取 changqijiyi collection"""
        if self._collection is not None:
            return self._collection

        self._collection = self.client.get(self.collection_name)
        if self._collection is None:
            raise ValueError(
                f"Collection '{self.collection_name}' 不存在，"
                f"请在 DashVector 控制台创建（维度: {self.dimension}, 度量: cosine）"
            )

        logger.info(f"成功连接到记忆 collection: {self.collection_name}")
        return self._collection
    
    def _get_embedding_model(self):
        """获取 Qwen2.5-VL-Embedding 模型"""
        if self._embedding is not None:
            return self._embedding

        from .document_processor import Qwen25VLEmbedding

        # 临时修改维度设置
        original_dimension = settings.EMBEDDING_DIMENSION
        settings.EMBEDDING_DIMENSION = self.dimension

        self._embedding = Qwen25VLEmbedding()

        # 恢复原设置
        settings.EMBEDDING_DIMENSION = original_dimension

        logger.info(f"Qwen2.5-VL-Embedding 初始化完成 (维度: {self.dimension})")
        return self._embedding
    
    def store_memory(self, memory: LettaMemoryOutput) -> Optional[str]:
        """
        存储单条记忆到向量库
        
        Args:
            memory: Letta 输出的记忆数据
            
        Returns:
            向量文档 ID，失败返回 None
        """
        try:
            collection = self._get_collection()
            embedding_model = self._get_embedding_model()
            
            # 生成向量
            vector = embedding_model.get_text_embedding(memory.memory_text)
            
            # 生成唯一 ID
            doc_id = f"mem_{memory.user_id}_{memory.memory_type.value}_{uuid.uuid4().hex[:8]}"
            
            # 提取 topic（如果有）
            topic = memory.details.get("topic", "")
            
            # 构建文档
            doc = dashvector.Doc(
                id=doc_id,
                vector=vector,
                fields={
                    "user_id": memory.user_id,
                    "book_id": memory.textbook_id or "",
                    "memory_type": memory.memory_type.value,
                    "topic": topic,
                    "memory_text": memory.memory_text
                }
            )
            
            # 插入向量库
            result = collection.insert([doc])
            
            if result.code == 0:
                logger.info(f"记忆存储成功: id={doc_id}, type={memory.memory_type.value}")
                return doc_id
            else:
                logger.error(f"记忆存储失败: {result.message}")
                return None

        except Exception as e:
            logger.error(f"记忆存储异常: {e}")
            return None

    def search_memories(
        self,
        user_id: str,
        query_text: str,
        memory_type: Optional[MemoryType] = None,
        book_id: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        搜索用户记忆

        Args:
            user_id: 用户ID
            query_text: 查询文本
            memory_type: 可选，筛选记忆类型
            book_id: 可选，筛选教材
            top_k: 返回数量

        Returns:
            匹配的记忆列表
        """
        try:
            collection = self._get_collection()
            embedding_model = self._get_embedding_model()

            # 生成查询向量
            query_vector = embedding_model.get_text_embedding(query_text)

            # 构建过滤条件
            filter_expr = f"user_id = '{user_id}'"
            if memory_type:
                filter_expr += f" AND memory_type = '{memory_type.value}'"
            if book_id:
                filter_expr += f" AND book_id = '{book_id}'"

            # 搜索
            result = collection.query(
                vector=query_vector,
                topk=top_k,
                filter=filter_expr,
                output_fields=["user_id", "book_id", "memory_type", "topic", "memory_text"]
            )

            if result.code != 0:
                logger.error(f"记忆搜索失败: {result.message}")
                return []

            memories = []
            for doc in result.output:
                memories.append({
                    "id": doc.id,
                    "score": doc.score,
                    "user_id": doc.fields.get("user_id", ""),
                    "book_id": doc.fields.get("book_id", ""),
                    "memory_type": doc.fields.get("memory_type", ""),
                    "topic": doc.fields.get("topic", ""),
                    "memory_text": doc.fields.get("memory_text", "")
                })

            logger.info(f"记忆搜索完成: 找到 {len(memories)} 条记忆")
            return memories

        except Exception as e:
            logger.error(f"记忆搜索异常: {e}")
            return []


# 全局实例
_memory_store: Optional[MemoryVectorStore] = None


def get_memory_store() -> MemoryVectorStore:
    """获取记忆向量存储单例"""
    global _memory_store
    if _memory_store is None:
        _memory_store = MemoryVectorStore()
    return _memory_store

