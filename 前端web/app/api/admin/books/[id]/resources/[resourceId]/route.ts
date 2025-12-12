/**
 * 单个图书资源管理 API
 * 删除资源
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'
import { deleteFromOSS } from '@/lib/oss'

// 删除资源
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
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
    const { resourceId } = await params

    // 查找资源
    const resource = await prisma.bookResource.findUnique({
      where: { id: resourceId },
    })

    if (!resource) {
      return NextResponse.json(
        { success: false, message: '资源不存在' },
        { status: 404 }
      )
    }

    // 删除 OSS 文件（资源文件在私有 Bucket）
    try {
      await deleteFromOSS(resource.fileUrl, false)
    } catch (error) {
      console.error('删除 OSS 文件失败:', error)
      // 继续删除数据库记录
    }

    // 删除数据库记录
    await prisma.bookResource.delete({
      where: { id: resourceId },
    })

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

