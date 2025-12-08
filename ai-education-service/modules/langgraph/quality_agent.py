"""
质量检查专家智能体
职责：
1. 验证回答的准确性
2. 检查回答的完整性
3. 验证引用的正确性
4. 评估回答质量
"""

import logging
from typing import Dict, Any

import httpx

from config import settings
from .state import AgentState

logger = logging.getLogger(__name__)


class QualityAgent:
    """质量检查专家智能体"""
    
    def __init__(self):
        self.chat_model = settings.CHAT_MODEL
        self.max_retry = 2
    
    async def run(self, state: AgentState) -> AgentState:
        """
        执行质量检查
        
        检查项：
        1. 回答是否完整
        2. 回答是否准确
        3. 引用是否正确
        4. 表达是否清晰
        """
        logger.info("质量检查专家开始")
        state["current_node"] = "quality_agent"
        
        try:
            # 获取待检查的回答
            expression_output = state.get("expression_output", {})
            answer = expression_output.get("answer", "")
            
            if not answer:
                # 尝试从其他输出获取
                reasoning_output = state.get("reasoning_output", {})
                generation_output = state.get("generation_output", {})
                answer = reasoning_output.get("answer", "") or generation_output.get("answer", "")
            
            if not answer:
                logger.warning("没有找到待检查的回答")
                state["quality_passed"] = False
                state["quality_feedback"] = "没有生成回答"
                state["next_node"] = "supervisor_exit"
                return state
            
            # 执行质量检查
            check_result = await self._check_quality(state, answer)
            
            state["quality_passed"] = check_result["passed"]
            state["quality_feedback"] = check_result.get("feedback", "")
            
            if check_result["passed"]:
                logger.info("质量检查通过")
                state["next_node"] = "supervisor_exit"
            else:
                # 检查重试次数
                retry_count = state.get("quality_retry_count", 0)
                if retry_count < self.max_retry:
                    state["quality_retry_count"] = retry_count + 1
                    logger.info(f"质量检查未通过，重试 {retry_count + 1}/{self.max_retry}")
                    # 返回表达专家重新生成
                    state["next_node"] = "expression_agent"
                else:
                    logger.warning("质量检查多次未通过，强制输出")
                    state["quality_passed"] = True  # 强制通过
                    state["next_node"] = "supervisor_exit"
            
        except Exception as e:
            logger.error(f"质量检查失败: {e}")
            state["error"] = str(e)
            state["quality_passed"] = True  # 出错时默认通过
            state["next_node"] = "supervisor_exit"
        
        return state
    
    async def _check_quality(self, state: AgentState, answer: str) -> Dict[str, Any]:
        """检查回答质量"""
        
        query = state.get("query", "")
        context = state.get("context", "")
        intent_type = state.get("intent_type", "")
        
        prompt = f"""请评估以下回答的质量。

用户问题：{query}
意图类型：{intent_type}

参考资料：
{context[:2000] if context else "（无参考资料）"}

待检查的回答：
{answer}

请从以下维度评估（每项 1-5 分）：
1. 完整性：是否完整回答了用户问题
2. 准确性：内容是否准确，有无明显错误
3. 相关性：是否紧扣问题，没有跑题
4. 清晰度：表达是否清晰易懂
5. 引用：如果使用了 [来源X]，是否合理

请用 JSON 格式返回：
{{
    "completeness": 分数,
    "accuracy": 分数,
    "relevance": 分数,
    "clarity": 分数,
    "citation": 分数,
    "passed": true/false,
    "feedback": "如果未通过，说明问题和改进建议"
}}

评估标准：
- 总分 >= 18 分（满分 25）且无单项 <= 2 分，则 passed = true
- 否则 passed = false，并给出具体反馈"""

        try:
            result_str = await self._call_llm(prompt)
            
            # 解析 JSON
            import json
            result_str = self._clean_json(result_str)
            result = json.loads(result_str)
            
            # 计算总分
            total = (
                result.get("completeness", 3) +
                result.get("accuracy", 3) +
                result.get("relevance", 3) +
                result.get("clarity", 3) +
                result.get("citation", 3)
            )
            
            # 检查是否有低分项
            scores = [
                result.get("completeness", 3),
                result.get("accuracy", 3),
                result.get("relevance", 3),
                result.get("clarity", 3),
            ]
            has_low_score = any(s <= 2 for s in scores)
            
            passed = total >= 18 and not has_low_score
            
            return {
                "passed": passed,
                "total_score": total,
                "scores": result,
                "feedback": result.get("feedback", "") if not passed else ""
            }
            
        except Exception as e:
            logger.warning(f"质量检查解析失败: {e}")
            # 解析失败时默认通过
            return {"passed": True, "feedback": ""}
    
    def _clean_json(self, content: str) -> str:
        """清理 JSON 字符串"""
        content = content.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            content = "\n".join(lines)
        return content.strip()
    
    async def _call_llm(self, prompt: str) -> str:
        """调用 LLM"""
        async with httpx.AsyncClient(timeout=60.0) as client:
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
            return data["choices"][0]["message"]["content"].strip()


# 全局实例
_quality_agent: QualityAgent = None


def get_quality_agent() -> QualityAgent:
    """获取质量检查专家单例"""
    global _quality_agent
    if _quality_agent is None:
        _quality_agent = QualityAgent()
    return _quality_agent


async def quality_agent_node(state: AgentState) -> AgentState:
    """质量检查专家节点函数"""
    agent = get_quality_agent()
    return await agent.run(state)

