"""
OSS 文件下载模块
从阿里云 OSS 下载文件到本地临时目录
"""

import os
import logging
from pathlib import Path
from typing import Optional
import oss2
from tenacity import retry, stop_after_attempt, wait_exponential

from config import settings

logger = logging.getLogger(__name__)


class OSSDownloader:
    """阿里云 OSS 文件下载器"""
    
    def __init__(self):
        """初始化 OSS 客户端"""
        self.auth = oss2.Auth(
            settings.OSS_ACCESS_KEY_ID,
            settings.OSS_ACCESS_KEY_SECRET
        )
        self.bucket = oss2.Bucket(
            self.auth,
            settings.oss_endpoint_url,
            settings.OSS_BUCKET
        )
        self.temp_dir = Path(settings.TEMP_DIR)
        self._ensure_temp_dir()
    
    def _ensure_temp_dir(self):
        """确保临时目录存在"""
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"临时目录已就绪: {self.temp_dir}")
    
    def _get_local_path(self, oss_key: str) -> Path:
        """根据 OSS key 生成本地文件路径"""
        # 使用 OSS key 的文件名部分
        filename = os.path.basename(oss_key)
        return self.temp_dir / filename
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True
    )
    def download(self, oss_key: str, local_path: Optional[str] = None) -> Path:
        """
        从 OSS 下载文件
        
        Args:
            oss_key: OSS 文件路径/key（例如: book-files/xxx.pdf）
            local_path: 可选的本地保存路径，不指定则自动生成
            
        Returns:
            下载后的本地文件路径
            
        Raises:
            oss2.exceptions.NoSuchKey: 文件不存在
            oss2.exceptions.OssError: OSS 操作错误
        """
        # 处理 oss_key，移除可能的 URL 前缀
        if oss_key.startswith("http://") or oss_key.startswith("https://"):
            from urllib.parse import urlparse
            parsed = urlparse(oss_key)
            oss_key = parsed.path.lstrip("/")
        
        # 确定本地保存路径
        if local_path:
            file_path = Path(local_path)
        else:
            file_path = self._get_local_path(oss_key)
        
        logger.info(f"开始下载文件: {oss_key} -> {file_path}")
        
        try:
            # 下载文件
            self.bucket.get_object_to_file(oss_key, str(file_path))
            
            # 验证文件
            if not file_path.exists():
                raise FileNotFoundError(f"下载完成但文件不存在: {file_path}")
            
            file_size = file_path.stat().st_size
            logger.info(f"文件下载成功: {file_path} ({file_size} bytes)")
            
            return file_path
            
        except oss2.exceptions.NoSuchKey:
            logger.error(f"OSS 文件不存在: {oss_key}")
            raise
        except Exception as e:
            logger.error(f"下载文件失败: {oss_key}, 错误: {e}")
            raise
    
    def cleanup(self, file_path: Path):
        """清理临时文件"""
        try:
            if file_path.exists():
                file_path.unlink()
                logger.debug(f"已清理临时文件: {file_path}")
        except Exception as e:
            logger.warning(f"清理临时文件失败: {file_path}, 错误: {e}")
    
    def cleanup_all(self):
        """清理所有临时文件"""
        try:
            for file in self.temp_dir.iterdir():
                if file.is_file():
                    file.unlink()
            logger.info("已清理所有临时文件")
        except Exception as e:
            logger.warning(f"清理临时目录失败: {e}")

