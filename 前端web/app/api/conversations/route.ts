/**
 * 对话 API
 * 创建新对话或保存消息到现有对话
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 使用AI生成对话标题（支持 OpenRouter / OpenAI 兼容 API）
async function generateTitle(userMessage: string, assistantMessage: string): Promise<string> {
  try {
    // 支持 OpenRouter 或 OpenAI 兼容的 API
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
    const baseUrl = process.env.OPENROUTER_BASE_URL || process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1'
    const model = process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || 'openai/gpt-4o-mini'

    if (!apiKey) {
      console.warn('⚠️ API_KEY 未配置，使用默认标题')
      return userMessage?.substring(0, 15) || '新对话'
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Book Chat',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个标题生成助手。请用10个字以内总结对话主题，只返回标题文字，不要任何解释、引号或标点符号。'
          },
          {
            role: 'user',
            content: `用户问题：${userMessage}\n\nAI回答：${assistantMessage.substring(0, 300)}`
          }
        ],
        max_tokens: 30,
        temperature: 0.3,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      const title = data.choices?.[0]?.message?.content?.trim()
        .replace(/[。，！？、：；""''【】《》"']/g, '')
        .substring(0, 20)

      if (title && title.length > 0) {
        console.log('🏷️ AI生成标题:', title)
        return title
      }
    } else {
      console.error('AI生成标题请求失败:', response.status, await response.text())
    }
  } catch (error) {
    console.error('AI生成标题失败:', error)
  }

  // 如果AI生成失败，使用用户消息的前15个字符作为备选
  return userMessage?.substring(0, 15) || '新对话'
}

// 创建新对话或添加消息到现有对话
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { conversationId, bookId, userMessage, assistantMessage } = body

    if (!bookId) {
      return NextResponse.json(
        { success: false, message: '缺少教材ID' },
        { status: 400 }
      )
    }

    let conversation

    if (conversationId) {
      // 添加消息到现有对话
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      })

      if (!conversation) {
        return NextResponse.json(
          { success: false, message: '对话不存在' },
          { status: 404 }
        )
      }

      if (conversation.userId !== decoded.userId) {
        return NextResponse.json(
          { success: false, message: '无权访问此对话' },
          { status: 403 }
        )
      }

      // 更新对话的更新时间
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      })
    } else {
      // 创建新对话，使用AI生成标题
      const title = await generateTitle(userMessage || '', assistantMessage || '')

      conversation = await prisma.conversation.create({
        data: {
          userId: decoded.userId,
          bookId: bookId,
          title: title,
        },
      })
    }

    // 保存用户消息
    if (userMessage) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: userMessage,
        },
      })
    }

    // 保存AI回复消息
    if (assistantMessage) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: assistantMessage,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        conversationId: conversation.id,
        title: conversation.title,
      },
    })
  } catch (error) {
    console.error('保存对话错误:', error)
    return NextResponse.json(
      { success: false, message: '保存对话失败' },
      { status: 500 }
    )
  }
}

