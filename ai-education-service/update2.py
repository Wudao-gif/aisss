#!/usr/bin/env python3
import re

with open('modules/agentic_rag/stream_workflow.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 修改反思步骤的进度消息
old_reflect = '# 鍙嶆€濊瘎浼?        ctx.write_event_to_stream(ProgressEvent(\n            progress_type=ProgressType.REFLECTING, message="馃 姝ｅ湪璇勪及妫€绱㈢粨鏋?.."\n        ))'

new_reflect = '''# 反思评估
        book_name = await ctx.store.get("book_name")
        if book_name:
            reflect_msg = f"🤔 正在评估《{book_name}》的检索结果..."
        else:
            reflect_msg = "🤔 正在评估检索结果..."
        ctx.write_event_to_stream(ProgressEvent(
            progress_type=ProgressType.REFLECTING, message=reflect_msg
        ))'''

if old_reflect in content:
    content = content.replace(old_reflect, new_reflect)
    print("OK reflect")
else:
    print("NOT FOUND reflect")

with open('modules/agentic_rag/stream_workflow.py', 'w', encoding='utf-8') as f:
    f.write(content)
