/**
 * AI 问答 API
 * 代理 Python LangGraph 多智能体 服务的 /api/v4/chat/stream 接口（流式输出，包含知识图谱）
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
    const { question, user_id, book_id, book_name, filter_expr, top_k = 5, history = [] } = body

    if (!question) {
      return NextResponse.json(
        { success: false, message: '请输入问题' },
        { status: 400 }
      )
    }

    // 优先使用前端传来的 user_id，否则从 token 中提取
    const userId = user_id || decoded.userId || (decoded as any).id || 'anonymous'

    console.log('🤖 [AI Chat] LangGraph 多智能体 问答请求:', {
      question: question.substring(0, 50) + '...',
      user_id: userId,
      book_id,
      filter_expr: filter_expr ? '已设置' : '无',
      top_k,
      historyCount: history.length,
    })

    // 调用 Python LangGraph 多智能体 服务（v4，包含知识图谱）
    const response = await fetch(`${AI_SERVICE_URL}/api/v4/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        user_id: userId,
        book_id: book_id,
        book_name: book_name,
        top_k,
        filter_expr: filter_expr,
        history: history,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [AI Chat] Python 服务返回错误:', response.status, errorText)
      return NextResponse.json(
        { success: false, message: 'AI 服务暂时不可用，请稍后重试' },
        { status: 502 }
      )
    }

    // 转换 v4 格式为 v1 格式（保持前端兼容）
    const reader = response.body?.getReader()
    if (!reader) {
      return NextResponse.json(
        { success: false, message: '无法获取响应流' },
        { status: 500 }
      )
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = ''
        let contentCount = 0
        let chunkCount = 0

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              // 处理剩余 buffer
              if (buffer.trim()) {
                console.log('🔍 [AI Chat] 剩余 buffer:', buffer.substring(0, 100))
              }
              console.log('🏁 [AI Chat] 流读取完成, 共', chunkCount, '个 chunks,', contentCount, '个 content')
              break
            }

            chunkCount++
            const chunk = decoder.decode(value, { stream: true })

            // 调试：打印前几个 chunk
            if (chunkCount <= 3) {
              console.log(`📦 [AI Chat] Chunk ${chunkCount}:`, chunk.substring(0, 200).replace(/\n/g, '\\n'))
            }

            buffer += chunk

            // 按双换行分割（SSE 消息以 \n\n 结尾）
            const messages = buffer.split('\n\n')
            buffer = messages.pop() || ''

            for (const message of messages) {
              if (!message.trim()) continue

              // 提取 data: 行
              const dataMatch = message.match(/^data:\s*(.+)$/m)
              if (!dataMatch) continue

              const dataStr = dataMatch[1].trim()
              if (!dataStr) continue

              try {
                const data = JSON.parse(dataStr)

                // 转换 v4 格式为 v1 格式
                if (data.type === 'start') {
                  // 开始事件 - 转换为 progress
                  console.log('🚀 [AI Chat] 开始:', data.message)
                  const progressData = {
                    step: 'start',
                    message: data.message || '开始处理...',
                    icon: 'start'
                  }
                  controller.enqueue(encoder.encode(`event: progress\ndata: ${JSON.stringify(progressData)}\n\n`))
                } else if (data.type === 'content' || data.type === 'token') {
                  contentCount++
                  const output = `event: content\ndata: ${JSON.stringify({ content: data.data })}\n\n`
                  controller.enqueue(encoder.encode(output))
                } else if (data.type === 'sources') {
                  console.log('📚 [AI Chat] 转发 sources:', data.data?.length, '个')
                  const sources = (data.data || []).map((s: any, i: number) => ({
                    id: s.id || `source-${i}`,
                    text: s.text || '',
                    score: s.score || 0.8,
                  }))
                  controller.enqueue(encoder.encode(`event: sources\ndata: ${JSON.stringify({ sources, has_context: sources.length > 0 })}\n\n`))
                } else if (data.type === 'done') {
                  console.log('✅ [AI Chat] 转发 done 事件')
                  controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`))
                } else if (data.type === 'progress') {
                  console.log('⏳ [AI Chat] 转发 progress:', data.step, data.message, 'level:', data.step_level, 'parent:', data.parent_step)
                  const progressData = {
                    step: data.step,
                    message: data.message,
                    detail: data.detail || data.status,
                    icon: data.icon,
                    step_level: data.step_level,
                    parent_step: data.parent_step
                  }
                  controller.enqueue(encoder.encode(`event: progress\ndata: ${JSON.stringify(progressData)}\n\n`))
                } else if (data.type === 'error') {
                  console.error('❌ [AI Chat] 收到错误:', data.message)
                  controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: data.message })}\n\n`))
                } else {
                  // 未知类型，打印日志
                  console.log('❓ [AI Chat] 未知事件类型:', data.type, data)
                }
              } catch (e) {
                console.warn('⚠️ [AI Chat] JSON 解析失败:', dataStr.substring(0, 100))
              }
            }
          }
        } catch (error) {
          console.error('❌ [AI Chat] 流处理错误:', error)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('❌ [AI Chat] 请求失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'AI 服务请求失败'
      },
      { status: 500 }
    )
  }
}

