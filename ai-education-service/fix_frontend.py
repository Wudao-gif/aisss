#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复前端文件编码问题 - 逐行处理"""

import re

# 读取文件
with open(r'C:\Users\daowu\Desktop\前端web\app\book-chat-v2\page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 额外修复
lines[178] = '  // 模型相关状态\n'
lines[208] = '        // 找到默认模型\n'
lines[221] = '        // 如果没有默认模型，使用第一个\n'
lines[222] = '        if (!defaultModel && providersData[0]?.models?.length > 0) {\n'
lines[402] = "    // 累积AI回复内容，用于保存到数据库\n"
lines[473] = "            console.log('🏷️ 事件类型:', currentEvent)\n"

# 写回文件
with open(r'C:\Users\daowu\Desktop\前端web\app\book-chat-v2\page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('额外修复完成！')
exit()

# 逐行修复
fixed_lines = []
for i, line in enumerate(lines):
    # 检测是否包含乱码（私有使用区字符或常见乱码模式）
    if re.search(r'[\ue000-\uf8ff]|鍙屾爮|鍒濆鍖|濡傛灉|娣诲姞|榛樿|馃摠|鉁\?|淇濆瓨|瑙ｆ瀽|鎶辨瓑|鍚屾|鏈櫥|鈴革笍|鉂\?|鍔犺浇|浣跨敤|馃摎|馃摉|娓叉煋|绠€鍗|绛夊緟|宸︿晶|璇ヨ祫|璇烽€|鍙充晶|涓崍|鍙戦€|璇尯', line):
        # 这是一行有问题的代码，需要根据行号修复
        line_num = i + 1

        # 根据行号进行特定修复
        if line_num == 5:
            line = ' * 双栏布局：左侧文件预览（顶部资源下拉菜单）、右侧对话区域\n'
        elif line_num == 190:
            line = '  // 引用来源状态\n'
        elif line_num == 192:
            line = '  // 初始化状态\n'
        elif line_num == 197:
            line = '  const messagesRef = useRef<Message[]>([]) // 避免闭包陷阱\n'
        elif line_num == 199:
            line = '  // ==================== 数据加载函数 ====================\n'
        elif line_num == 222:
            line = '        // 如果没有默认模型，使用第一个\n'
        elif line_num == 241:
            line = '      // 添加主教材（只要有 fileUrl 就可以预览）\n'
        elif line_num == 282:
            line = '    // 默认预览主教材\n'
        elif line_num == 468:
            line = "            console.log('📡 SSE 行:', line.substring(0, 80))\n"
        elif line_num == 515:
            line = "                console.log('✅ 回答完成，设置 sources:', pendingSources.length, '个, 累积内容长度:', accumulatedContent.length)\n"
        elif line_num == 522:
            line = '                // 保存对话到数据库\n'
        elif line_num == 553:
            line = "          console.warn('SSE 解析错误:', e, 'data:', dataStr)\n"
        elif line_num == 562:
            line = "            ? { ...msg, content: '抱歉，AI 服务暂时不可用，请稍后重试。' }\n"
        elif line_num == 590:
            line = '  // 同步 messages 到 ref（避免闭包陷阱）\n'
        elif line_num == 595:
            line = '  // 初始化认证状态和书架\n'
        elif line_num == 598:
            line = "      console.log('🔄 初始化认证状态和书架...')\n"
        elif line_num == 603:
            line = "      console.log('✅ 初始化完成')\n"
        elif line_num == 608:
            line = '  // 未登录跳转（只在初始化完成后）\n'
        elif line_num == 610:
            line = "      console.log('⏳ 等待初始化完成...')\n"
        elif line_num == 614:
            line = "      console.log('❌ 未登录，跳转到主页')\n"
        elif line_num == 621:
            line = '  // 加载书籍信息（只在初始化完成后）\n'
        elif line_num == 628:
            line = "        console.log('❌ 没有 bookId，跳转到主页')\n"
        elif line_num == 634:
            line = "        console.log('⏳ 书架为空，等待加载...')\n"
        elif line_num == 638:
            line = "      // 使用 bookId 字段查找（不是 id 字段）\n"
        elif line_num == 639:
            line = "      console.log('📚 书架中的所有书籍:', books.map(b => ({ id: b.id, bookId: b.bookId, name: b.book?.name })))\n"
        elif line_num == 640:
            line = "      console.log('📖 查找书籍结果:', bookshelfItem ? bookshelfItem.book?.name : '未找到')\n"
        elif line_num == 646:
            line = "        console.log('❌ 书籍未找到，bookId:', bookId)\n"
        elif line_num == 671:
            line = '  // ==================== 渲染内容处理 ====================\n'
        elif line_num == 683:
            line = '    // 简单处理：在内容后添加引用标记\n'
        elif line_num == 705:
            line = '  // 等待初始化完成（使用简单 div，避免等待动态组件加载）\n'
        elif line_num == 711:
            line = '          <p className="text-gray-600">初始化中...</p>\n'
        elif line_num == 723:
            line = '          <p className="text-gray-600">加载书籍中...</p>\n'
        elif line_num == 800:
            line = '          {/* 左侧：可拖动预览面板 */}\n'
        elif line_num == 830:
            line = "                <p>{currentPreviewResource ? '该资源暂不支持预览' : '请选择一个资源进行预览'}</p>\n"
        elif line_num == 837:
            line = '          {/* 右侧：对话面板 */}\n'
        elif line_num == 847:
            line = "              if (hour >= 12 && hour < 18) return '中午好，'\n"
        elif line_num == 850:
            line = '              有什么可以帮你的吗？\n'
        elif line_num == 954:
            line = '                    <Tooltip title="创建新话题">\n'
        elif line_num == 961:
            line = '                    {/* 发送按钮组 */}\n'
        elif line_num == 1035:
            line = '                <Tooltip title="思维导图" placement="left">\n'
        elif line_num == 1038:
            line = '                <Tooltip title="知识大纲" placement="left">\n'
        elif line_num == 1044:
            line = '                <Tooltip title="定理讲解" placement="left">\n'
        elif line_num == 1050:
            line = '                <Tooltip title="误区与易错点提醒" placement="left">\n'
        elif line_num == 1088:
            line = '        {/* 历史对话弹窗 */}\n'
        elif line_num == 1092:
            line = '          title="历史对话"\n'
        elif line_num == 1099:
            line = '              加载中...\n'
        elif line_num == 1104:
            line = '              <p className="text-sm">暂无历史对话</p>\n'

    fixed_lines.append(line)

# 写回文件
with open(r'C:\Users\daowu\Desktop\前端web\app\book-chat-v2\page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print('修复完成！')

# 不需要下面的旧代码了
exit()

# 乱码到正确中文的映射 - 完整列表
replacements = [
    # 注释头部
    ('鍙屾爮甯冨眬锛氬乏渚ф枃浠堕瑙堬紙椤堕儴璧勬簮涓嬫媺鑿滃崟锛夈€佸彸渚у璇濆尯鍩?', '双栏布局：左侧文件预览（顶部资源下拉菜单）、右侧对话区域'),
    ('// 寮曠敤鏉ユ簮鐘舵€?', '// 引用来源状态'),
    ('// 鍒濆鍖栫姸鎬?', '// 初始化状态'),
    ('// 閬垮厤闂寘闄烽槺', '// 避免闭包陷阱'),
    ('// ==================== 鏁版嵁鍔犺浇鍑芥暟 ====================', '// ==================== 数据加载函数 ===================='),
    ('// 濡傛灉娌℃湁榛樿妯″瀷锛屼娇鐢ㄧ涓€涓?', '// 如果没有默认模型，使用第一个'),
    ('// 娣诲姞涓绘暀鏉愶紙鍙鏈?fileUrl 灏卞彲浠ラ瑙堬級', '// 添加主教材（只要有 fileUrl 就可以预览）'),
    ('// 榛樿棰勮涓绘暀鏉?', '// 默认预览主教材'),
    ("console.log('馃摠 SSE 琛?', line.substring(0, 80))", "console.log('📡 SSE 行:', line.substring(0, 80))"),
    ("console.log('鉁?鍥炵瓟瀹屾垚锛岃缃?sources:', pendingSources.length, '涓? 绱Н鍐呭闀垮害:', acc", "console.log('✅ 回答完成，设置 sources:', pendingSources.length, '个, 累积内容长度:', acc"),
    ('// 淇濆瓨瀵硅瘽鍒版暟鎹簱', '// 保存对话到数据库'),
    ("console.warn('SSE 瑙ｆ瀽閿欒:', e, 'data:', dataStr)", "console.warn('SSE 解析错误:', e, 'data:', dataStr)"),
    ('鎶辨瓑锛孉I 鏈嶅姟鏆傛椂涓嶅彲鐢紝璇风◢鍚庨噸璇曘€?', '抱歉，AI 服务暂时不可用，请稍后重试。'),
    ('// 鍚屾 messages 鍒?ref锛堥伩鍏嶉棴鍖呴櫡闃憋級', '// 同步 messages 到 ref（避免闭包陷阱）'),
    ('// 鍒濆鍖栬璇佺姸鎬佸拰涔︽灦', '// 初始化认证状态和书架'),
    ("console.log('馃攧 鍒濆鍖栬璇佺姸鎬佸拰涔︽灦...')", "console.log('🔄 初始化认证状态和书架...')"),
    ("console.log('鉁?鍒濆鍖栧畬鎴?)", "console.log('✅ 初始化完成')"),
    ('// 鏈櫥褰曡烦杞紙鍙湪鍒濆鍖栧畬鎴愬悗锛?', '// 未登录跳转（只在初始化完成后）'),
    ("console.log('鈴革笍 绛夊緟鍒濆鍖栧畬鎴?..')", "console.log('⏳ 等待初始化完成...')"),
    ("console.log('鉂?鏈櫥褰曪紝璺宠浆鍒颁富椤?)", "console.log('❌ 未登录，跳转到主页')"),
    ('// 鍔犺浇涔︾睄淇℃伅锛堝彧鍦ㄥ垵濮嬪寲瀹屾垚鍚庯級', '// 加载书籍信息（只在初始化完成后）'),
    ("console.log('鉂?娌℃湁 bookId锛岃烦杞埌涓婚〉')", "console.log('❌ 没有 bookId，跳转到主页')"),
    ('涔︽灦涓虹┖锛岀瓑寰呭姞杞?..', '书架为空，等待加载...'),
    ('// 浣跨敤 bookId 瀛楁鏌ユ壘锛堜笉鏄?id 瀛楁锛?', '// 使用 bookId 字段查找（不是 id 字段）'),
    ("console.log('馃摎 涔︽灦涓殑鎵€鏈変功绫?', books.map(b", "console.log('📚 书架中的所有书籍:', books.map(b"),
    ('鏈壘鍒?', '未找到'),
    ("console.log('鉂?涔︾睄鏈壘鍒帮紝bookId:', bookId)", "console.log('❌ 书籍未找到，bookId:', bookId)"),
    ('// ==================== 娓叉煋鍐呭澶勭悊 ====================', '// ==================== 渲染内容处理 ===================='),
    ('// 绠€鍗曞鐞嗭細鍦ㄥ唴瀹瑰悗娣诲姞寮曠敤鏍囪', '// 简单处理：在内容后添加引用标记'),
    ('// 绛夊緟鍒濆鍖栧畬鎴愶紙浣跨敤绠€鍗?div锛岄伩鍏嶇瓑寰呭姩鎬佺粍浠跺姞杞斤級', '// 等待初始化完成（使用简单 div，避免等待动态组件加载）'),
    ('鍒濆鍖栦腑...', '初始化中...'),
    ('{/* 宸︿晶锛氬彲鎷栧姩棰勮闈㈡澘 */}', '{/* 左侧：可拖动预览面板 */}'),
    ('璇ヨ祫婧愭殏涓嶆敮鎸侀瑙?', '该资源暂不支持预览'),
    ('璇烽€夋嫨涓€涓祫婧愯繘琛岄瑙?', '请选择一个资源进行预览'),
    ('{/* 鍙充晶锛氬璇濋潰鏉?*/}', '{/* 右侧：对话面板 */}'),
    ('涓崍濂斤紝', '中午好，'),
    ('{/* 鍙戦€佹寜閽粍 */}', '{/* 发送按钮组 */}'),
    ('璇尯涓庢槗閿欑偣鎻愰啋', '误区与易错点提醒'),
]

# 执行替换
for old, new in replacements:
    content = content.replace(old, new)

# 写回文件
with open(r'C:\Users\daowu\Desktop\前端web\app\book-chat-v2\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('修复完成！')

