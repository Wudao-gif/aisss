"""
初始化 LangGraph 数据库表
在应用启动前运行此脚本，确保所有必要的表都已创建
"""

import asyncio
import logging
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.store.postgres.aio import AsyncPostgresStore
from config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def init_database():
    """初始化数据库表"""
    try:
        logger.info(f"🔧 开始初始化数据库...")
        logger.info(f"📊 PostgreSQL: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}")
        
        # 初始化 Store（长期记忆）
        logger.info("📝 初始化 Store（长期记忆）...")
        async with AsyncPostgresStore.from_conn_string(settings.postgres_uri) as store:
            await store.setup()
            logger.info("✅ Store 初始化完成")
        
        # 初始化 Checkpointer（短期记忆）
        logger.info("📝 初始化 Checkpointer（短期记忆）...")
        async with AsyncPostgresSaver.from_conn_string(settings.postgres_uri) as checkpointer:
            await checkpointer.setup()
            logger.info("✅ Checkpointer 初始化完成")
        
        logger.info("✅ 数据库初始化成功！")
        return True
        
    except Exception as e:
        logger.error(f"❌ 数据库初始化失败: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(init_database())
    exit(0 if success else 1)

