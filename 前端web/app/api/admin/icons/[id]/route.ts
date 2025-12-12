import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// DELETE /api/admin/icons/[id] - 删除图标
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未授权' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: '需要管理员权限' },
        { status: 403 }
      )
    }

    const { id } = await params

    // 检查图标是否存在
    const icon = await prisma.iconResource.findUnique({
      where: { id },
    })

    if (!icon) {
      return NextResponse.json(
        { success: false, message: '图标不存在' },
        { status: 404 }
      )
    }

    // 删除图标
    await prisma.iconResource.delete({
      where: { id },
    })

    return NextResponse.json(
      {
        success: true,
        message: '图标删除成功',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('删除图标错误:', error)
    return NextResponse.json(
      { success: false, message: '删除图标失败' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/icons/[id] - 更新图标
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未授权' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: '需要管理员权限' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, category, iconUrl } = body

    // 检查图标是否存在
    const icon = await prisma.iconResource.findUnique({
      where: { id },
    })

    if (!icon) {
      return NextResponse.json(
        { success: false, message: '图标不存在' },
        { status: 404 }
      )
    }

    // 更新图标
    const updatedIcon = await prisma.iconResource.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(iconUrl && { iconUrl }),
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '图标更新成功',
        data: updatedIcon,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('更新图标错误:', error)
    return NextResponse.json(
      { success: false, message: '更新图标失败' },
      { status: 500 }
    )
  }
}

