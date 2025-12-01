"""
API 依赖项
包含认证、日志等中间件
"""

import logging
from typing import Optional
from fastapi import Header, HTTPException, status

from config import settings

logger = logging.getLogger(__name__)


async def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None)
) -> bool:
    """
    验证 API Key
    
    支持两种方式：
    1. X-API-Key header
    2. Authorization: Bearer <api_key>
    
    如果未配置 API_KEY，则跳过验证（开发模式）
    """
    # 如果未配置 API_KEY，跳过验证
    if not settings.API_KEY:
        logger.warning("API_KEY 未配置，跳过认证验证")
        return True
    
    # 从 header 获取 API Key
    api_key = None
    
    if x_api_key:
        api_key = x_api_key
    elif authorization and authorization.startswith("Bearer "):
        api_key = authorization[7:]
    
    if not api_key:
        logger.warning("请求未提供 API Key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供 API Key"
        )
    
    if api_key != settings.API_KEY:
        logger.warning("无效的 API Key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的 API Key"
        )
    
    return True

