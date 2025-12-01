"""
RAG 检索模块
实现向量检索和上下文构建，支持多轮对话、查询改写、重排序和混合检索
"""

import logging
import json
import re
from typing import List, Dict, Any, Optional, Tuple
import httpx

from config import settings
from .vector_store import VectorStore
from .document_processor import OpenRouterEmbedding
from .conversation_memory import get_memory, ConversationMemory

logger = logging.getLogger(__name__)

# Context 字符数熔断阈值（防止超过模型上下文限制）
CONTEXT_CHAR_LIMIT = 12000  # 约 3000-4000 tokens

# Rerank 配置
RERANK_ENABLED = True  # 是否启用重排序
RERANK_TOP_N = 3  # 重排序后保留的数量

# 混合检索配置
HYBRID_SEARCH_ENABLED = True  # 是否启用混合检索
KEYWORD_BOOST_WEIGHT = 0.3  # 关键词匹配的权重提升


class RAGRetriever:
    """RAG 检索器"""
    
    def __init__(self):
        """初始化检索器"""
        self.embedding = OpenRouterEmbedding()
        self.vector_store = VectorStore()
        self.chat_model = settings.CHAT_MODEL
        self.memory = get_memory()
        logger.info(f"RAG 检索器初始化完成，Chat Model: {self.chat_model}")
    
    async def rewrite_query(
        self,
        query: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """根据历史对话改写查询，解决指代不清问题"""
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
                        "model": self.chat_model,
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
            logger.warning(f"查询改写失败，使用原查询: {e}")
            return query

    def _extract_keywords(self, query: str) -> List[str]:
        """从查询中提取关键词（用于混合检索）"""
        keywords = []
        # 提取英文单词和数字
        english_pattern = r'[A-Za-z][A-Za-z0-9_\-\.]*[A-Za-z0-9]|[A-Za-z]'
        english_matches = re.findall(english_pattern, query)
        keywords.extend([w for w in english_matches if len(w) >= 2])
        # 提取数字
        number_pattern = r'\d+\.?\d*'
        number_matches = re.findall(number_pattern, query)
        keywords.extend(number_matches)
        # 提取中文词组
        chinese_pattern = r'[\u4e00-\u9fff]{2,4}'
        chinese_matches = re.findall(chinese_pattern, query)
        keywords.extend(chinese_matches)
        return list(set(keywords))

    def _keyword_match_score(self, text: str, keywords: List[str]) -> float:
        """计算文本与关键词的匹配分数"""
        if not keywords:
            return 0.0
        text_lower = text.lower()
        matched = sum(1 for kw in keywords if kw.lower() in text_lower)
        return matched / len(keywords)

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        filter_expr: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """检索相关文档片段（支持混合检索）"""
        logger.info(f"开始检索，query: {query[:50]}..., top_k: {top_k}")

        query_embedding = self.embedding.get_text_embedding(query)
        search_top_k = top_k * 2 if RERANK_ENABLED else top_k
        results = self.vector_store.search(
            query_embedding=query_embedding,
            top_k=search_top_k,
            filter_expr=filter_expr
        )

        # 混合检索：关键词匹配加权
        if HYBRID_SEARCH_ENABLED and results:
            keywords = self._extract_keywords(query)
            if keywords:
                logger.info(f"混合检索：提取关键词 {keywords}")
                for result in results:
                    text = result.get("text", "")
                    keyword_score = self._keyword_match_score(text, keywords)
                    original_score = result.get("score", 0)
                    result["keyword_score"] = keyword_score
                    result["score"] = original_score + (keyword_score * KEYWORD_BOOST_WEIGHT)
                results.sort(key=lambda x: x["score"], reverse=True)

        logger.info(f"检索完成，找到 {len(results)} 个相关片段")
        return results

    async def rerank(
        self,
        query: str,
        results: List[Dict[str, Any]],
        top_n: int = RERANK_TOP_N
    ) -> List[Dict[str, Any]]:
        """使用 LLM 对检索结果进行重排序"""
        if not results or len(results) <= top_n:
            return results
        
        candidates = []
        for i, result in enumerate(results):
            text = result.get("text", "")[:500]
            candidates.append(f"[{i+1}] {text}")
        
        candidates_text = "\n\n".join(candidates)
        
        rerank_prompt = f"""你是一个文档相关性评估专家。请根据用户问题，对以下候选文档片段进行相关性排序。

用户问题：{query}

候选文档：
{candidates_text}

请按相关性从高到低，返回最相关的 {top_n} 个文档的编号。
只返回编号，用逗号分隔，例如：3,1,5

最相关的文档编号："""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.chat_model,
                        "messages": [{"role": "user", "content": rerank_prompt}],
                        "temperature": 0.1,
                        "max_tokens": 50,
                    }
                )
                response.raise_for_status()
                data = response.json()
                ranking_str = data["choices"][0]["message"]["content"].strip()
                
                indices = []
                for num in re.findall(r'\d+', ranking_str):
                    idx = int(num) - 1
                    if 0 <= idx < len(results) and idx not in indices:
                        indices.append(idx)
                
                if indices:
                    reranked = [results[i] for i in indices[:top_n]]
                    logger.info(f"Rerank 完成：{len(results)} -> {len(reranked)}")
                    return reranked
                else:
                    return results[:top_n]
        except Exception as e:
            logger.warning(f"Rerank 失败: {e}")
            return results[:top_n]
    
    def build_context(
        self,
        results: List[Dict[str, Any]],
        max_chars: int = CONTEXT_CHAR_LIMIT
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """构建上下文（带字符数熔断器和引用标记）"""
        if not results:
            return "", []
        
        context_parts = []
        used_results = []
        current_chars = 0
        
        for i, result in enumerate(results, 1):
            text = result.get("text", "")
            score = result.get("score", 0)
            part = f"[来源{i}] (相关度: {score:.3f})\n{text}"
            part_len = len(part)
            
            if current_chars + part_len > max_chars:
                logger.warning(f"Context 熔断：第 {i} 个片段超过限制")
                break
            
            context_parts.append(part)
            used_results.append({**result, "citation_id": i})
            current_chars += part_len + 10
        
        final_context = "\n\n---\n\n".join(context_parts)
        logger.info(f"Context 构建完成：{len(context_parts)} 个片段")
        return final_context, used_results
    
    def _build_messages(
        self,
        query: str,
        context: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        summary: Optional[str] = None
    ) -> list:
        """构建消息列表，支持多轮对话、摘要注入和引用溯源"""
        base_system_prompt = system_prompt or """你是一个专业的教育资料助手。请根据提供的参考资料回答用户的问题。

【重要】引用规则：
1. 回答时必须标注信息来源，使用格式：[来源X]
2. 如果答案综合了多个来源，请分别标注
3. 如果参考资料中没有相关信息，请诚实说明"参考资料中未找到相关信息"
4. 不要编造参考资料中没有的内容

回答要求：
- 准确、简洁、有条理
- 在多轮对话中保持上下文连贯性
- 优先使用参考资料中的原文表述"""

        if summary:
            full_system_prompt = f"""{base_system_prompt}

[之前的对话摘要]
{summary}
[摘要结束]"""
        else:
            full_system_prompt = base_system_prompt

        messages = [{"role": "system", "content": full_system_prompt}]

        if history:
            for msg in history:
                messages.append({"role": msg["role"], "content": msg["content"]})

        messages.append({
            "role": "user",
            "content": f"""参考资料（请在回答中使用[来源X]标注引用）：
{context}

用户问题：{query}

请根据以上参考资料回答问题，并标注信息来源。"""
        })

        return messages

    async def generate_answer(
        self,
        query: str,
        context: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        summary: Optional[str] = None
    ) -> str:
        """基于上下文生成回答（非流式）"""
        messages = self._build_messages(query, context, system_prompt, history, summary)
        logger.info(f"开始生成回答，模型: {self.chat_model}")

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": settings.OPENROUTER_SITE_URL or "",
                    "X-Title": settings.OPENROUTER_SITE_NAME or "",
                },
                json={
                    "model": self.chat_model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2000,
                }
            )
            response.raise_for_status()
            data = response.json()
            answer = data["choices"][0]["message"]["content"]
            logger.info(f"回答生成完成，长度: {len(answer)}")
            return answer

    async def generate_answer_stream(
        self,
        query: str,
        context: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        summary: Optional[str] = None
    ):
        """基于上下文生成回答（流式）"""
        messages = self._build_messages(query, context, system_prompt, history, summary)
        # 调试日志：确认引用规则是否生效
        if messages and messages[0].get("role") == "system":
            sys_content = messages[0].get("content", "")
            has_citation_rule = "[来源" in sys_content or "来源X" in sys_content
            logger.info(f"开始流式生成回答，模型: {self.chat_model}, 引用规则: {'✅' if has_citation_rule else '❌'}")

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": settings.OPENROUTER_SITE_URL or "",
                    "X-Title": settings.OPENROUTER_SITE_NAME or "",
                },
                json={
                    "model": self.chat_model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2000,
                    "stream": True,
                }
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue

    def _extract_citations(
        self,
        answer: str,
        sources: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """从回答中提取引用信息"""
        citations = []
        citation_pattern = r'\[来源(\d+)\]'
        matches = re.findall(citation_pattern, answer)
        
        seen_ids = set()
        for match in matches:
            citation_id = int(match)
            if citation_id not in seen_ids and citation_id <= len(sources):
                seen_ids.add(citation_id)
                source = sources[citation_id - 1]
                citations.append({
                    "citation_id": citation_id,
                    "text_preview": source.get("text", "")[:200] + "...",
                    "score": source.get("score", 0),
                    "metadata": source.get("metadata", {})
                })
        return citations
    
    async def query(
        self,
        question: str,
        top_k: int = 5,
        filter_expr: Optional[str] = None,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        user_id: Optional[str] = None,
        book_id: Optional[str] = None,
        enable_rerank: bool = RERANK_ENABLED
    ) -> Dict[str, Any]:
        """
        完整的 RAG 查询流程（支持多轮对话、长期记忆、重排序和引用溯源）
        """
        # 记忆模块处理
        compressed_history = history or []
        summary = None
        
        if user_id and book_id and history:
            try:
                compressed_history, summary = await self.memory.check_and_compress(
                    user_id=user_id, book_id=book_id, history=history
                )
                logger.info(f"记忆处理：{len(history)} -> {len(compressed_history)} 条")
            except Exception as e:
                logger.error(f"记忆处理失败: {e}")
                compressed_history = history
        elif user_id and book_id:
            try:
                summary = await self.memory.get_summary(user_id, book_id)
            except Exception as e:
                logger.warning(f"获取摘要失败: {e}")

        # 1. 查询改写
        rewritten_query = await self.rewrite_query(question, compressed_history)

        # 2. 检索（包含混合检索）
        results = self.retrieve(rewritten_query, top_k, filter_expr)

        if not results:
            return {
                "answer": "抱歉，没有找到相关的参考资料来回答您的问题。",
                "sources": [],
                "citations": [],
                "has_context": False
            }

        # 3. 重排序（可选）
        if enable_rerank and RERANK_ENABLED:
            results = await self.rerank(rewritten_query, results, top_n=top_k)

        # 4. 构建上下文（带引用标记）
        context, used_sources = self.build_context(results)

        # 5. 生成回答（带引用溯源）
        answer = await self.generate_answer(
            question, context, system_prompt, compressed_history, summary
        )

        # 6. 提取回答中的引用
        citations = self._extract_citations(answer, used_sources)

        return {
            "answer": answer,
            "sources": used_sources,
            "citations": citations,
            "has_context": True
        }
