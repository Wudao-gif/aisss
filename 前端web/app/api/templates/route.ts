import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// GET /api/templates - 用户获取可用模板
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

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '无效的令牌' },
        { status: 401 }
      )
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 获取用户所属大学的空白模板配置
    const university = await prisma.university.findUnique({
      where: { name: user.university || undefined },
      select: {
        enableWordBlank: true,
        enableExcelBlank: true,
        enablePptBlank: true,
      }
    })

    console.log('🏫 [模板API] 用户大学:', user.university)
    console.log('🏫 [模板API] 大学配置:', university)

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')

    // 构建查询条件：只获取启用的模板，且匹配用户大学或全局模板
    const where: any = {
      isEnabled: true,
      OR: [
        { university: null },  // 全局模板
        { university: user.university }  // 用户大学的模板
      ]
    }

    if (type) where.type = type
    if (category) where.category = category

    // 先查询所有空白模板（包括禁用的），用于调试
    const allBlankTemplates = await prisma.docTemplate.findMany({
      where: {
        category: '空白模板'
      },
      select: {
        id: true,
        name: true,
        type: true,
        isEnabled: true,
        university: true
      }
    })
    console.log('🔍 [调试] 数据库中所有空白模板:', allBlankTemplates)

    const templates = await prisma.docTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        description: true,
        fileUrl: true,
        fileSize: true,
        iconUrl: true,
        isDefault: true
      }
    })

    console.log('📋 [模板API] 查询条件:', where)
    console.log('📋 [模板API] 查询到的模板:', templates.filter(t => t.category === '空白模板').map(t => ({ name: t.name, type: t.type })))

    // 根据大学的空白模板开关过滤空白模板
    const filteredTemplates = templates.filter(template => {
      // 如果不是空白模板，直接返回
      if (template.category !== '空白模板') {
        return true
      }

      // 如果找不到大学配置，默认显示所有空白模板
      if (!university) {
        console.log(`⚠️ [模板过滤] 未找到大学配置，显示所有空白模板`)
        return true
      }

      // 根据模板类型和大学配置过滤空白模板
      let shouldShow = false
      switch (template.type) {
        case 'word':
          shouldShow = university.enableWordBlank
          break
        case 'excel':
          shouldShow = university.enableExcelBlank
          break
        case 'ppt':
          shouldShow = university.enablePptBlank
          break
        default:
          shouldShow = false
          break
      }

      console.log(`🔍 [模板过滤] ${template.name} (${template.type}): ${shouldShow ? '✅ 显示' : '❌ 隐藏'}`)
      return shouldShow
    })

    console.log('📋 [模板API] 过滤后的模板数量:', filteredTemplates.length)
    console.log('📋 [模板API] 空白模板:', filteredTemplates.filter(t => t.category === '空白模板').map(t => t.name))

    return NextResponse.json({
      success: true,
      data: filteredTemplates
    })
  } catch (error) {
    console.error('获取模板列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取模板列表失败' },
      { status: 500 }
    )
  }
}

