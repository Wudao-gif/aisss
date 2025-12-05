#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复 route.ts 文件编码问题"""

import re

# 读取文件
with open(r'C:\Users\daowu\Desktop\前端web\app\api\ai\chat\route.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 逐行修复
fixed_lines = []
for i, line in enumerate(lines):
    line_num = i + 1
    
    # 根据行号进行特定修复
    if line_num == 2:
        line = ' * AI 问答 API\n'
    elif line_num == 3:
        line = ' * 代理 Python Agentic RAG 服务的 /api/v3/chat/stream 接口（流式输出，包含知识图谱）\n'
    elif line_num == 12:
        line = '    // 验证用户登录\n'
    elif line_num == 18:
        line = "        { success: false, message: '请先登录' },\n"
    elif line_num == 26:
        line = "        { success: false, message: '登录已过期，请重新登录' },\n"
    elif line_num == 36:
        line = "        { success: false, message: '请输入问题' },\n"
    elif line_num == 41:
        line = '    // 优先使用前端传来的 user_id，否则从 token 中提取\n'
    elif line_num == 43:
        line = "    console.log('🤖 [AI Chat] Agentic RAG 问答请求:', {\n"
    elif line_num == 47:
        line = "      filter_expr: filter_expr ? '已设置' : '无',\n"
    elif line_num == 52:
        line = '    // 调用 Python Agentic RAG 服务（v3，包含知识图谱）\n'
    elif line_num == 71:
        line = "      console.error('❌ [AI Chat] Python 服务返回错误:', response.status, errorText)\n"
    elif line_num == 73:
        line = "        { success: false, message: 'AI 服务暂时不可用，请稍后重试' },\n"
    elif line_num == 78:
        line = '    // 转换 v3 格式为 v1 格式（保持前端兼容）\n'
    elif line_num == 82:
        line = "        { success: false, message: '无法获取响应流' },\n"
    elif line_num == 100:
        line = '          // 处理剩余 buffer\n'
    elif line_num == 102:
        line = "            console.log('🔍 [AI Chat] 剩余 buffer:', buffer.substring(0, 100))\n"
    elif line_num == 104:
        line = "          console.log('🏁 [AI Chat] 流读取完成, 共', chunkCount, '个 chunks,', contentCount, '个 content')\n"
    elif line_num == 113:
        line = "            console.log(`📦 [AI Chat] Chunk ${chunkCount}:`, chunk.substring(0, 200).replace(/\\n/g, '\\\\n'))\n"
    elif line_num == 118:
        line = '            // 按双换行分割（SSE 消息以 \\n\\n 结尾）\n'
    elif line_num == 124:
        line = '              // 提取 data: 行\n'
    elif line_num == 133:
        line = '                // 转换 v3 格式为 v1 格式\n'
    elif line_num == 140:
        line = "                    console.log('📚 [AI Chat] 转发 sources:', data.data?.length, '个')\n"
    elif line_num == 149:
        line = "                    console.log('✅ [AI Chat] 转发 done 事件')\n"
    elif line_num == 161:
        line = "                    console.error('❌ [AI Chat] 收到错误:', data.message)\n"
    elif line_num == 165:
        line = "                // 解析失败，忽略\n"
    elif line_num == 166:
        line = "                console.warn('⚠️ [AI Chat] JSON 解析失败:', dataStr.substring(0, 100))\n"
    elif line_num == 170:
        line = "        console.error('❌ [AI Chat] 流处理错误:', error)\n"
    elif line_num == 185:
        line = "    console.error('❌ [AI Chat] 请求失败:', error)\n"
    elif line_num == 189:
        line = "      message: error instanceof Error ? error.message : 'AI 服务请求失败'\n"
    
    fixed_lines.append(line)

# 写回文件
with open(r'C:\Users\daowu\Desktop\前端web\app\api\ai\chat\route.ts', 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print('route.ts 修复完成！')

