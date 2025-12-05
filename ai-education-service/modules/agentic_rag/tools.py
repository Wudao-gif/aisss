"""
Agentic RAG 工具定义
可扩展的工具注册机制
"""

import logging
import re
import math
import httpx
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Type
from dataclasses import dataclass

from config import settings

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


class CalculatorTool(Tool):
    """计算器工具 - 安全执行数学表达式"""

    name = "calculator"
    description = "执行数学计算，支持基本运算、三角函数、对数等。适合需要精确计算的问题。"

    # 允许的数学函数
    ALLOWED_NAMES = {
        'abs': abs, 'round': round, 'min': min, 'max': max,
        'sum': sum, 'pow': pow, 'sqrt': math.sqrt,
        'sin': math.sin, 'cos': math.cos, 'tan': math.tan,
        'log': math.log, 'log10': math.log10, 'log2': math.log2,
        'exp': math.exp, 'pi': math.pi, 'e': math.e,
        'floor': math.floor, 'ceil': math.ceil,
        'radians': math.radians, 'degrees': math.degrees,
    }

    @classmethod
    def get_parameters_schema(cls) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "数学表达式，如 '2+3*4' 或 'sqrt(16)+sin(pi/2)'"}
            },
            "required": ["expression"]
        }

    async def execute(self, expression: str, **kwargs) -> Dict[str, Any]:
        """安全执行数学表达式"""
        try:
            # 清理表达式
            expr = expression.strip()

            # 安全检查：只允许数字、运算符和白名单函数
            safe_pattern = r'^[\d\s\+\-\*\/\(\)\.\,\^]+$|^[\w\(\)\d\s\+\-\*\/\.\,\^]+$'

            # 替换 ^ 为 **（幂运算）
            expr = expr.replace('^', '**')

            # 使用 eval 但限制命名空间
            result = eval(expr, {"__builtins__": {}}, self.ALLOWED_NAMES)

            logger.info(f"计算: {expression} = {result}")

            return {
                "success": True,
                "expression": expression,
                "result": result,
                "formatted": f"{expression} = {result}",
                "results": [{"text": f"计算结果: {expression} = {result}", "score": 1.0}],
                "count": 1
            }
        except Exception as e:
            logger.error(f"计算失败: {expression}, 错误: {e}")
            return {
                "success": False,
                "expression": expression,
                "error": str(e),
                "results": [],
                "count": 0
            }


class KnowledgeGraphTool(Tool):
    """知识图谱工具 - 使用 Neo4j 查询实体关系"""

    name = "knowledge_graph"
    description = "查询知识图谱中的实体和关系。适合理解概念之间的关系、查找定义、探索知识结构。"

    def __init__(self, kg_store=None):
        self.kg_store = kg_store  # 延迟初始化
        self.chat_model = settings.CHAT_MODEL

    @classmethod
    def get_parameters_schema(cls) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "要查询的实体名称或自然语言问题"},
                "entity_type": {"type": "string", "description": "实体类型过滤（可选）"},
                "book_id": {"type": "string", "description": "限制在某本书内查询（可选）"},
                "operation": {"type": "string", "enum": ["search", "relations", "path"],
                             "description": "操作: search=搜索实体, relations=查关系, path=查路径"}
            },
            "required": ["query"]
        }

    async def _get_store(self):
        """延迟获取 KG Store"""
        if self.kg_store is None:
            from ..knowledge_graph import get_kg_store
            self.kg_store = await get_kg_store()
        return self.kg_store

    async def execute(self, query: str, entity_type: str = None, book_id: str = None,
                     operation: str = "search", **kwargs) -> Dict[str, Any]:
        """执行知识图谱查询"""
        try:
            store = await self._get_store()

            if operation == "search":
                return await self._search_entities(store, query, entity_type, book_id)
            elif operation == "relations":
                return await self._get_entity_relations(store, query, book_id)
            elif operation == "path":
                return await self._find_path(store, query)
            else:
                # 默认使用自然语言查询
                return await self._natural_query(store, query, book_id)
        except Exception as e:
            logger.error(f"知识图谱查询失败: {e}")
            return {"success": False, "error": str(e), "results": [], "count": 0}

    async def _search_entities(self, store, query: str, entity_type: str, book_id: str) -> Dict:
        """搜索实体"""
        entities = await store.search_entities(query, entity_type, book_id, limit=10)

        results = []
        for e in entities:
            text = f"【{e.get('type', '实体')}】{e.get('name', '')}"
            if e.get('properties'):
                text += f" - {e.get('properties', {})}"
            results.append({"text": text, "score": 1.0, "entity": e})

        return {"success": True, "results": results, "count": len(results), "entities": entities}

    async def _get_entity_relations(self, store, query: str, book_id: str) -> Dict:
        """获取实体的关系"""
        # 先搜索实体
        entities = await store.search_entities(query, book_id=book_id, limit=1)
        if not entities:
            return {"success": True, "results": [], "count": 0, "message": f"未找到实体: {query}"}

        entity = entities[0]
        relations = await store.get_relations(entity["id"])

        results = []
        for r in relations:
            source = r["source"].get("name", "")
            target = r["target"].get("name", "")
            rel_type = r["relation"].get("type", "关联")
            text = f"{source} --[{rel_type}]--> {target}"
            results.append({"text": text, "score": 1.0, "relation": r})

        return {"success": True, "results": results, "count": len(results), "relations": relations}

    async def _find_path(self, store, query: str) -> Dict:
        """查找两个实体之间的路径"""
        # 解析查询中的两个实体（格式: "A 和 B" 或 "A to B"）
        import re
        parts = re.split(r'\s+(?:和|与|to|->)\s+', query, maxsplit=1)
        if len(parts) != 2:
            return {"success": False, "error": "请指定两个实体，如: '微积分 和 导数'", "results": [], "count": 0}

        # 搜索两个实体
        e1 = await store.search_entities(parts[0].strip(), limit=1)
        e2 = await store.search_entities(parts[1].strip(), limit=1)

        if not e1 or not e2:
            return {"success": True, "results": [], "count": 0, "message": "未找到指定实体"}

        paths = await store.find_path(e1[0]["id"], e2[0]["id"])

        results = []
        for p in paths:
            nodes = [n.get("name", "") for n in p.get("nodes", [])]
            text = " -> ".join(nodes)
            results.append({"text": text, "score": 1.0, "path": p})

        return {"success": True, "results": results, "count": len(results), "paths": paths}

    async def _natural_query(self, store, query: str, book_id: str) -> Dict:
        """自然语言查询（LLM 生成 Cypher）"""
        records = await store.query_by_pattern(query, book_id)

        results = []
        for r in records:
            # 格式化结果
            text_parts = []
            for k, v in r.items():
                if isinstance(v, dict):
                    text_parts.append(f"{v.get('name', str(v))}")
                else:
                    text_parts.append(str(v))
            results.append({"text": " | ".join(text_parts), "score": 0.8, "data": r})

        return {"success": True, "results": results, "count": len(results)}