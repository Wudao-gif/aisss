#!/usr/bin/env python3
"""修改 stream_workflow.py 以支持 book_name"""

import re

def main():
    with open('modules/agentic_rag/stream_workflow.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. 修改 route 函数开头，添加 book_name 支持
    old_route_start = '''async def route(self, ctx: Context, ev: StartEvent) -> RouteDecisionEvent | StopEvent:
        """姝ラ1: 璺敱鍐崇瓥"""
        query = ev.query
        history = getattr(ev, 'history', None) or []'''
    
    new_route_start = '''async def route(self, ctx: Context, ev: StartEvent) -> RouteDecisionEvent | StopEvent:
        """步骤1: 路由决策 - 基于教材上下文判断问题类型"""
        query = ev.query
        history = getattr(ev, 'history', None) or []
        book_name = getattr(ev, 'book_name', None)  # 获取教材名称
        
        # 存储 book_name 供后续步骤使用
        await ctx.store.set("book_name", book_name)'''
    
    if old_route_start in content:
        content = content.replace(old_route_start, new_route_start)
        print("✅ 修改 route 函数开头成功")
    else:
        print("❌ 未找到 route 函数开头")
    
    # 2. 修改进度消息
    old_progress = '''ctx.write_event_to_stream(ProgressEvent(
            progress_type=ProgressType.ROUTING,
            message="馃 姝ｅ湪鍒嗘瀽鎮ㄧ殑闂...",
            detail=f"闂: {query[:50]}..."
        ))'''
    
    new_progress = '''# 构建进度消息
        if book_name:
            progress_msg = f"🎯 正在分析您关于《{book_name}》的问题..."
        else:
            progress_msg = "🎯 正在分析您的问题..."

        ctx.write_event_to_stream(ProgressEvent(
            progress_type=ProgressType.ROUTING,
            message=progress_msg,
            detail=f"问题: {query[:50]}..."
        ))'''
    
    if old_progress in content:
        content = content.replace(old_progress, new_progress)
        print("✅ 修改进度消息成功")
    else:
        print("❌ 未找到进度消息")
    
    # 3. 修改检索进度消息
    old_search = '''ctx.write_event_to_stream(ProgressEvent(
                    progress_type=ProgressType.SEARCHING,
                    message="馃攳 姝ｅ湪妫€绱㈢浉鍏宠祫鏂?.."
                ))'''
    
    new_search = '''# 获取 book_name 用于进度显示
                book_name = await ctx.store.get("book_name")
                if book_name:
                    search_msg = f"🔍 正在查阅《{book_name}》相关资料..."
                else:
                    search_msg = "🔍 正在检索相关资料..."
                ctx.write_event_to_stream(ProgressEvent(
                    progress_type=ProgressType.SEARCHING,
                    message=search_msg
                ))'''
    
    if old_search in content:
        content = content.replace(old_search, new_search)
        print("✅ 修改检索进度消息成功")
    else:
        print("❌ 未找到检索进度消息")
    
    # 4. 修改反思进度消息
    old_reflect = '''ctx.write_event_to_stream(ProgressEvent(
            progress_type=ProgressType.REFLECTING, message="馃 姝ｅ湪璇勪及妫€绱㈢粨鏋?.."
        ))'''
    
    new_reflect = '''book_name = await ctx.store.get("book_name")
        if book_name:
            reflect_msg = f"🤔 正在评估《{book_name}》的检索结果..."
        else:
            reflect_msg = "🤔 正在评估检索结果..."
        ctx.write_event_to_stream(ProgressEvent(
            progress_type=ProgressType.REFLECTING, message=reflect_msg
        ))'''
    
    if old_reflect in content:
        content = content.replace(old_reflect, new_reflect)
        print("✅ 修改反思进度消息成功")
    else:
        print("❌ 未找到反思进度消息")
    
    # 写回文件
    with open('modules/agentic_rag/stream_workflow.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("\n文件修改完成!")

if __name__ == "__main__":
    main()

