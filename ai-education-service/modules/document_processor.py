"""
文档处理模块
使用 LlamaIndex 进行文档解析、分块和向量化
使用 LlamaParse 解析 PDF（Markdown 格式，保留结构）
支持多种嵌入模型提供商：OpenRouter、DashScope (阿里云)
"""

import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Optional
import httpx

from llama_index.core import Document, Settings as LlamaSettings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import TextNode
from llama_index.readers.file import (
    DocxReader,
    PptxReader,
    MarkdownReader,
)

from config import settings

logger = logging.getLogger(__name__)

# LlamaParse 用于 PDF 解析
try:
    from llama_cloud_services import LlamaParse
    LLAMA_PARSE_AVAILABLE = True
except ImportError:
    LLAMA_PARSE_AVAILABLE = False
    logger.warning("LlamaParse 未安装，将使用基础 PDF 解析")


class BaseEmbedding(ABC):
    """嵌入模型基类"""

    @abstractmethod
    def get_text_embedding(self, text: str) -> List[float]:
        """获取单个文本的embedding"""
        pass

    @abstractmethod
    def get_text_embedding_batch(self, texts: List[str]) -> List[List[float]]:
        """批量获取文本的embedding"""
        pass

    @property
    @abstractmethod
    def embed_batch_size(self) -> int:
        """批次大小"""
        pass


class OpenRouterEmbedding(BaseEmbedding):
    """OpenRouter Embedding 适配器"""

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = settings.OPENROUTER_BASE_URL
        self.model = settings.EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION  # 1024 维
        self._embed_batch_size = settings.EMBEDDING_BATCH_SIZE

    @property
    def embed_batch_size(self) -> int:
        return self._embed_batch_size

    def _get_headers(self) -> dict:
        """获取请求头"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        if settings.OPENROUTER_SITE_URL:
            headers["HTTP-Referer"] = settings.OPENROUTER_SITE_URL
        if settings.OPENROUTER_SITE_NAME:
            headers["X-Title"] = settings.OPENROUTER_SITE_NAME
        return headers

    def get_text_embedding(self, text: str) -> List[float]:
        """获取单个文本的embedding"""
        return self.get_text_embedding_batch([text])[0]

    def get_text_embedding_batch(self, texts: List[str], max_retries: int = 3) -> List[List[float]]:
        """批量获取文本的embedding，带重试机制"""
        import time

        # 限制每个文本最大长度（约 6000 tokens，留安全余量）
        MAX_CHARS = 24000  # 约 6000 tokens (1 token ≈ 4 chars)
        truncated_texts = []
        for text in texts:
            if len(text) > MAX_CHARS:
                logger.warning(f"文本过长 ({len(text)} 字符)，截断至 {MAX_CHARS} 字符")
                text = text[:MAX_CHARS]
            truncated_texts.append(text)
        texts = truncated_texts

        for attempt in range(max_retries):
            try:
                with httpx.Client(timeout=180.0) as client:
                    response = client.post(
                        f"{self.base_url}/embeddings",
                        headers=self._get_headers(),
                        json={
                            "model": self.model,
                            "input": texts,
                            "dimensions": self.dimension  # 指定输出维度为1024
                        }
                    )
                    response.raise_for_status()
                    data = response.json()

                    # 检查响应格式
                    if "data" not in data:
                        error_msg = data.get('error', {}).get('message', str(data))
                        logger.warning(f"OpenRouter API 响应异常 (尝试 {attempt + 1}/{max_retries}): {error_msg}")
                        if attempt < max_retries - 1:
                            time.sleep(2 * (attempt + 1))  # 递增等待
                            continue
                        raise ValueError(f"OpenRouter API 响应缺少 data 字段: {error_msg}")

                    # 按index排序确保顺序正确
                    embeddings = sorted(data["data"], key=lambda x: x["index"])
                    return [item["embedding"] for item in embeddings]

            except httpx.HTTPStatusError as e:
                logger.warning(f"HTTP 错误 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 * (attempt + 1))
                    continue
                raise
            except Exception as e:
                logger.warning(f"请求失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 * (attempt + 1))
                    continue
                raise

        raise ValueError("Embedding 请求失败，已达最大重试次数")

    async def aget_text_embedding(self, text: str) -> List[float]:
        """异步获取单个文本的embedding"""
        result = await self.aget_text_embedding_batch([text])
        return result[0]

    async def aget_text_embedding_batch(self, texts: List[str]) -> List[List[float]]:
        """异步批量获取文本的embedding"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/embeddings",
                headers=self._get_headers(),
                json={
                    "model": self.model,
                    "input": texts,
                    "dimensions": self.dimension  # 指定输出维度为1024
                }
            )
            response.raise_for_status()
            data = response.json()

            embeddings = sorted(data["data"], key=lambda x: x["index"])
            return [item["embedding"] for item in embeddings]


