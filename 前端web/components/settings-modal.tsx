"use client"

import { useState, useRef, useEffect } from "react"
import { useAuthStore } from "@/stores/useAuthStore"
import {
  sendVerificationCode,
  sendPhoneVerificationCode,
  verifyCode,
  checkUserStatus
} from "@/lib/api/auth"
import { UniversitySelector } from "@/components/auth/UniversitySelector"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { user, updateProfile } = useAuthStore()

  // Form States
  const [realName, setRealName] = useState("")
  const [university, setUniversity] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  // Edit Mode States
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [isEditingPhone, setIsEditingPhone] = useState(false)

  // Verification States
  const [emailCode, setEmailCode] = useState("")
  const [phoneCode, setPhoneCode] = useState("")
  const [emailCountdown, setEmailCountdown] = useState(0)
  const [phoneCountdown, setPhoneCountdown] = useState(0)

  // Avatar States
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize data
  useEffect(() => {
    if (user) {
      setRealName(user.realName || "")
      setUniversity(user.university || "")
      setEmail(user.email || "")
      setPhone(user.phone || "")
      setAvatarPreview(user.avatar || null)
      // Reset edit states when opening/user changes
      setIsEditingEmail(false)
      setIsEditingPhone(false)
      setEmailCode("")
      setPhoneCode("")
    }
  }, [user, open])

  // Countdown timers
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (emailCountdown > 0) {
      timer = setTimeout(() => setEmailCountdown(c => c - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [emailCountdown])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (phoneCountdown > 0) {
      timer = setTimeout(() => setPhoneCountdown(c => c - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [phoneCountdown])

  const handleClose = () => {
    setAvatarFile(null)
    setAvatarPreview(user?.avatar || null)
    onOpenChange(false)
  }

  // Avatar handlers
  const handleAvatarClick = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('文件大小不能超过 2MB')
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) throw new Error('未登录')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'avatars')
      formData.append('isPublic', 'true')

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.message || '上传失败')
      return result.data.url
    } catch (error) {
      console.error('上传头像失败:', error)
      return null
    }
  }

  // Verification Code Handlers
  const handleSendEmailCode = async () => {
    if (!email) return alert('请输入邮箱')
    if (emailCountdown > 0) return

    // If editing, check if email exists (should not exist for new binding)
    // But if it's the same email, it's fine (though pointless)
    if (email !== user?.email) {
      const status = await checkUserStatus(email)
      if (status.exists) return alert('该邮箱已被使用')
    }

    const res = await sendVerificationCode(email, 'login') // Using 'login' type as generic verification
    if (res.success) {
      setEmailCountdown(60)
      alert('验证码已发送')
    } else {
      alert(res.message || '发送失败')
    }
  }

  const handleSendPhoneCode = async () => {
    if (!phone) return alert('请输入手机号')
    if (phoneCountdown > 0) return

    if (phone !== user?.phone) {
      const status = await checkUserStatus(phone)
      if (status.exists) return alert('该手机号已被使用')
    }

    const res = await sendPhoneVerificationCode(phone, 'login')
    if (res.success) {
      setPhoneCountdown(60)
      alert('验证码已发送')
    } else {
      alert(res.message || '发送失败')
    }
  }

  // Save Handler
  const handleSave = async () => {
    if (!user) return

    setIsUploading(true)
    try {
      const updateData: { realName?: string; avatar?: string; university?: string; email?: string; phone?: string } = {}

      // Avatar
      if (avatarFile) {
        const avatarUrl = await uploadAvatar(avatarFile)
        if (avatarUrl) {
          updateData.avatar = avatarUrl
        } else {
          alert('头像上传失败')
          setIsUploading(false)
          return
        }
      }

      // Basic Info
      if (realName !== user.realName) updateData.realName = realName
      if (university !== user.university) updateData.university = university

      // Email Update
      if ((isEditingEmail || !user.email) && email && email !== user.email) {
        if (!emailCode) {
          alert('请输入邮箱验证码')
          setIsUploading(false)
          return
        }
        const verifyRes = await verifyCode(email, emailCode)
        if (!verifyRes.success) {
          alert(verifyRes.message || '邮箱验证码错误')
          setIsUploading(false)
          return
        }
        updateData.email = email
      }

      // Phone Update
      if ((isEditingPhone || !user.phone) && phone && phone !== user.phone) {
        if (!phoneCode) {
          alert('请输入手机验证码')
          setIsUploading(false)
          return
        }
        const verifyRes = await verifyCode(phone, phoneCode)
        if (!verifyRes.success) {
          alert(verifyRes.message || '手机验证码错误')
          setIsUploading(false)
          return
        }
        updateData.phone = phone
      }

      if (Object.keys(updateData).length > 0) {
        const result = await updateProfile(updateData)
        if (!result.success) {
          alert(result.message || '保存失败')
          setIsUploading(false)
          return
        }
      }

      alert('保存成功！')
      setAvatarFile(null)
      handleClose()
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败，请重试')
    } finally {
      setIsUploading(false)
    }
  }

  if (!open || !user) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={handleClose} />

      <div className="relative bg-white rounded-2xl w-[480px] max-w-[90vw] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-gray-900">个人设置</h2>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">

          {/* Avatar Section */}
          <div className="flex items-center gap-5">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md group-hover:opacity-90 transition-opacity" />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-600 rounded-full flex items-center justify-center text-white font-medium text-2xl shadow-md">
                  {user.realName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">头像设置</h3>
              <p className="text-xs text-gray-500 mt-1">支持 JPG, PNG 格式，最大 2MB</p>
              <button onClick={handleAvatarClick} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                更换头像
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">

            {/* Real Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">用户名</label>
              <input
                type="text"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm"
                placeholder="请输入用户名"
              />
            </div>

            {/* University */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">所属大学</label>
                {user.university && (
                  <span className="text-xs text-gray-400">已绑定，如需修改请联系客服</span>
                )}
              </div>
              <UniversitySelector
                value={university}
                onChange={(value) => {
                  // 如果用户已经绑定了大学，不允许修改
                  if (user.university) {
                    return
                  }
                  // 首次选择时弹出确认提示
                  if (!university && value) {
                    const confirmed = window.confirm(
                      `确定选择「${value}」吗？\n\n⚠️ 注意：选中后无法更改，后期若需修改大学请联系客服。`
                    )
                    if (confirmed) {
                      setUniversity(value)
                    }
                  } else {
                    setUniversity(value)
                  }
                }}
                disabled={!!user.university}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">手机号</label>
                {user.phone && !isEditingPhone && (
                  <button onClick={() => setIsEditingPhone(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    更改
                  </button>
                )}
              </div>

              {!user.phone || isEditingPhone ? (
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm bg-white"
                    placeholder="请输入新手机号"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                      className="flex-1 h-10 px-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm bg-white"
                      placeholder="验证码"
                    />
                    <button
                      onClick={handleSendPhoneCode}
                      disabled={phoneCountdown > 0 || !phone}
                      className="h-10 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {phoneCountdown > 0 ? `${phoneCountdown}s` : '获取验证码'}
                    </button>
                  </div>
                  {isEditingPhone && (
                    <button onClick={() => { setIsEditingPhone(false); setPhone(user.phone || ""); }} className="text-xs text-gray-500 hover:text-gray-700">
                      取消更改
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full h-10 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  {user.phone.slice(0, 3)}****{user.phone.slice(-4)}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">邮箱</label>
                {user.email && !isEditingEmail && (
                  <button onClick={() => setIsEditingEmail(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    更改
                  </button>
                )}
              </div>

              {!user.email || isEditingEmail ? (
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm bg-white"
                    placeholder="请输入新邮箱"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value)}
                      className="flex-1 h-10 px-3 rounded-lg border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-sm bg-white"
                      placeholder="验证码"
                    />
                    <button
                      onClick={handleSendEmailCode}
                      disabled={emailCountdown > 0 || !email}
                      className="h-10 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {emailCountdown > 0 ? `${emailCountdown}s` : '获取验证码'}
                    </button>
                  </div>
                  {isEditingEmail && (
                    <button onClick={() => { setIsEditingEmail(false); setEmail(user.email || ""); }} className="text-xs text-gray-500 hover:text-gray-700">
                      取消更改
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full h-10 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  {user.email}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isUploading}
            className="px-5 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
          >
            {isUploading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            保存修改
          </button>
        </div>
      </div>
    </div>
  )
}
