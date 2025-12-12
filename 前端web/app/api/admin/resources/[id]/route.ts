/**
 * 管理后台 - 编辑/删除资源 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'
import { deleteFromOSS } from '@/lib/oss'

// 获取单个资源详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 验证管理员权限
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const { id } = await params

    const resource = await prisma.bookResource.findUnique({
      where: { id },
      include: {
        university: true,
        books: {
          include: {
            book: true,
          },
        },
      },
    })

    if (!resource) {
      return NextResponse.json(
        { success: false, message: '资源不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: resource,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取资源详情错误:', error)
    return NextResponse.json(
      { success: false, message: '获取资源详情失败' },
      { status: 500 }
    )
  }
}

// 更新资源（只能修改基本信息，不能修改教材绑定和大学）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 验证管理员权限
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
    const { name, description, allowReading } = body

    // 检查资源是否存在
    const existingResource = await prisma.bookResource.findUnique({
      where: { id },
    })

    if (!existingResource) {
      return NextResponse.json(
        { success: false, message: '资源不存在' },
        { status: 404 }
      )
    }

    // 更新资源基本信息
    const updatedResource = await prisma.bookResource.update({
      where: { id },
      data: {
        name: name || existingResource.name,
        description: description !== undefined ? description : existingResource.description,
        allowReading: allowReading !== undefined ? allowReading : existingResource.allowReading,
      },
      include: {
        university: true,
        books: {
          include: {
            book: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '资源更新成功',
        data: updatedResource,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('更新资源错误:', error)
    return NextResponse.json(
      { success: false, message: '更新资源失败' },
      { status: 500 }
    )
  }
}


// 删除资源
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 验证管理员权限
  const authResult = await verifyAdmin(request)
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, message: authResult.message },
      { status: 401 }
    )
  }

  try {
    const { id } = await params

    // 检查资源是否存在
    const resource = await prisma.bookResource.findUnique({
      where: { id },
    })

    if (!resource) {
      return NextResponse.json(
        { success: false, message: '资源不存在' },
        { status: 404 }
      )
    }

    // 删除资源（级联删除关联关系）
    await prisma.bookResource.delete({
      where: { id },
    })

    // 删除 OSS 文件
    try {
      await deleteFromOSS(resource.fileUrl, false)
    } catch (error) {
      console.error('删除 OSS 文件失败:', error)
      // 不影响资源删除，只记录错误
    }

    return NextResponse.json(
      {
        success: true,
        message: '资源删除成功',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('删除资源错误:', error)
    return NextResponse.json(
      { success: false, message: '删除资源失败' },
      { status: 500 }
    )
  }
}
