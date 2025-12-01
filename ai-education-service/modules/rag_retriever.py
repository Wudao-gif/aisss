"""
RAG 检索模块
实现向量检索和上下文构建，支持多轮对话和查询改写
"""

import logging
import json
from typing import List, Dict, Any, Optional
import httpx

from config import settings
from .vector_store import VectorStore
from .document_processor import OpenRouterEmbedding
from .conversation_memory import get_memory, ConversationMemory

logger = logging.getLogger(__name__)

# Context 字符数熔断阈值（防止超过模型上下文限制）
CONTEXT_CHAR_LIMIT = 12000  # 约 3000-4000 tokens


class RAGRetriever:
    """RAG 检索器"""
    
    def __init__(self):
        """初始化检索器"""
        self.embedding = OpenRouterEmbedding()
        self.vector_store = VectorStore()
        self.chat_model = settings.CHAT_MODEL
        self.memory = get_memory()  # 引入对话记忆模块
        logger.info(f"RAG 检索器初始化完成，Chat Model: {self.chat_model}")
    
    async def rewrite_query(
        self,
        query: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        根据历史对话改写查询，解决指代不清问题
        Args:
            query: 当前用户问题
            history: 历史对话记录

        Returns:
            改写后的查询（独立、完整、适合检索）
        """
        if not history or len(history) == 0:
            return query

        # 只取最近 6 轮对话（3 问 3 答）
        recent_history = history[-6:] if len(history) > 6 else history

        # 构建改写提示
        history_text = "\n".join([
            f"{'用户' if msg['role'] == 'user' else 'AI'}: {msg['content'][:200]}"
            for msg in recent_history
        ])

        rewrite_prompt = f"""你是一个查询改写助手。根据对话历史，将用户的当前问题改写成一个独立、完整的查询语句，使其适合用于文档检索。

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
                        "temperature": 0.1,  # 低温度，更确定性
                        "max_tokens": 200,
                    }
                )
                response.raise_for_status()
                data = response.json()
                rewritten = data["choices"][0]["message"]["content"].strip()

                # 清理可能的引号
                rewritten = rewritten.strip('"\'')

                logger.info(f"查询改写: '{query}' -> '{rewritten}'")
                return rewritten

        except Exception as e:
            logger.warning(f"查询改写失败，使用原查询: {e}")
            return query

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        filter_expr: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        检索相关文档片段
        Args:
            query: 用户查询
            top_k: 返回结果数量
            filter_expr: 过滤表达式
        Returns:
            检索结果列表，包含文本和相似度分数
        """
        logger.info(f"开始检索，query: {query[:50]}..., top_k: {top_k}, filter: {filter_expr}")

        # 1. 生成查询向量
        query_embedding = self.embedding.get_text_embedding(query)
        logger.debug(f"查询向量生成完成，维度: {len(query_embedding)}")

        # 2. 向量检索
        results = self.vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
            filter_expr=filter_expr
        )

        logger.info(f"检索完成，找到 {len(results)} 个相关片段")
        return results
    
    def build_context(
        self,
        results: List[Dict[str, Any]],
        max_chars: int = CONTEXT_CHAR_LIMIT
    ) -> str:
        """
        构建上下文（带字符数熔断器）
        
        Args:
            results: 检索结果列表
            max_chars: 最大字符数限制（熔断阈值）
            
        Returns:
            格式化的上下文字符串
        """
        if not results:
            return ""
        
        context_parts = []
        current_chars = 0
        
        for i, result in enumerate(results, 1):
            text = result.get("text", "")
            score = result.get("score", 0)
            
            # 构建当前片段
            part = f"[片段 {i}] (相关度: {score:.3f})\n{text}"
            part_len = len(part)
            
            # 熔断检查：如果加入这个片段会超过限制，则停止
            if current_chars + part_len > max_chars:
                logger.warning(
                    f"Context 熔断：已使用 {current_chars} 字符，"
                    f"第 {i} 个片段 ({part_len} 字符) 将超过限制 {max_chars}，停止添加"
                )
                break
            
            context_parts.append(part)
            current_chars += part_len + 10  # 10 是分隔符的大致长度
        
        final_context = "\n\n---\n\n".join(context_parts)
        logger.info(f"Context 构建完成：{len(context_parts)} 个片段，{len(final_context)} 字符")
        return final_context
    
    def _build_messages(
        self,
        query: str,
        context: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        summary: Optional[str] = None
    ) -> list:
        """
        构建消息列表，支持多轮对话和摘要注入
        Args:
            query: 当前用户问题
            context: 检索到的参考资料
            system_prompt: 系统提示词
            history: 历史对话记录（压缩后的专业历史）
            summary: 之前对话的摘要（长期记忆）
        """
        # 构建系统提示词（注入摘要）
        base_system_prompt = system_prompt or """你是一个专业的教育资料助手。请根据提供的参考资料回答用户的问题。
