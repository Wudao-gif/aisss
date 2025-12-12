/**
 * 管理后台 - AI供应商配置 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

// 获取供应商列表（包含模型）
export async function GET(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const providers = await prisma.aIProvider.findMany({
      include: {
        models: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({
      success: true,
      data: providers,
    })
  } catch (error) {
    console.error('获取供应商列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取供应商列表失败' },
      { status: 500 }
    )
  }
}

// 添加新供应商
export async function POST(request: NextRequest) {
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { name, code, icon, description, isEnabled = true } = body

    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: '供应商名称和代码不能为空' },
        { status: 400 }
      )
    }

    // 检查代码是否已存在
    const existing = await prisma.aIProvider.findUnique({
      where: { code },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, message: '该供应商代码已存在' },
        { status: 400 }
      )
    }

    const provider = await prisma.aIProvider.create({
      data: {
        name,
        code,
        icon,
        description,
        isEnabled,
      },
    })

    return NextResponse.json({
      success: true,
      data: provider,
      message: '供应商添加成功',
    })
  } catch (error) {
    console.error('添加供应商错误:', error)
    return NextResponse.json(
      { success: false, message: '添加供应商失败' },
      { status: 500 }
    )
  }
}

