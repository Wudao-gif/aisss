'use client'

/**
 * 邮箱登录/注册组件
 * 支持多步骤注册流程
 */

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import * as authApi from '@/lib/api/auth'
import { UniversitySelector } from './UniversitySelector'

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

interface EmailLoginProps {
  onSuccess: () => void
  onError: (error: string) => void
  onStepChange?: (step: RegistrationStep, canGoBack: boolean) => void
}

export function EmailLogin({ onSuccess, onError, onStepChange }: EmailLoginProps) {
  const { login, register, isLoading } = useAuthStore()

  // 表单状态
  const [step, setStep] = useState<RegistrationStep>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [realName, setRealName] = useState('')
  const [university, setUniversity] = useState('')

  // UI 状态
  const [passwordError, setPasswordError] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [isExistingUser, setIsExistingUser] = useState(false)

  // 通知步骤变化
  useEffect(() => {
    const canGoBack = step !== 'email'
    onStepChange?.(step, canGoBack)
  }, [step, onStepChange])

  // 倒计时
  useEffect(() => {
    if ((step === 'verification' || step === 'login-verification') && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [step, countdown])

  // 验证邮箱格式
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // 掩码邮箱
  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split('@')
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`
    }
    const visibleStart = localPart.slice(0, 2)
    const visibleEnd = localPart.slice(-1)
    return `${visibleStart}***${visibleEnd}@${domain}`
  }

  // 步骤1：输入邮箱
  const handleEmailSubmit = async () => {
    onError('')

    if (!email.trim()) {
      onError('请输入邮箱地址')
      return
    }

    if (!validateEmail(email)) {
      onError('请输入有效的邮箱格式')
      return
    }

    // 检查邮箱是否已注册
    const result = await authApi.checkEmailExists(email)
    console.log('[EmailLogin] 检查邮箱结果:', { email, result })

    if (result.isBanned) {
      onError('该邮箱已被官方封禁')
      return
    }

    if (result.exists) {
      // 老用户：直接进入密码登录（默认）
      console.log('[EmailLogin] 老用户，进入密码登录')
      setIsExistingUser(true)
      setStep('login-password')
    } else {
      // 新用户：直接发送注册验证码
      console.log('[EmailLogin] 新用户，发送验证码')
      setIsExistingUser(false)
      await handleSendCode()
    }
  }

  // 新用户：发送验证码
  const handleSendCode = async () => {
    const result = await authApi.sendVerificationCode(email)
    if (result.success) {
      setStep('verification')
      setCountdown(60)
    } else {
      onError(result.message || '发送验证码失败')
    }
  }

  // 老用户：选择密码登录
  const handleChoosePasswordLogin = () => {
    setStep('login-password')
  }

  // 老用户：选择验证码登录
  const handleChooseCodeLogin = async () => {
    const result = await authApi.sendVerificationCode(email)
    if (result.success) {
      setStep('login-verification')
      setCountdown(60)
    } else {
      onError(result.message || '发送验证码失败')
    }
  }

  // 老用户：密码登录
  const handlePasswordLogin = async () => {
    setPasswordError(false)
    onError('')

    if (!password.trim()) {
      onError('请输入密码')
      setPasswordError(true)
      return
    }

    const result = await login(email, password)

    if (result.success) {
      onSuccess()
    } else {
      onError('密码错误')
      setPasswordError(true)
    }
  }

  // 老用户：验证码登录
  const handleCodeLogin = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      onError('请输入6位验证码')
      return
    }

    // 使用验证码登录
    const result = await authApi.loginWithCode(email, verificationCode)

    if (result.success) {
      onSuccess()
    } else {
      onError(result.message || '验证码错误')
    }
  }

  // 新用户：验证码验证
  const handleVerificationSubmit = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      onError('请输入6位验证码')
      return
    }

    const result = await authApi.verifyCode(email, verificationCode)

    if (result.success) {
      onError('')
      setStep('password')
    } else {
      onError(result.message || '验证码错误')
    }
  }

  // 步骤4：设置密码
  const handlePasswordSubmit = () => {
    if (!password.trim() || password.length < 8) {
      onError('密码至少需要8个字符')
      return
    }
    if (password !== confirmPassword) {
      onError('两次输入的密码不一致')
      return
    }
    onError('')
    setStep('name')
  }

  // 步骤5：输入用户名
  const handleNameSubmit = () => {
    if (!realName.trim()) {
      onError('请输入您的用户名')
      return
    }
    onError('')
    setStep('university')
  }

  // 步骤6：选择大学
  const handleUniversitySubmit = async () => {
    if (!university.trim()) {
      onError('请选择您的大学')
      return
    }

    // 跳转到微信绑定步骤（可选）
    onError('')
    setStep('bind-wechat')
  }

  // 步骤7：绑定微信（可选）
  const handleWechatBind = async () => {
    // TODO: 实现微信绑定逻辑
    // 这里暂时跳过，直接完成注册
    await handleCompleteRegistration()
  }

  // 跳过微信绑定
  const handleSkipWechatBind = async () => {
    await handleCompleteRegistration()
  }

  // 完成注册
  const handleCompleteRegistration = async () => {
    const result = await register({
      email,
      password,
      realName,
      university,
      verificationCode,
    })

    if (result.success) {
      onSuccess()
    } else {
      onError(result.message || '注册失败')
    }
  }

  // 返回上一步
  const handleBack = () => {
    onError('')
    setPassword('')
    setPasswordError(false)

    if (step === 'send-code') setStep('email')
    else if (step === 'login-choice') setStep('email')
    else if (step === 'login-password') setStep('email') // 老用户：返回邮箱输入
    else if (step === 'login-verification') setStep('login-password') // 验证码登录返回密码登录
    else if (step === 'verification') setStep('email') // 新用户：返回邮箱输入
    else if (step === 'password') setStep('verification')
    else if (step === 'name') setStep('password')
    else if (step === 'university') setStep('name')
    else if (step === 'bind-wechat') setStep('university')
  }

  // 重新发送验证码
  const handleResendCode = async () => {
    if (countdown === 0) {
      const result = await authApi.sendVerificationCode(email)
      if (result.success) {
        setCountdown(60)
      }
    }
  }

  // 渲染不同步骤的表单
  return (
    <div className="space-y-4">
      {/* 步骤1: 邮箱输入 */}
      {step === 'email' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邮箱地址
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
              placeholder="请输入您的邮箱"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#37322F] focus:border-transparent"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleEmailSubmit}
            disabled={isLoading}
            className="w-full py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '处理中...' : '继续'}
          </button>
        </>
      )}

      {/* 新用户：发送验证码 */}
      {step === 'send-code' && (
        <>
          <div className="text-sm text-gray-600 mb-4">
            该邮箱未注册，请发送验证码以继续注册
          </div>
          <div className="text-sm text-gray-700 mb-4">
            <span className="font-medium">{maskEmail(email)}</span>
          </div>
          {/* 隐藏的返回按钮，供父组件触发 */}
          <button
            data-back-button
            onClick={handleBack}
            className="hidden"
          />
          <button
            onClick={handleSendCode}
            disabled={isLoading}
            className="w-full py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors font-medium disabled:opacity-50"
          >
            {isLoading ? '发送中...' : '发送验证码'}
          </button>
        </>
      )}

      {/* 老用户：选择登录方式 */}
      {step === 'login-choice' && (
        <>
          <div className="text-sm text-gray-600 mb-4">
            登录到 <span className="font-medium">{maskEmail(email)}</span>
          </div>
          {/* 隐藏的返回按钮，供父组件触发 */}
          <button
            data-back-button
            onClick={handleBack}
            className="hidden"
          />
          <div className="space-y-3">
            <button
              onClick={handleChoosePasswordLogin}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="font-medium text-gray-900">使用密码登录</div>
              <div className="text-xs text-gray-500 mt-1">输入您的账户密码</div>
            </button>
            <button
              onClick={handleChooseCodeLogin}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="font-medium text-gray-900">使用验证码登录</div>
              <div className="text-xs text-gray-500 mt-1">发送验证码到您的邮箱</div>
            </button>
          </div>
        </>
      )}

      {/* 老用户：密码登录 */}
      {step === 'login-password' && (
        <>
          <div className="text-sm text-gray-600 mb-4">
            登录到 <span className="font-medium">{maskEmail(email)}</span>
          </div>
          {/* 隐藏的返回按钮，供父组件触发 */}
          <button
            data-back-button
            onClick={handleBack}
            className="hidden"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordError(false)
                onError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
              placeholder="请输入密码"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                passwordError
                  ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                  : 'border-gray-300 focus:ring-[#37322F] focus:border-transparent'
              }`}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handlePasswordLogin}
            disabled={isLoading}
            className="w-full py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors font-medium disabled:opacity-50"
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
          {/* 切换到验证码登录 */}
          <div className="text-center">
            <button
              onClick={handleChooseCodeLogin}
              disabled={isLoading}
              className="text-sm text-[#37322F] hover:underline disabled:opacity-50"
            >
              使用验证码登录
            </button>
          </div>
        </>
      )}

      {/* 老用户：验证码登录 */}
      {step === 'login-verification' && (
        <>
          <div className="text-sm text-gray-600 mb-4">
            验证码已发送到 <span className="font-medium">{maskEmail(email)}</span>
          </div>
          {/* 隐藏的返回按钮，供父组件触发 */}
          <button
            data-back-button
            onClick={handleBack}
            className="hidden"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              验证码
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleCodeLogin()}
              placeholder="请输入6位验证码"
              maxLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#37322F] focus:border-transparent text-center text-2xl tracking-widest"
              disabled={isLoading}
            />
            <div className="mt-2 text-xs text-gray-500 text-center">
              {countdown > 0 ? (
                <span>{countdown}秒后可重新发送</span>
              ) : (
                <button onClick={handleResendCode} className="text-[#37322F] hover:underline">
                  重新发送验证码
                </button>
              )}
            </div>
          </div>
          <button
            onClick={handleCodeLogin}
            disabled={isLoading}
            className="w-full py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors font-medium disabled:opacity-50"
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </>
      )}

      {/* 新用户：验证码验证 */}
      {step === 'verification' && (
        <>
          <div>
            <div className="text-sm text-gray-600 mb-4">
              验证码已发送到 <span className="font-medium">{maskEmail(email)}</span>
            </div>
            {/* 隐藏的返回按钮，供父组件触发 */}
            <button
              data-back-button
              onClick={handleBack}
              className="hidden"
            />
            <label className="block text-sm font-medium text-gray-700 mb-2">
              验证码
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerificationSubmit()}
              placeholder="请输入6位验证码"
              maxLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#37322F] focus:border-transparent text-center text-2xl tracking-widest"
              disabled={isLoading}
            />
            <div className="mt-2 text-xs text-gray-500 text-center">
              {countdown > 0 ? (
                <span>{countdown}秒后可重新发送</span>
              ) : (
                <button onClick={handleResendCode} className="text-[#37322F] hover:underline">
                  重新发送验证码
                </button>
              )}
            </div>
          </div>
          <button
            onClick={handleVerificationSubmit}
            disabled={isLoading}
            className="w-full py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors font-medium disabled:opacity-50"
          >
            {isLoading ? '验证中...' : '继续'}
          </button>
        </>
      )}

      {/* 新用户：设置密码 */}
      {step === 'password' && (
        <>
          {/* 隐藏的返回按钮，供父组件触发 */}
          <button
            data-back-button
            onClick={handleBack}
            className="hidden"
          />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少8个字符"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#37322F] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="再次输入密码"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#37322F] focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handlePasswordSubmit}
            className="w-full py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors font-medium"
          >
            继续
          </button>
        </>
      )}

      {/* 新用户：输入用户名 */}
      {step === 'name' && (
        <>
          {/* 隐藏的返回按钮，供父组件触发 */}
          <button
            data-back-button
            onClick={handleBack}
            className="hidden"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户名
            </label>
            <input
              type="text"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              placeholder="请输入您的用户名"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#37322F] focus:border-transparent"
            />
          </div>
          <button
            onClick={handleNameSubmit}
            className="w-full py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors font-medium"
          >
            继续
          </button>
        </>
      )}

      {/* 新用户：选择大学 */}
      {step === 'university' && (
        <>
          {/* 隐藏的返回按钮，供父组件触发 */}
          <button
            data-back-button
            onClick={handleBack}
            className="hidden"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              所在大学
            </label>
            <UniversitySelector
              value={university}
              onChange={setUniversity}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleUniversitySubmit}
            disabled={isLoading}
            className="w-full py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors font-medium disabled:opacity-50"
          >
            继续
          </button>
        </>
      )}

      {/* 新用户：绑定微信（可选） */}
      {step === 'bind-wechat' && (
        <>
          {/* 隐藏的返回按钮，供父组件触发 */}
          <button
            data-back-button
            onClick={handleBack}
            className="hidden"
          />

          {/* 二维码区域 */}
          <div className="flex flex-col items-center space-y-4">
            {/* 二维码占位符 */}
            <div className="w-48 h-48 bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">📱</div>
                <div className="text-sm">微信扫码绑定</div>
                <div className="text-xs mt-1">二维码加载中...</div>
              </div>
            </div>

            {/* 提示文字 */}
            <div className="text-center text-sm text-gray-600">
              <p>使用微信扫描二维码</p>
              <p className="text-xs text-gray-400 mt-1">绑定后可使用微信快捷登录</p>
            </div>
          </div>

          {/* 按钮组 */}
          <div className="flex gap-3">
            <button
              onClick={handleSkipWechatBind}
              disabled={isLoading}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              跳过
            </button>
            <button
              onClick={handleWechatBind}
              disabled={isLoading}
              className="flex-1 py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? '绑定中...' : '已扫码'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

