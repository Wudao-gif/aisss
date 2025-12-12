/**
 * 管理后台 - AI模型配置 API (单个模型操作)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

// 更新模型
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { name, modelId, description, isEnabled, isDefault, sortOrder } = body

    // 检查模型是否存在
    const existing = await prisma.aIModel.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: '模型不存在' },
        { status: 404 }
      )
    }

    // 如果修改了modelId，检查是否与其他模型冲突
    if (modelId && modelId !== existing.modelId) {
      const conflict = await prisma.aIModel.findUnique({
        where: { modelId },
      })
      if (conflict) {
        return NextResponse.json(
          { success: false, message: '该模型ID已被使用' },
          { status: 400 }
        )
      }
    }

    // 如果设置为默认，先取消其他默认
    if (isDefault === true) {
      await prisma.aIModel.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const model = await prisma.aIModel.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(modelId !== undefined && { modelId }),
        ...(description !== undefined && { description }),
        ...(isEnabled !== undefined && { isEnabled }),
        ...(isDefault !== undefined && { isDefault }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json({
      success: true,
      data: model,
      message: '模型更新成功',
    })
  } catch (error) {
    console.error('更新模型错误:', error)
    return NextResponse.json(
      { success: false, message: '更新模型失败' },
      { status: 500 }
    )
  }
}

// 删除模型
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const { id } = await params

    await prisma.aIModel.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '模型删除成功',
    })
  } catch (error) {
    console.error('删除模型错误:', error)
    return NextResponse.json(
      { success: false, message: '删除模型失败' },
      { status: 500 }
    )
  }
}

