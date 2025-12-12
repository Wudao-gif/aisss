'use client'

/**
 * 欢迎标题组件
 * 显示大标题："你好，XX同学，有什么可以帮助你的吗？"
 */

interface WelcomeTitleProps {
  userName?: string
}

export function WelcomeTitle({ userName }: WelcomeTitleProps) {
  return (
    <div className="w-full flex justify-center items-center">
      <h1 className="text-[28px] leading-[34px] font-semibold tracking-[0.3px] text-center text-[#37322F]">
        同学，有什么可以帮忙的？
      </h1>
    </div>
  )
}

