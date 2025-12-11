"""
知识图谱工具 (GraphRAG)
- graphrag_search: 向量检索 + 图遍历，返回结构化知识上下文

参考: Neo4j GraphRAG 官方文档
"""

import logging
from typing import List, Dict, Any

from langchain_core.tools import tool

from config import settings
from modules.knowledge_graph import get_kg_store
from modules.document_processor import get_embedding_model

logger = logging.getLogger(__name__)

# 全局实例（懒加载）
_kg_store = None
_embedding_model = None


async def _get_kg_store():
    """获取知识图谱存储单例"""
    global _kg_store
    if _kg_store is None:
        _kg_store = await get_kg_store()
        logger.info("KnowledgeGraphStore 初始化完成")
    return _kg_store


def _get_embedding_model():
    """获取嵌入模型单例"""
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = get_embedding_model()
        logger.info("Embedding 模型初始化完成 (GraphRAG)")
    return _embedding_model


@tool
async def graphrag_search(query: str, book_id: str = None) -> str:
    """
    GraphRAG 知识图谱检索。
    
    结合向量相似度检索和图遍历，返回结构化的知识上下文。
    适用于需要理解概念之间关系的问题。
    
    Args:
        query: 用户的问题或查询
        book_id: 可选，教材ID，用于限制检索范围
    
    Returns:
        结构化的知识上下文，包含相关实体和它们之间的关系
    """
    logger.info(f"GraphRAG 检索: query={query[:50]}..., book_id={book_id}")
    
    try:
        kg_store = await _get_kg_store()
        embedding_model = _get_embedding_model()
        
        # 1. 生成查询向量
        query_embedding = embedding_model.get_text_embedding(query)
        
        # 2. 向量检索 + 图遍历
        result = await kg_store.search_with_graph_expansion(
            query_embedding=query_embedding,
            book_id=book_id,
            limit=5,
            expansion_depth=1
        )
        
        if not result.get("entities"):
            logger.info("GraphRAG 未找到相关实体")
            return "未在知识图谱中找到相关概念。"
        
        # 3. 格式化输出
        context = result.get("context", "")
        entities = result.get("entities", [])
        relations = result.get("relations", [])
        
        output_parts = [
            f"【知识图谱检索结果】",
            f"找到 {len(entities)} 个相关概念，{len(relations)} 个关联关系",
            "",
            context
        ]
        
        output = "\n".join(output_parts)
        logger.info(f"GraphRAG 检索完成: {len(entities)} 实体, {len(relations)} 关系")
        
        return output
        
    except Exception as e:
        logger.error(f"GraphRAG 检索失败: {e}")
        return f"知识图谱检索出错: {str(e)}"


@tool
async def get_entity_relations(entity_name: str, book_id: str = None) -> str:
    """
    获取指定实体的关联关系。
    
    查询知识图谱中某个概念/实体的所有关联。
    
    Args:
        entity_name: 实体名称（如"导数"、"极限"）
        book_id: 可选，教材ID
    
    Returns:
        该实体的关联关系描述
    """
    logger.info(f"查询实体关系: entity={entity_name}, book_id={book_id}")
    
    try:
        kg_store = await _get_kg_store()
        
        # 搜索实体
        entities = await kg_store.search_entities(
            query=entity_name,
            book_id=book_id,
            limit=1
        )
        
        if not entities:
            return f"未找到实体: {entity_name}"
        
        entity = entities[0]
        entity_id = entity.get("id")
        
        # 获取关联关系
        relations = await kg_store.get_entity_relations(entity_id)
        
        if not relations:
            return f"实体 '{entity_name}' 暂无关联关系"
        
        # 格式化输出
        output_parts = [f"【{entity_name}】的关联关系："]
        for rel in relations[:10]:
            output_parts.append(f"  - {rel.get('type', 'RELATES_TO')} → {rel.get('target_name', '未知')}")
        
        return "\n".join(output_parts)
        
    except Exception as e:
        logger.error(f"查询实体关系失败: {e}")
        return f"查询失败: {str(e)}"


# 工具组
graphrag_tools = [graphrag_search, get_entity_relations]

