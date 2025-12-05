#!/usr/bin/env python3
with open('modules/agentic_rag/stream_workflow.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'SYNTHESIZING' in line and 'progress_type' in line:
        new_lines = [
            '        book_name = await ctx.store.get("book_name")\n',
            '        if book_name:\n',
            '            synth_msg = f"✨ 正在基于《{book_name}》生成答案..."\n',
            '        else:\n',
            '            synth_msg = "✨ 正在生成答案..."\n',
            '        ctx.write_event_to_stream(ProgressEvent(\n',
            '            progress_type=ProgressType.SYNTHESIZING, message=synth_msg\n',
        ]
        lines[i-1:i+1] = new_lines
        break

with open('modules/agentic_rag/stream_workflow.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Done!')
