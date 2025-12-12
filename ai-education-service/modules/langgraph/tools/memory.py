"""
记忆工具
封装 modules/memory_store.py 的 MemoryVectorStore

使用 DashVector (jiyi Collection) + Qwen2.5-VL-Embedding
支持 LangGraph Streaming 可观测性
支持 Human-in-the-Loop (HITL) 中断（通过 interrupt() 函数）
"""

import logging
from typing import Optional, Literal

from langchain_core.tools import tool
from langgraph.config import get_stream_writer
from langgraph.types import interrupt

from modules.memory_store import (
    get_memory_store,
    MemoryType,
    LettaMemoryOutput,
)

logger = logging.getLogger(__name__)


def _get_writer():
    """安全获取 stream writer"""
    try:
        return get_stream_writer()
    except Exception:
        return None


@tool
def memory_write(
    user_id: str,
    memory_text: str,
    memory_type: Literal["profile", "understanding", "learning_track"] = "learning_track",
    textbook_id: Optional[str] = None,
    topic: Optional[str] = None,
) -> str:
    """
    写入用户记忆到向量库（需要人工审批）

    Args:
        user_id: 用户ID
        memory_text: 记忆内容文本
        memory_type: 记忆类型
            - "profile": 用户画像（姓名、年级、学习风格等）
            - "understanding": 知识理解（掌握的概念、薄弱点等）
            - "learning_track": 学习轨迹（学习历史、进度等）
        textbook_id: 教材ID（可选）
        topic: 主题（可选）

    Returns:
        操作结果
    """
    writer = _get_writer()

    # 发送进度：开始写入
    if writer:
        writer({
            "type": "progress",
            "step": "memory_write",
            "status": "start",
            "message": "💾 正在保存学习记录...",
            "icon": "save"
        })

    # ==================== HITL 中断：请求人工审批 ====================
    logger.info(f"🛑 [memory_write] 请求人工审批: {memory_text[:50]}...")

    approval = interrupt({
        "action": "memory_write",
        "action_name": "保存学习记录",
        "user_id": user_id,
        "memory_type": memory_type,
        "memory_text": memory_text,
        "textbook_id": textbook_id,
        "topic": topic,
        "message": "需要审批保存的学习记录",
        "description": f"将保存以下学习记录到您的个人记忆库：\n\n{memory_text}",
    })

    logger.info(f"✅ [memory_write] 收到审批结果: {approval}")

    # 检查审批结果
    if isinstance(approval, dict):
        action = approval.get("action", "")
        if action == "reject":
            logger.info(f"❌ [memory_write] 用户拒绝保存")
            if writer:
                writer({
                    "type": "progress",
                    "step": "memory_write",
                    "status": "cancelled",
                    "message": "❌ 保存已取消",
                    "icon": "cancel"
                })
            return "记忆保存已取消"
        elif action == "edit":
            # 使用编辑后的内容
            edited_text = approval.get("edited_value", memory_text)
            if edited_text:
                memory_text = edited_text
                logger.info(f"✏️ [memory_write] 使用编辑后的内容: {memory_text[:50]}...")

    # ==================== 执行保存 ====================
    try:
        store = get_memory_store()

        # 构建记忆对象
        memory = LettaMemoryOutput(
            user_id=user_id,
            textbook_id=textbook_id,
            memory_type=MemoryType(memory_type),
            memory_text=memory_text,
            language="zh",
            details={"topic": topic} if topic else {},
        )

        # 存储到向量库
        doc_id = store.store_memory(memory)

        if doc_id:
            # 发送进度：写入成功
            if writer:
                writer({
                    "type": "progress",
                    "step": "memory_write",
                    "status": "complete",
                    "message": "✅ 学习记录已保存",
                    "icon": "check"
                })
            logger.info(f"✅ [memory_write] 记忆保存成功: {doc_id}")
            return f"记忆存储成功: {doc_id}"
        else:
            if writer:
                writer({
                    "type": "progress",
                    "step": "memory_write",
                    "status": "error",
                    "message": "❌ 保存失败",
                    "icon": "error"
                })
            logger.error(f"❌ [memory_write] 记忆保存失败")
            return "记忆存储失败"

    except Exception as e:
        if writer:
            writer({
                "type": "progress",
                "step": "memory_write",
                "status": "error",
                "message": f"❌ 保存失败: {str(e)}",
                "icon": "error"
            })
        logger.error(f"❌ [memory_write] 记忆写入异常: {str(e)}")
        return f"记忆写入失败: {str(e)}"


@tool
def memory_read(
    user_id: str,
    query: str,
    memory_type: Optional[Literal["profile", "understanding", "learning_track"]] = None,
    textbook_id: Optional[str] = None,
    top_k: int = 5,
) -> str:
    """
    从向量库搜索用户记忆（语义搜索）

    Args:
        user_id: 用户ID
        query: 搜索查询文本
        memory_type: 记忆类型筛选（可选）
            - "profile": 用户画像
            - "understanding": 知识理解
            - "learning_track": 学习轨迹
        textbook_id: 教材ID筛选（可选）
        top_k: 返回结果数量

    Returns:
        搜索到的记忆内容
    """
    writer = _get_writer()

    # 发送进度：开始读取
    if writer:
        writer({
            "type": "progress",
            "step": "memory_read",
            "status": "start",
            "message": "📚 正在读取学习记录...",
            "icon": "search"
        })

    try:
        store = get_memory_store()

        # 转换记忆类型
        mem_type = MemoryType(memory_type) if memory_type else None

        # 语义搜索
        memories = store.search_memories(
            user_id=user_id,
            query_text=query,
            memory_type=mem_type,
            book_id=textbook_id,
            top_k=top_k,
        )

        if not memories:
            if writer:
                writer({
                    "type": "progress",
                    "step": "memory_read",
                    "status": "complete",
                    "message": "📭 暂无相关学习记录",
                    "icon": "empty"
                })
            return "未找到相关记忆"

        # 发送进度：找到记忆
        if writer:
            writer({
                "type": "progress",
                "step": "memory_read",
                "status": "complete",
                "message": f"✅ 找到 {len(memories)} 条相关记录",
                "icon": "check",
                "count": len(memories)
            })

        # 格式化结果
        results = []
        for mem in memories:
            score = mem.get("score", 0)
            text = mem.get("memory_text", "")
            m_type = mem.get("memory_type", "")
            topic = mem.get("topic", "")

            result = f"[{m_type}] {text}"
            if topic:
                result = f"[{m_type}:{topic}] {text}"
            results.append(result)

        return "\n".join(results)

    except Exception as e:
        if writer:
            writer({
                "type": "progress",
                "step": "memory_read",
                "status": "error",
                "message": f"❌ 读取失败: {str(e)}",
                "icon": "error"
            })
        return f"记忆读取失败: {str(e)}"


# 导出工具列表
memory_tools = [memory_read, memory_write]

