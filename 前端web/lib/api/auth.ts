/**
 * 认证相关 API
 * 处理登录、注册、登出等功能
 */

import { get, post, setAuthToken, clearAuthToken } from './client'
import type { User, LoginCredentials, RegisterData, AuthResponse } from '@/types'

/**
 * 用户登录（密码登录）
 * 支持邮箱或手机号登录
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    // 判断是邮箱还是手机号
    const identifier = credentials.email || credentials.phone || ''
    const isPhone = /^1[3-9]\d{9}$/.test(identifier)

    console.log('🔐 [登录] 开始登录:', identifier, isPhone ? '(手机号)' : '(邮箱)')

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: isPhone ? undefined : identifier,
        phone: isPhone ? identifier : undefined,
        password: credentials.password,
        loginMethod: 'password',
      }),
    })

    const data = await response.json()
    console.log('🔐 [登录] API 响应:', data)

    if (!data.success) {
      console.error('🔐 [登录] 登录失败:', data.message)
      return {
        success: false,
        message: data.message || '登录失败',
      }
    }

    // 保存 token
    console.log('🔐 [登录] 保存 token:', data.data.token.substring(0, 30) + '...')
    setAuthToken(data.data.token)

    // 验证 token 是否保存成功
    const savedToken = localStorage.getItem('authToken')
    console.log('🔐 [登录] Token 保存验证:', savedToken ? '✅ 成功' : '❌ 失败')

    // 保存用户信息到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('loggedInUser', JSON.stringify(data.data.user))
      console.log('🔐 [登录] 用户信息已保存:', data.data.user.realName)
    }

    return {
      success: true,
      user: data.data.user,
      token: data.data.token,
      message: `欢迎回来，${data.data.user.realName || ''}同学！`,
    }
  } catch (error) {
    console.error('🔐 [登录] 异常:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '登录失败',
    }
  }
}

/**
 * 用户登录（验证码登录）
 */
export async function loginWithCode(email: string, verificationCode: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        verificationCode,
        loginMethod: 'verification',
      }),
    })

    const data = await response.json()

    if (!data.success) {
      return {
        success: false,
        message: data.message || '登录失败',
      }
    }

    // 保存 token
    setAuthToken(data.data.token)

    // 保存用户信息到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('loggedInUser', JSON.stringify(data.data.user))
    }

    return {
      success: true,
      user: data.data.user,
      token: data.data.token,
      message: `欢迎回来，${data.data.user.realName}同学！`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '登录失败',
    }
  }
}

/**
 * 用户注册
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email || undefined,
        phone: data.phone || undefined,
        password: data.password || undefined,
        realName: data.realName || undefined,
        university: data.university || undefined,
        verificationCode: data.verificationCode,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      return {
        success: false,
        message: result.message || '注册失败',
      }
    }

    // 保存 token
    setAuthToken(result.data.token)

    // 保存用户信息到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('loggedInUser', JSON.stringify(result.data.user))
    }

    return {
      success: true,
      user: result.data.user,
      token: result.data.token,
      message: '注册成功！欢迎使用',
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '注册失败',
    }
  }
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  clearAuthToken()

  if (typeof window !== 'undefined') {
    localStorage.removeItem('loggedInUser')
  }
}

/**
 * 获取当前用户信息（从服务器）
 */
export async function getCurrentUserFromServer(): Promise<User | null> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    if (!token) return null

    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!data.success) {
      return null
    }

    return data.data
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

/**
 * 获取当前用户信息（从 localStorage）
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null

  const userStr = localStorage.getItem('loggedInUser')
  if (!userStr) return null

  try {
    return JSON.parse(userStr) as User
  } catch {
    return null
  }
}

/**
 * 发送验证码
 * 调用阿里云邮件推送服务发送验证码
 */
export async function sendVerificationCode(
  email: string,
  type: 'login' | 'register' | 'reset' = 'login'
): Promise<{ success: boolean; message?: string }> {
  try {
    console.log('📧 [发送验证码] 开始发送:', email)

    const response = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, type }),
    })

    const data = await response.json()
    console.log('📧 [发送验证码] API 响应:', data)

    return {
      success: data.success,
      message: data.message,
    }
  } catch (error) {
    console.error('📧 [发送验证码] 异常:', error)
    return {
      success: false,
      message: '发送验证码失败，请稍后重试',
    }
  }
}

