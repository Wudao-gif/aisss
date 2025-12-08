"""
LangGraph 多智能体系统
实现 Supervisor + 专业智能体的协作架构

新架构：
- Supervisor：意图澄清 + 任务规划 + 输出存储
- 检索专家：记忆获取 + 向量检索 + 图谱检索
- 推理专家：数学/逻辑推理
- 生成专家：表格/导图/计划生成
- 表达专家：专业/通俗表达调整
- 质量检查：验证回答质量
"""

from .state import AgentState, create_initial_state, IntentType, MemoryType, TaskType, EvidenceSource
from .graph import create_graph, compile_graph, run_graph, run_graph_stream
from .supervisor import SupervisorAgent, get_supervisor
from .letta_client import LettaClient, get_letta_client
from .retrieval import HybridRetriever, get_retriever
from .retrieval_agent import RetrievalAgent, get_retrieval_agent
from .reasoning_agent import ReasoningAgent, get_reasoning_agent
from .generation_agent import GenerationAgent, get_generation_agent
from .expression_agent import ExpressionAgent, get_expression_agent
from .quality_agent import QualityAgent, get_quality_agent

__all__ = [
    # State
    "AgentState",
    "create_initial_state",
    "IntentType",
    "MemoryType",
    "TaskType",
    "EvidenceSource",
    # Graph
    "create_graph",
    "compile_graph",
    "run_graph",
    "run_graph_stream",
    # Supervisor
    "SupervisorAgent",
    "get_supervisor",
    # Letta
    "LettaClient",
    "get_letta_client",
    # Retrieval
    "HybridRetriever",
    "get_retriever",
    # Agents
    "RetrievalAgent",
    "get_retrieval_agent",
    "ReasoningAgent",
    "get_reasoning_agent",
    "GenerationAgent",
    "get_generation_agent",
    "ExpressionAgent",
    "get_expression_agent",
    "QualityAgent",
    "get_quality_agent",
]

