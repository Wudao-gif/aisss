'use client'

/**
 * 大学选择器组件
 * 支持搜索和显示大学 LOGO
 */

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown } from 'lucide-react'

interface University {
  id: string
  name: string
  logoUrl: string | null
}

interface UniversitySelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function UniversitySelector({ value, onChange, disabled }: UniversitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 加载大学列表
  useEffect(() => {
    const loadUniversities = async () => {
      try {
        const response = await fetch('/api/universities')
        const data = await response.json()
        if (data.success) {
          setUniversities(data.data.sort((a: University, b: University) =>
            a.name.localeCompare(b.name, 'zh-CN')
          ))
        }
      } catch (error) {
        console.error('加载大学列表失败:', error)
      } finally {
        setLoading(false)
      }
    }
    loadUniversities()
  }, [])

  // 过滤大学列表
  const filteredUniversities = universities.filter((uni) =>
    uni.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 获取选中的大学
  const selectedUniversity = universities.find((uni) => uni.name === value)

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // 自动聚焦搜索框
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (universityName: string) => {
    onChange(universityName)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* 选择按钮 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#37322F] focus:border-transparent bg-white text-left flex items-center justify-between transition-colors ${
          disabled ? 'opacity-50 cursor-default' : 'hover:border-gray-400 cursor-pointer'
        } ${isOpen ? 'border-[#37322F] ring-1 ring-[#37322F]' : 'border-gray-300'}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {loading ? (
            <span className="text-gray-400">加载中...</span>
          ) : selectedUniversity ? (
            <>
              {selectedUniversity.logoUrl ? (
                <img
                  src={selectedUniversity.logoUrl}
                  alt={selectedUniversity.name}
                  className="w-6 h-6 rounded object-cover flex-shrink-0"
                />
              ) : (
                <span className="text-xl flex-shrink-0">🏫</span>
              )}
              <span className="text-gray-900 truncate">{selectedUniversity.name}</span>
            </>
          ) : (
            <span className="text-gray-400">请选择大学</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
          {/* 搜索框 */}
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索大学..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#37322F] focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* 大学列表 */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                加载中...
              </div>
            ) : filteredUniversities.length > 0 ? (
              filteredUniversities.map((uni) => (
                <button
                  key={uni.id}
                  type="button"
                  onClick={() => handleSelect(uni.name)}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                    value === uni.name ? 'bg-gray-100' : ''
                  }`}
                >
                  {uni.logoUrl ? (
                    <img
                      src={uni.logoUrl}
                      alt={uni.name}
                      className="w-6 h-6 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <span className="text-xl flex-shrink-0">🏫</span>
                  )}
                  <span className="text-gray-900 text-sm">{uni.name}</span>
                  {value === uni.name && (
                    <span className="ml-auto text-[#37322F] text-xs">✓</span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                未找到匹配的大学
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

