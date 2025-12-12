"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { UnifiedLogin } from "@/components/auth/UnifiedLogin"
import { useAuthStore } from "@/stores/useAuthStore"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuthStore()
  const [error, setError] = useState("")

  // 获取回调 URL
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  // 如果已登录，重定向到回调 URL
  useEffect(() => {
    if (isAuthenticated) {
      router.push(callbackUrl)
    }
  }, [isAuthenticated, callbackUrl, router])

  // 登录成功
  const handleLoginSuccess = () => {
    router.push(callbackUrl)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md p-4">



        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm text-center animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* 统一登录组件 */}
        <UnifiedLogin
          onSuccess={handleLoginSuccess}
          onError={setError}
        />

        {/* 底部条款 */}
        <div className="text-center text-xs text-gray-400 mt-12">
          继续即表示您同意我们的{" "}
          <a href="#" className="text-gray-900 hover:underline transition-colors font-medium">
            使用条款
          </a>{" "}
          和{" "}
          <a href="#" className="text-gray-900 hover:underline transition-colors font-medium">
            隐私政策
          </a>
        </div>
      </div>
    </div>
  )
}
