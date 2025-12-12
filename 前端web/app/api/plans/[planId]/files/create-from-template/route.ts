import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'
import { copyFileInOSS } from '@/lib/oss'

// POST /api/plans/[planId]/files/create-from-template - 基于模板创建新文档
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
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

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '无效的令牌' },
        { status: 401 }
      )
    }

    const { planId } = await params
    const body = await request.json()
    const { templateId, fileName } = body

    // 验证必填字段
    if (!templateId) {
      return NextResponse.json(
        { success: false, message: '缺少模板ID' },
        { status: 400 }
      )
    }

    // 检查计划是否存在且属于当前用户
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    })

    if (!plan) {
      return NextResponse.json(
        { success: false, message: '计划不存在' },
        { status: 404 }
      )
    }

    if (plan.userId !== decoded.userId) {
      return NextResponse.json(
        { success: false, message: '无权访问此计划' },
        { status: 403 }
      )
    }

    // 获取模板信息
    const template = await prisma.docTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return NextResponse.json(
        { success: false, message: '模板不存在' },
        { status: 404 }
      )
    }

    if (!template.isEnabled) {
      return NextResponse.json(
        { success: false, message: '模板已被禁用' },
        { status: 400 }
      )
    }

    // 获取用户信息以验证大学权限
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 检查用户是否有权使用此模板
    if (template.university && template.university !== user.university) {
      return NextResponse.json(
        { success: false, message: '您无权使用此模板' },
        { status: 403 }
      )
    }

    // 复制模板文件到新位置
    console.log('📋 开始复制模板文件:', template.fileUrl)
    const { url: newFileUrl, path: newFilePath } = await copyFileInOSS(
      template.fileUrl,
      `plans/${planId}`,
      fileName
    )

    console.log('✅ 模板文件复制成功:', newFileUrl)

    // 创建文件记录
    const newFile = await prisma.planFile.create({
      data: {
        planId,
        userId: decoded.userId,
        name: fileName || template.name,
        description: `基于模板「${template.name}」创建`,
        fileUrl: newFileUrl,
        fileType: template.type === 'word' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                  template.type === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                  template.type === 'ppt' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' :
                  'application/octet-stream',
        fileSize: template.fileSize,
        allowReading: true
      }
    })

    return NextResponse.json({
      success: true,
      data: newFile,
      message: '文档创建成功'
    })
  } catch (error) {
    console.error('基于模板创建文档失败:', error)
    return NextResponse.json(
      { success: false, message: '创建文档失败' },
      { status: 500 }
    )
  }
}

