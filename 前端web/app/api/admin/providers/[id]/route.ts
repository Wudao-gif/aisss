/**
 * 管理后台 - 单个供应商操作 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

// 更新供应商
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

    const provider = await prisma.aIProvider.update({
      where: { id },
      data: body,
    })

    return NextResponse.json({
      success: true,
      data: provider,
      message: '供应商更新成功',
    })
  } catch (error) {
    console.error('更新供应商错误:', error)
    return NextResponse.json(
      { success: false, message: '更新供应商失败' },
      { status: 500 }
    )
  }
}

// 删除供应商
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

    // 检查是否有关联的模型
    const modelsCount = await prisma.aIModel.count({
      where: { providerId: id },
    })

    if (modelsCount > 0) {
      return NextResponse.json(
        { success: false, message: `该供应商下还有 ${modelsCount} 个模型，请先删除模型` },
        { status: 400 }
      )
    }

    await prisma.aIProvider.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '供应商删除成功',
    })
  } catch (error) {
    console.error('删除供应商错误:', error)
    return NextResponse.json(
      { success: false, message: '删除供应商失败' },
      { status: 500 }
    )
  }
}

