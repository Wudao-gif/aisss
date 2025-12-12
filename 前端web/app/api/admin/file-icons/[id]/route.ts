import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// 验证管理员权限
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, message: '未授权' }
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)

  if (!decoded || decoded.role !== 'admin') {
    return { success: false, message: '需要管理员权限' }
  }

  return { success: true }
}

// PUT /api/admin/file-icons/[id] - 更新文件图标
export async function PUT(
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
    const { name, extensions, iconUrl, isDefault, sortOrder } = body

    // 检查图标是否存在
    const existingIcon = await prisma.fileIcon.findUnique({
      where: { id }
    })

    if (!existingIcon) {
      return NextResponse.json(
        { success: false, message: '文件图标不存在' },
        { status: 404 }
      )
    }

    // 如果设置为默认图标，先取消其他默认图标
    if (isDefault && !existingIcon.isDefault) {
      await prisma.fileIcon.updateMany({
        where: {
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      })
    }

    const fileIcon = await prisma.fileIcon.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(extensions && { extensions }),
        ...(iconUrl && { iconUrl }),
        ...(isDefault !== undefined && { isDefault }),
        ...(sortOrder !== undefined && { sortOrder })
      }
    })

    return NextResponse.json({
      success: true,
      data: fileIcon
    })
  } catch (error) {
    console.error('更新文件图标失败:', error)
    return NextResponse.json(
      { success: false, message: '更新文件图标失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/file-icons/[id] - 删除文件图标
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

    // 检查图标是否存在
    const fileIcon = await prisma.fileIcon.findUnique({
      where: { id }
    })

    if (!fileIcon) {
      return NextResponse.json(
        { success: false, message: '文件图标不存在' },
        { status: 404 }
      )
    }

    // 不允许删除默认图标
    if (fileIcon.isDefault) {
      return NextResponse.json(
        { success: false, message: '不能删除默认图标' },
        { status: 400 }
      )
    }

    await prisma.fileIcon.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '文件图标删除成功'
    })
  } catch (error) {
    console.error('删除文件图标失败:', error)
    return NextResponse.json(
      { success: false, message: '删除文件图标失败' },
      { status: 500 }
    )
  }
}

