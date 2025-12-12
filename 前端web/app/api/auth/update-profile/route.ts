import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

export async function PATCH(request: NextRequest) {
  try {
    // 从 Header 中获取 Token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: '未提供认证令牌' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // 移除 "Bearer " 前缀

    // 验证 Token
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: '无效的认证令牌' },
        { status: 401 }
      )
    }

    // 查找用户
    const existingUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    // 检查用户是否被封禁
    if (existingUser.isBanned) {
      return NextResponse.json(
        { success: false, message: '该账号已被封禁' },
        { status: 403 }
      )
    }

    // 获取请求体
    const body = await request.json()
    const { realName, avatar, university, email, phone } = body

    // 构建更新数据
    const updateData: { realName?: string | null; avatar?: string | null; university?: string | null; email?: string | null; phone?: string | null } = {}

    if (realName !== undefined) {
      // 验证姓名长度
      if (realName && realName.length > 50) {
        return NextResponse.json(
          { success: false, message: '姓名长度不能超过50个字符' },
          { status: 400 }
        )
      }
      updateData.realName = realName || null
    }

    if (avatar !== undefined) {
      updateData.avatar = avatar || null
    }

    if (university !== undefined) {
      // 验证大学名称长度
      if (university && university.length > 100) {
        return NextResponse.json(
          { success: false, message: '大学名称长度不能超过100个字符' },
          { status: 400 }
        )
      }
      // 只有当用户没有绑定大学时才允许绑定
      // 注意：需要检查 university 是否为非空字符串，因为数据库中可能存储了空字符串
      if (existingUser.university && existingUser.university.trim() !== '') {
        return NextResponse.json(
          { success: false, message: '已绑定大学，不支持修改' },
          { status: 400 }
        )
      }
      updateData.university = university || null
    }

    // 需要删除的用户ID列表（如果新邮箱/手机号已被其他用户注册）
    const usersToDelete: string[] = []

    if (email !== undefined) {
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (email && !emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, message: '邮箱格式不正确' },
          { status: 400 }
        )
      }

      // 如果邮箱有变化
      if (email !== existingUser.email) {
        // 检查邮箱是否已被其他用户使用
        if (email) {
          const emailUser = await prisma.user.findUnique({
            where: { email },
          })
          if (emailUser && emailUser.id !== existingUser.id) {
            // 邮箱已被其他用户注册，需要注销那个账户
            usersToDelete.push(emailUser.id)
          }
        }
        updateData.email = email || null
      }
    }

    if (phone !== undefined) {
      // 验证手机号格式
      const phoneRegex = /^1[3-9]\d{9}$/
      if (phone && !phoneRegex.test(phone)) {
        return NextResponse.json(
          { success: false, message: '手机号格式不正确' },
          { status: 400 }
        )
      }

      // 如果手机号有变化
      if (phone !== existingUser.phone) {
        // 检查手机号是否已被其他用户使用
        if (phone) {
          const phoneUser = await prisma.user.findUnique({
            where: { phone },
          })
          if (phoneUser && phoneUser.id !== existingUser.id) {
            // 手机号已被其他用户注册，需要注销那个账户
            usersToDelete.push(phoneUser.id)
          }
        }
        updateData.phone = phone || null
      }
    }

    // 如果没有需要更新的字段
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: '没有需要更新的字段' },
        { status: 400 }
      )
    }

    // 使用事务处理：先删除冲突用户，再更新当前用户
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 删除冲突的用户账户
      if (usersToDelete.length > 0) {
        for (const userId of usersToDelete) {
          await tx.user.delete({
            where: { id: userId },
          })
        }
      }

      // 更新当前用户信息
      return tx.user.update({
        where: { id: decoded.userId },
        data: updateData,
      })
    })

    // 返回更新后的用户信息（不包含密码）
    return NextResponse.json(
      {
        success: true,
        message: '更新成功',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          phone: updatedUser.phone,
          realName: updatedUser.realName,
          avatar: updatedUser.avatar,
          university: updatedUser.university,
          isBanned: updatedUser.isBanned,
          createdAt: updatedUser.createdAt,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('更新用户信息错误:', error)
    return NextResponse.json(
      { success: false, message: '更新用户信息失败' },
      { status: 500 }
    )
  }
}

