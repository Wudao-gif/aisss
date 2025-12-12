/**
 * IP 地址工具库
 * 用于获取客户端 IP 地址和城市信息
 */

import { NextRequest } from 'next/server'

/**
 * 从请求中获取客户端 IP 地址
 */
export function getClientIp(request: NextRequest): string | null {
  // 优先从 X-Forwarded-For 获取（经过代理的情况）
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // X-Forwarded-For 可能包含多个 IP，取第一个
    const ips = forwardedFor.split(',').map(ip => ip.trim())
    return ips[0] || null
  }

  // 从 X-Real-IP 获取（Nginx 代理）
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // 从 CF-Connecting-IP 获取（Cloudflare）
  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) {
    return cfIp
  }

  // 尝试从 request.ip 获取（Vercel 等平台）
  // @ts-ignore - NextRequest 可能有 ip 属性
  if (request.ip) {
    // @ts-ignore
    return request.ip
  }

  return null
}

/**
 * 通过 IP 地址获取城市信息
 * 使用免费的 IP 查询 API
 */
export async function getCityByIp(ip: string): Promise<string | null> {
  // 本地 IP 不查询
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return '本地'
  }

  try {
    // 使用 ip-api.com 免费 API（每分钟 45 次请求限制）
    const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN&fields=status,city,regionName`, {
      // 设置超时，避免阻塞登录流程
      signal: AbortSignal.timeout(3000),
    })

    if (!response.ok) {
      console.warn('IP 查询失败:', response.status)
      return null
    }

    const data = await response.json()

    if (data.status === 'success') {
      // 返回城市名，如果没有城市则返回省份
      return data.city || data.regionName || null
    }

    return null
  } catch (error) {
    // 查询失败不影响登录流程
    console.warn('IP 城市查询异常:', error)
    return null
  }
}

/**
 * 获取客户端 IP 和城市信息
 */
export async function getClientIpInfo(request: NextRequest): Promise<{
  ip: string | null
  city: string | null
}> {
  const ip = getClientIp(request)
  
  if (!ip) {
    return { ip: null, city: null }
  }

  // 异步获取城市信息，但不阻塞主流程
  const city = await getCityByIp(ip)

  return { ip, city }
}

