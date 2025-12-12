/**
 * PDF 高亮详情 API
 * GET - 获取单个高亮
 * PUT - 更新高亮（颜色、笔记）
 * DELETE - 删除高亮
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 获取单个高亮
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const highlight = await prisma.pdfHighlight.findFirst({
      where: {
        id,
        userId: decoded.userId,
      },
    })

    if (!highlight) {
      return NextResponse.json(
        { success: false, message: '高亮不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: highlight,
    })
  } catch (error) {
    console.error('获取高亮失败:', error)
    return NextResponse.json(
      { success: false, message: '获取高亮失败' },
      { status: 500 }
    )
  }
}

// 更新高亮
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const { color, note } = body

    // 检查高亮是否存在且属于当前用户
    const existing = await prisma.pdfHighlight.findFirst({
      where: {
        id,
        userId: decoded.userId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: '高亮不存在' },
        { status: 404 }
      )
    }

    const highlight = await prisma.pdfHighlight.update({
      where: { id },
      data: {
        ...(color !== undefined && { color }),
        ...(note !== undefined && { note }),
      },
    })

    console.log('🖍️ [高亮] 更新成功:', highlight.id)

    return NextResponse.json({
      success: true,
      data: highlight,
    })
  } catch (error) {
    console.error('更新高亮失败:', error)
    return NextResponse.json(
      { success: false, message: '更新高亮失败' },
      { status: 500 }
    )
  }
}

// 删除高亮
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // 检查高亮是否存在且属于当前用户
    const existing = await prisma.pdfHighlight.findFirst({
      where: {
        id,
        userId: decoded.userId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: '高亮不存在' },
        { status: 404 }
      )
    }

    await prisma.pdfHighlight.delete({
      where: { id },
    })

    console.log('🗑️ [高亮] 删除成功:', id)

    return NextResponse.json({
      success: true,
      message: '删除成功',
    })
  } catch (error) {
    console.error('删除高亮失败:', error)
    return NextResponse.json(
      { success: false, message: '删除高亮失败' },
      { status: 500 }
    )
  }
}

