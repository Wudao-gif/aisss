"""
LangGraph 状态定义
定义多智能体系统的共享状态

架构：
- Supervisor 入口：接收问题 → 意图澄清 → 分析分配
- 子智能体：检索/推理/生成/表达/质量检查
- Supervisor 出口：输出 + 存储记忆
"""

from typing import TypedDict, List, Dict, Any, Optional, Literal, Annotated
from enum import Enum
from langgraph.graph import add_messages


class IntentType(str, Enum):
    """用户意图类型"""
    REVIEW_SUMMARY = "review_summary"      # 复习总结
    HOMEWORK_HELP = "homework_help"        # 作业辅导
    CONCEPT_EXPLAIN = "concept_explain"    # 概念解释
    LEARNING_PLAN = "learning_plan"        # 学习规划
    QUESTION_ANSWER = "question_answer"    # 简单问答
    EXERCISE_PRACTICE = "exercise_practice" # 练习题
    UNKNOWN = "unknown"                    # 未知（需澄清）


class TaskType(str, Enum):
    """任务类型枚举（分配给哪个智能体）"""
    RETRIEVAL = "retrieval"  # 检索专家
    REASONING = "reasoning"  # 推理专家
    GENERATION = "generation" # 生成专家
    EXPRESSION = "expression" # 表达专家


class MemoryType(str, Enum):
    """记忆类型"""
    PROFILE = "profile"           # 用户画像
    UNDERSTANDING = "understanding" # 知识理解
    LEARNING = "learning"         # 学习轨迹


class EvidenceSource(str, Enum):
    """证据来源枚举"""
    TEXTBOOK = "textbook"    # 教材检索
    WEB = "web"              # 网络搜索
    NONE = "none"            # 无证据


class ClarificationOption(TypedDict):
    """澄清选项"""
    key: str           # 选项键
    label: str         # 显示标签
    options: List[str] # 可选值（如果是选择题）
    value: str         # 用户选择的值


class TaskStep(TypedDict):
    """任务步骤"""
    step_id: int           # 步骤序号
    agent: str             # 执行的智能体
    action: str            # 具体动作
    status: str            # pending/running/done/failed
    result: Optional[str]  # 执行结果


class AgentState(TypedDict, total=False):
    """
    多智能体系统的共享状态

    流程：
    1. Supervisor 入口：接收 → 意图澄清 → 分析分配
    2. 子智能体执行：检索 → 推理 → 生成 → 表达
    3. 质量检查
    4. Supervisor 出口：输出 → 存储记忆
    """

    # ==================== 消息字段（短期记忆） ====================
    # 使用 add_messages reducer 自动累积对话历史
    messages: Annotated[list, add_messages]

    # 对话摘要（用于压缩历史消息，保留关键信息）
    summary: str

    # ==================== 输入字段 ====================
    query: str                          # 用户原始问题
    user_id: str                        # 用户ID
    book_id: str                        # 教材ID
    book_name: str                      # 教材名称
    book_subject: str                   # 教材学科
    history: List[Dict[str, str]]       # 对话历史（兼容旧接口，逐步废弃）

    # ==================== 意图澄清字段 ====================
    intent_clear: bool                  # 意图是否明确
    intent_type: str                    # 意图类型（IntentType）
    clarification_needed: bool          # 是否需要澄清
    clarification_options: List[ClarificationOption]  # 澄清选项
    clarification_response: Dict[str, str]  # 用户的澄清回复

    # 意图参数（澄清后确定）
    intent_params: Dict[str, Any]       # 如：{"scope": "chapter_3", "type": "key_points"}

    # ==================== 任务计划字段 ====================
    task_plan: List[TaskStep]           # 执行计划
    current_step: int                   # 当前步骤
    required_memories: List[str]        # 需要获取的记忆类型

    # ==================== Letta 记忆字段 ====================
    user_profile: Optional[Dict[str, Any]]       # 用户画像
    user_understanding: Optional[Dict[str, Any]] # 知识理解
    user_learning: Optional[Dict[str, Any]]      # 学习轨迹

    # ==================== 检索字段 ====================
    retrieval_strategy: str             # 检索策略
    vector_results: List[Dict[str, Any]]
    graph_results: List[Dict[str, Any]]
    context: str                        # 融合后的上下文
    sources: List[Dict[str, Any]]
    evidence_source: str
    has_sufficient_context: bool

    # ==================== 子智能体输出 ====================
    retrieval_output: Dict[str, Any]    # 检索专家输出
    reasoning_output: Dict[str, Any]    # 推理专家输出
    generation_output: Dict[str, Any]   # 生成专家输出
    expression_output: Dict[str, Any]   # 表达专家输出

    # ==================== 质量检查字段 ====================
    quality_passed: bool                # 质量是否通过
    quality_feedback: str               # 质量反馈
    quality_retry_count: int            # 质量重试次数

    # ==================== 最终输出 ====================
    final_answer: str                   # 最终回答
    citations: List[Dict[str, Any]]     # 引用信息
    attachments: List[Dict[str, Any]]   # 附件（导图、表格等）

    # ==================== 流程控制字段 ====================
    current_node: str                   # 当前节点
    next_node: str                      # 下一个节点（条件路由用）
    error: Optional[str]                # 错误信息


def create_initial_state(
    query: str,
    user_id: str,
    book_id: str,
    book_name: str = "",
    book_subject: str = "",
    history: List[Dict[str, str]] = None,
    clarification_response: Dict[str, str] = None
) -> AgentState:
    """
    创建初始状态

    Args:
        query: 用户问题
        user_id: 用户ID
        book_id: 教材ID
        book_name: 教材名称
        book_subject: 教材学科
        history: 对话历史
        clarification_response: 用户的澄清回复（第二轮对话时传入）

    Returns:
        初始化的 AgentState
    """
    # 将用户问题转为 HumanMessage
    from langchain_core.messages import HumanMessage

    return AgentState(
        # 消息（短期记忆）- 添加用户消息
        messages=[HumanMessage(content=query)],

        # 对话摘要（初始为空）
        summary="",

        # 输入
        query=query,
        user_id=user_id,
        book_id=book_id,
        book_name=book_name,
        book_subject=book_subject,
        history=history or [],

        # 意图澄清
        intent_clear=False,
        intent_type=IntentType.UNKNOWN.value,
        clarification_needed=False,
        clarification_options=[],
        clarification_response=clarification_response or {},
        intent_params={},

        # 任务计划
        task_plan=[],
        current_step=0,
        required_memories=[],

        # 记忆（待填充）
        user_profile=None,
        user_understanding=None,
        user_learning=None,

        # 检索
        retrieval_strategy="",
        vector_results=[],
        graph_results=[],
        context="",
        sources=[],
        evidence_source=EvidenceSource.NONE.value,
        has_sufficient_context=False,

        # 子智能体输出
        retrieval_output={},
        reasoning_output={},
        generation_output={},
        expression_output={},

        # 质量检查
        quality_passed=False,
        quality_feedback="",
        quality_retry_count=0,

        # 最终输出
        final_answer="",
        citations=[],
        attachments=[],

        # 流程控制
        current_node="start",
        next_node="",
        error=None
    )

