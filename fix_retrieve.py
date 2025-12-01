import re

with open(r'C:/Users/daowu/Documents/GitHub/aisss/ai-education-service/modules/rag_retriever.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 旧的 retrieve 方法结尾
old_code = '''        logger.info(f"检索完成，找到 {len(results)} 个相关片段")
        return results'''

# 新的 retrieve 方法结尾（添加相关度阈值过滤）
new_code = '''        # 🆕 新增：过滤掉相关度过低的噪音
        # 阈值建议：0.5 - 0.6 (DashVector 的 score 通常是 0-1 或更高，视距离类型而定)
        # 如果是 Cosine 距离，通常 0.7 以下就很不相关了
        SCORE_THRESHOLD = 0.5 
        
        valid_results = [r for r in results if r.get("score", 0) >= SCORE_THRESHOLD]
        
        logger.info(f"检索完成，原始: {len(results)}，有效(>{SCORE_THRESHOLD}): {len(valid_results)}")
        return valid_results'''

new_content = content.replace(old_code, new_code)

with open(r'C:/Users/daowu/Documents/GitHub/aisss/ai-education-service/modules/rag_retriever.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('修改完成')

