/**
 * 管理后台 - AI模型配置 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

// 获取模型列表
export async function GET(request: NextRequest) {
  // 验证管理员权限
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const models = await prisma.aIModel.findMany({
      include: {
        provider: true,  // 包含供应商信息
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: models,
    })
  } catch (error) {
    console.error('获取模型列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取模型列表失败' },
      { status: 500 }
    )
  }
}

// 添加新模型
export async function POST(request: NextRequest) {
  // 验证管理员权限
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { name, modelId, providerId, description, isEnabled = true, isDefault = false } = body

    if (!name || !modelId || !providerId) {
      return NextResponse.json(
        { success: false, message: '模型名称、模型ID和供应商不能为空' },
        { status: 400 }
      )
    }

    // 检查模型ID是否已存在
    const existing = await prisma.aIModel.findUnique({
      where: { modelId },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, message: '该模型ID已存在' },
        { status: 400 }
      )
    }

    // 如果设置为默认，先取消其他默认
    if (isDefault) {
      await prisma.aIModel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const model = await prisma.aIModel.create({
      data: {
        name,
        modelId,
        providerId,
        description,
        isEnabled,
        isDefault,
      },
      include: {
        provider: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: model,
      message: '模型添加成功',
    })
  } catch (error) {
    console.error('添加模型错误:', error)
    return NextResponse.json(
      { success: false, message: '添加模型失败' },
      { status: 500 }
    )
  }
}

