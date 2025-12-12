/**
 * API 客户端基础配置
 * 统一处理请求、响应、错误
 */

import { ApiResponse, AppError } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

interface RequestConfig extends RequestInit {
  params?: Record<string, string>
}

/**
 * 统一的 API 请求函数
 */
async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { params, ...fetchConfig } = config

  // 构建 URL
  let url = `${API_BASE_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  // 默认配置
  const defaultConfig: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...fetchConfig.headers,
    },
    ...fetchConfig,
  }

  // 添加认证 token（如果存在）
  const token = getAuthToken()
  if (token) {
    defaultConfig.headers = {
      ...defaultConfig.headers,
      Authorization: `Bearer ${token}`,
    }
  }

  try {
    const response = await fetch(url, defaultConfig)

    // 处理 HTTP 错误
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new AppError(
        errorData.message || `HTTP Error: ${response.status}`,
        errorData.code,
        response.status
      )
    }

    // 解析响应
    const data = await response.json()
    return {
      success: true,
      data,
    }
  } catch (error) {
    // 统一错误处理
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

/**
 * GET 请求
 */
export async function get<T>(endpoint: string, params?: Record<string, string>) {
  return request<T>(endpoint, { method: 'GET', params })
}

/**
 * POST 请求
 */
export async function post<T>(endpoint: string, data?: any) {
  return request<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * PUT 请求
 */
export async function put<T>(endpoint: string, data?: any) {
  return request<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * DELETE 请求
 */
export async function del<T>(endpoint: string) {
  return request<T>(endpoint, { method: 'DELETE' })
}

/**
 * 获取认证 token
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('authToken')
}

/**
 * 设置认证 token
 */
export function setAuthToken(token: string) {
  console.log('💾 [setAuthToken] 开始保存 token')
  console.log('💾 [setAuthToken] window 类型:', typeof window)
  console.log('💾 [setAuthToken] token 长度:', token?.length)

  if (typeof window === 'undefined') {
    console.error('💾 [setAuthToken] ❌ window 未定义，无法保存')
    return
  }

  localStorage.setItem('authToken', token)
  console.log('💾 [setAuthToken] ✅ Token 已保存到 localStorage')

  // 立即验证
  const saved = localStorage.getItem('authToken')
  console.log('💾 [setAuthToken] 验证保存结果:', saved ? '✅ 成功' : '❌ 失败')
}

/**
 * 清除认证 token
 */
export function clearAuthToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('authToken')
}

