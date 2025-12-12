#!/usr/bin/env python3
"""
测试 interrupt() 函数在 memory_write 工具中的工作
"""

import asyncio
import logging
from modules.langgraph.deep_agent import run_deep_agent_stream

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


async def test_hitl_interrupt():
    """测试 HITL 中断"""
    print("\n" + "="*60)
    print("测试 HITL 中断功能")
    print("="*60 + "\n")
    
    query = "保存我的学习笔记：今天学习了 HITL 功能"
    user_id = "test_user_123"
    book_id = "test_book_456"
    book_name = "测试教材"
    
    print(f"📝 发送查询: {query}")
    print(f"👤 用户ID: {user_id}")
    print(f"📚 教材ID: {book_id}\n")
    
    event_count = 0
    interrupt_detected = False
    
    async for event in run_deep_agent_stream(
        query=query,
        user_id=user_id,
        book_id=book_id,
        book_name=book_name,
    ):
        event_count += 1
        event_type = event.get("event_type")
        
        print(f"[事件 {event_count}] 类型: {event_type}")
        
        if event_type == "interrupt":
            interrupt_detected = True
            print(f"  ✅ 检测到 HITL 中断！")
            print(f"  📋 中断数据: {event.get('interrupt')}")
        elif event_type == "start":
            print(f"  📌 {event.get('message')}")
        elif event_type == "node":
            print(f"  🔄 节点: {event.get('node')}, 状态: {event.get('status')}")
        elif event_type == "answer":
            print(f"  💬 回答: {event.get('content')[:100]}...")
        elif event_type == "error":
            print(f"  ❌ 错误: {event.get('error')}")
        elif event_type == "progress":
            print(f"  📊 进度: {event.get('message')}")
    
    print(f"\n总事件数: {event_count}")
    print(f"中断检测: {'✅ 是' if interrupt_detected else '❌ 否'}")
    
    if interrupt_detected:
        print("\n✅ HITL 中断测试成功！")
    else:
        print("\n❌ HITL 中断测试失败 - 没有检测到中断")


if __name__ == "__main__":
    asyncio.run(test_hitl_interrupt())

