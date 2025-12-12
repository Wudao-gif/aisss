/**
 * 获取可用的AI模型列表（用户端）
 * 返回按供应商分组的模型列表
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取启用的供应商和模型列表
export async function GET(request: NextRequest) {
  try {
    const providers = await prisma.aIProvider.findMany({
      where: {
        isEnabled: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        icon: true,
        models: {
          where: {
            isEnabled: true,
          },
          select: {
            id: true,
            name: true,
            modelId: true,
            description: true,
            isDefault: true,
          },
          orderBy: [
            { sortOrder: 'asc' },
            { createdAt: 'desc' },
          ],
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // 过滤掉没有启用模型的供应商
    const filteredProviders = providers.filter(p => p.models.length > 0)

    return NextResponse.json({
      success: true,
      data: filteredProviders,
    })
  } catch (error) {
    console.error('获取模型列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取模型列表失败' },
      { status: 500 }
    )
  }
}

