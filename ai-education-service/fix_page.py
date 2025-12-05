#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复 page.tsx 所有乱码"""

with open(r'C:\Users\daowu\Desktop\前端web\app\book-chat-v2\page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 逐行修复
fixes = {
    363: "    // 添加书籍过滤\n",
    488: "            console.log('📦 解析数据:', { currentEvent, dataKeys: Object.keys(data) })\n",
    493: "            console.log('📚 收到 sources:', data.sources?.length, '有效:', validSources.length)\n",
    545: "          console.log('💾 对话已保存:', saveData.data.conversationId)\n",
    924: "                    // Enter 发送模式\n",
    929: "                    // Ctrl+Enter 发送模式\n",
    997: "                      <span>发送</span>\n",
    1007: "                      <span>发送</span>\n",
    1034: "            {/* 右侧 SideNav - 工作区 */}\n",
    1075: '              <span className="text-xs font-medium text-blue-700">📖 参考来源</span>\n',
}

for line_num, new_content in fixes.items():
    if line_num <= len(lines):
        lines[line_num - 1] = new_content

with open(r'C:\Users\daowu\Desktop\前端web\app\book-chat-v2\page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('✅ page.tsx 乱码修复完成！')

