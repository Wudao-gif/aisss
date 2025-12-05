"""
Agentic RAG 工具定义
可扩展的工具注册机制
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Type
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ToolSchema:
    """工具描述 Schema（用于 LLM 理解）"""
    name: str
    description: str
    parameters: Dict[str, Any]  # JSON Schema 格式


class Tool(ABC):
    """工具基类"""
    
    name: str = ""
    description: str = ""
    
    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """执行工具，返回结果"""
        pass
    
    @classmethod
    def get_schema(cls) -> ToolSchema:
        """获取工具 Schema"""
        return ToolSchema(
            name=cls.name,
            description=cls.description,
            parameters=cls.get_parameters_schema()
        )
    
    @classmethod
    def get_parameters_schema(cls) -> Dict[str, Any]:
        """获取参数 Schema，子类可覆盖"""
        return {"type": "object", "properties": {}}


class ToolRegistry:
    """工具注册器"""
    
    def __init__(self):
        self._tools: Dict[str, Tool] = {}
    
    def register(self, tool: Tool) -> None:
        """注册工具"""
        self._tools[tool.name] = tool
        logger.info(f"工具已注册: {tool.name}")
    
    def get(self, name: str) -> Optional[Tool]:
        """获取工具"""
        return self._tools.get(name)
    
    def list_tools(self) -> List[ToolSchema]:
        """列出所有工具 Schema"""
        return [tool.get_schema() for tool in self._tools.values()]
    
    def get_tools_prompt(self) -> str:
        """生成工具描述 Prompt"""
        lines = ["可用工具:"]
        for tool in self._tools.values():
            lines.append(f"- {tool.name}: {tool.description}")
        return "\n".join(lines)


# ============ 具体工具实现 ============

class VectorSearchTool(Tool):
    """向量检索工具"""
    
    name = "vector_search"
    description = "基于语义相似度的向量检索，适合查找与问题语义相关的内容"
    
    def __init__(self, vector_store, embedding_model):
        self.vector_store = vector_store
        self.embedding_model = embedding_model
    
    @classmethod
    def get_parameters_schema(cls) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "检索查询"},
                "top_k": {"type": "integer", "description": "返回数量", "default": 5},
                "filter_expr": {"type": "string", "description": "过滤表达式"}
            },
            "required": ["query"]
        }
    
    async def execute(self, query: str, top_k: int = 5, filter_expr: str = None) -> Dict[str, Any]:
        """执行向量检索"""
        try:
            # 生成 embedding
            embedding = self.embedding_model.get_query_embedding(query)
            
            # 检索
            results = self.vector_store.search(
                query_embedding=embedding,
                top_k=top_k,
                filter_expr=filter_expr
            )
            
            return {
                "success": True,
                "results": results,
                "count": len(results)
            }
        except Exception as e:
            logger.error(f"向量检索失败: {e}")
            return {"success": False, "error": str(e), "results": []}


class KeywordSearchTool(Tool):
    """关键词检索工具"""
    
    name = "keyword_search"
    description = "基于关键词匹配的检索，适合查找包含特定术语或名词的内容"
    
    def __init__(self, vector_store):
        self.vector_store = vector_store
    
    @classmethod
    def get_parameters_schema(cls) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "keywords": {"type": "array", "items": {"type": "string"}, "description": "关键词列表"},
                "top_k": {"type": "integer", "description": "返回数量", "default": 5},
                "filter_expr": {"type": "string", "description": "过滤表达式"}
            },
            "required": ["keywords"]
        }
    
    async def execute(self, keywords: List[str], top_k: int = 5, filter_expr: str = None) -> Dict[str, Any]:
        """执行关键词检索（基于向量存储的文本匹配）"""
        try:
            # 简化实现：将关键词组合成查询
            # 实际可以扩展为 BM25 或 Elasticsearch
            combined_query = " ".join(keywords)
            
            # 这里复用向量检索，实际项目可以接入专门的关键词检索引擎
            logger.info(f"关键词检索: {keywords}")
            
            return {
                "success": True,
                "results": [],  # 需要实际实现
                "count": 0,
                "note": "关键词检索需要接入专门的搜索引擎"
            }
        except Exception as e:
            logger.error(f"关键词检索失败: {e}")
            return {"success": False, "error": str(e), "results": []}

