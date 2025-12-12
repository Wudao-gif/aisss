import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// GET /api/admin/templates - 获取所有模板
export async function GET(request: NextRequest) {
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

    console.log('🔍 [Templates API] Token decoded:', decoded)

    if (!decoded || decoded.role !== 'admin') {
      console.log('❌ [Templates API] 权限检查失败:', { decoded, role: decoded?.role })
      return NextResponse.json(
        { success: false, message: '需要管理员权限' },
        { status: 403 }
      )
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const university = searchParams.get('university')
    const isEnabled = searchParams.get('isEnabled')

    // 构建查询条件
    const where: any = {}
    if (type) where.type = type
    if (category) where.category = category
    if (university) where.university = university
    if (isEnabled !== null && isEnabled !== undefined) {
      where.isEnabled = isEnabled === 'true'
    }

    const templates = await prisma.docTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    console.log('📋 [Admin Templates API] 查询到的模板数量:', templates.length)
    console.log('📋 [Admin Templates API] 空白模板:', templates.filter(t => t.category === '空白模板').map(t => ({ name: t.name, type: t.type, isEnabled: t.isEnabled })))

    return NextResponse.json({
      success: true,
      data: templates
    })
  } catch (error) {
    console.error('获取模板列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取模板列表失败' },
      { status: 500 }
    )
  }
}

// POST /api/admin/templates - 创建新模板
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { name, type, category, description, fileUrl, fileSize, iconUrl, university, isEnabled, isDefault } = body

    console.log('📝 [创建模板] 接收到的数据:', {
      name,
      type,
      category,
      description,
      fileUrl,
      fileSize,
      iconUrl,
      university,
      isEnabled,
      isDefault
    })

    // 验证必填字段
    const missingFields = []
    if (!name) missingFields.push('name')
    if (!type) missingFields.push('type')
    if (!category) missingFields.push('category')
    if (!fileUrl) missingFields.push('fileUrl')
    if (!fileSize && fileSize !== 0) missingFields.push('fileSize')

    if (missingFields.length > 0) {
      console.error('❌ [创建模板] 缺少必填字段:', missingFields)
      return NextResponse.json(
        { success: false, message: `缺少必填字段: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // 如果设置为默认模板，先取消同类别的其他默认模板
    if (isDefault) {
      await prisma.docTemplate.updateMany({
        where: {
          type,
          category,
          university: university || null,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    const template = await prisma.docTemplate.create({
      data: {
        name,
        type,
        category,
        description,
        fileUrl,
        fileSize,
        iconUrl: iconUrl || null,
        university: university || null,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        isDefault: isDefault || false
      }
    })

    console.log('✅ [创建模板] 模板创建成功:', template)

    return NextResponse.json({
      success: true,
      data: template
    })
  } catch (error) {
    console.error('❌ [创建模板] 创建失败:', error)
    console.error('❌ [创建模板] 错误详情:', error instanceof Error ? error.message : String(error))
    console.error('❌ [创建模板] 错误堆栈:', error instanceof Error ? error.stack : '')
    return NextResponse.json(
      {
        success: false,
        message: '创建模板失败',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

