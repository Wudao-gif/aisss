"""
LangGraph 多智能体系统

架构演进：
- 旧架构：Supervisor + 专业智能体（graph.py）
- 新架构：Deep Agent 主系统 + 子代理（deep_agent.py）

Deep Agent 配置项：
- model: 主 LLM 模型
- tools: 自定义工具（检索、记忆等）
- system_prompt: 系统提示词
- subagents: 子代理列表
- checkpointer: 短期记忆持久化
- store: 长期记忆持久化
"""

# ==================== Deep Agent（新主系统） ====================
from .deep_agent import (
    get_deep_agent,
    run_deep_agent,
    run_deep_agent_stream,
    set_deep_agent_checkpointer,
    set_deep_agent_store,
)

# ==================== 旧架构（保留兼容） ====================
from .state import AgentState, create_initial_state, IntentType, MemoryType, TaskType, EvidenceSource
from .graph import (
    create_graph, compile_graph, run_graph, run_graph_stream,
    set_checkpointer, get_checkpointer,
    set_store, get_store,
    get_compiled_graph
)
from .supervisor import SupervisorAgent, get_supervisor

# ==================== 工具（统一管理） ====================
from .tools import (
    retrieve_from_textbook,
    search_knowledge_graph,
    retrieval_tools,
    memory_read,
    memory_write,
    memory_tools,
    ALL_TOOLS,
)
from .retrieval_agent import RetrievalAgent, get_retrieval_agent
from .reasoning_agent import ReasoningAgent, get_reasoning_agent
from .generation_agent import GenerationAgent, get_generation_agent
from .expression_agent import ExpressionAgent, get_expression_agent
from .quality_agent import QualityAgent, get_quality_agent

__all__ = [
    # ==================== Deep Agent（新主系统） ====================
    "get_deep_agent",
    "run_deep_agent",
    "run_deep_agent_stream",
    "set_deep_agent_checkpointer",
    "set_deep_agent_store",

    # ==================== 旧架构（保留兼容） ====================
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
    "set_checkpointer",
    "get_checkpointer",
    "set_store",
    "get_store",
    "get_compiled_graph",
    # Supervisor
    "SupervisorAgent",
    "get_supervisor",
    # 工具（统一管理）
    "retrieve_from_textbook",
    "search_knowledge_graph",
    "retrieval_tools",
    "memory_read",
    "memory_write",
    "memory_tools",
    "ALL_TOOLS",
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

