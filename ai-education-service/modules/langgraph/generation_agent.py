"""
生成专家智能体
职责：
1. 生成思维导图
2. 生成表格
3. 生成学习计划
4. 生成练习题
"""

import logging
from typing import Dict, Any

import httpx

from config import settings
from .state import AgentState

logger = logging.getLogger(__name__)


class GenerationAgent:
    """生成专家智能体"""
    
    def __init__(self):
        self.chat_model = settings.CHAT_MODEL
    
    async def run(self, state: AgentState) -> AgentState:
        """
        执行生成任务
        
        支持的动作：
        - create_outline: 生成大纲/导图
        - create_table: 生成表格
        - create_plan: 生成学习计划
        - create_exercises: 生成练习题
        """
        logger.info(f"生成专家开始: action={self._get_current_action(state)}")
        state["current_node"] = "generation_agent"
        
        try:
            action = self._get_current_action(state)
            
            if action == "create_outline":
                result = await self._create_outline(state)
            elif action == "create_table":
                result = await self._create_table(state)
            elif action == "create_plan":
                result = await self._create_plan(state)
            elif action == "create_exercises":
                result = await self._create_exercises(state)
            else:
                result = await self._general_generate(state)
            
            state["generation_output"] = result
            self._update_task_status(state, "done")
            state["next_node"] = self._get_next_agent(state)
            
            logger.info(f"生成专家完成，下一节点: {state['next_node']}")
            
        except Exception as e:
            logger.error(f"生成专家失败: {e}")
            state["error"] = str(e)
            state["generation_output"] = {"error": str(e)}
            self._update_task_status(state, "failed")
            state["next_node"] = "supervisor_exit"
        
        return state
    
    async def _create_outline(self, state: AgentState) -> Dict[str, Any]:
        """生成大纲/思维导图"""
        
        context = state.get("context", "")
        query = state.get("query", "")
        intent_params = state.get("intent_params", {})
        
        prompt = f"""请根据以下内容生成知识框架大纲。

参考资料：
{context if context else "（无参考资料）"}

用户需求：{query}
范围：{intent_params.get('scope', '全部')}

生成要求：
1. 使用层级结构（一级、二级、三级标题）
2. 突出重点和核心概念
3. 逻辑清晰，层次分明
4. 使用 Markdown 格式

请生成大纲："""

        answer = await self._call_llm(prompt)
        
        return {
            "answer": answer,
            "type": "outline",
            "format": "markdown",
            "attachments": [{
                "type": "outline",
                "content": answer
            }]
        }
    
    async def _create_table(self, state: AgentState) -> Dict[str, Any]:
        """生成表格"""
        
        context = state.get("context", "")
        query = state.get("query", "")
        
        prompt = f"""请根据以下内容生成对比表格。

参考资料：
{context if context else "（无参考资料）"}

用户需求：{query}

生成要求：
1. 使用 Markdown 表格格式
2. 列出关键对比维度
3. 内容简洁明了

请生成表格："""

        answer = await self._call_llm(prompt)
        
        return {
            "answer": answer,
            "type": "table",
            "format": "markdown"
        }
    
    async def _create_plan(self, state: AgentState) -> Dict[str, Any]:
        """生成学习计划"""
        
        context = state.get("context", "")
        query = state.get("query", "")
        user_profile = state.get("user_profile", {})
        user_learning = state.get("user_learning", {})
        intent_params = state.get("intent_params", {})
        
        prompt = f"""请制定个性化学习计划。

参考资料：
{context if context else "（无参考资料）"}

用户需求：{query}
用户画像：{user_profile if user_profile else "未知"}
学习进度：{user_learning if user_learning else "未知"}
目标：{intent_params.get('goal', '未指定')}
时间：{intent_params.get('duration', '未指定')}

计划要求：
1. 分阶段制定（每周/每天）
2. 明确学习目标和任务
3. 包含复习和检测环节
4. 考虑用户实际情况

请生成学习计划："""

        answer = await self._call_llm(prompt)
        
        return {
            "answer": answer,
            "type": "plan",
            "format": "markdown"
        }
    
    async def _create_exercises(self, state: AgentState) -> Dict[str, Any]:
        """生成练习题"""
        
        context = state.get("context", "")
        query = state.get("query", "")
        user_understanding = state.get("user_understanding", {})
        intent_params = state.get("intent_params", {})
        
        prompt = f"""请生成练习题。

参考资料：
{context if context else "（无参考资料）"}

用户需求：{query}
知识掌握情况：{user_understanding if user_understanding else "未知"}
难度：{intent_params.get('difficulty', '中等')}
数量：{intent_params.get('count', '5')}题

生成要求：
1. 题目难度适中
2. 覆盖核心知识点
3. 包含答案和解析
4. 格式清晰

请生成练习题："""

        answer = await self._call_llm(prompt)
        
        return {
            "answer": answer,
            "type": "exercises",
            "format": "markdown"
        }
    
    async def _general_generate(self, state: AgentState) -> Dict[str, Any]:
        """通用生成"""
        
        context = state.get("context", "")
        query = state.get("query", "")
        
        prompt = f"""请根据以下需求生成内容。

参考资料：
{context if context else "（无参考资料）"}

用户需求：{query}

请生成："""

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
            if task.get("agent") == "generation" and task.get("status") == "pending":
                return task.get("action", "general")
        return "general"
    
    def _update_task_status(self, state: AgentState, status: str) -> None:
        """更新任务状态"""
        task_plan = state.get("task_plan", [])
        for task in task_plan:
            if task.get("agent") == "generation" and task.get("status") == "pending":
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
_generation_agent: GenerationAgent = None


def get_generation_agent() -> GenerationAgent:
    """获取生成专家单例"""
    global _generation_agent
    if _generation_agent is None:
        _generation_agent = GenerationAgent()
    return _generation_agent


async def generation_agent_node(state: AgentState) -> AgentState:
    """生成专家节点函数"""
    agent = get_generation_agent()
    return await agent.run(state)

