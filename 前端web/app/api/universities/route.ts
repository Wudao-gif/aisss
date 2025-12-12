import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取大学列表
export async function GET(request: NextRequest) {
  try {
    const universities = await prisma.university.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: universities,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取大学列表错误:', error)
    return NextResponse.json(
      { success: false, message: '获取大学列表失败' },
      { status: 500 }
    )
  }
}

// 创建大学（管理员功能）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, logoUrl } = body

    if (!name) {
      return NextResponse.json(
        { success: false, message: '请提供大学名称' },
        { status: 400 }
      )
    }

    // 检查大学是否已存在
    const existingUniversity = await prisma.university.findUnique({
      where: { name },
    })

    if (existingUniversity) {
      return NextResponse.json(
        { success: false, message: '该大学已存在' },
        { status: 400 }
      )
    }

    // 创建大学
    const university = await prisma.university.create({
      data: {
        name,
        logoUrl: logoUrl || null,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: '大学创建成功',
        data: university,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('创建大学错误:', error)
    return NextResponse.json(
      { success: false, message: '创建大学失败' },
      { status: 500 }
    )
  }
}

