'use client'

/**
 * 登录模态框组件
 * 包含邮箱登录和微信登录
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmailLogin } from './EmailLogin'
import { WeChatLogin } from './WeChatLogin'
import { useAuthStore } from '@/stores/useAuthStore'
import { ArrowLeft } from 'lucide-react'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sidebarOpen?: boolean
  onSuccess?: () => void
  title?: string
  description?: string
}

type RegistrationStep =
  | 'email'
  | 'send-code'
  | 'login-choice'
  | 'login-password'
  | 'login-verification'
  | 'verification'
  | 'password'
  | 'name'
  | 'university'
  | 'bind-wechat'

export function LoginModal({
  open,
  onOpenChange,
  sidebarOpen = true,
  onSuccess,
  title: customTitle,
  description: customDescription,
}: LoginModalProps) {
  const router = useRouter()
  const [loginView, setLoginView] = useState<'email' | 'wechat'>('email')
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('email')
  const [canGoBack, setCanGoBack] = useState(false)
  const { user, isLoading } = useAuthStore()

  const handleLoginSuccess = () => {
    onOpenChange(false)
    setError('')
    setLoginView('email')  // 重置为邮箱登录
    setCurrentStep('email')
    setCanGoBack(false)

    // 调用外部成功回调
    onSuccess?.()

    // 如果是管理员，跳转到后台管理页面
    setTimeout(() => {
      const currentUser = useAuthStore.getState().user
      if (currentUser?.role === 'admin') {
        router.push('/admin')
      }
    }, 100)
  }

  const handleClose = () => {
    onOpenChange(false)
    setError('')
    setLoginView('email')  // 重置为邮箱登录
    setCurrentStep('email')
    setCanGoBack(false)
  }

  // 获取标题和副标题
  const getTitle = () => {
    // 如果有自定义标题且在主视图，使用自定义标题
    if (customTitle && currentStep === 'email' && loginView === 'email') return customTitle
    if (loginView === 'wechat') return '欢迎使用 Brillance'

    switch (currentStep) {
      case 'password':
        return '设置密码'
      case 'name':
        return '让应用知道你的称呼'
      case 'university':
        return '选择所在大学'
      case 'bind-wechat':
        return '绑定微信'
      default:
        return '欢迎使用 Brillance'
    }
  }

  const getSubtitle = () => {
    // 如果有自定义描述且在主视图，使用自定义描述
    if (customDescription && currentStep === 'email' && loginView === 'email') return customDescription
    if (loginView === 'wechat') return '登录或注册以继续'

    switch (currentStep) {
      case 'password':
        return '请牢记首次设置登录密码'
      case 'name':
        return '设置一个用户名，或者你希望我们该如何称呼你'
      case 'university':
        return '选择您所在的大学以获取专属教材资源'
      case 'bind-wechat':
        return '绑定微信后可使用微信快捷登录（可选）'
      default:
        return '登录或注册以继续'
    }
  }

  return (
    <>
      {/* 错误提示 - 在弹窗外部上方 */}
      {error && open && (
        <div
          className="fixed z-[60] top-[calc(50%-280px)] transform -translate-x-1/2"
          style={{
            left: sidebarOpen ? 'calc(50% + 140px)' : '50%',
          }}
        >
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 shadow-lg max-w-md">
            {error}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md" sidebarOpen={sidebarOpen}>
          <div className="space-y-6">
            {/* 返回按钮 - 左上角 */}
            {canGoBack && (
              <button
                onClick={() => {
                  // 触发 EmailLogin 的返回逻辑
                  const backButton = document.querySelector('[data-back-button]') as HTMLButtonElement
                  if (backButton) backButton.click()
                }}
                className="absolute left-6 top-6 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}

            {/* 标题 */}
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900">
                {getTitle()}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {getSubtitle()}
              </p>
            </div>

            {/* 登录表单 */}
            {loginView === 'email' ? (
              <EmailLogin
                onSuccess={handleLoginSuccess}
                onError={setError}
                onStepChange={(step, hasBack) => {
                  setCurrentStep(step)
                  setCanGoBack(hasBack)
                }}
              />
            ) : (
              <WeChatLogin onSuccess={handleLoginSuccess} />
            )}

            {/* 登录方式切换 - 移到底部 */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setLoginView(loginView === 'email' ? 'wechat' : 'email')
                  setError('')  // 切换时清除错误
                }}
                className="w-full text-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {loginView === 'email' ? '使用微信登录' : '使用邮箱登录'}
              </button>
            </div>

            {/* 底部提示 */}
            <div className="text-center text-xs text-gray-500">
              登录即表示您同意我们的
              <button className="text-[#37322F] hover:underline mx-1">
                服务条款
              </button>
              和
              <button className="text-[#37322F] hover:underline ml-1">
                隐私政策
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

