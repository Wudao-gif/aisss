/**
 * 图书相关 API
 * 处理图书查询、书架管理等功能
 */

import { get, post, del } from './client'
import type { Book, BookshelfItem } from '@/types'

/**
 * 获取图书列表
 */
export async function getBooks(params?: {
  universityId?: string
  search?: string
}): Promise<Book[]> {
  try {
    const queryParams = new URLSearchParams()

    if (params?.universityId) {
      queryParams.append('universityId', params.universityId)
    }

    if (params?.search) {
      queryParams.append('search', params.search)
    }

    const url = `/api/books${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (data.success) {
      return data.data
    }

    return []
  } catch (error) {
    console.error('获取图书列表失败:', error)
    return []
  }
}

/**
 * 获取书架中的图书
 */
export async function getBookshelf(): Promise<BookshelfItem[]> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    if (!token) {
      console.warn('未登录，无法获取书架')
      return []
    }

    const response = await fetch('/api/bookshelf', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (data.success) {
      return data.data
    }

    return []
  } catch (error) {
    console.error('获取书架失败:', error)
    return []
  }
}

/**
 * 添加图书到书架
 */
export async function addToBookshelf(
  bookId: string,
  resourceIds?: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    if (!token) {
      return { success: false, message: '请先登录' }
    }

    const response = await fetch('/api/bookshelf', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookId, resourceIds }),
    })

    const data = await response.json()

    if (data.success) {
      return { success: true, message: data.message || '已添加到书架' }
    }

    return { success: false, message: data.message || '添加失败' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '添加失败',
    }
  }
}

/**
 * 从书架移除图书
 */
export async function removeFromBookshelf(bookId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    if (!token) {
      return { success: false, message: '请先登录' }
    }

    const response = await fetch(`/api/bookshelf?bookId=${bookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (data.success) {
      return { success: true, message: data.message || '已从书架移除' }
    }

    return { success: false, message: data.message || '移除失败' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '移除失败',
    }
  }
}

/**
 * 获取图书详情
 */
export async function getBookById(id: string): Promise<Book | null> {
  try {
    const books = await getBooks()
    return books.find((book) => book.id === id) || null
  } catch (error) {
    console.error('获取图书详情失败:', error)
    return null
  }
}

/**
 * 获取大学列表
 */
export async function getUniversities() {
  try {
    const response = await fetch('/api/universities', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (data.success) {
      return data.data
    }

    return []
  } catch (error) {
    console.error('获取大学列表失败:', error)
    return []
  }
}

/**
 * 获取图书资源列表（根据用户大学）
 */
export async function getBookResources(bookId: string): Promise<any[]> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    if (!token) {
      console.warn('未登录，无法获取资源列表')
      return []
    }

    const response = await fetch(`/api/books/${bookId}/resources`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (data.success) {
      return data.data
    }

    return []
  } catch (error) {
    console.error('获取资源列表失败:', error)
    return []
  }
}

