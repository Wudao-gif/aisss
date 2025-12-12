/**
 * 书架状态管理
 * 管理用户的书架、选中的书籍等
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BookshelfItem, Book } from '@/types'
import * as booksApi from '@/lib/api/books'

interface BookshelfState {
  // 状态
  books: BookshelfItem[]
  selectedBook: { id: string; name: string } | null
  isLoading: boolean

  // 操作
  loadBookshelf: () => Promise<void>
  addBook: (bookId: string) => Promise<{ success: boolean; message?: string }>
  removeBook: (bookId: string) => Promise<{ success: boolean; message?: string }>
  selectBook: (book: { id: string; name: string } | null) => void
  clearSelection: () => void
}

export const useBookshelfStore = create<BookshelfState>()(
  persist(
    (set, get) => ({
      // 初始状态
      books: [],
      selectedBook: null,
      isLoading: false,

      // 加载书架
      loadBookshelf: async () => {
        set({ isLoading: true })
        try {
          const books = await booksApi.getBookshelf()
          set({ books, isLoading: false })
        } catch (error) {
          console.error('加载书架失败:', error)
          set({ isLoading: false })
        }
      },

      // 添加图书
      addBook: async (bookId) => {
        set({ isLoading: true })

        try {
          const response = await booksApi.addToBookshelf(bookId)

          if (response.success) {
            // 重新加载书架
            const books = await booksApi.getBookshelf()
            set({ books, isLoading: false })
          } else {
            set({ isLoading: false })
          }

          return response
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            message: error instanceof Error ? error.message : '添加失败',
          }
        }
      },

      // 移除图书
      removeBook: async (bookId) => {
        set({ isLoading: true })

        try {
          const response = await booksApi.removeFromBookshelf(bookId)

          if (response.success) {
            // 重新加载书架
            const books = await booksApi.getBookshelf()
            set({ books, isLoading: false })

            // 如果移除的是当前选中的书，清除选择
            const { selectedBook } = get()
            if (selectedBook && selectedBook.id === bookId) {
              set({ selectedBook: null })
            }
          } else {
            set({ isLoading: false })
          }

          return response
        } catch (error) {
          set({ isLoading: false })
          return {
            success: false,
            message: error instanceof Error ? error.message : '移除失败',
          }
        }
      },

      // 选择图书
      selectBook: (book) => {
        set({ selectedBook: book })
      },

      // 清除选择
      clearSelection: () => {
        set({ selectedBook: null })
      },
    }),
    {
      name: 'bookshelf-storage',
      partialize: (state) => ({
        books: state.books,
        selectedBook: state.selectedBook,
      }),
    }
  )
)