class DashScopeEmbedding(BaseEmbedding):
    """
    DashScope (阿里云) Embedding 适配器
    支持 qwen2.5-vl-embedding 等阿里云嵌入模型
    使用 OpenAI 兼容接口调用
    """

    def __init__(self):
        self.api_key = settings.DASHSCOPE_API_KEY
        self.base_url = settings.DASHSCOPE_BASE_URL
        self.model = settings.DASHSCOPE_EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION  # 1024 维
        self._embed_batch_size = settings.EMBEDDING_BATCH_SIZE

        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY 未配置，请在 .env 文件中设置")

        logger.info(f"DashScope Embedding 初始化: model={self.model}, dimension={self.dimension}")

    @property
    def embed_batch_size(self) -> int:
        return self._embed_batch_size

    def _get_headers(self) -> dict:
        """获取请求头"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def get_text_embedding(self, text: str) -> List[float]:
        """获取单个文本的embedding"""
        return self.get_text_embedding_batch([text])[0]

    def get_text_embedding_batch(self, texts: List[str], max_retries: int = 3) -> List[List[float]]:
        """批量获取文本的embedding，带重试机制"""
        import time

        # qwen2.5-vl-embedding 支持最大 32,000 Token
        # 保守估计：1 token ≈ 1.5 中文字符，留安全余量
        MAX_CHARS = 40000
        truncated_texts = []
        for text in texts:
            if len(text) > MAX_CHARS:
                logger.warning(f"文本过长 ({len(text)} 字符)，截断至 {MAX_CHARS} 字符")
                text = text[:MAX_CHARS]
            truncated_texts.append(text)
        texts = truncated_texts

        for attempt in range(max_retries):
            try:
                with httpx.Client(timeout=180.0) as client:
                    response = client.post(
                        f"{self.base_url}/embeddings",
                        headers=self._get_headers(),
                        json={
                            "model": self.model,
                            "input": texts,
                            "dimensions": self.dimension  # 指定输出维度
                        }
                    )
                    response.raise_for_status()
                    data = response.json()

                    # 检查响应格式
                    if "data" not in data:
                        error_msg = data.get('error', {}).get('message', str(data))
                        logger.warning(f"DashScope API 响应异常 (尝试 {attempt + 1}/{max_retries}): {error_msg}")
                        if attempt < max_retries - 1:
                            time.sleep(2 * (attempt + 1))
                            continue
                        raise ValueError(f"DashScope API 响应缺少 data 字段: {error_msg}")

                    # 按index排序确保顺序正确
                    embeddings = sorted(data["data"], key=lambda x: x["index"])
                    return [item["embedding"] for item in embeddings]

            except httpx.HTTPStatusError as e:
                logger.warning(f"HTTP 错误 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 * (attempt + 1))
                    continue
                raise
            except Exception as e:
                logger.warning(f"请求失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 * (attempt + 1))
                    continue
                raise

        raise ValueError("DashScope Embedding 请求失败，已达最大重试次数")

    async def aget_text_embedding(self, text: str) -> List[float]:
        """异步获取单个文本的embedding"""
        result = await self.aget_text_embedding_batch([text])
        return result[0]

    async def aget_text_embedding_batch(self, texts: List[str]) -> List[List[float]]:
        """异步批量获取文本的embedding"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/embeddings",
                headers=self._get_headers(),
                json={
                    "model": self.model,
                    "input": texts,
                    "dimensions": self.dimension
                }
            )
            response.raise_for_status()
            data = response.json()

            embeddings = sorted(data["data"], key=lambda x: x["index"])
            return [item["embedding"] for item in embeddings]


