$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# System Prompt
$systemPrompt = @"
<base_instructions>
你是一个教育学习记忆智能体，负责分析用户与AI助教的对话，维护以下三类记忆：

1. **用户画像 (user_profile_memory)**
   - 记录用户基本信息（年级、专业、年龄等）
   - 记录学习目标和偏好
   - 当用户提供新信息时更新相应字段

2. **知识点理解 (user_understanding_memory)**
   - 一个知识点 = 一条记录（不要重复）
   - 根据用户的回答和表现来评估理解程度
   - 理解分数：0=未学习, 1=初步了解, 2=基本掌握, 3=熟练
   - 如果用户对同一知识点有新的表现，更新已有记录，不要新增

3. **学习轨迹 (user_learning_memory)**
   - 按教材分组，每本教材最多保留5条记录
   - 一次对话会话（用户打开对话到关闭对话）= 1条记录
   - 记录格式：简短总结用户本次会话学了什么
   - 超过5条时，删除最旧的记录

记忆编辑原则：
- 日期时间写具体日期（如2025-12-07），不要写"今天"
- 精简记录，不要冗长
- 闲聊和无关内容不需要记录
- 没有有意义的更新时，直接调用finish工具

行号说明：查看记忆块时显示行号帮助定位，编辑时不要包含行号。
</base_instructions>
"@

$body = @{ system = $systemPrompt } | ConvertTo-Json -Depth 3
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Invoke-RestMethod -Uri "http://localhost:8283/v1/agents/agent-bd0d5ebe-49cb-4962-a812-b5199054c1f0" -Method Patch -ContentType "application/json; charset=utf-8" -Body $bytes

Write-Host "System Prompt updated"

# Learning Memory
$learningMemory = @"
# 学习轨迹 - 按教材分组，每本教材最多5条

## 毛泽东思想和中国特色社会主义理论体系概论
book_id: 8bba2c38-cd14-42cb-b931-f4c40894de03
1. 学习马克思主义中国化时代化的定义和核心要素 (2025-12-07)
2. 了解历史自信与文化自信 (2025-12-07)
"@

$body2 = @{ value = $learningMemory } | ConvertTo-Json -Depth 3
$bytes2 = [System.Text.Encoding]::UTF8.GetBytes($body2)

Invoke-RestMethod -Uri "http://localhost:8283/v1/blocks/block-9c0c9cce-7acd-4b08-97e2-e6738f28feb5" -Method Patch -ContentType "application/json; charset=utf-8" -Body $bytes2

Write-Host "Learning Memory updated"

# Understanding Memory
$understandingMemory = @"
# 知识点理解 - 一个知识点一条记录

- concept_name: 马克思主义中国化时代化
  book_id: 8bba2c38-cd14-42cb-b931-f4c40894de03
  understanding_score: 2
  understanding_summary: 了解定义、核心要素及实践意义
  last_updated_at: 2025-12-07

- concept_name: 导数与复合函数求导
  book_id: 
  understanding_score: 1
  understanding_summary: 理解导数是切线斜率，链式法则不熟练
  last_updated_at: 2025-12-07

- concept_name: 极限的定义
  book_id: 
  understanding_score: 1
  understanding_summary: 了解ε-δ定义但理解困难
  last_updated_at: 2025-12-07
"@

$body3 = @{ value = $understandingMemory } | ConvertTo-Json -Depth 3
$bytes3 = [System.Text.Encoding]::UTF8.GetBytes($body3)

Invoke-RestMethod -Uri "http://localhost:8283/v1/blocks/block-91008d87-e480-4db4-8f83-f148d631d54d" -Method Patch -ContentType "application/json; charset=utf-8" -Body $bytes3

Write-Host "Understanding Memory updated"
Write-Host "All done!"

