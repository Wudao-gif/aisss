"""
检索专家智能体
职责：
1. 根据任务类型确定检索策略
2. 选择性获取 Letta 记忆（画像/理解/轨迹）
3. 执行向量检索（DashVector）
4. 执行图谱检索（Neo4j）
5. 融合检索结果
"""

import logging
from typing import Dict, Any, List

from config import settings
from .state import AgentState, MemoryType, EvidenceSource
from .letta_client import get_letta_client
from .retrieval import get_retriever

logger = logging.getLogger(__name__)


class RetrievalAgent:
    """检索专家智能体"""
    
    def __init__(self):
        self.letta_client = get_letta_client()
        self.retriever = get_retriever()
    
    async def run(self, state: AgentState) -> AgentState:
        """
        执行检索任务
        
        流程：
        1. 获取所需记忆
        2. 确定检索策略
        3. 执行向量检索
        4. 执行图谱检索
        5. 融合结果
        """
        logger.info(f"检索专家开始: intent={state.get('intent_type')}")
        state["current_node"] = "retrieval_agent"
        
        try:
            # 1. 获取所需记忆
            await self._fetch_required_memories(state)
            
            # 2. 确定检索策略
            strategy = self._determine_strategy(state)
            state["retrieval_strategy"] = strategy
            logger.info(f"检索策略: {strategy}")
            
            # 3. 执行向量检索
            vector_results = self.retriever.vector_search(
                state["query"],
                state["book_id"],
                top_k=self._get_top_k(strategy)
            )
            state["vector_results"] = vector_results
            logger.info(f"向量检索: {len(vector_results)} 条结果")
            
            # 4. 执行图谱检索
            graph_results = await self.retriever.graph_search(
                state["query"],
                state["book_id"]
            )
            state["graph_results"] = graph_results
            logger.info(f"图谱检索: {len(graph_results)} 条结果")
            
            # 5. 融合结果
            context, sources = self.retriever.fuse_results(vector_results, graph_results)
            state["context"] = context
            state["sources"] = sources
            
            # 6. 评估检索质量
            has_sufficient = self.retriever.evaluate_context_quality(
                state["query"],
                context,
                sources
            )
            state["has_sufficient_context"] = has_sufficient
            
            if has_sufficient:
                state["evidence_source"] = EvidenceSource.TEXTBOOK.value
            else:
                # 检索不足，触发网络搜索
                logger.info("教材检索不足，触发网络搜索")
                web_results, relation = await self.retriever.web_search(
                    state["query"],
                    state.get("book_subject", "")
                )
                if web_results:
                    state["evidence_source"] = EvidenceSource.WEB.value
                    # 将网络结果添加到上下文
                    web_context = "\n\n【网络搜索结果】\n"
                    for i, wr in enumerate(web_results[:3], 1):
                        web_context += f"[网络来源{i}] {wr.get('title', '')}\n{wr.get('snippet', '')}\n\n"
                    state["context"] += web_context
                else:
                    state["evidence_source"] = EvidenceSource.NONE.value
            
            # 7. 构建检索输出
            state["retrieval_output"] = {
                "context": state["context"],
                "sources": state["sources"],
                "has_sufficient": has_sufficient,
                "evidence_source": state["evidence_source"],
                "memory_used": state.get("required_memories", [])
            }
            
            # 8. 更新任务计划状态
            self._update_task_status(state, "done")
            
            # 9. 设置下一个节点
            state["next_node"] = self._get_next_agent(state)
            
            logger.info(f"检索专家完成，下一节点: {state['next_node']}")
            
        except Exception as e:
            logger.error(f"检索专家失败: {e}")
            state["error"] = str(e)
            state["retrieval_output"] = {"error": str(e)}
            self._update_task_status(state, "failed")
            state["next_node"] = "supervisor_exit"
        
        return state
    
    async def _fetch_required_memories(self, state: AgentState) -> None:
        """获取所需的记忆"""
        required = state.get("required_memories", [])
        
        if not required:
            logger.info("不需要获取记忆")
            return
        
        try:
            memory = await self.letta_client.get_memory_blocks()
            
            if MemoryType.PROFILE.value in required:
                state["user_profile"] = self.letta_client.parse_user_profile(
                    memory.get("user_profile")
                )
                logger.info("已获取用户画像")
            
            if MemoryType.UNDERSTANDING.value in required:
                state["user_understanding"] = memory.get("user_understanding")
                logger.info("已获取知识理解")
            
            if MemoryType.LEARNING.value in required:
                state["user_learning"] = memory.get("user_learning")
                logger.info("已获取学习轨迹")
                
        except Exception as e:
            logger.warning(f"获取记忆失败: {e}")
    
    def _determine_strategy(self, state: AgentState) -> str:
        """根据意图确定检索策略"""
        intent_type = state.get("intent_type", "")
        intent_params = state.get("intent_params", {})
        
        # 根据意图类型返回策略
        strategies = {
            "review_summary": "comprehensive",  # 全面检索
            "homework_help": "precise",         # 精确检索
            "concept_explain": "concept",       # 概念检索
            "learning_plan": "structure",       # 结构检索
            "question_answer": "quick",         # 快速检索
            "exercise_practice": "exercise",    # 练习检索
        }
        
        return strategies.get(intent_type, "quick")
    
    def _get_top_k(self, strategy: str) -> int:
        """根据策略确定检索数量"""
        top_k_map = {
            "comprehensive": 10,
            "precise": 5,
            "concept": 5,
            "structure": 8,
            "quick": 3,
            "exercise": 5,
        }
        return top_k_map.get(strategy, 5)
    
    def _update_task_status(self, state: AgentState, status: str) -> None:
        """更新任务计划中的状态"""
        task_plan = state.get("task_plan", [])
        for task in task_plan:
            if task.get("agent") == "retrieval":
                task["status"] = status
                break
    
    def _get_next_agent(self, state: AgentState) -> str:
        """根据任务计划确定下一个智能体"""
        task_plan = state.get("task_plan", [])
        current_step = state.get("current_step", 0)
        
        # 找到下一个待执行的任务
        for i, task in enumerate(task_plan):
            if task.get("status") == "pending" and i > current_step:
                agent = task.get("agent", "")
                state["current_step"] = i
                return f"{agent}_agent"
        
        # 没有更多任务，进入出口
        return "supervisor_exit"


# 全局实例
_retrieval_agent: RetrievalAgent = None


def get_retrieval_agent() -> RetrievalAgent:
    """获取检索专家单例"""
    global _retrieval_agent
    if _retrieval_agent is None:
        _retrieval_agent = RetrievalAgent()
    return _retrieval_agent


async def retrieval_agent_node(state: AgentState) -> AgentState:
    """检索专家节点函数"""
    agent = get_retrieval_agent()
    return await agent.run(state)

