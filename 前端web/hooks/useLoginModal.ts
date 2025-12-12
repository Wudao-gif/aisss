/**
 * 登录弹窗全局状态管理 Hook
 * 用于在任何地方触发登录弹窗（被动登录场景）
 */

import { create } from 'zustand'

interface LoginModalState {
  // 状态
  isOpen: boolean
  title?: string
  description?: string
  onSuccessCallback?: () => void

  // 操作
  openLoginModal: (options?: {
    title?: string
    description?: string
    onSuccess?: () => void
  }) => void
  closeLoginModal: () => void
  setOnSuccess: (callback: () => void) => void
}

export const useLoginModal = create<LoginModalState>((set) => ({
  // 初始状态
  isOpen: false,
  title: undefined,
  description: undefined,
  onSuccessCallback: undefined,

  // 打开登录弹窗
  openLoginModal: (options) => {
    set({
      isOpen: true,
      title: options?.title,
      description: options?.description,
      onSuccessCallback: options?.onSuccess,
    })
  },

  // 关闭登录弹窗
  closeLoginModal: () => {
    set({
      isOpen: false,
      title: undefined,
      description: undefined,
      onSuccessCallback: undefined,
    })
  },

  // 设置成功回调
  setOnSuccess: (callback) => {
    set({ onSuccessCallback: callback })
  },
}))

/**
 * 需要登录的操作包装器
 * 如果用户未登录，会弹出登录框；登录成功后执行回调
 */
export function requireAuth(
  isAuthenticated: boolean,
  action: () => void,
  options?: {
    title?: string
    description?: string
  }
) {
  if (isAuthenticated) {
    action()
  } else {
    useLoginModal.getState().openLoginModal({
      ...options,
      onSuccess: action,
    })
  }
}

