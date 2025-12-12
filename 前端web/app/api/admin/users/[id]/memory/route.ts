/**
 * 管理后台 - 用户记忆 API
 * 从数据库读取用户画像、知识点理解（按教材分组）、学习轨迹、对话记录
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

// 获取用户记忆信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 验证管理员权限
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const { id: userId } = await params

    // 获取用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        realName: true,
        university: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 并行获取所有数据
    const [
      userProfile,
      understandings,
      learnings,
      conversations,
    ] = await Promise.all([
      // 1. 用户画像（全局，不按教材）
      prisma.userProfile.findUnique({
        where: { userId },
      }),
      // 2. 知识点理解（按教材分组）
      prisma.userUnderstanding.findMany({
        where: { userId },
        include: {
          book: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      // 3. 学习轨迹（按教材分组）
      prisma.userLearning.findMany({
        where: { userId },
        include: {
          book: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      // 4. 对话记录（按教材分组，包含消息）
      prisma.conversation.findMany({
        where: { userId },
        include: {
          book: { select: { id: true, name: true } },
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 50, // 每个对话最多取50条消息
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50, // 最多取50个对话
      }),
    ])

    // 按教材分组 Understanding
    const understandingsByBook: Record<string, {
      bookId: string
      bookName: string
      concepts: typeof understandings
    }> = {}

    for (const u of understandings) {
      const bookId = u.bookId || 'unknown'
      const bookName = u.book?.name || '未知教材'
      if (!understandingsByBook[bookId]) {
        understandingsByBook[bookId] = { bookId, bookName, concepts: [] }
      }
      understandingsByBook[bookId].concepts.push(u)
    }

    // 按教材分组 Learning
    const learningsByBook: Record<string, {
      bookId: string
      bookName: string
      records: typeof learnings
    }> = {}

    for (const l of learnings) {
      const bookId = l.bookId || 'unknown'
      const bookName = l.book?.name || '未知教材'
      if (!learningsByBook[bookId]) {
        learningsByBook[bookId] = { bookId, bookName, records: [] }
      }
      learningsByBook[bookId].records.push(l)
    }

    // 按教材分组 Conversations
    const conversationsByBook: Record<string, {
      bookId: string
      bookName: string
      conversations: typeof conversations
    }> = {}

    for (const c of conversations) {
      const bookId = c.bookId || 'unknown'
      const bookName = c.book?.name || '未知教材'
      if (!conversationsByBook[bookId]) {
        conversationsByBook[bookId] = { bookId, bookName, conversations: [] }
      }
      conversationsByBook[bookId].conversations.push(c)
    }

    return NextResponse.json({
      success: true,
      data: {
        user,
        // 用户画像（全局）
        userProfile,
        // 知识点理解（按教材分组）
        understandingsByBook: Object.values(understandingsByBook),
        // 学习轨迹（按教材分组）
        learningsByBook: Object.values(learningsByBook),
        // 对话记录（按教材分组）
        conversationsByBook: Object.values(conversationsByBook),
        // 统计
        stats: {
          totalBooks: new Set([
            ...Object.keys(understandingsByBook),
            ...Object.keys(learningsByBook),
            ...Object.keys(conversationsByBook),
          ]).size,
          totalConcepts: understandings.length,
          totalLearnings: learnings.length,
          totalConversations: conversations.length,
          hasProfile: !!userProfile,
        },
      },
    })
  } catch (error) {
    console.error('获取用户记忆错误:', error)
    return NextResponse.json(
      { success: false, message: '获取用户记忆失败' },
      { status: 500 }
    )
  }
}

