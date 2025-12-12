'use client'

/**
 * 筛选栏组件
 * 用于筛选大学
 */

import { useState, useRef, useEffect } from 'react'

interface FilterBarProps {
  selectedUniversity: string
  onUniversityChange: (university: string) => void
  universities: string[]
}

export function FilterBar({ selectedUniversity, onUniversityChange, universities }: FilterBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 筛选按钮 */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[#37322F] hover:bg-gray-50 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span className="text-sm font-medium">
          {selectedUniversity || '所有大学'}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      {dropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {/* 所有大学选项 */}
          <button
            onClick={() => {
              onUniversityChange('')
              setDropdownOpen(false)
            }}
            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${
              !selectedUniversity ? 'bg-gray-50 font-medium' : ''
            }`}
          >
            所有大学
          </button>

          {/* 分隔线 */}
          <div className="border-t border-gray-200" />

          {/* 大学列表 */}
          {universities.map((university) => (
            <button
              key={university}
              onClick={() => {
                onUniversityChange(university)
                setDropdownOpen(false)
              }}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${
                selectedUniversity === university ? 'bg-gray-50 font-medium' : ''
              }`}
            >
              {university}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

