/**
 * 手动同步 Letta 记忆到数据库
 * 用于一次性同步已有的 Letta 记忆数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

const LETTA_BASE_URL = process.env.LETTA_BASE_URL || 'http://localhost:8283'
const LETTA_AGENT_ID = process.env.LETTA_AGENT_ID || ''

export async function POST(request: NextRequest) {
  // 简单密钥验证（用于手动触发）
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key !== 'sync123') {
    // 如果没有密钥，尝试管理员验证
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: '需要管理员权限或密钥' }, { status: 401 })
    }
  }

  try {
    // 1. 获取 Letta 记忆块
    const response = await fetch(`${LETTA_BASE_URL}/v1/agents/${LETTA_AGENT_ID}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      return NextResponse.json({ success: false, message: 'Letta API 错误' }, { status: 500 })
    }

    const agent = await response.json()
    const blocks = agent.blocks || []

    let userLearningMemory = null
    for (const block of blocks) {
      if (block.label === 'user_learning_memory') {
        userLearningMemory = block.value
      }
    }

    if (!userLearningMemory) {
      return NextResponse.json({ success: false, message: '没有找到 learning memory' }, { status: 404 })
    }

    // 2. 解析并更新数据库
    const dialogRegex = /- dialog_id:\s*(.+?)(?:\n|$)/g
    const matches = [...userLearningMemory.matchAll(dialogRegex)]
    
    let updatedCount = 0
    const results: { dialogId: string; summary: string; updated: boolean }[] = []

    for (const match of matches) {
      const dialogId = match[1].trim()
      if (!dialogId || dialogId.startsWith('#')) continue

      const startIdx = match.index || 0
      const nextMatch = userLearningMemory.indexOf('- dialog_id:', startIdx + 1)
      const endIdx = nextMatch > 0 ? nextMatch : userLearningMemory.length
      const dialogBlock = userLearningMemory.substring(startIdx, endIdx)

      const summaryMatch = dialogBlock.match(/learning_summary:\s*(.+?)(?:\n|$)/)
      const learningSummary = summaryMatch ? summaryMatch[1].trim() : null

      if (!learningSummary) continue

      try {
        const result = await prisma.userLearning.updateMany({
          where: { dialogId },
          data: { learningSummary },
        })
        
        if (result.count > 0) {
          updatedCount += result.count
          results.push({ dialogId, summary: learningSummary, updated: true })
        } else {
          results.push({ dialogId, summary: learningSummary, updated: false })
        }
      } catch (err) {
        results.push({ dialogId, summary: learningSummary, updated: false })
      }
    }

    return NextResponse.json({
      success: true,
      message: `同步完成，更新了 ${updatedCount} 条记录`,
      data: { updatedCount, totalParsed: matches.length, results },
    })

  } catch (error) {
    console.error('同步失败:', error)
    return NextResponse.json({ success: false, message: '同步失败' }, { status: 500 })
  }
}

