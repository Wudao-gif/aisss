"""
Query Transformation 模块
使用 LlamaIndex 内置的查询转换功能
"""

import logging
from typing import Optional, List, Any

import httpx
from llama_index.core.indices.query.query_transform.base import HyDEQueryTransform
from llama_index.core.prompts import PromptTemplate
from llama_index.core.llms import CustomLLM, CompletionResponse, LLMMetadata
from llama_index.core.schema import QueryBundle
from pydantic import Field

from config import settings

logger = logging.getLogger(__name__)


# 自定义 HyDE Prompt（中文教育场景优化）
HYDE_PROMPT_TEMPLATE = """请根据以下问题，生成一段假设性的答案文本。
这段文本应该像是从教材或学习资料中摘录的内容，包含专业术语和详细解释。

问题: {context_str}

假设性答案（请直接输出内容，不要加任何前缀）:
"""


class OpenRouterLLM(CustomLLM):
    """OpenRouter LLM 包装器，兼容 LlamaIndex"""

    model: str = Field(default=settings.CHAT_MODEL)
    temperature: float = Field(default=0.3)

    @property
    def metadata(self) -> LLMMetadata:
        return LLMMetadata(model_name=self.model, is_chat_model=True)

    def complete(self, prompt: str, **kwargs: Any) -> CompletionResponse:
        """同步完成"""
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": self.temperature
                }
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"]
            return CompletionResponse(text=text)

    async def acomplete(self, prompt: str, **kwargs: Any) -> CompletionResponse:
        """异步完成"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": self.temperature
                }
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"]
            return CompletionResponse(text=text)

    def stream_complete(self, prompt: str, **kwargs: Any):
        raise NotImplementedError("流式完成暂不支持")


class QueryTransformer:
    """
    查询转换器

    支持:
    - HyDE: 生成假设性文档，提高语义检索效果
    """

    def __init__(self):
        """初始化查询转换器"""
        self.llm = OpenRouterLLM()

        # 初始化 HyDE 转换器
        hyde_prompt = PromptTemplate(HYDE_PROMPT_TEMPLATE)
        self.hyde_transform = HyDEQueryTransform(
            llm=self.llm,
            hyde_prompt=hyde_prompt,
            include_original=True  # 同时保留原始查询
        )

        logger.info("QueryTransformer 初始化完成 (HyDE)")
    
    def transform_with_hyde(self, query: str) -> QueryBundle:
        """
        使用 HyDE 转换查询（同步版本）

        生成假设性答案，用于提高向量检索的召回率

        Args:
            query: 原始查询

        Returns:
            QueryBundle: 包含原始查询和假设性文档的查询包
        """
        try:
            query_bundle = QueryBundle(query_str=query)
            transformed = self.hyde_transform(query_bundle)

            logger.info(f"HyDE 转换完成: '{query[:30]}...'")
            if transformed.embedding_strs:
                logger.debug(f"假设性文档: {transformed.embedding_strs[0][:100]}...")

            return transformed
        except Exception as e:
            logger.error(f"HyDE 转换失败: {e}")
            return QueryBundle(query_str=query)

    def get_embedding_strings(self, transformed: QueryBundle) -> List[str]:
        """获取用于 embedding 的字符串列表"""
        if transformed.embedding_strs:
            return list(transformed.embedding_strs)
        return [transformed.query_str]


# ============ 工厂函数 ============

_query_transformer: Optional[QueryTransformer] = None


def get_query_transformer() -> QueryTransformer:
    """获取 QueryTransformer 单例"""
    global _query_transformer
    if _query_transformer is None:
        _query_transformer = QueryTransformer()
    return _query_transformer

