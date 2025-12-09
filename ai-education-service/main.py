"""
AI 教育资料处理服务
主入口文件
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.store.postgres.aio import AsyncPostgresStore

from config import settings
from api import router
from modules.langgraph import set_checkpointer, set_store, get_compiled_graph
from modules.langgraph.memory_store import MemoryManager, set_memory_manager

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format=settings.LOG_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} 启动中...")
    logger.info(f"📦 OSS Bucket: {settings.OSS_BUCKET}")
    logger.info(f"🔗 DashVector Collection: {settings.DASHVECTOR_COLLECTION}")
    # 根据提供商显示正确的嵌入模型
    provider = settings.EMBEDDING_PROVIDER.lower()
    if provider == "qwen25vl":
        logger.info(f"🤖 Embedding: Qwen2.5-VL-Embedding (维度: {settings.EMBEDDING_DIMENSION})")
    elif provider == "dashscope":
        logger.info(f"🤖 Embedding: DashScope/{settings.DASHSCOPE_EMBEDDING_MODEL} (维度: {settings.EMBEDDING_DIMENSION})")
    else:
        logger.info(f"🤖 Embedding: OpenRouter/{settings.EMBEDDING_MODEL} (维度: {settings.EMBEDDING_DIMENSION})")

    # 初始化 LangGraph Checkpointer（短期记忆）和 Store（长期记忆）
    logger.info(f"🧠 初始化 PostgreSQL 持久化...")
    logger.info(f"📊 PostgreSQL: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}")

    async with (
        AsyncPostgresStore.from_conn_string(settings.postgres_uri) as store,
        AsyncPostgresSaver.from_conn_string(settings.postgres_uri) as checkpointer,
    ):
        # 首次使用时创建表
        await store.setup()
        await checkpointer.setup()

        # 设置全局实例
        set_store(store)
        set_checkpointer(checkpointer)

        # 初始化 MemoryManager（长期记忆管理器）
        memory_manager = MemoryManager(store)
        set_memory_manager(memory_manager)

        logger.info(f"✅ Store（长期记忆）初始化完成")
        logger.info(f"✅ Checkpointer（短期记忆）初始化完成")
        logger.info(f"✅ MemoryManager 初始化完成")

        # 预热：初始化 LangGraph 图和所有智能体
        logger.info("🤖 预热智能体...")
        get_compiled_graph()
        logger.info("✅ 智能体预热完成: Supervisor, Retrieval, Reasoning, Generation, Expression, Quality")

        yield

        # 关闭时
        logger.info("👋 服务正在关闭...")
        set_memory_manager(None)
        set_store(None)
        set_checkpointer(None)


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## AI 教育资料处理服务

本服务用于处理教育资料文件，将其转换为向量并存储到向量数据库中。

### 主要功能

- 📥 从阿里云 OSS 下载文件
- 📄 支持多种文档格式（PDF、Word、PPT、TXT、Markdown）
- ✂️ 智能文本分块
- 🔢 向量化（通过 OpenRouter Embedding API）
- 💾 存储到阿里云 DashVector
- 🔍 向量检索（语义搜索）
- 💬 RAG 问答（检索增强生成）

### 使用流程

**文档处理：**
1. 现有后端上传文件到 OSS
2. 调用本服务的 `/api/process-document` 接口
3. 服务自动完成下载、处理、向量化、存储

**RAG 问答：**
1. 调用 `/api/search` 进行向量检索
2. 调用 `/api/chat` 进行智能问答
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(router, prefix=settings.API_PREFIX, tags=["文档处理"])


@app.get("/", tags=["根路径"])
async def root():
    """根路径，返回服务信息"""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )

