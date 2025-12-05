#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复 Next.js 15 API 路由的 params 类型问题
第二轮：修复 params.xxx 的使用
"""

import os
import re

# 前端目录
frontend_dir = r'C:\Users\daowu\Desktop\前端web\app\api'

def fix_params_usage(filepath):
    """修复 params.xxx 的使用"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 检查是否已经是 Promise 类型
    if 'Promise<{' not in content:
        return False

    # 检查是否有 params.xxx 的直接使用（而不是 await params）
    if 'params.' in content and 'await params' not in content:
        # 找到所有 params.xxx 的使用
        # 在函数开头添加 const { xxx } = await params

        # 提取参数名
        param_names = set(re.findall(r'params\.(\w+)', content))
        if param_names:
            # 构建解构语句
            params_str = ', '.join(sorted(param_names))
            await_line = f'    const {{ {params_str} }} = await params\n'

            # 替换 params.xxx 为 xxx
            for name in param_names:
                content = content.replace(f'params.{name}', name)

            # 在 try { 后面添加 await params
            content = re.sub(
                r'(export async function \w+\([^)]+\)\s*\{\s*(?:try\s*\{)?)',
                lambda m: m.group(0) + '\n' + await_line,
                content,
                count=1
            )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    fixed_count = 0

    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if file == 'route.ts':
                filepath = os.path.join(root, file)
                if '[' in filepath:
                    if fix_params_usage(filepath):
                        print(f'✅ 已修复: {filepath}')
                        fixed_count += 1

    print(f'\n共修复 {fixed_count} 个文件')

if __name__ == '__main__':
    main()

