import re

# 用 GBK 读取
with open(r'C:/Users/daowu/Documents/GitHub/aisss/ai-education-service/modules/rag_retriever.py', 'r', encoding='gbk') as f:
    content = f.read()

# 新的 _build_messages 方法
new_method = '''    def _build_messages(
        self,
        query: str,
        context: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        summary: Optional[str] = None
    ) -> list:
        """构建消息列表，支持多轮对话、摘要注入和引用溯源"""
        
        # 1. 动态决定 System Prompt
        # 如果没有参考资料，就把它变成一个纯聊天助手，不要给它"引用"的压力
        if not context or not context.strip():
            base_system_prompt = """你是一个知识渊博、幽默风趣的 AI 伙伴。
你的目标是与用户进行自然、流畅的对话。

【你的行为准则】：
1. **像真人一样聊天**：如果用户跟你打招呼、自我介绍或闲聊，请热情回应，不要在那儿一本正经地找资料。
2. **关注对话历史**：时刻关注上面的[对话历史]，如果用户在回顾之前的对话，请准确回答。
3. **自信回答**：既然现在没有参考资料束缚你，你可以利用你自己的通用知识来回答用户的问题（比如关于英语学习建议、常识等）。
4. **拒绝机械回复**：绝对不要说"参考资料里没有"，因为现在根本就没有参考资料！"""
        else:
            # 如果有参考资料，再启用"严谨模式"
            base_system_prompt = system_prompt or """你是一个专业的 AI 助教。
【重要】：你拥有以下参考资料。请主要基于参考资料回答用户的问题。

【行为准则】：
1. **优先引用**：回答知识点时，请标注[来源X]。
2. **灵活变通**：如果资料里没提到，但你能从常识判断，可以补充说明。
3. **允许闲聊**：如果用户只是想聊天，请忽略参考资料，直接回应。
"""

        # 2. 注入摘要（长期记忆）
        if summary:
            full_system_prompt = f"{base_system_prompt}\\n\\n[之前的对话摘要（这是用户的重要背景，请记住）]\\n{summary}\\n[摘要结束]"
        else:
            full_system_prompt = base_system_prompt

        messages = [{"role": "system", "content": full_system_prompt}]

        # 3. 注入短期历史
        if history:
            for msg in history:
                messages.append({"role": msg["role"], "content": msg["content"]})

        # 4. 【最关键修改】动态构建用户消息
        # 如果没有 context，就不要发"参考资料"这几个字，防止 AI 犯傻
        if context and context.strip():
            final_user_content = f"""### 参考资料（请在回答中引用）：
{context}

---

### 用户问题：
{query}"""
        else:
            # 没资料时，就是纯聊天！
            final_user_content = query

        messages.append({
            "role": "user",
            "content": final_user_content
        })

        return messages

'''

# 使用正则替换 _build_messages 方法
pattern = r'(    def _build_messages\(.*?)(    async def generate_answer\()'
new_content = re.sub(pattern, new_method + r'\2', content, flags=re.DOTALL)

# 写回文件（使用 UTF-8）
with open(r'C:/Users/daowu/Documents/GitHub/aisss/ai-education-service/modules/rag_retriever.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('修改完成')

