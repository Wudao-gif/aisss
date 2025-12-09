"""
消息管理工具
用于修剪和格式化对话历史，防止超出 LLM 上下文窗口

两种策略：
1. trim_messages - 临时修剪（不改变 checkpoint）
2. RemoveMessage - 永久删除（修改 checkpoint）
"""

import logging
from typing import List, Dict, Any, Optional

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, RemoveMessage
from langchain_core.messages.utils import trim_messages, count_tokens_approximately

logger = logging.getLogger(__name__)

# 默认配置
DEFAULT_MAX_TOKENS = 4000  # 保留的最大 token 数
DEFAULT_MAX_MESSAGES = 20  # 保留的最大消息数
CLEANUP_THRESHOLD = 30    # 超过此数量触发清理
CLEANUP_KEEP = 20         # 清理后保留的消息数


def trim_conversation_history(
    messages: List[BaseMessage],
    max_tokens: int = DEFAULT_MAX_TOKENS,
    max_messages: int = DEFAULT_MAX_MESSAGES
) -> List[BaseMessage]:
    """
    修剪对话历史，防止超出 LLM 上下文窗口
    
    策略：
    1. 先按消息数量限制
    2. 再按 token 数量限制
    3. 保留最近的消息（strategy="last"）
    4. 确保以 human 消息开始
    
    Args:
        messages: 原始消息列表
        max_tokens: 最大 token 数
        max_messages: 最大消息数
        
    Returns:
        修剪后的消息列表
    """
    if not messages:
        return []
    
    # 1. 先按消息数量限制
    if len(messages) > max_messages:
        messages = messages[-max_messages:]
        logger.debug(f"按消息数量修剪: 保留最后 {max_messages} 条")
    
    # 2. 按 token 数量修剪
    try:
        trimmed = trim_messages(
            messages,
            strategy="last",
            token_counter=count_tokens_approximately,
            max_tokens=max_tokens,
            start_on="human",  # 确保以 human 消息开始
            end_on=("human", "ai"),  # 确保以完整对话结束
            allow_partial=False,
        )
        
        if len(trimmed) < len(messages):
            logger.info(f"消息修剪: {len(messages)} -> {len(trimmed)} 条")
        
        return trimmed
        
    except Exception as e:
        logger.warning(f"消息修剪失败，返回原始消息: {e}")
        return messages


def format_messages_for_prompt(
    messages: List[BaseMessage],
    max_tokens: int = DEFAULT_MAX_TOKENS
) -> str:
    """
    将消息列表格式化为 prompt 字符串
    
    Args:
        messages: 消息列表
        max_tokens: 最大 token 数
        
    Returns:
        格式化的对话历史字符串
    """
    # 先修剪
    trimmed = trim_conversation_history(messages, max_tokens=max_tokens)
    
    if not trimmed:
        return ""
    
    # 格式化
    lines = []
    for msg in trimmed:
        if isinstance(msg, HumanMessage):
            lines.append(f"用户: {msg.content}")
        elif isinstance(msg, AIMessage):
            lines.append(f"助手: {msg.content}")
        else:
            lines.append(f"{msg.type}: {msg.content}")
    
    return "\n".join(lines)


def get_recent_context(
    messages: List[BaseMessage],
    n_turns: int = 3
) -> str:
    """
    获取最近 N 轮对话作为上下文
    
    Args:
        messages: 消息列表
        n_turns: 保留的对话轮数（1轮 = 1个用户消息 + 1个AI回复）
        
    Returns:
        最近对话的字符串
    """
    if not messages:
        return ""
    
    # 计算需要保留的消息数（每轮2条）
    n_messages = n_turns * 2
    recent = messages[-n_messages:] if len(messages) > n_messages else messages
    
    return format_messages_for_prompt(recent, max_tokens=2000)


def count_messages(messages: List[BaseMessage]) -> Dict[str, int]:
    """
    统计消息数量

    Returns:
        {"total": N, "human": N, "ai": N, "tokens": N}
    """
    human_count = sum(1 for m in messages if isinstance(m, HumanMessage))
    ai_count = sum(1 for m in messages if isinstance(m, AIMessage))

    # 估算 token 数
    total_text = "".join(m.content for m in messages if hasattr(m, 'content'))
    token_estimate = count_tokens_approximately(total_text)

    return {
        "total": len(messages),
        "human": human_count,
        "ai": ai_count,
        "tokens": token_estimate
    }


