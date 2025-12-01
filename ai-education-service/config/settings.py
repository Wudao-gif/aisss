"""
应用配置设置
使用 Pydantic Settings 管理配置，支持环境变量和 .env 文件
"""

from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置类"""
    
    # ==================== 应用基础配置 ====================
    APP_NAME: str = "AI Education Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api"
    
    # API认证配置
    API_KEY: Optional[str] = None  # 用于验证来自现有后端的请求
    
    # ==================== 阿里云 OSS 配置 ====================
    OSS_ACCESS_KEY_ID: str
    OSS_ACCESS_KEY_SECRET: str
    OSS_REGION: str = "oss-cn-hangzhou"
    OSS_BUCKET: str  # 私有Bucket（存储教育资料文件）
    OSS_ENDPOINT: Optional[str] = None  # 可选，自定义endpoint
    
    # ==================== OpenRouter 配置 ====================
    OPENROUTER_API_KEY: str
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_SITE_URL: Optional[str] = None  # 可选，用于排名
    OPENROUTER_SITE_NAME: Optional[str] = None  # 可选，用于排名
    
    # Embedding模型配置
    EMBEDDING_MODEL: str = "openai/text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1024  # DashVector Collection Ooo11 配置的维度
    EMBEDDING_BATCH_SIZE: int = 10  # 批次大小

    # Chat模型配置（用于RAG问答）
    CHAT_MODEL: str = "openai/gpt-4o-mini"  # 默认使用 GPT-4o-mini，性价比高

    # ==================== 阿里云 DashVector 配置 ====================
    # 华北3(张家口) 集群: Dao123_
    DASHVECTOR_API_KEY: str
    DASHVECTOR_ENDPOINT: str  # 格式: vrs-cn-xxx.dashvector.cn-zhangjiakou.aliyuncs.com
    DASHVECTOR_COLLECTION: str = "Ooo11"  # 集合名称，1024维，Cosine度量
    
    # ==================== LlamaIndex 配置 ====================
    # 文档分块配置
    CHUNK_SIZE: int = 512  # 每个文本块的大小
    CHUNK_OVERLAP: int = 50  # 文本块之间的重叠
    
    # ==================== LlamaParse 配置 ====================
    LLAMA_CLOUD_API_KEY: Optional[str] = None

    # ==================== 处理配置 ====================
    # 临时文件目录
    TEMP_DIR: str = "./temp"

    # 支持的文件类型
    SUPPORTED_FILE_TYPES: str = "pdf,doc,docx,ppt,pptx,txt,md"

    # 重试配置
    MAX_RETRIES: int = 3
    RETRY_DELAY: float = 1.0  # 秒

    # ==================== Redis 配置（对话摘要存储）====================
    REDIS_URL: Optional[str] = None  # 格式: redis://localhost:6379/0

    # 对话摘要配置
    SUMMARY_TOKEN_THRESHOLD: int = 2000  # 触发压缩的 Token 阈值
    SUMMARY_CHAR_THRESHOLD: int = 3000   # 触发压缩的中文字符阈值
    SUMMARY_EXPIRE_SECONDS: int = 86400 * 7  # 摘要过期时间：7天

    # ==================== 日志配置 ====================
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
    
    @property
    def oss_endpoint_url(self) -> str:
        """获取OSS endpoint URL"""
        if self.OSS_ENDPOINT:
            return self.OSS_ENDPOINT
        return f"https://{self.OSS_REGION}.aliyuncs.com"
    
    @property
    def supported_extensions(self) -> list[str]:
        """获取支持的文件扩展名列表"""
        return [ext.strip().lower() for ext in self.SUPPORTED_FILE_TYPES.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


# 全局配置实例
settings = get_settings()

