"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/stores/useAuthStore"
import * as authApi from "@/lib/api/auth"
import { Edit2, Loader2 } from "lucide-react"

type LoginStep =
    | "input" // 输入账号（邮箱/手机）
    | "password" // 已注册：输入密码
    | "verification" // 未注册：验证码
    | "register-password" // 注册：设置密码

interface UnifiedLoginProps {
    onSuccess: () => void
    onError: (error: string) => void
}

export function UnifiedLogin({ onSuccess, onError }: UnifiedLoginProps) {
    const { login, register, isLoading } = useAuthStore()

    // 状态
    const [step, setStep] = useState<LoginStep>("input")
    const [identifier, setIdentifier] = useState("") // 邮箱或手机号
    const [identifierType, setIdentifierType] = useState<"email" | "phone">("email")
    const [password, setPassword] = useState("")
    const [verificationCode, setVerificationCode] = useState("")
    const [countdown, setCountdown] = useState(0)

    // 辅助状态
    const [isChecking, setIsChecking] = useState(false)

    // 倒计时逻辑
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [countdown])

    // 验证输入格式
    const validateInput = (input: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const phoneRegex = /^1[3-9]\d{9}$/

        if (emailRegex.test(input)) return "email"
        if (phoneRegex.test(input)) return "phone"
        return null
    }

    // 获取当前标题和副标题
    const getHeader = () => {
        switch (step) {
            case "input":
                return { title: "欢迎回来", subtitle: "登录或注册以继续使用" }
            case "password":
                return { title: "输入密码", subtitle: `欢迎回来，${identifier}` }
            case "verification":
                return { title: "验证账号", subtitle: `验证码已发送至 ${identifier}` }
            case "register-password":
                return { title: "设置密码", subtitle: "为了您的账号安全，请设置一个强密码" }
            default:
                return { title: "欢迎回来", subtitle: "登录或注册以继续使用" }
        }
    }

    const header = getHeader()

    // 处理第一步提交：检查账号状态
    const handleIdentifierSubmit = async () => {
        if (!identifier.trim()) {
            onError("请输入邮箱或手机号")
            return
        }

        const type = validateInput(identifier)
        if (!type) {
            onError("请输入有效的邮箱或手机号")
            return
        }

        setIdentifierType(type)
        setIsChecking(true)
        onError("")

        try {
            const status = await authApi.checkUserStatus(identifier)

            if (status.isBanned) {
                onError("该账号已被封禁，无法登录")
                setIsChecking(false)
                return
            }

            if (status.exists) {
                // 已注册 -> 输入密码
                setStep("password")
            } else {
                // 未注册 -> 发送验证码进入注册流程
                await handleSendCode(type)
                setStep("verification")
            }
        } catch (error) {
            onError("系统繁忙，请稍后重试")
        } finally {
            setIsChecking(false)
        }
    }

    // 发送验证码
    const handleSendCode = async (type: "email" | "phone") => {
        let result
        if (type === "email") {
            result = await authApi.sendVerificationCode(identifier, "register")
        } else {
            result = await authApi.sendPhoneVerificationCode(identifier, "register")
        }

        if (result.success) {
            setCountdown(60)
        } else {
            onError(result.message || "发送验证码失败")
        }
    }

    // 处理登录（已注册用户）
    const handleLogin = async () => {
        if (!password) {
            onError("请输入密码")
            return
        }

        let result
        if (identifierType === "email") {
            result = await login(identifier, password)
        } else {
            result = await login(identifier, password)
        }

        if (result.success) {
            onSuccess()
        } else {
            onError(result.message || "登录失败")
        }
    }

    // 处理验证码提交（注册第一步）
    const handleVerificationSubmit = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            onError("请输入6位验证码")
            return
        }

        const result = await authApi.verifyCode(identifier, verificationCode)

        if (result.success) {
            setStep("register-password")
            onError("")
        } else {
            onError(result.message || "验证码错误")
        }
    }

    // 完成注册（设置密码后直接完成）
    const handleCompleteRegister = async () => {
        if (password.length < 8) {
            onError("密码长度至少8位")
            return
        }

        const result = await register({
            email: identifierType === "email" ? identifier : undefined,
            phone: identifierType === "phone" ? identifier : undefined,
            password,
            realName: undefined, // 后续完善
            university: undefined, // 后续完善
            verificationCode,
        })

        if (result.success) {
            onSuccess()
        } else {
            onError(result.message || "注册失败")
        }
    }

    // 返回上一级
    const handleBack = () => {
        onError("")
        if (step === "password" || step === "verification") {
            setStep("input")
            setPassword("")
            setVerificationCode("")
        } else if (step === "register-password") {
            setStep("verification")
        }
    }

    return (
        <div className="w-full max-w-sm mx-auto">
            {/* Header - 动态显示 */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-300 key={header.title}">
                    {header.title}
                </h1>
                <p className="text-gray-500 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75 key={header.subtitle}">
                    {header.subtitle}
                </p>
            </div>

            <div className="space-y-5">
                {/* 步骤 1: 输入账号 */}
                {step === "input" && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleIdentifierSubmit()}
                                placeholder="请输入邮箱或手机号"
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all text-base placeholder:text-gray-400"
                                disabled={isChecking}
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={handleIdentifierSubmit}
                            disabled={isChecking}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all duration-300 font-semibold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isChecking ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>请稍候</span>
                                </>
                            ) : (
                                "继续"
                            )}
                        </button>

                        {/* WeChat Login Button */}
                        <div className="pt-2">
                            <div className="relative mb-5">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-100"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-transparent px-2 text-gray-400">或者</span>
                                </div>
                            </div>

                            <button className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all duration-300 group shadow-sm hover:shadow-md">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1AAD19" className="group-hover:scale-110 transition-transform duration-300">
                                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 4.882-1.932 7.621-.55-.302-2.676-2.476-4.991-5.693-6.189a8.86 8.86 0 0 0-3.572-.447z" />
                                    <path d="M17.31 11.188c-3.573 0-6.425 2.5-6.425 5.64 0 1.611.834 3.06 2.188 4.04a.472.472 0 0 1 .167.506l-.302 1.14c-.013.053-.037.107-.037.162 0 .124.1.223.22.223.041 0 .081-.013.119-.041l1.462-.857a.69.69 0 0 1 .55-.074c.543.157 1.119.236 1.714.236 3.573 0 6.425-2.529 6.425-5.64s-2.852-5.335-6.081-5.335z" />
                                </svg>
                                <span className="text-gray-600 font-medium text-sm group-hover:text-gray-900">微信快捷登录</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 步骤 2: 输入密码 (已注册) */}
                {step === "password" && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="relative group">
                            <input
                                type="text"
                                value={identifier}
                                disabled
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-500 text-base"
                            />
                            <button
                                onClick={handleBack}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                                title="修改账号"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                                placeholder="请输入密码"
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all text-base"
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={isLoading}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all duration-300 font-semibold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
                        >
                            {isLoading ? "登录中..." : "登录"}
                        </button>
                    </div>
                )}

                {/* 步骤 3: 验证码 (未注册) */}
                {step === "verification" && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="请输入6位验证码"
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-center text-2xl tracking-[0.5em] font-medium"
                                autoFocus
                            />
                            <div className="mt-3 text-center">
                                {countdown > 0 ? (
                                    <span className="text-sm text-gray-400">{countdown}秒后重新发送</span>
                                ) : (
                                    <button
                                        onClick={() => handleSendCode(identifierType)}
                                        className="text-sm text-gray-900 font-medium hover:underline"
                                    >
                                        重新发送验证码
                                    </button>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleVerificationSubmit}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all duration-300 font-semibold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                        >
                            下一步
                        </button>

                        <button
                            onClick={handleBack}
                            className="w-full text-sm text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            返回修改账号
                        </button>
                    </div>
                )}

                {/* 步骤 4: 设置密码 (注册) */}
                {step === "register-password" && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="设置密码 (至少8位)"
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all text-base"
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={handleCompleteRegister}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all duration-300 font-semibold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                        >
                            完成注册
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