def create_cleanup_messages(
    messages: List[BaseMessage],
    threshold: int = CLEANUP_THRESHOLD,
    keep: int = CLEANUP_KEEP
) -> List[RemoveMessage]:
    """
    创建需要删除的消息列表（用于永久清理 checkpoint）

    策略：
    - 当消息数超过 threshold 时，删除最早的消息
    - 保留最近的 keep 条消息
    - 确保删除后以 human 消息开始

    Args:
        messages: 当前消息列表
        threshold: 触发清理的阈值
        keep: 清理后保留的消息数

    Returns:
        RemoveMessage 列表（用于更新 state["messages"]）
    """
    if len(messages) <= threshold:
        return []

    # 计算需要删除的消息数
    to_remove_count = len(messages) - keep

    if to_remove_count <= 0:
        return []

    # 获取要删除的消息
    messages_to_remove = messages[:to_remove_count]

    # 确保删除后以 human 消息开始
    remaining = messages[to_remove_count:]
    while remaining and not isinstance(remaining[0], HumanMessage):
        # 如果剩余消息不是以 human 开始，多删一条
        if messages_to_remove:
            messages_to_remove.append(remaining.pop(0))

    # 创建 RemoveMessage 列表
    remove_messages = []
    for msg in messages_to_remove:
        if hasattr(msg, 'id') and msg.id:
            remove_messages.append(RemoveMessage(id=msg.id))

    if remove_messages:
        logger.info(f"消息清理: 删除 {len(remove_messages)} 条，保留 {len(messages) - len(remove_messages)} 条")

    return remove_messages


def should_cleanup_messages(
    messages: List[BaseMessage],
    threshold: int = CLEANUP_THRESHOLD
) -> bool:
    """
    判断是否需要清理消息

    Args:
        messages: 当前消息列表
        threshold: 触发清理的阈值

    Returns:
        是否需要清理
    """
    return len(messages) > threshold


# ==================== 消息摘要相关 ====================

SUMMARY_THRESHOLD = 20  # 超过此数量触发摘要
SUMMARY_KEEP = 4        # 摘要后保留的最近消息数（2轮对话）


def should_summarize_messages(
    messages: List[BaseMessage],
    threshold: int = SUMMARY_THRESHOLD
) -> bool:
    """
    判断是否需要生成摘要

    Args:
        messages: 当前消息列表
        threshold: 触发摘要的阈值

    Returns:
        是否需要摘要
    """
    return len(messages) > threshold


def build_summary_prompt(
    messages: List[BaseMessage],
    existing_summary: str = ""
) -> str:
    """
    构建摘要提示词

    Args:
        messages: 需要摘要的消息列表
        existing_summary: 已有的摘要（用于扩展）

    Returns:
        摘要提示词
    """
    # 格式化消息
    conversation = []
    for msg in messages:
        if isinstance(msg, HumanMessage):
            conversation.append(f"用户: {msg.content}")
        elif isinstance(msg, AIMessage):
            conversation.append(f"助手: {msg.content}")

    conversation_text = "\n".join(conversation)

    if existing_summary:
        prompt = f"""以下是之前对话的摘要：
{existing_summary}

以下是新的对话内容：
{conversation_text}

请扩展摘要，整合新的对话内容。摘要应该：
1. 保留用户的关键信息（如姓名、偏好、学习目标等）
2. 记录讨论过的主要话题和结论
3. 保持简洁，不超过 200 字

更新后的摘要："""
    else:
        prompt = f"""以下是对话内容：
{conversation_text}

请生成对话摘要。摘要应该：
1. 保留用户的关键信息（如姓名、偏好、学习目标等）
2. 记录讨论过的主要话题和结论
3. 保持简洁，不超过 200 字

摘要："""

    return prompt


def get_messages_to_remove_after_summary(
    messages: List[BaseMessage],
    keep: int = SUMMARY_KEEP
) -> List[RemoveMessage]:
    """
    获取摘要后需要删除的消息

    保留最近的 keep 条消息，删除其余的

    Args:
        messages: 当前消息列表
        keep: 保留的消息数

    Returns:
        RemoveMessage 列表
    """
    if len(messages) <= keep:
        return []

    # 删除除最后 keep 条之外的所有消息
    messages_to_remove = messages[:-keep]

    remove_messages = []
    for msg in messages_to_remove:
        if hasattr(msg, 'id') and msg.id:
            remove_messages.append(RemoveMessage(id=msg.id))

    if remove_messages:
        logger.info(f"摘要后清理: 删除 {len(remove_messages)} 条，保留最近 {keep} 条")

    return remove_messages
