with open(r'C:/Users/daowu/Documents/GitHub/aisss/ai-education-service/modules/rag_retriever.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复跨行的 f-string
old = '''        if summary:
            full_system_prompt = f"{base_system_prompt}

[之前的对话摘要（这是用户的重要背景，请记住）]
{summary}
[摘要结束]"'''

new = '''        if summary:
            full_system_prompt = f"{base_system_prompt}\\n\\n[之前的对话摘要（这是用户的重要背景，请记住）]\\n{summary}\\n[摘要结束]"'''

content = content.replace(old, new)

with open(r'C:/Users/daowu/Documents/GitHub/aisss/ai-education-service/modules/rag_retriever.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('语法错误已修复')

