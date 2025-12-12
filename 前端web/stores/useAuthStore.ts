/**
 * 认证状态管理
 * 管理用户登录状态、用户信息等
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import * as authApi from '@/lib/api/auth'

interface AuthState {
  // 状态
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  // 操作
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  register: (data: any) => Promise<{ success: boolean; message?: string }>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  initialize: () => Promise<void>
  updateProfile: (data: { realName?: string; avatar?: string; university?: string; email?: string }) => Promise<{ success: boolean; message?: string }>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // 登录
      login: async (email, password) => {
        set({ isLoading: true })
        
        try {
          const response = await authApi.login({ email, password })
          
          if (response.success && response.user) {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
            })
            
            return {
              success: true,
              message: response.message,
            }
          }
          
          set({ isLoading: false })
          return {
            success: false,
            message: response.message || '登录失败',
          }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            message: error instanceof Error ? error.message : '登录失败',
          }
        }
      },

      // 注册
      register: async (data) => {
        set({ isLoading: true })
        
        try {
          const response = await authApi.register(data)
          
          if (response.success && response.user) {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
            })
            
            return {
              success: true,
              message: response.message,
            }
          }
          
          set({ isLoading: false })
          return {
            success: false,
            message: response.message || '注册失败',
          }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            message: error instanceof Error ? error.message : '注册失败',
          }
        }
      },

      // 登出
      logout: async () => {
        await authApi.logout()
        set({
          user: null,
          isAuthenticated: false,
        })
      },

      // 设置用户
      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
        })
      },

      // 初始化（从服务器获取最新用户信息）
      initialize: async () => {
        // 先尝试从 localStorage 快速恢复（避免闪烁）
        const cachedUser = authApi.getCurrentUser()
        if (cachedUser) {
          set({
            user: cachedUser,
            isAuthenticated: true,
          })
        }

        // 然后从服务器获取最新数据
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
        if (token) {
          try {
            const serverUser = await authApi.getCurrentUserFromServer()
            if (serverUser) {
              set({
                user: serverUser,
                isAuthenticated: true,
              })
              // 同步更新 localStorage 中的缓存
              localStorage.setItem('loggedInUser', JSON.stringify(serverUser))
            }
          } catch (error) {
            console.error('从服务器获取用户信息失败:', error)
          }
        }
      },

      // 更新用户资料
      updateProfile: async (data) => {
        set({ isLoading: true })

        try {
          const response = await authApi.updateProfile(data)

          if (response.success && response.user) {
            // 更新 store 中的用户信息
            const currentUser = get().user
            if (currentUser) {
              set({
                user: { ...currentUser, ...response.user },
                isLoading: false,
              })
            }

            return {
              success: true,
              message: response.message,
            }
          }

          set({ isLoading: false })
          return {
            success: false,
            message: response.message || '更新失败',
          }
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            message: error instanceof Error ? error.message : '更新失败',
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

