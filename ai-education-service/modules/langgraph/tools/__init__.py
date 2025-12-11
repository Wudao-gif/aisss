"""
工具统一管理模块

所有工具集中在此目录，主系统和子代理按需引用。

目录结构：
- retrieval.py: 检索工具（retrieve_from_textbook, search_knowledge_graph）
- memory.py: 记忆工具（memory_read, memory_write）
- knowledge_graph.py: GraphRAG 工具（graphrag_search, get_entity_relations）

使用方式：
    # 引用单个工具
    from .tools import retrieve_from_textbook, memory_read, graphrag_search

    # 引用工具组
    from .tools import retrieval_tools, memory_tools, graphrag_tools

    # 引用全部工具
    from .tools import ALL_TOOLS
"""

# ==================== 检索工具 ====================
from .retrieval import (
    retrieve_from_textbook,
    search_knowledge_graph,
    retrieval_tools,
)

# ==================== 记忆工具 ====================
from .memory import (
    memory_read,
    memory_write,
    memory_tools,
)

# ==================== GraphRAG 工具 ====================
from .knowledge_graph import (
    graphrag_search,
    get_entity_relations,
    graphrag_tools,
)

# ==================== 全部工具 ====================
ALL_TOOLS = [
    # 检索
    retrieve_from_textbook,
    search_knowledge_graph,
    # 记忆
    memory_read,
    memory_write,
    # GraphRAG
    graphrag_search,
    get_entity_relations,
]

__all__ = [
    # 检索工具
    "retrieve_from_textbook",
    "search_knowledge_graph",
    "retrieval_tools",
    # 记忆工具
    "memory_read",
    "memory_write",
    "memory_tools",
    # GraphRAG 工具
    "graphrag_search",
    "get_entity_relations",
    "graphrag_tools",
    # 全部
    "ALL_TOOLS",
]

