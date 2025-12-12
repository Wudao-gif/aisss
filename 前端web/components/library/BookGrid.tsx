'use client'

/**
 * 书籍网格容器组件
 * 显示书籍卡片的网格布局
 */

import { BookCard } from './BookCard'
import type { Book } from '@/types'

interface BookGridProps {
  books: Book[]
  onBookClick: (book: Book) => void
  isLoading?: boolean
}

export function BookGrid({ books, onBookClick, isLoading = false }: BookGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#37322F] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <div className="col-span-full text-center py-12">
        <p className="text-gray-500 text-lg">未找到相关教材</p>
        <p className="text-gray-400 text-sm mt-2">请尝试其他关键词</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-5 gap-x-6 gap-y-8 pb-8">
      {books.map((book) => (
        <BookCard key={book.id} book={book} onClick={onBookClick} />
      ))}
    </div>
  )
}

