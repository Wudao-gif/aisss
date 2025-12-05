"""
Agentic RAG 事件定义
定义工作流中的所有事件类型
使用 Pydantic 模型（与 LlamaIndex Event 基类兼容）
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import Field

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


class SubTask:
    """子任务（普通类，不是 Event）"""
    def __init__(
        self,
        id: str,
        description: str,
        tool: str,
        tool_args: Dict[str, Any] = None,
        depends_on: List[str] = None,
        status: str = "pending",
        result: Any = None
    ):
        self.id = id
        self.description = description
        self.tool = tool
        self.tool_args = tool_args or {}
        self.depends_on = depends_on or []
        self.status = status
        self.result = result


class PlanEvent(Event):
    """规划事件 - 复杂问题分解为子任务"""
    query: str
    subtasks: List[Any] = Field(default_factory=list)  # List[SubTask]
    reasoning: str = ""                         # 规划推理过程
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None
    filter_expr: Optional[str] = None
    retry_count: int = 0


class ToolCallEvent(Event):
    """工具调用事件"""
    query: str
    tool_name: str
    tool_args: Dict[str, Any] = Field(default_factory=dict)
    subtask_id: Optional[str] = None            # 关联的子任务ID
    plan: Optional[Any] = None                  # PlanEvent
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None


class ToolResultEvent(Event):
    """工具执行结果事件"""
    query: str
    tool_name: str
    tool_args: Dict[str, Any] = Field(default_factory=dict)
    result: Any = None
    success: bool = True
    error: Optional[str] = None
    subtask_id: Optional[str] = None
    plan: Optional[Any] = None                  # PlanEvent
    all_results: List[Dict[str, Any]] = Field(default_factory=list)
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None


class ReflectEvent(Event):
    """反思事件 - 评估当前结果质量"""
    query: str
    results: List[Dict[str, Any]] = Field(default_factory=list)
    decision: ReflectDecision = ReflectDecision.SUFFICIENT
    reasoning: str = ""                         # 反思推理过程
    suggestions: Optional[str] = None           # 改进建议
    plan: Optional[Any] = None                  # PlanEvent
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None
    retry_count: int = 0


class RetryEvent(Event):
    """重试事件"""
    query: str
    reason: str = ""
    previous_results: List[Dict[str, Any]] = Field(default_factory=list)
    suggestions: str = ""
    retry_count: int = 0
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None
    filter_expr: Optional[str] = None


class SynthesizeEvent(Event):
    """合成事件 - 准备生成最终答案"""
    query: str
    results: List[Dict[str, Any]] = Field(default_factory=list)
    context: str = ""                           # 构建好的上下文
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    book_id: Optional[str] = None


# ============ 流式进度事件 ============

class ProgressType(str, Enum):
    """进度类型"""
    ROUTING = "routing"           # 正在分析问题
    PLANNING = "planning"         # 正在规划任务
    SEARCHING = "searching"       # 正在检索
    REFLECTING = "reflecting"     # 正在反思
    RETRYING = "retrying"         # 正在重试
    SYNTHESIZING = "synthesizing" # 正在生成答案
    STREAMING = "streaming"       # 流式输出答案
    DONE = "done"                 # 完成


class ProgressEvent(Event):
    """进度事件 - 用于流式输出 Agent 思考过程"""
    progress_type: ProgressType
    message: str                                # 用户可见的进度消息
    detail: Optional[str] = None                # 详细信息（可选）
    extra_metadata: Optional[Dict[str, Any]] = None  # 额外元数据（避免与 Event 基类冲突）
