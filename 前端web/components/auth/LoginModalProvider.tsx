'use client'

/**
 * 登录弹窗提供者组件
 * 在应用根部使用，提供全局登录弹窗功能
 */

import { useLoginModal } from '@/hooks/useLoginModal'
import { LoginModal } from './LoginModal'

export function LoginModalProvider() {
  const { isOpen, title, description, onSuccessCallback, closeLoginModal } = useLoginModal()

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeLoginModal()
    }
  }

  const handleSuccess = () => {
    onSuccessCallback?.()
    closeLoginModal()
  }

  return (
    <LoginModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      onSuccess={handleSuccess}
      title={title}
      description={description}
      sidebarOpen={false}
    />
  )
}

