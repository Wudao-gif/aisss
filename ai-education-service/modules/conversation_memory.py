"""
对话记忆模块
实现长期记忆存储和懒惰压缩策略
Key 设计: summary_{user_id}_{book_id}
"""

import logging
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import httpx

from config import settings

logger = logging.getLogger(__name__)

# Redis 客户端（可选）
redis_client = None
try:
    if settings.REDIS_URL:
        import redis
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        logger.info("Redis 连接成功")
except Exception as e:
    logger.warning(f"Redis 连接失败，将使用内存存储: {e}")

# 内存存储（Redis 不可用时的备选方案）
_memory_store: Dict[str, Dict[str, Any]] = {}


class ConversationMemory:
    """对话记忆管理器"""

    def __init__(self, chat_model: str = None):
        self.chat_model = chat_model or settings.CHAT_MODEL
        self.token_threshold = settings.SUMMARY_TOKEN_THRESHOLD
        self.char_threshold = settings.SUMMARY_CHAR_THRESHOLD
        self.expire_seconds = settings.SUMMARY_EXPIRE_SECONDS

    def _get_key(self, user_id: str, book_id: str) -> str:
        """生成存储 Key"""
        return f"summary_{user_id}_{book_id}"

    def _estimate_tokens(self, text: str) -> int:
        """估算 Token 数量（中文约 1.5 字符/token，英文约 4 字符/token）"""
        chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        other_chars = len(text) - chinese_chars
        return int(chinese_chars / 1.5 + other_chars / 4)

    def _count_history_chars(self, history: List[Dict[str, str]]) -> int:
        """计算历史对话总字符数"""
        return sum(len(msg.get("content", "")) for msg in history)

    async def get_summary(self, user_id: str, book_id: str) -> Optional[str]:
        """获取对话摘要"""
        key = self._get_key(user_id, book_id)

        if redis_client:
            try:
                data = redis_client.get(key)
                if data:
                    return json.loads(data).get("summary")
            except Exception as e:
                logger.error(f"Redis 读取失败: {e}")

        # 回退到内存存储
        if key in _memory_store:
            return _memory_store[key].get("summary")

        return None

    async def save_summary(self, user_id: str, book_id: str, summary: str):
        """保存对话摘要"""
        key = self._get_key(user_id, book_id)
        data = {
            "summary": summary,
            "updated_at": datetime.now().isoformat(),
            "book_id": book_id,
            "user_id": user_id,
        }

        if redis_client:
            try:
                redis_client.setex(key, self.expire_seconds, json.dumps(data, ensure_ascii=False))
                logger.info(f"摘要已保存到 Redis: {key}")
                return
            except Exception as e:
                logger.error(f"Redis 写入失败: {e}")

        # 回退到内存存储
        _memory_store[key] = data
        logger.info(f"摘要已保存到内存: {key}")

    async def generate_summary(self, history: List[Dict[str, str]]) -> str:
        """调用 LLM 生成对话摘要"""
        history_text = "\n".join([
            f"{'用户' if msg['role'] == 'user' else 'AI'}: {msg['content']}"
            for msg in history
        ])

        prompt = f"""请将以下对话历史压缩成一段简短的摘要（不超过200字）。
保留关键信息：讨论的主题、重要结论、用户的偏好或需求。

对话历史：
{history_text}

摘要："""

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
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens": 300,
                    }
                )
                response.raise_for_status()
                data = response.json()
                summary = data["choices"][0]["message"]["content"].strip()
                logger.info(f"生成摘要成功，长度: {len(summary)}")
                return summary
        except Exception as e:
            logger.error(f"生成摘要失败: {e}")
            return ""

    async def check_and_compress(
        self,
        user_id: str,
        book_id: str,
        history: List[Dict[str, str]]
    ) -> tuple[List[Dict[str, str]], Optional[str]]:
        """
        检查并压缩对话历史（懒惰模式）

        Returns:
            (压缩后的历史, 摘要文本)
        """
        if not history:
            existing_summary = await self.get_summary(user_id, book_id)
            return [], existing_summary

        total_chars = self._count_history_chars(history)
        logger.info(f"对话历史字符数: {total_chars}, 阈值: {self.char_threshold}")

        # 获取现有摘要
        existing_summary = await self.get_summary(user_id, book_id)

        # 未超过阈值，直接返回
        if total_chars <= self.char_threshold:
            return history, existing_summary

        # 超过阈值，压缩最早的对话
        logger.info(f"对话历史超过阈值，开始压缩...")

        # 保留最近 4 条消息（2轮对话），压缩其余的
        keep_count = 4
        to_compress = history[:-keep_count] if len(history) > keep_count else []
        to_keep = history[-keep_count:] if len(history) > keep_count else history

        if to_compress:
            # 如果有现有摘要，合并后再压缩
            if existing_summary:
                to_compress.insert(0, {"role": "system", "content": f"[之前的对话摘要]: {existing_summary}"})

            new_summary = await self.generate_summary(to_compress)
            if new_summary:
                await self.save_summary(user_id, book_id, new_summary)
                return to_keep, new_summary

        return to_keep, existing_summary


# 全局实例
_memory_instance: Optional[ConversationMemory] = None


def get_memory() -> ConversationMemory:
    """获取对话记忆管理器单例"""
    global _memory_instance
    if _memory_instance is None:
        _memory_instance = ConversationMemory()
    return _memory_instance