class Qwen25VLEmbedding(BaseEmbedding):
    """
    Qwen2.5-VL-Embedding 多模态嵌入适配器
    使用 DashScope 原生 SDK 调用（不支持 OpenAI 兼容接口）
    支持文本、图片、视频的多模态嵌入
    """

    def __init__(self):
        self.api_key = settings.DASHSCOPE_API_KEY
        self.model = "qwen2.5-vl-embedding"
        self.dimension = settings.EMBEDDING_DIMENSION  # 2048, 1024, 768, 512
        self._embed_batch_size = 1  # 多模态模型每次只能处理一个输入

        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY 未配置，请在 .env 文件中设置")

        # 动态导入 dashscope
        try:
            import dashscope
            self.dashscope = dashscope
            # 设置 API Key
            dashscope.api_key = self.api_key
        except ImportError:
            raise ImportError("请安装 dashscope SDK: pip install dashscope")

        logger.info(f"Qwen2.5-VL-Embedding 初始化: model={self.model}, dimension={self.dimension}")

    @property
    def embed_batch_size(self) -> int:
        return self._embed_batch_size

    def get_text_embedding(self, text: str) -> List[float]:
        """获取单个文本的embedding"""
        return self._get_multimodal_embedding([{"text": text}])

    def get_text_embedding_batch(self, texts: List[str], max_retries: int = 3) -> List[List[float]]:
        """批量获取文本的embedding（逐个处理）"""
        import time

        embeddings = []
        for i, text in enumerate(texts):
            for attempt in range(max_retries):
                try:
                    embedding = self.get_text_embedding(text)
                    embeddings.append(embedding)
                    break
                except Exception as e:
                    logger.warning(f"文本 {i+1}/{len(texts)} 嵌入失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                    if attempt < max_retries - 1:
                        time.sleep(2 * (attempt + 1))
                        continue
                    raise
        return embeddings

    def get_image_embedding(self, image_url: str) -> List[float]:
        """获取图片的embedding"""
        return self._get_multimodal_embedding([{"image": image_url}])

    def get_video_embedding(self, video_url: str) -> List[float]:
        """获取视频的embedding"""
        return self._get_multimodal_embedding([{"video": video_url}])

    def get_multimodal_embedding(self, text: str = None, image_url: str = None, video_url: str = None) -> List[float]:
        """获取多模态混合内容的embedding"""
        input_content = []
        if text:
            input_content.append({"text": text})
        if image_url:
            input_content.append({"image": image_url})
        if video_url:
            input_content.append({"video": video_url})

        if not input_content:
            raise ValueError("至少需要提供 text、image_url 或 video_url 中的一个")

        return self._get_multimodal_embedding(input_content)

    def _get_multimodal_embedding(self, input_content: List[dict]) -> List[float]:
        """调用 DashScope MultiModalEmbedding API"""
        from http import HTTPStatus

        resp = self.dashscope.MultiModalEmbedding.call(
            api_key=self.api_key,
            model=self.model,
            input=input_content,
            dimension=self.dimension
        )

        if resp.status_code == HTTPStatus.OK:
            # 返回 embedding 向量
            return resp.output["embeddings"][0]["embedding"]
        else:
            error_msg = f"DashScope MultiModalEmbedding 调用失败: code={resp.code}, message={resp.message}"
            logger.error(error_msg)
            raise ValueError(error_msg)


def get_embedding_model(provider: str = None) -> BaseEmbedding:
    """
    根据配置获取嵌入模型实例（工厂函数）

    Args:
        provider: 可选，指定提供商。如果不指定则使用配置文件中的 EMBEDDING_PROVIDER
                  可选值: "openrouter", "dashscope", "qwen25vl"

    Returns:
        BaseEmbedding: 嵌入模型实例
    """
    if provider is None:
        provider = settings.EMBEDDING_PROVIDER.lower()
    else:
        provider = provider.lower()

    if provider == "qwen25vl":
        logger.info(f"使用 Qwen2.5-VL-Embedding 多模态嵌入模型 (维度: {settings.EMBEDDING_DIMENSION})")
        return Qwen25VLEmbedding()
    elif provider == "dashscope":
        logger.info(f"使用 DashScope 嵌入模型: {settings.DASHSCOPE_EMBEDDING_MODEL}")
        return DashScopeEmbedding()
    elif provider == "openrouter":
        logger.info(f"使用 OpenRouter 嵌入模型: {settings.EMBEDDING_MODEL}")
        return OpenRouterEmbedding()
    else:
        logger.warning(f"未知的嵌入提供商 '{provider}'，默认使用 OpenRouter")
        return OpenRouterEmbedding()


class DocumentProcessor:
    """文档处理器"""

    # 文件类型到Reader的映射（不包含 PDF，PDF 使用 LlamaParse）
    READERS = {
        ".docx": DocxReader,
        ".doc": DocxReader,
        ".pptx": PptxReader,
        ".ppt": PptxReader,
        ".md": MarkdownReader,
    }

    def __init__(self):
        """初始化文档处理器"""
        # 使用工厂函数获取嵌入模型（支持 OpenRouter 和 DashScope）
        self.embedding = get_embedding_model()
        self.node_parser = SentenceSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )

        # 初始化 LlamaParse（用于 PDF）
        self.llama_parser = None
        if LLAMA_PARSE_AVAILABLE and settings.LLAMA_CLOUD_API_KEY:
            self.llama_parser = LlamaParse(
                api_key=settings.LLAMA_CLOUD_API_KEY,
                result_type="markdown",  # Markdown 格式，保留标题、列表、加粗等结构
                verbose=True,
                language="ch_sim",  # 简体中文（LlamaParse 特殊代码）
                skip_diagonal_text=True,  # 跳过斜向文本（水印等）
                invalidate_cache=False,
            )
            logger.info("LlamaParse 初始化成功 (Markdown 格式)")
        else:
            logger.warning("LlamaParse 未配置，PDF 解析可能效果不佳")

        logger.info(f"文档处理器初始化完成，chunk_size={settings.CHUNK_SIZE}")

    def _get_reader(self, file_path: Path):
        """根据文件类型获取对应的Reader"""
        suffix = file_path.suffix.lower()
        reader_class = self.READERS.get(suffix)
        if reader_class:
            return reader_class()
        return None

    def load_document(self, file_path: Path) -> List[Document]:
        """加载文档"""
        suffix = file_path.suffix.lower()
        logger.info(f"加载文档: {file_path} (类型: {suffix})")

        # 纯文本文件直接读取
        if suffix in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            return [Document(text=content, metadata={"source": str(file_path)})]

        # PDF 使用 LlamaParse
        if suffix == ".pdf":
            if self.llama_parser:
                logger.info("使用 LlamaParse 解析 PDF...")
                documents = self.llama_parser.load_data(str(file_path))
                # 过滤空文档
                documents = [doc for doc in documents if doc.text and doc.text.strip()]
                logger.info(f"LlamaParse 成功解析 {len(documents)} 个文档片段")
                return documents
            else:
                # 回退到基础 PDF 解析
                from llama_index.readers.file import PDFReader
                logger.warning("LlamaParse 不可用，使用基础 PDFReader")
                reader = PDFReader()
                documents = reader.load_data(file=file_path)
                # 过滤空文档
                documents = [doc for doc in documents if doc.text and doc.text.strip()]
                logger.info(f"成功加载 {len(documents)} 个文档片段")
                return documents

        # 其他格式使用对应的 Reader
        reader = self._get_reader(file_path)
        if reader:
            documents = reader.load_data(file=file_path)
            # 过滤空文档
            documents = [doc for doc in documents if doc.text and doc.text.strip()]
            logger.info(f"成功加载 {len(documents)} 个文档片段")
            return documents

        raise ValueError(f"不支持的文件类型: {suffix}")

    def parse_to_nodes(self, documents: List[Document]) -> List[TextNode]:
        """将文档解析为节点（分块）"""
        logger.info(f"开始分块处理，共 {len(documents)} 个文档")
        nodes = self.node_parser.get_nodes_from_documents(documents)
        logger.info(f"分块完成，生成 {len(nodes)} 个节点")
        return nodes

    def generate_embeddings(self, nodes: List[TextNode]) -> List[TextNode]:
        """为节点生成向量"""
        logger.info(f"开始生成向量，共 {len(nodes)} 个节点")

        # 提取所有文本
        texts = [node.get_content() for node in nodes]

        # 批量生成embedding
        batch_size = self.embedding.embed_batch_size
        total_batches = (len(texts) + batch_size - 1) // batch_size
        logger.info(f"批次大小: {batch_size}, 总批次数: {total_batches}")

        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_num = i // batch_size + 1
            logger.info(f"处理批次 {batch_num}/{total_batches}, 文本数: {len(batch)}")
            embeddings = self.embedding.get_text_embedding_batch(batch)
            all_embeddings.extend(embeddings)

        # 将embedding附加到节点
        for node, embedding in zip(nodes, all_embeddings):
            node.embedding = embedding

        logger.info(f"向量生成完成，维度: {len(all_embeddings[0]) if all_embeddings else 0}")
        return nodes

    def process(
        self,
        file_path: Path,
        metadata: Optional[dict] = None
    ) -> List[TextNode]:
        """
        完整处理流程：加载 -> 分块 -> 向量化

        Args:
            file_path: 文件路径
            metadata: 额外的元数据（如文件ID、来源等）

        Returns:
            带有向量的节点列表
        """
        # 1. 加载文档
        documents = self.load_document(file_path)

        # 2. 添加元数据
        if metadata:
            for doc in documents:
                doc.metadata.update(metadata)

        # 3. 分块
        nodes = self.parse_to_nodes(documents)

        # 4. 添加元数据到节点
        if metadata:
            for node in nodes:
                node.metadata.update(metadata)

        # 5. 生成向量
        nodes = self.generate_embeddings(nodes)

        return nodes
