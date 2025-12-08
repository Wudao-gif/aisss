"""
记忆数据库存储模块
将 Letta 输出的记忆存入 PostgreSQL 数据库
表: user_profiles, user_understandings, user_learnings
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor

from config import settings
from .memory_store import LettaMemoryOutput, MemoryType

logger = logging.getLogger(__name__)


class MemoryDatabase:
    """
    记忆数据库存储
    直接连接 PostgreSQL，存储用户记忆
    """
    
    def __init__(self):
        """初始化数据库连接参数"""
        # 从 settings 或环境变量获取数据库配置
        self.db_config = {
            "host": getattr(settings, "POSTGRES_HOST", "127.0.0.1"),
            "port": getattr(settings, "POSTGRES_PORT", 5432),
            "database": getattr(settings, "POSTGRES_DB", "user_auth_db"),
            "user": getattr(settings, "POSTGRES_USER", "postgres"),
            "password": getattr(settings, "POSTGRES_PASSWORD", "mysecretpassword")
        }
        logger.info(f"MemoryDatabase 初始化: {self.db_config['host']}:{self.db_config['port']}")
    
    def _get_connection(self):
        """获取数据库连接"""
        return psycopg2.connect(**self.db_config)
    
    def store_memory(self, memory: LettaMemoryOutput, vector_id: Optional[str] = None) -> bool:
        """
        存储记忆到数据库
        
        Args:
            memory: Letta 输出的记忆数据
            vector_id: DashVector 中的文档 ID
            
        Returns:
            是否成功
        """
        try:
            if memory.memory_type == MemoryType.PROFILE:
                return self._store_profile(memory)
            elif memory.memory_type == MemoryType.UNDERSTANDING:
                return self._store_understanding(memory, vector_id)
            elif memory.memory_type == MemoryType.LEARNING_TRACK:
                return self._store_learning(memory, vector_id)
            else:
                logger.warning(f"未知的记忆类型: {memory.memory_type}")
                return False
        except Exception as e:
            logger.error(f"存储记忆到数据库失败: {e}")
            return False
    
    def _store_profile(self, memory: LettaMemoryOutput) -> bool:
        """存储用户画像"""
        details = memory.details
        
        sql = """
        INSERT INTO user_profiles (
            id, user_id, grade, university, major, age,
            learning_goal, exam_deadline, language_preference,
            tone_preference, learning_style_preference, memory_text,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(), %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            NOW(), NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            grade = COALESCE(EXCLUDED.grade, user_profiles.grade),
            university = COALESCE(EXCLUDED.university, user_profiles.university),
            major = COALESCE(EXCLUDED.major, user_profiles.major),
            age = COALESCE(EXCLUDED.age, user_profiles.age),
            learning_goal = COALESCE(EXCLUDED.learning_goal, user_profiles.learning_goal),
            exam_deadline = COALESCE(EXCLUDED.exam_deadline, user_profiles.exam_deadline),
            language_preference = COALESCE(EXCLUDED.language_preference, user_profiles.language_preference),
            tone_preference = COALESCE(EXCLUDED.tone_preference, user_profiles.tone_preference),
            learning_style_preference = COALESCE(EXCLUDED.learning_style_preference, user_profiles.learning_style_preference),
            memory_text = COALESCE(EXCLUDED.memory_text, user_profiles.memory_text),
            updated_at = NOW()
        """
        
        # 解析 exam_deadline
        exam_deadline = None
        if details.get("exam_deadline"):
            try:
                exam_deadline = datetime.fromisoformat(details["exam_deadline"])
            except:
                pass
        
        params = (
            memory.user_id,
            details.get("grade"),
            details.get("university"),
            details.get("major"),
            details.get("age"),
            details.get("learning_goal"),
            exam_deadline,
            details.get("language_preference", "中文"),
            details.get("tone_preference"),
            details.get("learning_style_preference"),
            memory.memory_text
        )
        
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
            conn.commit()
        
        logger.info(f"用户画像存储成功: user_id={memory.user_id}")
        return True
    
    def _store_understanding(self, memory: LettaMemoryOutput, vector_id: Optional[str]) -> bool:
        """存储知识理解"""
        details = memory.details
        book_id = memory.textbook_id or details.get("textbook_id", "")
        topic = details.get("topic", "")
        understood = details.get("understood", [])
        not_understood = details.get("not_understood", [])
        
        if not book_id or not topic:
            logger.warning("知识理解缺少 book_id 或 topic")
            return False
        
        sql = """
        INSERT INTO user_understandings (
            id, user_id, book_id, topic, understood, not_understood,
            memory_text, vector_id, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
        )
        ON CONFLICT (user_id, book_id, topic) DO UPDATE SET
            understood = EXCLUDED.understood,
            not_understood = EXCLUDED.not_understood,
            memory_text = EXCLUDED.memory_text,
            vector_id = COALESCE(EXCLUDED.vector_id, user_understandings.vector_id),
            updated_at = NOW()
        """
        
        params = (
            memory.user_id, book_id, topic,
            understood, not_understood,
            memory.memory_text, vector_id
        )
        
        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
            conn.commit()
        
        logger.info(f"知识理解存储成功: user={memory.user_id}, topic={topic}")
        return True

    def _store_learning(self, memory: LettaMemoryOutput, vector_id: Optional[str]) -> bool:
        """存储学习轨迹"""
        details = memory.details
        book_id = memory.textbook_id or details.get("textbook_id", "")
        topic = details.get("topic", "")
        question_type = details.get("question_type", "other")

        if not book_id or not topic:
            logger.warning("学习轨迹缺少 book_id 或 topic")
            return False

        sql = """
        INSERT INTO user_learnings (
            id, user_id, book_id, topic, question_type,
            memory_text, vector_id, created_at
        ) VALUES (
            gen_random_uuid(), %s, %s, %s, %s, %s, %s, NOW()
        )
        """

        params = (
            memory.user_id, book_id, topic, question_type,
            memory.memory_text, vector_id
        )

        with self._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
            conn.commit()

        logger.info(f"学习轨迹存储成功: user={memory.user_id}, topic={topic}")
        return True

    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """获取用户画像"""
        sql = "SELECT * FROM user_profiles WHERE user_id = %s"

        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, (user_id,))
                row = cur.fetchone()
                return dict(row) if row else None

    def get_user_understandings(
        self,
        user_id: str,
        book_id: Optional[str] = None
    ) -> list:
        """获取用户知识理解记录"""
        if book_id:
            sql = "SELECT * FROM user_understandings WHERE user_id = %s AND book_id = %s ORDER BY updated_at DESC"
            params = (user_id, book_id)
        else:
            sql = "SELECT * FROM user_understandings WHERE user_id = %s ORDER BY updated_at DESC"
            params = (user_id,)

        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, params)
                return [dict(row) for row in cur.fetchall()]

    def get_user_learnings(
        self,
        user_id: str,
        book_id: Optional[str] = None,
        limit: int = 20
    ) -> list:
        """获取用户学习轨迹"""
        if book_id:
            sql = "SELECT * FROM user_learnings WHERE user_id = %s AND book_id = %s ORDER BY created_at DESC LIMIT %s"
            params = (user_id, book_id, limit)
        else:
            sql = "SELECT * FROM user_learnings WHERE user_id = %s ORDER BY created_at DESC LIMIT %s"
            params = (user_id, limit)

        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, params)
                return [dict(row) for row in cur.fetchall()]


# 全局实例
_memory_db: Optional[MemoryDatabase] = None


def get_memory_db() -> MemoryDatabase:
    """获取记忆数据库单例"""
    global _memory_db
    if _memory_db is None:
        _memory_db = MemoryDatabase()
    return _memory_db

