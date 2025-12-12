'use client'

/**
 * 管理后台首页 - 重定向到用户管理
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/admin/users')
  }, [router])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-500">正在跳转...</div>
    </div>
  )
}

