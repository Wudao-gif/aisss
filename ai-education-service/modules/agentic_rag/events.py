"""
Agentic RAG 事件定义
定义工作流中的所有事件类型
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Optional

from llama_index.core.workflow import Event


class QueryType(str, Enum):
    """查询类型"""
    SIMPLE = "simple"           # 简单问题，直接检索回答
    COMPLEX = "complex"         # 复杂问题，需要规划分解
    CLARIFY = "clarify"         # 需要澄清
    CHITCHAT = "chitchat"       # 闲聊，无需检索


class ReflectDecision(str, Enum):
    """反思决策"""
    SUFFICIENT = "sufficient"   # 信息充足，可以回答
    RETRY = "retry"             # 需要重试
    REPLAN = "replan"           # 需要重新规划
    GIVE_UP = "give_up"         # 放弃，直接回答


@dataclass
class RouteDecisionEvent(Event):
    """路由决策事件 - 决定问题处理策略"""
    query: str
    query_type: QueryType
    reasoning: str                              # 路由推理过程
    rewritten_query: Optional[str] = None       # 改写后的查询
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None
    filter_expr: Optional[str] = None


@dataclass
class SubTask:
    """子任务"""
    id: str
    description: str
    tool: str                                   # 使用的工具名
    tool_args: Dict[str, Any] = field(default_factory=dict)
    depends_on: List[str] = field(default_factory=list)  # 依赖的子任务ID
    status: str = "pending"                     # pending, running, done, failed
    result: Optional[Any] = None


@dataclass
class PlanEvent(Event):
    """规划事件 - 复杂问题分解为子任务"""
    query: str
    subtasks: List[SubTask]
    reasoning: str                              # 规划推理过程
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None
    filter_expr: Optional[str] = None
    retry_count: int = 0


@dataclass
class ToolCallEvent(Event):
    """工具调用事件"""
    query: str
    tool_name: str
    tool_args: Dict[str, Any]
    subtask_id: Optional[str] = None            # 关联的子任务ID
    plan: Optional[PlanEvent] = None            # 完整计划（用于追踪）
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None


@dataclass
class ToolResultEvent(Event):
    """工具执行结果事件"""
    query: str
    tool_name: str
    tool_args: Dict[str, Any]
    result: Any
    success: bool
    error: Optional[str] = None
    subtask_id: Optional[str] = None
    plan: Optional[PlanEvent] = None
    all_results: List[Dict[str, Any]] = field(default_factory=list)  # 所有已完成的结果
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None


@dataclass
class ReflectEvent(Event):
    """反思事件 - 评估当前结果质量"""
    query: str
    results: List[Dict[str, Any]]               # 所有工具执行结果
    decision: ReflectDecision
    reasoning: str                              # 反思推理过程
    suggestions: Optional[str] = None           # 改进建议
    plan: Optional[PlanEvent] = None
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None
    retry_count: int = 0


@dataclass
class RetryEvent(Event):
    """重试事件"""
    query: str
    reason: str
    previous_results: List[Dict[str, Any]]
    suggestions: str
    retry_count: int
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None
    filter_expr: Optional[str] = None


@dataclass
class SynthesizeEvent(Event):
    """合成事件 - 准备生成最终答案"""
    query: str
    results: List[Dict[str, Any]]
    context: str                                # 构建好的上下文
    sources: List[Dict[str, Any]]               # 来源信息
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None

