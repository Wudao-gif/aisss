import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// PUT /api/admin/templates/[id] - 更新模板
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { name, type, category, description, fileUrl, fileSize, iconUrl, university, isEnabled, isDefault } = body

    // 检查模板是否存在
    const existingTemplate = await prisma.docTemplate.findUnique({
      where: { id }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, message: '模板不存在' },
        { status: 404 }
      )
    }

    // 如果设置为默认模板，先取消同类别的其他默认模板
    if (isDefault && !existingTemplate.isDefault) {
      await prisma.docTemplate.updateMany({
        where: {
          type: type || existingTemplate.type,
          category: category || existingTemplate.category,
          university: university !== undefined ? university : existingTemplate.university,
          isDefault: true,
          id: { not: id }
        },
        data: {
          isDefault: false
        }
      })
    }

    const template = await prisma.docTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(category && { category }),
        ...(description !== undefined && { description }),
        ...(fileUrl && { fileUrl }),
        ...(fileSize && { fileSize }),
        ...(iconUrl !== undefined && { iconUrl: iconUrl || null }),
        ...(university !== undefined && { university: university || null }),
        ...(isEnabled !== undefined && { isEnabled }),
        ...(isDefault !== undefined && { isDefault })
      }
    })

    return NextResponse.json({
      success: true,
      data: template
    })
  } catch (error) {
    console.error('更新模板失败:', error)
    return NextResponse.json(
      { success: false, message: '更新模板失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/templates/[id] - 删除模板
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // 检查模板是否存在
    const template = await prisma.docTemplate.findUnique({
      where: { id }
    })

    if (!template) {
      return NextResponse.json(
        { success: false, message: '模板不存在' },
        { status: 404 }
      )
    }

    await prisma.docTemplate.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: '模板已删除'
    })
  } catch (error) {
    console.error('删除模板失败:', error)
    return NextResponse.json(
      { success: false, message: '删除模板失败' },
      { status: 500 }
    )
  }
}

