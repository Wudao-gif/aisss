"""
混合检索模块
封装向量检索 + 图谱检索 + 网络搜索
"""

import logging
import re
from typing import List, Dict, Any, Optional, Tuple
import httpx

from config import settings
from ..vector_store import VectorStore
from ..document_processor import get_embedding_model
from ..knowledge_graph import get_kg_store

logger = logging.getLogger(__name__)

# 检索配置
VECTOR_TOP_K = 5          # 向量检索数量
GRAPH_LIMIT = 10          # 图谱检索数量
CONTEXT_CHAR_LIMIT = 12000  # 上下文字符限制
RELEVANCE_THRESHOLD = 0.5   # 相关性阈值


class HybridRetriever:
    """混合检索器：向量 + 图谱 + 网络"""
    
    def __init__(self):
        self.embedding = get_embedding_model()
        self.vector_store = VectorStore()
        logger.info("混合检索器初始化完成")
    
    async def rewrite_query(
        self,
        query: str,
        history: List[Dict[str, str]] = None
    ) -> str:
        """根据历史对话改写查询，解决指代问题"""
        if not history or len(history) == 0:
            return query
        
        recent_history = history[-6:] if len(history) > 6 else history
        history_text = "\n".join([
            f"{'用户' if msg['role'] == 'user' else 'AI'}: {msg['content'][:200]}"
            for msg in recent_history
        ])
        
        rewrite_prompt = f"""你是一个查询改写助手。根据对话历史，将用户的当前问题改写成一个独立、完整的查询语句。

对话历史：
{history_text}

当前问题：{query}

改写规则：
1. 解决代词指代（如"它"、"这个"、"那个"等）
2. 补充省略的主语或宾语
3. 保持原意，不要添加额外信息
4. 如果当前问题已经足够清晰，直接返回原问题
5. 只返回改写后的问题，不要有任何解释

改写后的问题："""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.CHAT_MODEL,
                        "messages": [{"role": "user", "content": rewrite_prompt}],
                        "temperature": 0.1,
                        "max_tokens": 200,
                    }
                )
                response.raise_for_status()
                data = response.json()
                rewritten = data["choices"][0]["message"]["content"].strip().strip('"\'')
                logger.info(f"查询改写: '{query}' -> '{rewritten}'")
                return rewritten
        except Exception as e:
            logger.warning(f"查询改写失败: {e}")
            return query
    
    def vector_search(
        self,
        query: str,
        book_id: str,
        top_k: int = VECTOR_TOP_K
    ) -> List[Dict[str, Any]]:
        """向量检索"""
        logger.info(f"向量检索: query={query[:50]}..., book_id={book_id}")
        
        query_embedding = self.embedding.get_text_embedding(query)
        filter_expr = f"book_id = '{book_id}'"
        
        results = self.vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
            filter_expr=filter_expr
        )
        
        logger.info(f"向量检索完成: {len(results)} 条结果")
        return results
    
    async def graph_search(
        self,
        query: str,
        book_id: str,
        limit: int = GRAPH_LIMIT
    ) -> List[Dict[str, Any]]:
        """图谱检索：实体搜索 + 关系查询"""
        logger.info(f"图谱检索: query={query[:50]}..., book_id={book_id}")
        
        results = []
        
        try:
            kg_store = await get_kg_store()
            
            # 1. 实体搜索
            entities = await kg_store.search_entities(
                query=query,
                book_id=book_id,
                limit=limit
            )
            
            for entity in entities:
                results.append({
                    "type": "entity",
                    "name": entity.get("name", ""),
                    "entity_type": entity.get("type", ""),
                    "properties": entity
                })
            
            # 2. 如果找到实体，获取相关关系
            if entities:
                for entity in entities[:3]:  # 只取前3个实体的关系
                    entity_id = entity.get("id")
                    if entity_id:
                        relations = await kg_store.get_relations(entity_id)
                        for rel in relations[:5]:  # 每个实体最多5个关系
                            results.append({
                                "type": "relation",
                                "source": rel.get("source", {}).get("name", ""),
                                "target": rel.get("target", {}).get("name", ""),
                                "relation_type": rel.get("relation", {}).get("type", "")
                            })
            
            await kg_store.close()
            logger.info(f"图谱检索完成: {len(results)} 条结果")
            
        except Exception as e:
            logger.error(f"图谱检索失败: {e}")
        
        return results
    
    async def web_search(
        self,
        query: str,
        book_subject: str = ""
    ) -> Tuple[List[Dict[str, Any]], str]:
        """
        网络搜索（带学科关联）
        
        Returns:
            (搜索结果, 与教材的关联说明)
        """
        # 分析与教材的关联
        relation_prompt = f"""分析以下问题与"{book_subject}"学科的关联。

问题：{query}

请返回 JSON 格式：
{{
    "has_relation": true/false,
    "search_query": "优化后的搜索查询（带学科视角）",
    "relation_explanation": "关联说明（如何从{book_subject}角度理解这个问题）"
}}

只返回 JSON，不要其他内容。"""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # 1. 分析关联
                response = await client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.CHAT_MODEL,
                        "messages": [{"role": "user", "content": relation_prompt}],
                        "temperature": 0.1,
                        "max_tokens": 300,
                    }
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()
                
                # 解析 JSON
                import json
                # 清理可能的 markdown 标记
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                
                analysis = json.loads(content)
                search_query = analysis.get("search_query", query)
                relation = analysis.get("relation_explanation", "")
                
                logger.info(f"网络搜索查询: {search_query}")
                
                # 2. 执行搜索（这里用 DuckDuckGo 或其他搜索 API）
                # 暂时返回空结果，后续可以接入真实搜索 API
                web_results = []
                
                return web_results, relation
                
        except Exception as e:
            logger.error(f"网络搜索失败: {e}")
            return [], ""

    def fuse_results(
        self,
        vector_results: List[Dict[str, Any]],
        graph_results: List[Dict[str, Any]]
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        融合向量检索和图谱检索结果，构建上下文

        Returns:
            (context, sources)
        """
        context_parts = []
        sources = []
        current_chars = 0

        # 1. 添加图谱实体信息（优先，因为更精确）
        entities = [r for r in graph_results if r.get("type") == "entity"]
        if entities:
            entity_text = "【知识图谱 - 相关概念】\n"
            for ent in entities[:5]:
                entity_text += f"- {ent.get('name', '')}: {ent.get('entity_type', '')}\n"
            context_parts.append(entity_text)
            current_chars += len(entity_text)

        # 2. 添加图谱关系信息
        relations = [r for r in graph_results if r.get("type") == "relation"]
        if relations:
            relation_text = "【知识图谱 - 概念关系】\n"
            for rel in relations[:5]:
                relation_text += f"- {rel.get('source', '')} --[{rel.get('relation_type', '')}]--> {rel.get('target', '')}\n"
            context_parts.append(relation_text)
            current_chars += len(relation_text)

        # 3. 添加向量检索结果（详细内容）
        for i, result in enumerate(vector_results, 1):
            text = result.get("text", "")
            score = result.get("score", 0)

            part = f"[来源{i}] (相关度: {score:.3f})\n{text}"
            part_len = len(part)

            if current_chars + part_len > CONTEXT_CHAR_LIMIT:
                logger.warning(f"Context 熔断：第 {i} 个片段超过限制")
                break

            context_parts.append(part)
            sources.append({
                "citation_id": i,
                "text": text,
                "score": score,
                "metadata": result.get("metadata", {})
            })
            current_chars += part_len + 10

        context = "\n\n---\n\n".join(context_parts)
        logger.info(f"上下文构建完成: {len(sources)} 个来源, {current_chars} 字符")

        return context, sources

    def evaluate_context_quality(
        self,
        query: str,
        context: str,
        sources: List[Dict[str, Any]]
    ) -> bool:
        """评估检索结果是否充足"""
        if not sources:
            return False

        # 简单评估：至少有一个高相关度的结果
        high_relevance = any(s.get("score", 0) > RELEVANCE_THRESHOLD for s in sources)

        # 或者有图谱实体匹配
        has_entity = "知识图谱" in context

        return high_relevance or has_entity


# 全局检索器实例
_retriever: Optional[HybridRetriever] = None


def get_retriever() -> HybridRetriever:
    """获取混合检索器单例"""
    global _retriever
    if _retriever is None:
        _retriever = HybridRetriever()
    return _retriever

