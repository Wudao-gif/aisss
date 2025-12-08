"""
推理专家智能体
职责：
1. 解决复杂数学问题
2. 逻辑推理和证明
3. 分析和规划
"""

import logging
from typing import Dict, Any

import httpx

from config import settings
from .state import AgentState

logger = logging.getLogger(__name__)


class ReasoningAgent:
    """推理专家智能体"""
    
    def __init__(self):
        self.chat_model = settings.CHAT_MODEL
    
    async def run(self, state: AgentState) -> AgentState:
        """
        执行推理任务
        
        支持的动作：
        - solve: 解题
        - analyze: 分析
        - prove: 证明
        """
        logger.info(f"推理专家开始: action={self._get_current_action(state)}")
        state["current_node"] = "reasoning_agent"
        
        try:
            action = self._get_current_action(state)
            
            if action == "solve":
                result = await self._solve_problem(state)
            elif action == "analyze":
                result = await self._analyze(state)
            elif action == "prove":
                result = await self._prove(state)
            else:
                result = await self._general_reasoning(state)
            
            state["reasoning_output"] = result
            self._update_task_status(state, "done")
            state["next_node"] = self._get_next_agent(state)
            
            logger.info(f"推理专家完成，下一节点: {state['next_node']}")
            
        except Exception as e:
            logger.error(f"推理专家失败: {e}")
            state["error"] = str(e)
            state["reasoning_output"] = {"error": str(e)}
            self._update_task_status(state, "failed")
            state["next_node"] = "supervisor_exit"
        
        return state
    
    async def _solve_problem(self, state: AgentState) -> Dict[str, Any]:
        """解决数学/逻辑问题"""
        
        context = state.get("context", "")
        query = state.get("query", "")
        user_understanding = state.get("user_understanding", {})
        
        prompt = f"""你是一位专业的数学老师，请解决以下问题。

参考资料：
{context if context else "（无参考资料）"}

学生的知识掌握情况：
{user_understanding if user_understanding else "（未知）"}

问题：{query}

解题要求：
1. 分析题目，明确已知条件和求解目标
2. 选择合适的解题方法
3. 展示完整的解题步骤
4. 每一步都要有清晰的解释
5. 最后给出明确的答案
6. 如果使用了参考资料，用 [来源X] 标注

请按以下格式回答：
【分析】...
【解题步骤】...
【答案】..."""

        answer = await self._call_llm(prompt)
        
        return {
            "answer": answer,
            "type": "solve",
            "has_steps": True
        }
    
    async def _analyze(self, state: AgentState) -> Dict[str, Any]:
        """分析任务"""
        
        context = state.get("context", "")
        query = state.get("query", "")
        intent_params = state.get("intent_params", {})
        
        prompt = f"""你是一位教育专家，请分析以下内容。

参考资料：
{context if context else "（无参考资料）"}

用户需求：{query}
具体参数：{intent_params}

分析要求：
1. 全面理解用户需求
2. 结合参考资料进行分析
3. 给出有价值的见解
4. 如果使用了参考资料，用 [来源X] 标注"""

        answer = await self._call_llm(prompt)
        
        return {
            "answer": answer,
            "type": "analyze"
        }
    
    async def _prove(self, state: AgentState) -> Dict[str, Any]:
        """证明任务"""
        
        context = state.get("context", "")
        query = state.get("query", "")
        
        prompt = f"""你是一位数学专家，请完成以下证明。

参考资料：
{context if context else "（无参考资料）"}

证明题目：{query}

证明要求：
1. 明确证明目标
2. 列出已知条件
3. 选择合适的证明方法
4. 逐步推导，每步都要有依据
5. 最后总结证明完成"""

        answer = await self._call_llm(prompt)
        
        return {
            "answer": answer,
            "type": "prove"
        }
    
    async def _general_reasoning(self, state: AgentState) -> Dict[str, Any]:
        """通用推理"""
        
        context = state.get("context", "")
        query = state.get("query", "")
        
        prompt = f"""请根据以下信息进行推理分析。

参考资料：
{context if context else "（无参考资料）"}

问题：{query}

请给出详细的分析和结论。如果使用了参考资料，用 [来源X] 标注。"""

        answer = await self._call_llm(prompt)
        
        return {
            "answer": answer,
            "type": "general"
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
                    "temperature": 0.3,
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
            if task.get("agent") == "reasoning" and task.get("status") == "pending":
                return task.get("action", "general")
        return "general"
    
    def _update_task_status(self, state: AgentState, status: str) -> None:
        """更新任务状态"""
        task_plan = state.get("task_plan", [])
        for task in task_plan:
            if task.get("agent") == "reasoning" and task.get("status") == "pending":
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
_reasoning_agent: ReasoningAgent = None


def get_reasoning_agent() -> ReasoningAgent:
    """获取推理专家单例"""
    global _reasoning_agent
    if _reasoning_agent is None:
        _reasoning_agent = ReasoningAgent()
    return _reasoning_agent


async def reasoning_agent_node(state: AgentState) -> AgentState:
    """推理专家节点函数"""
    agent = get_reasoning_agent()
    return await agent.run(state)

