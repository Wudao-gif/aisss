/**
 * Letta 记忆同步 API
 * 1. 发送对话给 Letta Memory Agent 进行智能分析
 * 2. 等待 Letta 返回后，读取更新的记忆块
 * 3. 解析记忆块内容，按 bookId 写入数据库
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// Letta 服务配置
const LETTA_BASE_URL = process.env.LETTA_BASE_URL || 'http://localhost:8283'
const LETTA_AGENT_ID = process.env.LETTA_AGENT_ID || ''

// 从 Letta 获取记忆块
async function getLettaMemoryBlocks(): Promise<{
  userProfile: string | null
  userUnderstanding: string | null
  userLearning: string | null
}> {
  try {
    const response = await fetch(`${LETTA_BASE_URL}/v1/agents/${LETTA_AGENT_ID}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      console.error('Letta API error:', response.status)
      return { userProfile: null, userUnderstanding: null, userLearning: null }
    }

    const agent = await response.json()
    const blocks = agent.blocks || []

    let userProfile = null
    let userUnderstanding = null
    let userLearning = null

    for (const block of blocks) {
      if (block.label === 'user_profile_memory') userProfile = block.value
      else if (block.label === 'user_understanding_memory') userUnderstanding = block.value
      else if (block.label === 'user_learning_memory') userLearning = block.value
    }

    return { userProfile, userUnderstanding, userLearning }
  } catch (error) {
    console.error('Failed to fetch Letta memory:', error)
    return { userProfile: null, userUnderstanding: null, userLearning: null }
  }
}

// 解析 Understanding Memory 并入库
async function syncUnderstandingToDb(userId: string, bookId: string | null, memoryContent: string) {
  if (!memoryContent) {
    console.log('📚 [Letta Sync] 没有 understanding memory 内容')
    return
  }

  // 解析格式：找到知识点条目
  // 格式示例：
  // - concept_name: 极限的定义
  //   book_id: xxx (可能为空)
  //   understanding_score: 2
  //   understanding_summary: ...
  //   misconceptions: ...

  const conceptRegex = /- concept_name:\s*(.+?)(?:\n|$)/g
  const matches = [...memoryContent.matchAll(conceptRegex)]

  console.log(`📚 [Letta Sync] 解析到 ${matches.length} 个知识点, 传入的 bookId: ${bookId}`)

  for (const match of matches) {
    const conceptName = match[1].trim()
    if (!conceptName || conceptName.startsWith('#')) continue

    // 提取该知识点的详细信息
    const startIdx = match.index || 0
    const nextMatch = memoryContent.indexOf('- concept_name:', startIdx + 1)
    const endIdx = nextMatch > 0 ? nextMatch : memoryContent.length
    const conceptBlock = memoryContent.substring(startIdx, endIdx)

    // 解析各字段
    const scoreMatch = conceptBlock.match(/understanding_score:\s*(\d+)/)
    const summaryMatch = conceptBlock.match(/understanding_summary:\s*(.+?)(?:\n|$)/)
    const misconceptionsMatch = conceptBlock.match(/misconceptions:\s*(.+?)(?:\n|$)/)
    const conceptDescMatch = conceptBlock.match(/concept_description:\s*(.+?)(?:\n|$)/)
    // 从 Letta 记忆中解析 book_id
    const bookIdMatch = conceptBlock.match(/book_id:\s*(.+?)(?:\n|$)/)
    const parsedBookId = bookIdMatch && bookIdMatch[1].trim() ? bookIdMatch[1].trim() : null

    const score = scoreMatch ? parseInt(scoreMatch[1]) : 1
    const summary = summaryMatch ? summaryMatch[1].trim() : null
    const misconceptions = misconceptionsMatch ? misconceptionsMatch[1].trim() : null
    const conceptDescription = conceptDescMatch ? conceptDescMatch[1].trim() : null
    // 优先使用 Letta 记忆中的 book_id，否则使用传入的 bookId
    const finalBookId = parsedBookId || bookId

    console.log(`📝 [Letta Sync] 处理知识点: ${conceptName}, bookId: ${finalBookId}, score: ${score}`)

    // 如果没有 bookId，跳过（因为唯一约束需要 bookId）
    if (!finalBookId) {
      console.warn(`⚠️ [Letta Sync] 知识点 ${conceptName} 没有 bookId，跳过`)
      continue
    }

    try {
      await prisma.userUnderstanding.upsert({
        where: {
          userId_bookId_conceptName: { userId, bookId: finalBookId, conceptName }
        },
        create: {
          userId,
          bookId: finalBookId,
          conceptName,
          conceptDescription,
          understandingScore: score,
          understandingSummary: summary,
          misconceptions,
        },
        update: {
          conceptDescription: conceptDescription || undefined,
          understandingScore: score,
          understandingSummary: summary,
          misconceptions,
        },
      })
      console.log(`✅ [Letta Sync] 知识点已入库: ${conceptName}`)
    } catch (err) {
      console.warn(`⚠️ [Letta Sync] 知识点入库失败: ${conceptName}`, err)
    }
  }
}

// 解析 Learning Memory 并更新数据库中的 learningSummary
async function syncLearningToDb(memoryContent: string) {
  if (!memoryContent) {
    console.log('📝 [Letta Sync] 没有 learning memory 内容')
    return
  }

  // 解析格式：
  // - dialog_id: xxx
  //   book_id: xxx
  //   user_query_summary: xxx
  //   ai_response_summary: xxx
  //   learning_summary: xxx  ← 这是我们需要的
  //   start_time: xxx

  const dialogRegex = /- dialog_id:\s*(.+?)(?:\n|$)/g
  const matches = [...memoryContent.matchAll(dialogRegex)]

  console.log(`📝 [Letta Sync] 解析到 ${matches.length} 条学习轨迹`)

  for (const match of matches) {
    const dialogId = match[1].trim()
    if (!dialogId || dialogId.startsWith('#')) continue

    // 提取该对话的详细信息
    const startIdx = match.index || 0
    const nextMatch = memoryContent.indexOf('- dialog_id:', startIdx + 1)
    const endIdx = nextMatch > 0 ? nextMatch : memoryContent.length
    const dialogBlock = memoryContent.substring(startIdx, endIdx)

    // 解析 learning_summary
    const summaryMatch = dialogBlock.match(/learning_summary:\s*(.+?)(?:\n|$)/)
    const learningSummary = summaryMatch ? summaryMatch[1].trim() : null

    if (!learningSummary) continue

    console.log(`📝 [Letta Sync] 更新学习总结: dialogId=${dialogId.slice(0, 8)}..., summary=${learningSummary.slice(0, 30)}...`)

    try {
      // 根据 dialogId 更新 UserLearning 记录（不需要 userId，dialogId 是唯一的）
      const result = await prisma.userLearning.updateMany({
        where: { dialogId },
        data: { learningSummary },
      })
      if (result.count > 0) {
        console.log(`✅ [Letta Sync] 学习总结已更新: ${dialogId.slice(0, 8)}... (${result.count} 条)`)
      }
    } catch (err) {
      console.warn(`⚠️ [Letta Sync] 学习总结更新失败: ${dialogId}`, err)
    }
  }
}

// 解析 User Profile 并入库
async function syncProfileToDb(userId: string, memoryContent: string) {
  if (!memoryContent) return

  const parseField = (field: string): string | null => {
    const regex = new RegExp(`- ${field}:\\s*(.+?)(?:\\n|$)`)
    const match = memoryContent.match(regex)
    return match ? match[1].trim() : null
  }

  const parseIntField = (field: string): number => {
    const value = parseField(field)
    return value ? parseInt(value) || 0 : 0
  }

  // 构建完整的用户画像数据
  const profileData = {
    // 基础画像
    grade: parseField('grade'),
    major: parseField('major'),
    age: parseIntField('age') || null,
    learningGoal: parseField('learning_goal'),
    examDeadline: parseField('exam_deadline') ? new Date(parseField('exam_deadline')!) : null,
    languagePreference: parseField('language_preference') || '中文',
    tonePreference: parseField('tone_preference'),
    learningStylePreference: parseField('learning_style_preference'),
    // 理科能力
    mathSkill: parseIntField('math_skill'),
    derivationSkill: parseIntField('derivation_skill'),
    symbolSkill: parseIntField('symbol_skill'),
    graphSkill: parseIntField('graph_skill'),
    abstractSkill: parseIntField('abstract_skill'),
    // 工科能力
    appliedMathSkill: parseIntField('applied_math_skill'),
    modelingSkill: parseIntField('modeling_skill'),
    systemThinkingSkill: parseIntField('system_thinking_skill'),
    spatialSkill: parseIntField('spatial_skill'),
    codingSkill: parseIntField('coding_skill'),
    // 医学能力
    medicalTermsSkill: parseIntField('medical_terms_skill'),
    medicalImageSkill: parseIntField('medical_image_skill'),
    clinicalReasoningSkill: parseIntField('clinical_reasoning_skill'),
    bioFoundationSkill: parseIntField('bio_foundation_skill'),
    memorySkillMedical: parseIntField('memory_skill_medical'),
    // 文科能力
    readingSkill: parseIntField('reading_skill'),
    expressionSkill: parseIntField('expression_skill'),
    logicSkill: parseIntField('logic_skill'),
    criticalThinkingSkill: parseIntField('critical_thinking_skill'),
    memorySkillHumanities: parseIntField('memory_skill_humanities'),
    // 语言能力
    englishReadingSkill: parseIntField('english_reading_skill'),
    englishExpressionSkill: parseIntField('english_expression_skill'),
    // 偏好画像
    examplePreference: parseField('example_preference'),
    explanationDepthPreference: parseField('explanation_depth_preference'),
    teachingStylePreference: parseField('teaching_style_preference'),
  }

  try {
    await prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
    })
    console.log('✅ [Letta Sync] 用户画像已入库')
  } catch (err) {
    console.warn('⚠️ [Letta Sync] 用户画像入库失败:', err)
  }
}

// POST 处理函数
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ success: false, message: '请先登录' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: '登录已过期' }, { status: 401 })
    }

    const body = await request.json()
    const { user_id, book_id, book_name, dialog_id, user_message, assistant_message } = body

    if (!user_message || !assistant_message) {
      return NextResponse.json({ success: false, message: '缺少对话内容' }, { status: 400 })
    }

    const userId = user_id || (decoded as any).userId || (decoded as any).id

    // 1. 保存原始学习轨迹到数据库
    try {
      await prisma.userLearning.create({
        data: {
          userId,
          bookId: book_id || null,
          dialogId: dialog_id || null,
          userQuerySummary: user_message.substring(0, 500),
          aiResponseSummary: assistant_message.substring(0, 500),
        },
      })
      console.log('💾 [Letta Sync] 学习轨迹已保存到数据库')
    } catch (dbError) {
      console.warn('⚠️ [Letta Sync] 保存学习轨迹失败:', dbError)
    }

    // 2. 调用 Letta API 进行智能记忆分析
    const memoryUpdatePrompt = `
[系统指令：请分析以下对话并更新用户记忆]

用户ID: ${userId}
教材ID: ${book_id || 'unknown'}
教材名称: ${book_name || 'unknown'}
对话ID: ${dialog_id || 'unknown'}

用户问题：${user_message}

AI回答：${assistant_message}

请根据以上对话：
1. 更新 user_learning_memory（学习轨迹）
2. 如果用户提到了对某个知识点的理解或困惑，更新 user_understanding_memory
3. 如果用户透露了个人信息（年级、专业等），更新 user_profile_memory
`

    console.log('🧠 [Letta Sync] 发送记忆更新请求', { user_id: userId, book_id, dialog_id })

    // 调用 Letta API 并等待响应
    try {
      const lettaResponse = await fetch(`${LETTA_BASE_URL}/v1/agents/${LETTA_AGENT_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: memoryUpdatePrompt }] }),
      })

      if (lettaResponse.ok) {
        console.log('✅ [Letta Sync] Letta 记忆更新成功')

        // 3. 读取更新后的记忆块
        const memoryBlocks = await getLettaMemoryBlocks()

        // 4. 解析并入库
        if (memoryBlocks.userProfile) {
          await syncProfileToDb(userId, memoryBlocks.userProfile)
        }

        if (memoryBlocks.userUnderstanding) {
          await syncUnderstandingToDb(userId, book_id, memoryBlocks.userUnderstanding)
        }

        // 解析 learning memory 并更新 learningSummary
        if (memoryBlocks.userLearning) {
          await syncLearningToDb(memoryBlocks.userLearning)
        }

        console.log('✅ [Letta Sync] 记忆已同步到数据库')
      } else {
        console.warn('⚠️ [Letta Sync] Letta API 返回错误:', lettaResponse.status)
      }
    } catch (lettaError) {
      console.warn('⚠️ [Letta Sync] Letta 调用失败:', lettaError)
    }

    return NextResponse.json({ success: true, message: '记忆同步完成' })

  } catch (error) {
    console.error('❌ [Letta Sync] 请求失败:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Letta 服务请求失败' },
      { status: 500 }
    )
  }
}

