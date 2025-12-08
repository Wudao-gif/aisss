"""
Letta 记忆服务客户端
封装 Letta API 调用，提取和存储用户长期记忆

Letta Agent 配置为 "Long-Term Memory Extraction and Formatting Agent"
输出格式为结构化 JSON，包含:
- user_id, textbook_id, memory_type, memory_text, language, details
"""

import json
import logging
import re
from typing import Dict, Any, Optional, List

import httpx

from ..memory_store import LettaMemoryOutput, MemoryType, get_memory_store
from ..memory_db import get_memory_db

logger = logging.getLogger(__name__)

# Letta 服务配置
LETTA_BASE_URL = "http://host.docker.internal:8283"
LETTA_AGENT_ID = "agent-bd0d5ebe-49cb-4962-a812-b5199054c1f0"


class LettaClient:
    """
    Letta 记忆服务客户端

    工作流程:
    1. 发送对话内容给 Letta Agent
    2. Letta 分析对话，输出结构化 JSON 记忆
    3. 解析 JSON，存入 DashVector (changqijiyi) 和 PostgreSQL
    """

    def __init__(
        self,
        base_url: str = LETTA_BASE_URL,
        agent_id: str = LETTA_AGENT_ID
    ):
        self.base_url = base_url
        self.agent_id = agent_id
        self._memory_store = None
        self._memory_db = None

    @property
    def memory_store(self):
        """延迟加载记忆向量存储"""
        if self._memory_store is None:
            self._memory_store = get_memory_store()
        return self._memory_store

    @property
    def memory_db(self):
        """延迟加载记忆数据库"""
        if self._memory_db is None:
            self._memory_db = get_memory_db()
        return self._memory_db

    async def extract_and_store_memory(
        self,
        user_id: str,
        book_id: str,
        book_name: str,
        user_message: str,
        assistant_message: str
    ) -> Dict[str, Any]:
        """
        提取并存储记忆（主入口）

        Args:
            user_id: 用户ID
            book_id: 教材ID
            book_name: 教材名称
            user_message: 用户消息
            assistant_message: AI回复

        Returns:
            {
                "success": bool,
                "memories": [...],  # 提取的记忆列表
                "stored_count": int  # 成功存储的数量
            }
        """
        # 1. 调用 Letta 提取记忆
        letta_output = await self._call_letta_agent(
            user_id=user_id,
            book_id=book_id,
            book_name=book_name,
            user_message=user_message,
            assistant_message=assistant_message
        )

        if not letta_output:
            return {"success": False, "memories": [], "stored_count": 0}

        # 2. 解析 Letta 输出
        memories = self._parse_letta_output(letta_output, user_id, book_id)

        if not memories:
            logger.info("Letta 未提取到需要存储的记忆")
            return {"success": True, "memories": [], "stored_count": 0}

        # 3. 存储记忆
        stored_count = 0
        for memory in memories:
            try:
                # 存入向量库
                vector_id = self.memory_store.store_memory(memory)

                # 存入数据库
                db_success = self.memory_db.store_memory(memory, vector_id)

                if vector_id or db_success:
                    stored_count += 1

            except Exception as e:
                logger.error(f"存储记忆失败: {e}")

        logger.info(f"记忆存储完成: 提取 {len(memories)} 条，成功存储 {stored_count} 条")

        return {
            "success": True,
            "memories": [self._memory_to_dict(m) for m in memories],
            "stored_count": stored_count
        }

    async def _call_letta_agent(
        self,
        user_id: str,
        book_id: str,
        book_name: str,
        user_message: str,
        assistant_message: str
    ) -> Optional[str]:
        """调用 Letta Agent 提取记忆"""

        # 构建输入 prompt
        prompt = f"""请分析以下对话并提取用户记忆：

用户ID: {user_id}
教材ID: {book_id}
教材名称: {book_name}

用户问题：
{user_message}

AI回答：
{assistant_message}

请根据对话内容，输出结构化的记忆 JSON。"""

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/v1/agents/{self.agent_id}/messages",
                    headers={"Content-Type": "application/json"},
                    json={
                        "messages": [{"role": "user", "content": prompt}]
                    }
                )

                if not response.is_success:
                    logger.error(f"Letta API 错误: {response.status_code}")
                    return None

                data = response.json()

                # 提取 assistant 回复
                messages = data.get("messages", [])
                for msg in messages:
                    if msg.get("role") == "assistant":
                        return msg.get("content", "")

                logger.warning("Letta 响应中未找到 assistant 消息")
                return None

        except Exception as e:
            logger.error(f"调用 Letta Agent 失败: {e}")
            return None

    def _parse_letta_output(
        self,
        output: str,
        default_user_id: str,
        default_book_id: str
    ) -> List[LettaMemoryOutput]:
        """
        解析 Letta 输出的 JSON

        Letta 可能输出单个 JSON 或多个 JSON（用于多条记忆）
        """
        memories = []

        # 尝试提取 JSON 块
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        json_matches = re.findall(json_pattern, output, re.DOTALL)

        for json_str in json_matches:
            try:
                data = json.loads(json_str)

                # 检查是否是有效的记忆格式
                if "memory_type" not in data:
                    continue

                # 填充默认值
                if not data.get("user_id"):
                    data["user_id"] = default_user_id
                if not data.get("textbook_id"):
                    data["textbook_id"] = default_book_id

                memory = LettaMemoryOutput.from_dict(data)
                memories.append(memory)

                logger.debug(f"解析到记忆: type={memory.memory_type.value}")

            except json.JSONDecodeError as e:
                logger.debug(f"JSON 解析失败: {e}")
                continue
            except Exception as e:
                logger.warning(f"记忆解析失败: {e}")
                continue

        return memories

    def _memory_to_dict(self, memory: LettaMemoryOutput) -> Dict[str, Any]:
        """将记忆对象转为字典"""
        return {
            "user_id": memory.user_id,
            "textbook_id": memory.textbook_id,
            "memory_type": memory.memory_type.value,
            "memory_text": memory.memory_text,
            "language": memory.language,
            "details": memory.details
        }

    async def get_user_memories(
        self,
        user_id: str,
        book_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        获取用户记忆（从数据库）

        Returns:
            {
                "profile": {...},
                "understandings": [...],
                "learnings": [...]
            }
        """
        profile = self.memory_db.get_user_profile(user_id)
        understandings = self.memory_db.get_user_understandings(user_id, book_id)
        learnings = self.memory_db.get_user_learnings(user_id, book_id)

        return {
            "profile": profile,
            "understandings": understandings,
            "learnings": learnings
        }

    async def search_relevant_memories(
        self,
        user_id: str,
        query: str,
        book_id: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        搜索相关记忆（从向量库）

        用于 RAG 时检索用户历史学习记录
        """
        return self.memory_store.search_memories(
            user_id=user_id,
            query_text=query,
            book_id=book_id,
            top_k=top_k
        )


# 全局客户端实例
_letta_client: Optional[LettaClient] = None


def get_letta_client() -> LettaClient:
    """获取 Letta 客户端单例"""
    global _letta_client
    if _letta_client is None:
        _letta_client = LettaClient()
    return _letta_client