如果参考资料中没有相关信息，请诚实地说明。
回答要准确、简洁、有条理。
在多轮对话中，请保持上下文连贯性。"""

        # 如果有摘要，注入到系统提示词中
        if summary:
            full_system_prompt = f"""{base_system_prompt}

[之前的对话摘要]
{summary}
[摘要结束]

请结合以上摘要中的背景信息来回答用户的问题。"""
        else:
            full_system_prompt = base_system_prompt

        messages = [{"role": "system", "content": full_system_prompt}]

        # 添加历史对话（已经是压缩后的专业历史，最多保留最近 4-6 条）
        if history:
            for msg in history:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

        # 添加当前问题（带参考资料）
        messages.append({
            "role": "user",
            "content": f"""参考资料：
{context}

用户问题：{query}

请根据以上参考资料回答问题。"""
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
        """
        基于上下文生成回答（非流式）
        """
        messages = self._build_messages(query, context, system_prompt, history, summary)

        logger.info(f"开始生成回答，使用模型: {self.chat_model}, 历史对话: {len(history) if history else 0} 条, 有摘要: {bool(summary)}")

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
        """
        基于上下文生成回答（流式）
        Yields:
            str: 每次生成的文本片段
        """
        messages = self._build_messages(query, context, system_prompt, history, summary)

        logger.info(f"开始流式生成回答，使用模型: {self.chat_model}, 历史对话: {len(history) if history else 0} 条, 有摘要: {bool(summary)}")

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
                    "stream": True,  # 启用流式
                }
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]  # 去掉 "data: " 前缀
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
    
    async def query(
        self,
        question: str,
        top_k: int = 5,
        filter_expr: Optional[str] = None,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        user_id: Optional[str] = None,
        book_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        完整的 RAG 查询流程（支持多轮对话和长期记忆）

        Args:
            question: 用户问题
            top_k: 检索数量
            filter_expr: 过滤表达式
            system_prompt: 系统提示词
            history: 历史对话记录
            user_id: 用户ID（用于记忆管理）
            book_id: 书籍ID（用于记忆管理）

        Returns:
            包含回答和来源的结果
        """
        # ========== 关键修复：串联记忆模块 ==========
        compressed_history = history or []
        summary = None
        
        # 如果提供了 user_id 和 book_id，启用记忆管理
        if user_id and book_id and history:
            try:
                # 调用记忆模块的 check_and_compress
                compressed_history, summary = await self.memory.check_and_compress(
                    user_id=user_id,
                    book_id=book_id,
                    history=history
                )
                logger.info(
                    f"记忆处理完成：原始历史 {len(history)} 条 -> 压缩后 {len(compressed_history)} 条, "
                    f"摘要: {'有' if summary else '无'}"
                )
            except Exception as e:
                logger.error(f"记忆处理失败，使用原始历史: {e}")
                compressed_history = history
        elif user_id and book_id:
            # 没有历史但有 user_id/book_id，尝试获取已有摘要
            try:
                summary = await self.memory.get_summary(user_id, book_id)
                if summary:
                    logger.info(f"获取到已有摘要，长度: {len(summary)}")
            except Exception as e:
                logger.warning(f"获取摘要失败: {e}")

        # 1. 查询改写（解决多轮对话中的指代不清）
        rewritten_query = await self.rewrite_query(question, compressed_history)

        # 2. 使用改写后的查询检索相关文档
        results = self.retrieve(rewritten_query, top_k, filter_expr)

        if not results:
            return {
                "answer": "抱歉，没有找到相关的参考资料来回答您的问题。",
                "sources": [],
                "has_context": False
            }

        # 3. 构建上下文（带熔断保护）
        context = self.build_context(results)

        # 4. 生成回答（传入压缩后的历史和摘要）
        answer = await self.generate_answer(
            question, 
            context, 
            system_prompt, 
            compressed_history,  # 使用压缩后的历史
            summary  # 注入摘要
        )

        return {
            "answer": answer,
            "sources": results,
            "has_context": True
        }
