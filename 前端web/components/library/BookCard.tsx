'use client'

/**
 * 书籍卡片组件
 * 显示书籍封面和详细信息（hover 时）
 */

import { useState } from 'react'
import type { Book } from '@/types'

interface BookCardProps {
  book: Book
  onClick: (book: Book) => void
}

export function BookCard({ book, onClick }: BookCardProps) {
  const [copiedISBN, setCopiedISBN] = useState(false)

  // 复制 ISBN
  const handleCopyISBN = (isbn: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(isbn)
    setCopiedISBN(true)
    setTimeout(() => setCopiedISBN(false), 2000)
  }

  // 格式化作者名称
  const formatAuthors = (authorString: string) => {
    const authors = authorString.split(/[,、，]/).map((a) => a.trim())
    if (authors.length > 3) {
      return `${authors.slice(0, 3).join(' · ')} 等`
    }
    return authors.join(' · ')
  }

  // 获取封面图片URL（兼容新旧格式）
  const coverUrl = book.coverUrl || book.cover || '/placeholder.svg'

  return (
    <button
      onClick={() => onClick(book)}
      className="group relative w-[205px] h-[315px] bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:ring-offset-2 [contain:layout_paint_size]"
      tabIndex={0}
    >
      {/* 封面图片 - 始终可见 */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={coverUrl}
          alt={book.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Hover/Focus 覆盖层 - 半高度版本 */}
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-white/98 via-white/95 to-transparent backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-y-2 group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-all duration-300 ease-out flex flex-col justify-end px-5 pb-5 overflow-hidden min-w-0 rounded-b-2xl">
        {/* 书名 */}
        <h3
          className="font-semibold text-[#37322F] mb-3 line-clamp-2 text-base leading-snug break-words min-w-0"
          style={{ fontWeight: 600 }}
          title={book.name}
        >
          {book.name}
        </h3>

        {/* 详细信息 - 卡片式布局 */}
        <div className="space-y-2 min-w-0">
          {/* 作者 */}
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span
              className="text-[13px] text-gray-700 font-normal truncate min-w-0"
              title={book.author}
            >
              {formatAuthors(book.author)}
            </span>
          </div>

          {/* 出版社 */}
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span
              className="text-[13px] text-gray-600 font-normal truncate min-w-0"
              title={book.publisher}
            >
              {book.publisher}
            </span>
          </div>

          {/* ISBN - 带复制功能 */}
          <div className="flex items-center gap-2 min-w-0 group/isbn pt-0.5">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <span
              className="text-[12px] text-gray-500 font-mono truncate min-w-0 tracking-tight"
              title={book.isbn}
            >
              {book.isbn}
            </span>
            <button
              onClick={(e) => handleCopyISBN(book.isbn, e)}
              className="opacity-0 group-hover/isbn:opacity-100 transition-opacity flex-shrink-0 p-0.5 hover:bg-white/60 rounded ml-auto"
              title={copiedISBN ? '已复制!' : '复制 ISBN'}
            >
              {copiedISBN ? (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-green-600"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-500"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </button>
  )
}

