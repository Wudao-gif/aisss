"""
表达专家智能体
职责：
1. 根据用户画像调整表达方式（专业/通俗）
2. 概念解释
3. 内容总结
4. 回答润色
"""

import logging
from typing import Dict, Any

import httpx

from config import settings
from .state import AgentState
from .message_utils import get_recent_context

logger = logging.getLogger(__name__)


class ExpressionAgent:
    """表达专家智能体"""
    
    def __init__(self):
        self.chat_model = settings.CHAT_MODEL
    
    async def run(self, state: AgentState) -> AgentState:
        """
        执行表达任务
        
        支持的动作：
        - explain: 解释概念
        - summarize: 总结内容
        - answer: 回答问题
        - polish: 润色回答
        """
        logger.info(f"表达专家开始: action={self._get_current_action(state)}")
        state["current_node"] = "expression_agent"
        
        try:
            action = self._get_current_action(state)
            
            if action == "explain":
                result = await self._explain(state)
            elif action == "summarize":
                result = await self._summarize(state)
            elif action == "answer":
                result = await self._answer(state)
            elif action == "polish":
                result = await self._polish(state)
            else:
                result = await self._answer(state)
            
            state["expression_output"] = result
            self._update_task_status(state, "done")
            state["next_node"] = self._get_next_agent(state)
            
            logger.info(f"表达专家完成，下一节点: {state['next_node']}")
            
        except Exception as e:
            logger.error(f"表达专家失败: {e}")
            state["error"] = str(e)
            state["expression_output"] = {"error": str(e)}
            self._update_task_status(state, "failed")
            state["next_node"] = "supervisor_exit"
        
        return state
    
    def _get_expression_style(self, state: AgentState) -> str:
        """根据用户画像确定表达风格"""
        user_profile = state.get("user_profile", {})
        
        if not user_profile:
            return "balanced"  # 默认平衡风格
        
        # 根据数学能力和解释深度偏好判断
        math_skill = user_profile.get("math_skill", 3)
        depth_pref = user_profile.get("explanation_depth_preference", "")
        
        if math_skill >= 4 or depth_pref == "detailed":
            return "professional"  # 专业风格
        elif math_skill <= 2 or depth_pref == "simple":
            return "simple"  # 通俗风格
        else:
            return "balanced"  # 平衡风格
    
    def _build_style_instruction(self, style: str) -> str:
        """构建风格指令"""
        instructions = {
            "professional": """表达风格：专业学术
- 使用专业术语
- 可以包含公式和推导
- 深入分析原理
- 适合基础较好的学生""",
            "simple": """表达风格：通俗易懂
- 使用日常语言
- 多用比喻和例子
- 避免复杂公式
- 循序渐进解释
- 适合初学者""",
            "balanced": """表达风格：平衡适中
- 专业术语配合解释
- 适当使用例子
- 兼顾深度和易懂性"""
        }
        return instructions.get(style, instructions["balanced"])
    
    async def _explain(self, state: AgentState) -> Dict[str, Any]:
        """解释概念"""
        
        context = state.get("context", "")
        query = state.get("query", "")
        style = self._get_expression_style(state)
        style_instruction = self._build_style_instruction(style)
        
        prompt = f"""请解释以下概念。

参考资料：
{context if context else "（无参考资料）"}

问题：{query}

{style_instruction}

解释要求：
1. 先给出简洁定义
2. 再详细解释
3. 举例说明
4. 如果使用了参考资料，用 [来源X] 标注

请解释："""

        answer = await self._call_llm(prompt)
        
        return {
            "answer": answer,
            "type": "explain",
            "style": style
        }
    
    async def _summarize(self, state: AgentState) -> Dict[str, Any]:
        """总结内容"""
        
        context = state.get("context", "")
        query = state.get("query", "")
        intent_params = state.get("intent_params", {})
        style = self._get_expression_style(state)
        style_instruction = self._build_style_instruction(style)
        
        # 获取其他智能体的输出
        reasoning_output = state.get("reasoning_output", {})
        generation_output = state.get("generation_output", {})
        
        additional_content = ""
        if reasoning_output.get("answer"):
            additional_content += f"\n\n推理结果：\n{reasoning_output['answer']}"
        if generation_output.get("answer"):
            additional_content += f"\n\n生成内容：\n{generation_output['answer']}"
        
        prompt = f"""请进行复习总结。

参考资料：
{context if context else "（无参考资料）"}
{additional_content}

用户需求：{query}
范围：{intent_params.get('scope', '全部')}
类型：{intent_params.get('type', '综合总结')}

{style_instruction}

总结要求：
1. 提炼核心知识点
2. 突出重点和难点
3. 梳理知识结构
4. 如果使用了参考资料，用 [来源X] 标注

请总结："""

        answer = await self._call_llm(prompt)
        
        return {
            "answer": answer,
            "type": "summarize",
            "style": style
        }
    
    async def _answer(self, state: AgentState) -> Dict[str, Any]:
        """回答问题"""

        context = state.get("context", "")
        query = state.get("query", "")
        style = self._get_expression_style(state)
        style_instruction = self._build_style_instruction(style)
        book_name = state.get("book_name", "")

        # 获取对话摘要（长期上下文）
        summary = state.get("summary", "")

        # 获取对话历史（短期上下文）
        messages = state.get("messages", [])
        recent_context = get_recent_context(messages, n_turns=3) if messages else ""

        # 构建历史上下文部分
        history_section = ""
        if summary:
            history_section += f"""
对话摘要（之前的对话要点）：
{summary}
"""
        if recent_context:
            history_section += f"""
最近对话：
{recent_context}
"""

        prompt = f"""请回答以下问题。

教材：{book_name if book_name else "未知"}
{history_section}
参考资料：
{context if context else "（无参考资料）"}

当前问题：{query}

{style_instruction}

回答要求：
1. 直接回答问题
2. 条理清晰
3. 如果使用了参考资料，用 [来源X] 标注
4. 如果参考资料不足，基于专业知识补充，但要说明
5. 如果问题涉及之前对话的内容，要正确理解指代关系
6. 参考对话摘要中的用户信息（如姓名、偏好等）

请回答："""

        answer = await self._call_llm(prompt)
        
        return {
            "answer": answer,
            "type": "answer",
            "style": style
        }
    
    async def _polish(self, state: AgentState) -> Dict[str, Any]:
        """润色回答"""
        
        # 获取其他智能体的输出
        reasoning_output = state.get("reasoning_output", {})
        generation_output = state.get("generation_output", {})
        
        original = reasoning_output.get("answer", "") or generation_output.get("answer", "")
        
        if not original:
            return await self._answer(state)
        
        style = self._get_expression_style(state)
        style_instruction = self._build_style_instruction(style)
        
        prompt = f"""请润色以下回答。

原始回答：
{original}

{style_instruction}

润色要求：
1. 保持核心内容不变
2. 调整表达方式
3. 保留所有 [来源X] 标注
4. 使语言更流畅自然

润色后的回答："""

        answer = await self._call_llm(prompt)
        
        return {
            "answer": answer,
            "type": "polish",
            "style": style
        }
    
    async def _call_llm(self, prompt: str) -> str:
        """调用 LLM"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.chat_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": 2000,
                }
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    
    def _get_current_action(self, state: AgentState) -> str:
        """获取当前任务的动作"""
        task_plan = state.get("task_plan", [])
        for task in task_plan:
            if task.get("agent") == "expression" and task.get("status") == "pending":
                return task.get("action", "answer")
        return "answer"
    
    def _update_task_status(self, state: AgentState, status: str) -> None:
        """更新任务状态"""
        task_plan = state.get("task_plan", [])
        for task in task_plan:
            if task.get("agent") == "expression" and task.get("status") == "pending":
                task["status"] = status
                break
    
    def _get_next_agent(self, state: AgentState) -> str:
        """获取下一个智能体"""
        task_plan = state.get("task_plan", [])
        current_step = state.get("current_step", 0)
        
        for i, task in enumerate(task_plan):
            if task.get("status") == "pending" and i > current_step:
                agent = task.get("agent", "")
                state["current_step"] = i
                return f"{agent}_agent"
        
        return "supervisor_exit"


# 全局实例
_expression_agent: ExpressionAgent = None


def get_expression_agent() -> ExpressionAgent:
    """获取表达专家单例"""
    global _expression_agent
    if _expression_agent is None:
        _expression_agent = ExpressionAgent()
    return _expression_agent


async def expression_agent_node(state: AgentState) -> AgentState:
    """表达专家节点函数"""
    agent = get_expression_agent()
    return await agent.run(state)

