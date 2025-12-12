/**
 * 管理后台 - 编辑大学 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'

// 更新大学
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
    const { name, logoUrl, enableWordBlank, enableExcelBlank, enablePptBlank } = body

    // 检查大学是否存在
    const university = await prisma.university.findUnique({
      where: { id },
    })

    if (!university) {
      return NextResponse.json(
        { success: false, message: '大学不存在' },
        { status: 404 }
      )
    }

    // 如果修改了名称，检查是否与其他大学冲突
    if (name && name !== university.name) {
      const existingUniversity = await prisma.university.findUnique({
        where: { name },
      })

      if (existingUniversity) {
        return NextResponse.json(
          { success: false, message: '大学名称已存在' },
          { status: 400 }
        )
      }
    }

    // 更新大学
    const updatedUniversity = await prisma.university.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(enableWordBlank !== undefined && { enableWordBlank }),
        ...(enableExcelBlank !== undefined && { enableExcelBlank }),
        ...(enablePptBlank !== undefined && { enablePptBlank }),
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '大学更新成功',
        data: updatedUniversity,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('更新大学错误:', error)
    return NextResponse.json(
      { success: false, message: '更新大学失败' },
      { status: 500 }
    )
  }
}