/**
 * 验证验证码（支持邮箱和手机号）
 * @param identifier 邮箱或手机号
 * @param code 验证码
 */
export async function verifyCode(
  identifier: string,
  code: string
): Promise<{ success: boolean; message?: string }> {
  try {
    console.log('✅ [验证验证码] 开始验证:', identifier)

    // 判断是邮箱还是手机号
    const isPhone = /^1[3-9]\d{9}$/.test(identifier)
    const bodyData = isPhone
      ? { phone: identifier, code }
      : { email: identifier, code }

    const response = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData),
    })

    const data = await response.json()
    console.log('✅ [验证验证码] API 响应:', data)

    return {
      success: data.success,
      message: data.message,
    }
  } catch (error) {
    console.error('✅ [验证验证码] 异常:', error)
    return {
      success: false,
      message: '验证失败，请稍后重试',
    }
  }
}

/**
 * 检查邮箱是否已注册
 */
export async function checkEmailExists(email: string): Promise<{
  exists: boolean
  isBanned: boolean
}> {
  try {
    const response = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()

    if (data.success) {
      return {
        exists: data.data.exists,
        isBanned: data.data.isBanned,
      }
    }

    return {
      exists: false,
      isBanned: false,
    }
  } catch (error) {
    console.error('检查邮箱失败:', error)
    return {
      exists: false,
      isBanned: false,
    }
  }
}


/**
 * 检查用户状态（邮箱或手机号）
 */
export async function checkUserStatus(identifier: string): Promise<{
  exists: boolean
  isBanned: boolean
  type: 'email' | 'phone'
}> {
  // 简单的正则判断类型
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
  const type = isEmail ? 'email' : 'phone'

  try {
    // 根据类型调用不同的 API
    const endpoint = type === 'email' ? '/api/auth/check-email' : '/api/auth/check-phone'
    const bodyKey = type === 'email' ? 'email' : 'phone'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [bodyKey]: identifier }),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    console.log('[checkUserStatus] API 响应:', data)

    if (data.success) {
      return {
        exists: data.data.exists,
        isBanned: data.data.isBanned,
        type,
      }
    }

    return {
      exists: false,
      isBanned: false,
      type,
    }
  } catch (error) {
    console.error('[checkUserStatus] 检查失败:', error)

    // 出错时返回不存在
    return {
      exists: false,
      isBanned: false,
      type,
    }
  }
}

/**
 * 发送手机验证码
 */
export async function sendPhoneVerificationCode(
  phone: string,
  type: 'login' | 'register' | 'reset' = 'login'
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch('/api/auth/send-phone-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, type }),
    })

    const data = await response.json()
    return {
      success: data.success,
      message: data.message,
    }
  } catch (error) {
    console.error('发送手机验证码失败:', error)
    return {
      success: false,
      message: '发送失败，请稍后重试',
    }
  }
}

/**
 * 手机号验证码登录
 */
export async function loginWithPhone(phone: string, code: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/login-phone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, code }),
    })

    const data = await response.json()

    if (!data.success) {
      return {
        success: false,
        message: data.message || '登录失败',
      }
    }

    setAuthToken(data.data.token)
    if (typeof window !== 'undefined') {
      localStorage.setItem('loggedInUser', JSON.stringify(data.data.user))
    }

    return {
      success: true,
      user: data.data.user,
      token: data.data.token,
      message: `欢迎回来，${data.data.user.realName}同学！`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '登录失败',
    }
  }
}

/**
 * 更新用户资料
 */
export async function updateProfile(data: { realName?: string; avatar?: string; university?: string; email?: string; phone?: string }): Promise<{
  success: boolean
  user?: User
  message?: string
}> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    if (!token) {
      return {
        success: false,
        message: '未登录',
      }
    }

    const response = await fetch('/api/auth/update-profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!result.success) {
      return {
        success: false,
        message: result.message || '更新失败',
      }
    }

    // 更新 localStorage 中的用户信息
    if (typeof window !== 'undefined') {
      const currentUser = localStorage.getItem('loggedInUser')
      if (currentUser) {
        const user = JSON.parse(currentUser)
        const updatedUser = { ...user, ...result.data }
        localStorage.setItem('loggedInUser', JSON.stringify(updatedUser))
      }
    }

    return {
      success: true,
      user: result.data,
      message: '更新成功',
    }
  } catch (error) {
    console.error('更新用户资料失败:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新失败',
    }
  }
}
