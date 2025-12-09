"""
Supervisor 智能体
职责：
- 入口：接收问题 → 意图澄清 → 分析分配
- 出口：输出回答 → 存储记忆
"""

import logging
import json
import re
from typing import Dict, Any, List, Optional

import httpx

from config import settings
from .state import AgentState, IntentType, TaskType, MemoryType, EvidenceSource
from .message_utils import get_recent_context, trim_conversation_history
from .memory_store import get_memory_manager

logger = logging.getLogger(__name__)


# 意图类型与所需记忆的映射
INTENT_MEMORY_MAP = {
    IntentType.REVIEW_SUMMARY.value: [MemoryType.LEARNING.value, MemoryType.UNDERSTANDING.value],
    IntentType.HOMEWORK_HELP.value: [MemoryType.UNDERSTANDING.value],
    IntentType.CONCEPT_EXPLAIN.value: [MemoryType.UNDERSTANDING.value],
    IntentType.LEARNING_PLAN.value: [MemoryType.PROFILE.value, MemoryType.LEARNING.value],
    IntentType.QUESTION_ANSWER.value: [],  # 简单问答不需要记忆
    IntentType.EXERCISE_PRACTICE.value: [MemoryType.UNDERSTANDING.value],
}


class SupervisorAgent:
    """Supervisor 智能体"""

    def __init__(self):
        self.chat_model = settings.CHAT_MODEL

    # ==================== 入口阶段 ====================

    async def intent_clarify_node(self, state: AgentState) -> AgentState:
        """
        意图澄清节点
        1. 分析用户意图是否明确
        2. 如果不明确，生成澄清选项
        3. 如果明确，确定意图类型和参数
        """
        logger.info(f"Supervisor 意图澄清: query={state['query'][:50]}...")
        state["current_node"] = "intent_clarify"

        try:
            # 检查是否有澄清回复（第二轮对话）
            if state.get("clarification_response"):
                # 用户已回复澄清，解析意图
                intent_result = await self._parse_clarification(state)
                state["intent_clear"] = True
                state["intent_type"] = intent_result["intent_type"]
                state["intent_params"] = intent_result["params"]
                state["clarification_needed"] = False
                state["next_node"] = "task_plan"
                logger.info(f"意图已确认: {state['intent_type']}, params={state['intent_params']}")
            else:
                # 第一轮对话，分析意图
                intent_result = await self._analyze_intent(state)

                if intent_result["is_clear"]:
                    # 意图明确，直接进入任务规划
                    state["intent_clear"] = True
                    state["intent_type"] = intent_result["intent_type"]
                    state["intent_params"] = intent_result.get("params", {})
                    state["clarification_needed"] = False
                    state["next_node"] = "task_plan"
                    logger.info(f"意图明确: {state['intent_type']}")
                else:
                    # 意图不明确，需要澄清
                    state["intent_clear"] = False
                    state["intent_type"] = intent_result["intent_type"]
                    state["clarification_needed"] = True
                    state["clarification_options"] = intent_result["clarification_options"]
                    state["next_node"] = "return_clarification"
                    logger.info(f"需要澄清，选项数: {len(state['clarification_options'])}")

        except Exception as e:
            logger.error(f"意图澄清失败: {e}")
            # 降级处理：假设是简单问答
            state["intent_clear"] = True
            state["intent_type"] = IntentType.QUESTION_ANSWER.value
            state["intent_params"] = {}
            state["next_node"] = "task_plan"
            state["error"] = str(e)

        return state

    async def _analyze_intent(self, state: AgentState) -> Dict[str, Any]:
        """分析用户意图"""

        # 获取长期记忆（跨会话）
        user_id = state.get("user_id", "anonymous")
        book_id = state.get("book_id", "default")
        query = state.get("query", "")

        long_term_memory = ""
        memory_manager = get_memory_manager()
        if memory_manager:
            try:
                context = await memory_manager.get_user_context(
                    user_id=user_id,
                    book_id=book_id,
                    query=query
                )
                long_term_memory = memory_manager.format_context_for_prompt(context)
            except Exception as e:
                logger.warning(f"获取长期记忆失败: {e}")

        # 获取对话摘要（会话内压缩）
        summary = state.get("summary", "")

        # 获取最近对话历史（短期上下文）
        messages = state.get("messages", [])
        recent_context = get_recent_context(messages, n_turns=3) if messages else ""

        # 构建历史上下文部分
        history_section = ""
        if long_term_memory:
            history_section += f"""
用户长期记忆：
{long_term_memory}
"""
        if summary:
            history_section += f"""
对话摘要（本次会话要点）：
{summary}
"""
        if recent_context:
            history_section += f"""
最近对话历史：
{recent_context}
"""

        prompt = f"""分析用户的问题，判断意图是否明确。
{history_section}
当前问题：{query}
教材：{state.get('book_name', '未知')}

意图类型：
- review_summary: 复习总结（需要明确：范围、类型）
- homework_help: 作业辅导（需要明确：具体题目）
- concept_explain: 概念解释（通常明确）
- learning_plan: 学习规划（需要明确：目标、时间）
- question_answer: 简单问答（通常明确）
- exercise_practice: 练习题（需要明确：范围、难度）

判断规则：
1. 如果问题具体明确（如"什么是邓小平理论"），标记为明确
2. 如果问题模糊（如"复习总结"、"帮我学习"），需要澄清
3. 需要澄清时，生成结构化选项让用户选择

返回 JSON：
{{
    "is_clear": true/false,
    "intent_type": "意图类型",
    "params": {{}},  // 如果明确，填写参数
    "clarification_options": [  // 如果不明确，填写选项
        {{
            "key": "scope",
            "label": "范围",
            "type": "select",  // select 或 input
            "options": ["全书", "第一章", "第二章", ...]
        }}
    ]
}}

只返回 JSON。"""

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
                        "temperature": 0.1,
                        "max_tokens": 500,
                    }
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()

                # 清理 markdown
                content = self._clean_json(content)
                result = json.loads(content)
                return result

        except Exception as e:
            logger.error(f"意图分析失败: {e}")
            # 默认为简单问答
            return {
                "is_clear": True,
                "intent_type": IntentType.QUESTION_ANSWER.value,
                "params": {}
            }

    async def _parse_clarification(self, state: AgentState) -> Dict[str, Any]:
        """解析用户的澄清回复"""

        clarification = state.get("clarification_response", {})
        intent_type = state.get("intent_type", IntentType.QUESTION_ANSWER.value)

        return {
            "intent_type": intent_type,
            "params": clarification
        }

    async def task_plan_node(self, state: AgentState) -> AgentState:
        """
        任务规划节点
        1. 根据意图类型确定需要的记忆
        2. 制定执行计划
        3. 分配给子智能体
        """
        logger.info(f"Supervisor 任务规划: intent={state['intent_type']}")
        state["current_node"] = "task_plan"

        try:
            # 1. 确定需要获取的记忆类型
            intent_type = state.get("intent_type", IntentType.QUESTION_ANSWER.value)
            required_memories = INTENT_MEMORY_MAP.get(intent_type, [])
            state["required_memories"] = required_memories
            logger.info(f"需要的记忆: {required_memories}")

            # 2. 制定执行计划
            task_plan = await self._create_task_plan(state)
            state["task_plan"] = task_plan
            state["current_step"] = 0

            # 3. 设置下一个节点（检索专家）
            state["next_node"] = "retrieval_agent"

            logger.info(f"任务计划: {len(task_plan)} 步")

        except Exception as e:
            logger.error(f"任务规划失败: {e}")
            state["error"] = str(e)
            # 降级：直接进入检索
            state["required_memories"] = []
            state["task_plan"] = [{"step_id": 1, "agent": "retrieval", "action": "search", "status": "pending"}]
            state["next_node"] = "retrieval_agent"

        return state

    async def _create_task_plan(self, state: AgentState) -> List[Dict[str, Any]]:
        """根据意图创建执行计划"""

        intent_type = state.get("intent_type", "")
        intent_params = state.get("intent_params", {})

        # 基础计划：所有任务都需要检索
        plan = [
            {"step_id": 1, "agent": "retrieval", "action": "search", "status": "pending", "result": None}
        ]

        # 根据意图类型添加步骤
        if intent_type == IntentType.REVIEW_SUMMARY.value:
            plan.extend([
                {"step_id": 2, "agent": "expression", "action": "summarize", "status": "pending", "result": None},
                {"step_id": 3, "agent": "generation", "action": "create_outline", "status": "pending", "result": None},
            ])
        elif intent_type == IntentType.HOMEWORK_HELP.value:
            plan.extend([
                {"step_id": 2, "agent": "reasoning", "action": "solve", "status": "pending", "result": None},
                {"step_id": 3, "agent": "expression", "action": "explain", "status": "pending", "result": None},
            ])
        elif intent_type == IntentType.CONCEPT_EXPLAIN.value:
            plan.extend([
                {"step_id": 2, "agent": "expression", "action": "explain", "status": "pending", "result": None},
            ])
        elif intent_type == IntentType.LEARNING_PLAN.value:
            plan.extend([
                {"step_id": 2, "agent": "reasoning", "action": "analyze", "status": "pending", "result": None},
                {"step_id": 3, "agent": "generation", "action": "create_plan", "status": "pending", "result": None},
            ])
        elif intent_type == IntentType.EXERCISE_PRACTICE.value:
            plan.extend([
                {"step_id": 2, "agent": "generation", "action": "create_exercises", "status": "pending", "result": None},
            ])
        else:
            # 简单问答
            plan.extend([
                {"step_id": 2, "agent": "expression", "action": "answer", "status": "pending", "result": None},
            ])

        # 所有任务最后都需要质量检查
        plan.append({"step_id": len(plan) + 1, "agent": "quality", "action": "check", "status": "pending", "result": None})

        return plan

    def _clean_json(self, content: str) -> str:
        """清理 LLM 返回的 JSON 字符串"""
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            # 移除第一行和最后一行
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            content = "\n".join(lines)
        return content.strip()

    # ==================== 出口阶段 ====================

    async def exit_node(self, state: AgentState) -> AgentState:
        """
        Supervisor 出口节点
        1. 整合各智能体的输出
        2. 提取引用信息
        3. 更新 Letta 记忆
        """
        logger.info("Supervisor 出口: 开始整合回答")
        state["current_node"] = "supervisor_exit"

        try:
            # 从表达专家获取最终回答
            expression_output = state.get("expression_output", {})
            final_answer = expression_output.get("answer", "")

            # 如果表达专家没有输出，尝试从其他智能体获取
            if not final_answer:
                reasoning_output = state.get("reasoning_output", {})
                final_answer = reasoning_output.get("answer", "")

            if not final_answer:
                retrieval_output = state.get("retrieval_output", {})
                final_answer = retrieval_output.get("answer", "抱歉，处理您的问题时出现了错误。")

            state["final_answer"] = final_answer

            # 提取引用信息
            state["citations"] = self._extract_citations(
                final_answer,
                state.get("sources", [])
            )

            # 添加附件（如果有）
            generation_output = state.get("generation_output", {})
            if generation_output.get("attachments"):
                state["attachments"] = generation_output["attachments"]

            # 添加来源标注（如果是网络搜索）
            if state.get("evidence_source") == EvidenceSource.WEB.value:
                state["final_answer"] += "\n\n📌 *此回答部分内容来源于网络搜索*"

            # 将 AI 回复添加到 messages（短期记忆）
            from langchain_core.messages import AIMessage
            state["messages"] = [AIMessage(content=state["final_answer"])]

            # 更新长期记忆（使用 LangGraph Store）
            await self._update_long_term_memory(state)

            logger.info("Supervisor 出口处理完成")

        except Exception as e:
            logger.error(f"Supervisor 出口处理失败: {e}")
            state["final_answer"] = "处理失败，请重试。"
            state["error"] = str(e)

        return state

    def _extract_citations(
        self,
        answer: str,
        sources: list
    ) -> list:
        """从回答中提取引用信息"""
        import re

        citations = []
        citation_pattern = r'\[来源(\d+)\]'
        matches = re.findall(citation_pattern, answer)

        seen_ids = set()
        for match in matches:
            citation_id = int(match)
            if citation_id not in seen_ids and citation_id <= len(sources):
                seen_ids.add(citation_id)
                source = sources[citation_id - 1]
                citations.append({
                    "citation_id": citation_id,
                    "text_preview": source.get("text", "")[:200] + "...",
                    "score": source.get("score", 0),
                    "metadata": source.get("metadata", {})
                })

        return citations

    async def _update_long_term_memory(self, state: AgentState) -> None:
        """
        更新长期记忆
        从对话中提取用户信息并存储到 LangGraph Store
        """
        memory_manager = get_memory_manager()
        if not memory_manager:
            logger.debug("MemoryManager 未初始化，跳过长期记忆更新")
            return

        user_id = state.get("user_id", "anonymous")
        book_id = state.get("book_id", "default")
        query = state.get("query", "")
        answer = state.get("final_answer", "")

        try:
            # 使用 LLM 提取需要记住的信息
            facts = await self._extract_facts_from_conversation(query, answer)

            # 存储提取的事实
            for fact in facts:
                await memory_manager.store_user_fact(
                    user_id=user_id,
                    fact_type=fact.get("type", "general"),
                    fact_value=fact.get("value", ""),
                    source="conversation"
                )

            # 记录学习事件
            intent = state.get("intent", "")
            if intent in ["concept_explain", "homework_help", "exercise_practice"]:
                await memory_manager.log_learning_event(
                    user_id=user_id,
                    book_id=book_id,
                    event_type="question",
                    content=query,
                    result=answer[:200]  # 只保存前200字符
                )

            logger.debug(f"长期记忆更新完成: user={user_id}, facts={len(facts)}")

        except Exception as e:
            logger.warning(f"更新长期记忆失败: {e}")

    async def _extract_facts_from_conversation(
        self,
        query: str,
        answer: str
    ) -> list:
        """
        从对话中提取需要记住的用户信息
        返回: [{"type": "name", "value": "小明"}, ...]
        """
        # 简单的关键词匹配（可以后续用 LLM 增强）
        facts = []

        # 检测用户自我介绍
        name_patterns = [
            r"我叫(.{1,10})",
            r"我是(.{1,10})",
            r"我的名字是(.{1,10})",
        ]

        for pattern in name_patterns:
            match = re.search(pattern, query)
            if match:
                name = match.group(1).strip()
                # 过滤掉太长或包含标点的
                if len(name) <= 6 and not re.search(r'[，。！？、]', name):
                    facts.append({"type": "name", "value": name})
                    break

        # 检测年级信息
        grade_patterns = [
            r"我(是|在读)?(.{1,3}年级)",
            r"我(是|在读)?(.{1,3}年)",
        ]

        for pattern in grade_patterns:
            match = re.search(pattern, query)
            if match:
                grade = match.group(2).strip()
                facts.append({"type": "grade", "value": grade})
                break

        # 检测学习偏好
        if "喜欢" in query or "偏好" in query:
            preference_match = re.search(r"喜欢(.{2,20})", query)
            if preference_match:
                facts.append({
                    "type": "preference",
                    "value": preference_match.group(1).strip()
                })

        return facts


# 全局 Supervisor 实例
_supervisor: SupervisorAgent = None


def get_supervisor() -> SupervisorAgent:
    """获取 Supervisor 单例"""
    global _supervisor
    if _supervisor is None:
        _supervisor = SupervisorAgent()
    return _supervisor

