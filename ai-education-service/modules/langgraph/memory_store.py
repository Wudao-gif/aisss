"""
长期记忆管理模块
使用 LangGraph Store 存储跨会话的用户记忆

记忆类型：
- profile: 用户画像（姓名、年级、学习风格等）
- understanding: 知识理解（掌握的概念、薄弱点等）
- learning: 学习轨迹（学习历史、进度等）
"""

import logging
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

from langgraph.store.base import BaseStore

logger = logging.getLogger(__name__)

# 记忆命名空间
NAMESPACE_PROFILE = "profile"           # 用户画像
NAMESPACE_UNDERSTANDING = "understanding"  # 知识理解
NAMESPACE_LEARNING = "learning"          # 学习轨迹
NAMESPACE_FACTS = "facts"               # 用户事实（如姓名、偏好）


class MemoryManager:
    """长期记忆管理器"""

    def __init__(self, store: BaseStore):
        self.store = store

    # ==================== 用户事实（Facts） ====================

    async def store_user_fact(
        self,
        user_id: str,
        fact_type: str,
        fact_value: str,
        source: str = "conversation"
    ) -> str:
        """
        存储用户事实

        Args:
            user_id: 用户ID
            fact_type: 事实类型（如 "name", "grade", "preference"）
            fact_value: 事实值
            source: 来源

        Returns:
            记忆ID
        """
        namespace = (NAMESPACE_FACTS, user_id)
        memory_id = str(uuid.uuid4())

        await self.store.aput(
            namespace,
            memory_id,
            {
                "type": fact_type,
                "value": fact_value,
                "source": source,
                "created_at": datetime.now().isoformat(),
            }
        )

        logger.info(f"存储用户事实: user={user_id}, type={fact_type}, value={fact_value}")
        return memory_id

    async def get_user_facts(self, user_id: str) -> List[Dict[str, Any]]:
        """获取用户所有事实"""
        namespace = (NAMESPACE_FACTS, user_id)

        try:
            items = await self.store.alist(namespace)
            facts = [item.value for item in items]
            logger.debug(f"获取用户事实: user={user_id}, count={len(facts)}")
            return facts
        except Exception as e:
            logger.error(f"获取用户事实失败: {e}")
            return []

    async def search_user_facts(
        self,
        user_id: str,
        query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """语义搜索用户事实"""
        namespace = (NAMESPACE_FACTS, user_id)

        try:
            items = await self.store.asearch(namespace, query=query, limit=limit)
            facts = [item.value for item in items]
            logger.debug(f"搜索用户事实: user={user_id}, query={query[:30]}, found={len(facts)}")
            return facts
        except Exception as e:
            logger.error(f"搜索用户事实失败: {e}")
            return []

    # ==================== 用户画像（Profile） ====================

    async def update_user_profile(
        self,
        user_id: str,
        profile_data: Dict[str, Any]
    ) -> None:
        """更新用户画像"""
        namespace = (NAMESPACE_PROFILE, user_id)

        # 使用固定 key 存储画像（覆盖更新）
        await self.store.aput(
            namespace,
            "main",
            {
                **profile_data,
                "updated_at": datetime.now().isoformat(),
            }
        )

        logger.info(f"更新用户画像: user={user_id}")

    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """获取用户画像"""
        namespace = (NAMESPACE_PROFILE, user_id)

        try:
            item = await self.store.aget(namespace, "main")
            if item:
                return item.value
            return None
        except Exception as e:
            logger.error(f"获取用户画像失败: {e}")
            return None

    # ==================== 知识理解（Understanding） ====================

    async def store_understanding(
        self,
        user_id: str,
        book_id: str,
        concept: str,
        level: str,  # "mastered", "learning", "weak"
        notes: str = ""
    ) -> str:
        """存储知识理解记录"""
        namespace = (NAMESPACE_UNDERSTANDING, user_id, book_id)
        memory_id = str(uuid.uuid4())

        await self.store.aput(
            namespace,
            memory_id,
            {
                "concept": concept,
                "level": level,
                "notes": notes,
                "created_at": datetime.now().isoformat(),
            }
        )

        logger.info(f"存储知识理解: user={user_id}, concept={concept}, level={level}")
        return memory_id

    async def search_understanding(
        self,
        user_id: str,
        book_id: str,
        query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """搜索知识理解记录"""
        namespace = (NAMESPACE_UNDERSTANDING, user_id, book_id)

        try:
            items = await self.store.asearch(namespace, query=query, limit=limit)
            return [item.value for item in items]
        except Exception as e:
            logger.error(f"搜索知识理解失败: {e}")
            return []

    # ==================== 学习轨迹（Learning） ====================

    async def log_learning_event(
        self,
        user_id: str,
        book_id: str,
        event_type: str,  # "question", "review", "exercise"
        content: str,
        result: str = ""
    ) -> str:
        """记录学习事件"""
        namespace = (NAMESPACE_LEARNING, user_id, book_id)
        memory_id = str(uuid.uuid4())

        await self.store.aput(
            namespace,
            memory_id,
            {
                "event_type": event_type,
                "content": content,
                "result": result,
                "created_at": datetime.now().isoformat(),
            }
        )

        logger.debug(f"记录学习事件: user={user_id}, type={event_type}")
        return memory_id

    # ==================== 综合查询 ====================

    async def get_user_context(
        self,
        user_id: str,
        book_id: Optional[str] = None,
        query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        获取用户上下文（用于 LLM prompt）

        Returns:
            {
                "profile": {...},
                "facts": [...],
                "understanding": [...],
            }
        """
        context = {
            "profile": None,
            "facts": [],
            "understanding": [],
        }

        # 获取用户画像
        context["profile"] = await self.get_user_profile(user_id)

        # 获取/搜索用户事实
        if query:
            context["facts"] = await self.search_user_facts(user_id, query, limit=5)
        else:
            context["facts"] = await self.get_user_facts(user_id)

        # 获取知识理解（如果有 book_id）
        if book_id and query:
            context["understanding"] = await self.search_understanding(
                user_id, book_id, query, limit=3
            )

        return context

    def format_context_for_prompt(self, context: Dict[str, Any]) -> str:
        """将上下文格式化为 prompt 文本"""
        parts = []

        # 用户画像
        if context.get("profile"):
            profile = context["profile"]
            profile_text = ", ".join(f"{k}: {v}" for k, v in profile.items()
                                     if k not in ["updated_at"])
            if profile_text:
                parts.append(f"用户画像: {profile_text}")

        # 用户事实
        if context.get("facts"):
            facts_text = "; ".join(
                f"{f.get('type', '信息')}: {f.get('value', '')}"
                for f in context["facts"]
            )
            if facts_text:
                parts.append(f"已知信息: {facts_text}")

        # 知识理解
        if context.get("understanding"):
            understanding_text = "; ".join(
                f"{u.get('concept', '')}({u.get('level', '')})"
                for u in context["understanding"]
            )
            if understanding_text:
                parts.append(f"知识掌握: {understanding_text}")

        return "\n".join(parts) if parts else ""


# 全局 MemoryManager 实例
_memory_manager: Optional[MemoryManager] = None


def get_memory_manager() -> Optional[MemoryManager]:
    """获取全局 MemoryManager"""
    return _memory_manager


def set_memory_manager(manager: Optional[MemoryManager]) -> None:
    """设置全局 MemoryManager"""
    global _memory_manager
    _memory_manager = manager
    logger.info(f"MemoryManager 已设置: {manager is not None}")
