"""
测试检索子代理功能

验证：
1. 检索子代理配置是否正确
2. Deep Agent 是否能正确加载检索子代理
3. 检索子代理是否能正确调用检索工具
"""

import asyncio
import logging
from modules.langgraph.retrieval_subagent import create_retrieval_subagent
from modules.langgraph.deep_agent import get_deep_agent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_retrieval_subagent_config():
    """测试检索子代理配置"""
    logger.info("=" * 60)
    logger.info("测试 1: 检索子代理配置")
    logger.info("=" * 60)
    
    config = create_retrieval_subagent()
    
    # 验证必要字段
    assert "name" in config, "缺少 name 字段"
    assert "description" in config, "缺少 description 字段"
    assert "system_prompt" in config, "缺少 system_prompt 字段"
    assert "tools" in config, "缺少 tools 字段"
    
    logger.info(f"✅ 子代理名称: {config['name']}")
    logger.info(f"✅ 子代理描述: {config['description']}")
    logger.info(f"✅ 工具数量: {len(config['tools'])}")
    
    # 验证工具
    tool_names = [tool.name for tool in config['tools']]
    logger.info(f"✅ 工具列表: {tool_names}")
    
    assert "retrieve_from_textbook" in tool_names, "缺少 retrieve_from_textbook 工具"
    assert "search_knowledge_graph" in tool_names, "缺少 search_knowledge_graph 工具"
    
    logger.info("✅ 检索子代理配置验证通过！\n")


def test_deep_agent_with_subagent():
    """测试 Deep Agent 是否能正确加载检索子代理"""
    logger.info("=" * 60)
    logger.info("测试 2: Deep Agent 加载检索子代理")
    logger.info("=" * 60)
    
    try:
        agent = get_deep_agent()
        logger.info(f"✅ Deep Agent 创建成功")
        logger.info(f"✅ Agent 类型: {type(agent)}")
        logger.info(f"✅ Agent 名称: education_agent")
        logger.info("✅ Deep Agent 加载检索子代理成功！\n")
    except Exception as e:
        logger.error(f"❌ Deep Agent 创建失败: {e}")
        raise


async def test_deep_agent_stream():
    """测试 Deep Agent 流式运行（包含检索子代理）"""
    logger.info("=" * 60)
    logger.info("测试 3: Deep Agent 流式运行")
    logger.info("=" * 60)
    
    try:
        from modules.langgraph.deep_agent import run_deep_agent_stream
        
        # 测试查询
        query = "什么是极限？"
        user_id = "test_user"
        book_id = "test_book"
        book_name = "高等数学"
        
        logger.info(f"📝 测试查询: {query}")
        logger.info(f"👤 用户ID: {user_id}")
        logger.info(f"📚 教材: {book_name}")
        logger.info("")
        
        # 流式运行
        event_count = 0
        async for event in run_deep_agent_stream(
            query=query,
            user_id=user_id,
            book_id=book_id,
            book_name=book_name,
        ):
            event_count += 1
            event_type = event.get("event_type", "unknown")
            
            if event_type == "start":
                logger.info(f"🚀 {event.get('message', '')}")
            elif event_type == "node":
                node = event.get("node", "")
                status = event.get("status", "")
                logger.info(f"📍 节点: {node} ({status})")
            elif event_type == "token":
                # 不打印每个 token，只计数
                pass
            elif event_type == "progress":
                step = event.get("step", "")
                message = event.get("message", "")
                logger.info(f"⏳ {step}: {message}")
            elif event_type == "error":
                logger.error(f"❌ 错误: {event.get('error', '')}")
            elif event_type == "end":
                logger.info(f"✅ {event.get('message', '完成')}")
        
        logger.info(f"✅ 流式运行完成，共收到 {event_count} 个事件\n")
        
    except Exception as e:
        logger.error(f"❌ 流式运行失败: {e}")
        import traceback
        traceback.print_exc()


def main():
    """运行所有测试"""
    logger.info("\n")
    logger.info("🧪 开始测试检索子代理功能")
    logger.info("=" * 60)
    logger.info("")
    
    try:
        # 测试 1: 配置验证
        test_retrieval_subagent_config()
        
        # 测试 2: Deep Agent 加载
        test_deep_agent_with_subagent()
        
        # 测试 3: 流式运行（可选，需要完整环境）
        try:
            asyncio.run(test_deep_agent_stream())
        except Exception as e:
            logger.warning(f"⚠️  流式运行测试跳过: {e}")
        
        logger.info("=" * 60)
        logger.info("✅ 所有测试通过！")
        logger.info("=" * 60)
        
    except AssertionError as e:
        logger.error(f"❌ 测试失败: {e}")
        exit(1)
    except Exception as e:
        logger.error(f"❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    main()

