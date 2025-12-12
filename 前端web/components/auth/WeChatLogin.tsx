'use client'

/**
 * 微信登录组件
 * 显示二维码供用户扫描
 */

interface WeChatLoginProps {
  onSuccess: () => void
}

export function WeChatLogin({ onSuccess }: WeChatLoginProps) {
  return (
    <div className="space-y-4">
      {/* 二维码区域 */}
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
          <svg
            className="w-32 h-32 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
        </div>
        
        <p className="text-sm text-gray-600 text-center">
          使用微信扫描二维码登录
        </p>
        
        <p className="text-xs text-gray-500 mt-2">
          功能开发中，敬请期待
        </p>
      </div>

      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex gap-2">
          <svg
            className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">温馨提示</p>
            <ul className="text-xs space-y-1 text-blue-700">
              <li>• 首次使用需要绑定大学信息</li>
              <li>• 确保微信已实名认证</li>
              <li>• 二维码有效期为5分钟</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

