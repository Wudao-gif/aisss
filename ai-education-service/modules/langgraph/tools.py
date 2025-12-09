"""
LangGraph 检索工具
按照 LangGraph Agentic RAG 文档实现
让 LLM 决定是否调用检索工具

参考: https://docs.langchain.com/oss/python/langgraph/agentic-rag
"""

import logging
from typing import List, Dict, Any

from langchain_core.tools import tool

from config import settings
from modules.vector_store import VectorStore
from modules.document_processor import get_embedding_model

logger = logging.getLogger(__name__)

# 全局实例（懒加载）
_vector_store: VectorStore = None
_embedding_model = None


def _get_vector_store() -> VectorStore:
    """获取向量存储单例"""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
        logger.info("VectorStore 初始化完成")
    return _vector_store


def _get_embedding_model():
    """获取嵌入模型单例"""
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = get_embedding_model()
        logger.info("Embedding 模型初始化完成")
    return _embedding_model


@tool
def retrieve_from_textbook(query: str, book_id: str) -> str:
    """
    从教材中检索相关内容。
    
    当用户询问与教材内容相关的问题时使用此工具。
    返回教材中与查询最相关的段落。
    
    Args:
        query: 用户的问题或查询
        book_id: 教材ID，用于过滤检索范围
    
    Returns:
        检索到的相关教材内容，包含来源标注
    """
    logger.info(f"检索教材: query={query[:50]}..., book_id={book_id}")
    
    try:
        vector_store = _get_vector_store()
        embedding_model = _get_embedding_model()
        
        # 生成查询向量
        query_embedding = embedding_model.get_text_embedding(query)
        
        # 构建过滤条件
        filter_expr = f"book_id = '{book_id}'" if book_id else None
        
        # 执行向量检索
        results = vector_store.search(
            query_embedding=query_embedding,
            top_k=5,
            filter_expr=filter_expr
        )
        
        if not results:
            logger.info("未找到相关教材内容")
            return "未在教材中找到相关内容。"
        
        # 格式化检索结果
        formatted_results = []
        for i, doc in enumerate(results, 1):
            text = doc.get("text", "")
            score = doc.get("score", 0)
            formatted_results.append(f"[来源{i}] (相关度: {score:.2f})\n{text}")
        
        result_text = "\n\n".join(formatted_results)
        logger.info(f"检索完成: {len(results)} 条结果")
        
        return result_text
        
    except Exception as e:
        logger.error(f"教材检索失败: {e}")
        return f"检索失败: {str(e)}"


@tool
async def search_knowledge_graph(query: str, book_id: str) -> str:
    """
    从知识图谱中搜索实体和关系。
    
    当需要查找概念之间的关系、定义或结构化知识时使用此工具。
    
    Args:
        query: 要搜索的概念或问题
        book_id: 教材ID，用于限定搜索范围
    
    Returns:
        知识图谱中的相关实体和关系
    """
    logger.info(f"知识图谱搜索: query={query[:50]}..., book_id={book_id}")
    
    try:
        from modules.knowledge_graph import get_kg_store
        
        kg_store = await get_kg_store()
        
        # 搜索实体
        entities = await kg_store.search_entities(
            query=query,
            book_id=book_id,
            limit=5
        )
        
        if not entities:
            await kg_store.close()
            return "未在知识图谱中找到相关实体。"
        
        # 格式化结果
        results = []
        for entity in entities:
            name = entity.get("name", "")
            entity_type = entity.get("type", "")
            results.append(f"- {name} ({entity_type})")
            
            # 获取关系
            entity_id = entity.get("id")
            if entity_id:
                relations = await kg_store.get_relations(entity_id)
                for rel in relations[:3]:
                    source = rel.get("source", {}).get("name", "")
                    target = rel.get("target", {}).get("name", "")
                    rel_type = rel.get("relation", {}).get("type", "")
                    results.append(f"  → {source} --[{rel_type}]--> {target}")
        
        await kg_store.close()
        
        result_text = "\n".join(results)
        logger.info(f"知识图谱搜索完成: {len(entities)} 个实体")
        
        return result_text
        
    except Exception as e:
        logger.error(f"知识图谱搜索失败: {e}")
        return f"知识图谱搜索失败: {str(e)}"


# 导出所有工具
retrieval_tools = [retrieve_from_textbook, search_knowledge_graph]

