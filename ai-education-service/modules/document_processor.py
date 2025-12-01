"""
文档处理模块
使用 LlamaIndex 进行文档解析、分块和向量化
使用 LlamaParse 解析 PDF（Markdown 格式，保留结构）
"""

import logging
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


class OpenRouterEmbedding:
    """OpenRouter Embedding 适配器"""

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = settings.OPENROUTER_BASE_URL
        self.model = settings.EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION  # 1024 维
        self.embed_batch_size = settings.EMBEDDING_BATCH_SIZE

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
        self.embedding = OpenRouterEmbedding()
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
