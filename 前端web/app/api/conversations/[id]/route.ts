/**
 * 对话详情 API
 * 获取指定对话的所有消息
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 获取对话详情（包含所有消息）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params

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

    // 获取对话详情，包含所有消息
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            attachments: true,
          },
        },
        book: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: '对话不存在' },
        { status: 404 }
      )
    }

    // 验证对话属于当前用户
    if (conversation.userId !== decoded.userId) {
      return NextResponse.json(
        { success: false, message: '无权访问此对话' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: conversation.id,
        title: conversation.title,
        bookId: conversation.bookId,
        bookName: conversation.book.name,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
          attachments: msg.attachments,
        })),
      },
    })
  } catch (error) {
    console.error('获取对话详情错误:', error)
    return NextResponse.json(
      { success: false, message: '获取对话详情失败' },
      { status: 500 }
    )
  }
}

