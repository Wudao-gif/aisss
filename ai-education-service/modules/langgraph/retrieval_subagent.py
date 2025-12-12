"""
检索子代理 (Retrieval SubAgent)
用于 Deep Agent 框架中的检索任务

SubAgent 配置：
- name: "retrieval_expert"
- description: 检索教材和知识图谱中的相关信息
- system_prompt: 检索专家的系统提示词
- tools: 检索工具列表（retrieve_from_textbook, search_knowledge_graph）
"""

import logging
from typing import Dict, Any

from .tools import retrieve_from_textbook, search_knowledge_graph

logger = logging.getLogger(__name__)


# ==================== 检索子代理系统提示词 ====================

RETRIEVAL_EXPERT_PROMPT = """你是一个专业的检索专家，专门从教材和知识图谱中查找相关信息。

## 你的职责

1. **理解用户问题** - 分析用户的真实需求
2. **决定检索策略** - 选择合适的检索工具
3. **执行检索** - 调用检索工具获取信息
4. **评估结果** - 判断检索结果是否充分

## 可用工具

### 1. retrieve_from_textbook
从教材向量库中检索相关内容。
- 用于：教材内容查询、知识点解释、例题查找
- 参数：query（问题）、book_id（教材ID）

### 2. search_knowledge_graph
从知识图谱中搜索实体和关系。
- 用于：概念关系、知识结构、实体定义
- 参数：query（问题）、book_id（教材ID）

## 检索决策规则

1. **教材内容相关** → 使用 retrieve_from_textbook
   - 用户询问教材中的概念、定义、例题
   - 需要获取教材原文或相关段落

2. **知识结构相关** → 使用 search_knowledge_graph
   - 用户询问概念之间的关系
   - 需要理解知识的层级结构

3. **综合查询** → 同时使用两个工具
   - 复杂问题需要多角度信息
   - 需要既有原文又有结构化知识

4. **无需检索** → 不调用任何工具
   - 简单问候、闲聊
   - 与教材完全无关的问题
   - 用户已经提供了充分的信息

## 工作流程

1. 分析用户问题的类型和复杂度
2. 根据规则选择合适的检索工具
3. 调用工具获取信息
4. 评估检索结果的充分性
5. 返回检索结果给主代理

## 重要提示

- 优先使用 retrieve_from_textbook 获取教材原文
- 如果初次检索结果不充分，可以尝试改写查询或使用其他工具
- 始终确保 book_id 参数正确传递
- 返回结果时包含来源信息和相关度评分
"""


# ==================== 检索子代理配置 ====================

def create_retrieval_subagent() -> Dict[str, Any]:
    """
    创建检索子代理配置
    
    Returns:
        SubAgent 配置字典，可直接传递给 create_deep_agent
    """
    return {
        "name": "retrieval_expert",
        "description": "从教材和知识图谱中检索相关信息。用于查找教材内容、概念定义、知识结构等。",
        "system_prompt": RETRIEVAL_EXPERT_PROMPT,
        "tools": [retrieve_from_textbook, search_knowledge_graph],
    }


# ==================== 导出 ====================

__all__ = [
    "create_retrieval_subagent",
    "RETRIEVAL_EXPERT_PROMPT",
]

