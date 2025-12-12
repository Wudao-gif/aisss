/**
 * 获取用户在指定教材下的历史对话列表
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 获取历史对话列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params

    // 验证用户登录
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '登录已过期' },
        { status: 401 }
      )
    }

    // 获取用户在该教材下的所有对话，按更新时间倒序排列
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: decoded.userId,
        bookId: bookId,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv._count.messages,
      })),
    })
  } catch (error) {
    console.error('获取历史对话列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取历史对话列表失败' },
      { status: 500 }
    )
  }
}

