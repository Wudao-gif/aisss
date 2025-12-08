"""
专业智能体节点（占位实现）
后续规划：计算、分析、表达、工具 4 个专业智能体
"""

import logging
from typing import Dict, Any

import httpx

from config import settings
from .state import AgentState

logger = logging.getLogger(__name__)


async def placeholder_agent(state: AgentState) -> AgentState:
    """
    占位智能体（统一处理所有任务类型）
    后续将拆分为 4 个专业智能体
    """
    logger.info(f"占位智能体处理: task_type={state.get('task_type')}")
    state["current_node"] = "placeholder_agent"
    
    try:
        # 构建提示词
        system_prompt = _build_system_prompt(state)
        user_prompt = _build_user_prompt(state)
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.CHAT_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000,
                }
            )
            response.raise_for_status()
            data = response.json()
            answer = data["choices"][0]["message"]["content"]
            state["agent_response"] = answer
            logger.info(f"智能体回答生成完成: {len(answer)} 字符")
            
    except Exception as e:
        logger.error(f"智能体处理失败: {e}")
        state["agent_response"] = "抱歉，处理您的问题时出现了错误。"
        state["error"] = str(e)
    
    return state


def _build_system_prompt(state: AgentState) -> str:
    """根据任务类型构建系统提示词"""

    task_type = state.get("task_type", "analyze")
    book_name = state.get("book_name", "")
    book_subject = state.get("book_subject", "")

    book_info = f"《{book_name}》" if book_name else "当前教材"

    base_prompt = f"""你是一个专业的教育助手，正在帮助学生学习{book_info}。

【核心原则】
1. 基于参考资料回答，用 [来源X] 标注引用
2. 如果参考资料不能直接回答问题，但包含相关信息，请：
   - 先说明参考资料中有哪些相关内容
   - 然后基于这些内容和你的专业知识给出有价值的回答
3. 只有在参考资料完全无关时，才说"未找到相关信息"

【回答风格】
- 直接回答问题，不要重复问题
- 条理清晰，重点突出
- 语气自然亲切，像一位耐心的老师"""

    # 根据任务类型添加特定指导
    task_prompts = {
        "compute": """
【计算类任务】
- 展示完整的计算步骤
- 使用规范的数学符号
- 解释每一步的推导逻辑
- 如有公式，说明公式的含义""",
        
        "analyze": """
【分析类任务】
- 清晰解释概念的定义
- 使用例子帮助理解
- 如有对比，列出异同点
- 梳理知识点之间的关系""",
        
        "express": """
【表达类任务】
- 注意语言的准确性和流畅性
- 根据要求调整语气和风格
- 如是翻译，保持原意的同时符合目标语言习惯
- 如是写作，结构清晰、论点明确""",
        
        "tool": """
【工具类任务】
- 按照用户要求的格式输出
- 如是思维导图，使用层级结构
- 如是代码，添加必要的注释
- 确保输出可以直接使用"""
    }
    
    task_specific = task_prompts.get(task_type, task_prompts["analyze"])
    
    if book_subject:
        subject_note = f"\n\n当前教材学科：{book_subject}"
    else:
        subject_note = ""
    
    return base_prompt + task_specific + subject_note


def _build_user_prompt(state: AgentState) -> str:
    """构建用户提示词"""
    
    context = state.get("context", "")
    query = state.get("query", "")
    rewritten_query = state.get("rewritten_query", "")
    
    # 如果有改写，显示改写后的查询
    query_display = rewritten_query if rewritten_query and rewritten_query != query else query
    
    prompt = f"""参考资料（请在回答中使用[来源X]标注引用）：
{context if context else "（无相关参考资料）"}

---

用户问题：{query_display}"""

    # 如果检索不足，添加提示
    if not state.get("has_sufficient_context"):
        prompt += "\n\n注意：参考资料可能不完整，请基于已有信息尽可能回答，如信息不足请说明。"
    
    return prompt

