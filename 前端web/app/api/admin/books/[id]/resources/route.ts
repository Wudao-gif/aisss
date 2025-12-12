/**
 * 图书资源管理 API
 * 管理图书的资料列表
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/admin-auth'
import { processUploadedDocument } from '@/lib/ai-service'
import { getOssPathFromUrl } from '@/lib/oss'

// 获取图书资源列表（可按大学筛选）
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
    const { searchParams } = new URL(request.url)
    const universityId = searchParams.get('universityId')

    // 检查图书是否存在
    const book = await prisma.book.findUnique({
      where: { id },
    })

    if (!book) {
      return NextResponse.json(
        { success: false, message: '图书不存在' },
        { status: 404 }
      )
    }

    // 通过关联表获取资源列表
    const resourceRelations = await prisma.bookResourceRelation.findMany({
      where: {
        bookId: id,
      },
      include: {
        resource: {
          include: {
            university: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 提取资源并按大学筛选
    let resources = resourceRelations.map((rel) => rel.resource)
    if (universityId) {
      resources = resources.filter((r) => r.universityId === universityId)
    }

    return NextResponse.json(
      {
        success: true,
        data: resources,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取资源列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取资源列表失败' },
      { status: 500 }
    )
  }
}

// 为图书添加资源（可以为多个大学创建）
export async function POST(
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
    const { id: bookId } = await params
    const body = await request.json()
    const { universityIds, name, description, fileUrl, fileType, fileSize, allowReading } = body

    // 验证必填字段
    if (!name || !fileUrl || !fileType || !fileSize) {
      return NextResponse.json(
        { success: false, message: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 验证必须选择至少一个大学
    if (!universityIds || !Array.isArray(universityIds) || universityIds.length === 0) {
      return NextResponse.json(
        { success: false, message: '资源必须至少选择一个大学' },
        { status: 400 }
      )
    }

    // 检查图书是否存在
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    })

    if (!book) {
      return NextResponse.json(
        { success: false, message: '图书不存在' },
        { status: 404 }
      )
    }

    // 检查所有大学是否存在
    const universities = await prisma.university.findMany({
      where: { id: { in: universityIds } },
    })

    if (universities.length !== universityIds.length) {
      return NextResponse.json(
        { success: false, message: '部分大学不存在' },
        { status: 404 }
      )
    }

    // 为每个大学创建资源并关联到图书（使用事务）
    const resources = await prisma.$transaction(async (tx) => {
      const createdResources = []

      for (const universityId of universityIds) {
        // 创建资源
        const newResource = await tx.bookResource.create({
          data: {
            universityId,
            name,
            description: description || null,
            fileUrl,
            fileType,
            fileSize,
            allowReading: allowReading !== undefined ? allowReading : true,
          },
          include: {
            university: true,
          },
        })

        // 创建图书-资源关联
        await tx.bookResourceRelation.create({
          data: {
            bookId,
            resourceId: newResource.id,
          },
        })

        createdResources.push(newResource)
      }

      return createdResources
    })

    // 触发 AI 处理（向量化资源文件）
    // 只处理一次，使用第一个资源的 ID（因为文件相同）
    if (resources.length > 0) {
      const ossPath = getOssPathFromUrl(fileUrl)
      if (ossPath) {
        processUploadedDocument(ossPath, {
          resource_id: resources[0].id,  // 使用资源 ID
          book_id: bookId,  // 也关联教材 ID
          name: name,
          type: 'resource',
        }).catch(err => {
          console.error('❌ [AI Service] 资源文件处理失败:', err)
        })
        console.log('🤖 [创建资源] 已提交 AI 处理任务:', ossPath, '| resourceId:', resources[0].id)
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `成功为 ${universityIds.length} 个大学创建资源`,
        data: resources,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('添加资源错误:', error)
    return NextResponse.json(
      { success: false, message: '添加资源失败' },
      { status: 500 }
    )
  }
}

