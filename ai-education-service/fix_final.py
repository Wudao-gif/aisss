#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""最终修复 page.tsx 所有乱码"""

with open(r'C:\Users\daowu\Desktop\前端web\app\book-chat-v2\page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 逐行修复
fixes = {
    168: "  // 消息相关状态\n",
    172: "  const [inputExpanded, setInputExpanded] = useState(false) // 输入框是否展开\n",
    184: "  // 对话相关状态\n",
    190: "  // 引用来源状态\n",
    621: "      console.log('✅ 已登录')\n",
    638: "      console.log('⏳ 书架为空，等待加载...')\n",
    648: "      setBookshelfItemId(bookshelfItem.id) // 保存书架项目 ID\n",
    692: '          <span className="text-xs text-gray-500 mr-1">参考来源:</span>\n',
    816: "                // PDF 文件使用 ReactPDFViewer\n",
    823: "                  // 其他 Office 文件使用 iframe\n",
}

for line_num, new_content in fixes.items():
    if line_num <= len(lines):
        lines[line_num - 1] = new_content

with open(r'C:\Users\daowu\Desktop\前端web\app\book-chat-v2\page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('✅ 修复完成！')

