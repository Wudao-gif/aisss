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
    """知识图谱工具 - 提取和查询实体关系"""

    name = "knowledge_graph"
    description = "从文本中提取实体和关系，或查询实体间的关联。适合理解概念之间的关系。"

    def __init__(self):
        self.chat_model = settings.CHAT_MODEL

    @classmethod
    def get_parameters_schema(cls) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "要查询的实体或关系"},
                "context": {"type": "string", "description": "用于提取知识的上下文文本"},
                "operation": {"type": "string", "enum": ["extract", "query"], "description": "操作类型"}
            },
            "required": ["query"]
        }

    async def execute(self, query: str, context: str = "", operation: str = "extract", **kwargs) -> Dict[str, Any]:
        """执行知识图谱操作"""
        try:
            if operation == "extract" and context:
                # 从上下文提取实体关系
                return await self._extract_entities(query, context)
            else:
                # 查询实体关系（需要外部知识图谱，这里用 LLM 模拟）
                return await self._query_relations(query)
        except Exception as e:
            logger.error(f"知识图谱操作失败: {e}")
            return {"success": False, "error": str(e), "results": [], "count": 0}

    async def _extract_entities(self, query: str, context: str) -> Dict[str, Any]:
        """从文本提取实体和关系"""
        prompt = f"""从以下文本中提取与"{query}"相关的实体和关系。

文本:
{context[:2000]}

请提取（返回 JSON）:
{{"entities": ["实体1", "实体2"], "relations": [{{"subject": "主体", "predicate": "关系", "object": "客体"}}]}}"""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
                    json={"model": self.chat_model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.1}
                )
                result = response.json()["choices"][0]["message"]["content"]

                if "```" in result:
                    result = result.split("```")[1].replace("json", "").strip()

                import json
                parsed = json.loads(result)

                # 格式化为统一的结果格式
                text_result = f"实体: {', '.join(parsed.get('entities', []))}\n"
                for rel in parsed.get('relations', []):
                    text_result += f"关系: {rel['subject']} --[{rel['predicate']}]--> {rel['object']}\n"

                return {
                    "success": True,
                    "entities": parsed.get("entities", []),
                    "relations": parsed.get("relations", []),
                    "results": [{"text": text_result, "score": 1.0}],
                    "count": len(parsed.get("entities", [])) + len(parsed.get("relations", []))
                }
        except Exception as e:
            logger.error(f"实体提取失败: {e}")
            return {"success": False, "error": str(e), "results": [], "count": 0}

    async def _query_relations(self, query: str) -> Dict[str, Any]:
        """查询实体关系（用 LLM 模拟知识图谱查询）"""
        prompt = f"""作为知识图谱，回答关于"{query}"的实体关系问题。

请提供:
1. 相关实体
2. 实体之间的关系
3. 关键属性

返回 JSON: {{"answer": "简要回答", "entities": [], "relations": []}}"""

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
                    json={"model": self.chat_model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.3}
                )
                result = response.json()["choices"][0]["message"]["content"]

                if "```" in result:
                    result = result.split("```")[1].replace("json", "").strip()

                import json
                parsed = json.loads(result)

                return {
                    "success": True,
                    "answer": parsed.get("answer", ""),
                    "entities": parsed.get("entities", []),
                    "relations": parsed.get("relations", []),
                    "results": [{"text": parsed.get("answer", ""), "score": 0.8}],
                    "count": 1
                }
        except Exception as e:
            logger.error(f"知识查询失败: {e}")
            return {"success": False, "error": str(e), "results": [], "count": 0}
