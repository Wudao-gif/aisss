'use client'

/**
 * 搜索栏组件
 * 用于搜索书籍
 */

import { useState, useEffect } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onFocus?: () => void
  onBlur?: () => void
}

export function SearchBar({ value, onChange, placeholder = '搜索教材名称、作者、ISBN...', onFocus, onBlur }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [localValue, onChange])

  const handleClear = () => {
    setLocalValue('')
    onChange('')
  }

  return (
    <div className="relative w-full max-w-2xl">
      {/* 搜索图标 */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {/* 搜索输入框 */}
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full pl-12 pr-12 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-0 focus:border-gray-400 shadow-sm transition-all duration-300"
      />

      {/* 清除按钮 */}
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="清除搜索"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}

