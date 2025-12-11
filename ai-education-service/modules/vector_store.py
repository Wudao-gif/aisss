"""
向量存储模块
集成阿里云 DashVector 进行向量存储和检索
"""

import logging
from typing import List, Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential
import dashvector

from llama_index.core.schema import TextNode

from config import settings

logger = logging.getLogger(__name__)


class VectorStore:
    """DashVector 向量存储"""
    
    def __init__(self):
        """初始化 DashVector 客户端"""
        self.client = dashvector.Client(
            api_key=settings.DASHVECTOR_API_KEY,
            endpoint=settings.DASHVECTOR_ENDPOINT
        )
        self.collection_name = settings.DASHVECTOR_COLLECTION
        self.dimension = settings.EMBEDDING_DIMENSION
        self._collection = None
        logger.info(f"DashVector 客户端初始化完成，collection: {self.collection_name}")
    
    def _get_collection(self):
        """获取 collection（ces 已在 DashVector 控制台创建）"""
        if self._collection is not None:
            return self._collection

        # 直接获取已存在的 collection
        # Collection: ces, 维度: 2048, 度量: Cosine
        self._collection = self.client.get(self.collection_name)

        if self._collection is None:
            raise ValueError(
                f"Collection '{self.collection_name}' 不存在，"
                f"请在 DashVector 控制台创建（维度: {self.dimension}, 度量: cosine）"
            )

        logger.info(f"成功连接到 collection: {self.collection_name}")
        return self._collection
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True
    )
    def insert(self, nodes: List[TextNode], batch_size: int = 100) -> int:
        """
        批量插入向量
        
        Args:
            nodes: 带有 embedding 的节点列表
            batch_size: 每批插入的数量
            
        Returns:
            成功插入的数量
        """
        collection = self._get_collection()
        total_inserted = 0
        
        logger.info(f"开始插入向量，共 {len(nodes)} 个节点")
        
        for i in range(0, len(nodes), batch_size):
            batch = nodes[i:i + batch_size]
            docs = []

            for node in batch:
                # 提取 book_id 作为独立字段（用于过滤）
                book_id = node.metadata.get("book_id", "")
                resource_id = node.metadata.get("resource_id", "")

                # 构建文档
                doc = dashvector.Doc(
                    id=node.node_id,
                    vector=node.embedding,
                    fields={
                        "text": node.get_content(),
                        "book_id": book_id,
                        "resource_id": resource_id,
                        "metadata": str(node.metadata)
                    }
                )
                docs.append(doc)
            
            # 批量插入
            result = collection.insert(docs)
            
            if result.code == 0:
                total_inserted += len(batch)
                logger.debug(f"批次 {i//batch_size + 1} 插入成功: {len(batch)} 条")
            else:
                logger.error(f"批次 {i//batch_size + 1} 插入失败: {result.message}")
        
        logger.info(f"向量插入完成，成功: {total_inserted}/{len(nodes)}")
        return total_inserted
    
    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_expr: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        向量相似度搜索

        Args:
            query_embedding: 查询向量
            top_k: 返回结果数量
            filter_expr: 过滤表达式

        Returns:
            搜索结果列表
        """
        collection = self._get_collection()

        logger.info(f"执行向量搜索，filter_expr: {filter_expr}")

        result = collection.query(
            vector=query_embedding,
            topk=top_k,
            filter=filter_expr,
            include_vector=False
        )

        # 打印搜索结果的 book_id 信息
        if result.code == 0 and result.output:
            for doc in result.output[:3]:  # 只打印前3个
                book_id = doc.fields.get("book_id", "无")
                logger.info(f"搜索结果 - id: {doc.id[:20]}..., book_id: {book_id}")
        
        if result.code != 0:
            logger.error(f"搜索失败: {result.message}")
            return []
        
        return [
            {
                "id": doc.id,
                "score": doc.score,
                "text": doc.fields.get("text", ""),
                "metadata": doc.fields.get("metadata", "{}")
            }
            for doc in result.output
        ]
    
    def delete(self, ids: List[str]) -> bool:
        """删除指定的向量"""
        collection = self._get_collection()
        result = collection.delete(ids=ids)
        
        if result.code == 0:
            logger.info(f"成功删除 {len(ids)} 条向量")
            return True
        else:
            logger.error(f"删除失败: {result.message}")
            return False
    
    def delete_by_filter(self, filter_expr: str) -> bool:
        """根据过滤条件删除向量"""
        collection = self._get_collection()
        result = collection.delete(filter=filter_expr)
        
        if result.code == 0:
            logger.info(f"根据条件删除成功: {filter_expr}")
            return True
        else:
            logger.error(f"条件删除失败: {result.message}")
            return False

