/**
 * AI 聊天恢复 API
 * 处理 Human-in-the-loop 中断后的恢复请求
 * 代理 Python LangGraph 服务的 /api/v4/chat/resume 接口
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '登录已过期，请重新登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { thread_id, decisions } = body

    if (!thread_id) {
      return NextResponse.json(
        { success: false, message: '缺少 thread_id' },
        { status: 400 }
      )
    }

    if (!decisions || !Array.isArray(decisions)) {
      return NextResponse.json(
        { success: false, message: '缺少或无效的 decisions' },
        { status: 400 }
      )
    }

    const userId = decoded.userId || (decoded as any).id || 'anonymous'

    console.log('🔄 [AI Chat Resume] 恢复执行请求:', {
      thread_id,
      user_id: userId,
      decisions_count: decisions.length,
    })

    // 调用 Python LangGraph 服务恢复执行
    const response = await fetch(`${AI_SERVICE_URL}/api/v4/chat/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        thread_id,
        decisions,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [AI Chat Resume] Python 服务返回错误:', response.status, errorText)
      return NextResponse.json(
        { success: false, message: 'AI 服务暂时不可用，请稍后重试' },
        { status: 502 }
      )
    }

    // 转发流式响应
    const reader = response.body?.getReader()
    if (!reader) {
      return NextResponse.json(
        { success: false, message: '无法读取响应' },
        { status: 500 }
      )
    }

    // 创建可读流
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
          controller.close()
        } catch (error) {
          console.error('流处理错误:', error)
          controller.error(error)
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('❌ [AI Chat Resume] 错误:', error)
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    )
  }
}

