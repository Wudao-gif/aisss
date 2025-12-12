'use client'

/**
 * 管理后台 - 用户管理页面
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string | null
  phone: string | null
  realName: string | null
  university: string | null
  role: string
  isBanned: boolean
  lastLoginIp: string | null
  lastLoginCity: string | null
  createdAt: string
  _count: {
    bookshelf: number
  }
}

interface UsersData {
  users: User[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function UsersPage() {
  const router = useRouter()
  const [data, setData] = useState<UsersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('page', page.toString())

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        alert(result.message || '获取用户列表失败')
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
      alert('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const handleBanToggle = async (userId: string, currentBanStatus: boolean) => {
    if (!confirm(currentBanStatus ? '确定要解封此用户吗？' : '确定要封禁此用户吗？')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isBanned: !currentBanStatus }),
      })

      const result = await response.json()
      if (result.success) {
        alert(result.message)
        fetchUsers()
      } else {
        alert(result.message || '操作失败')
      }
    } catch (error) {
      console.error('操作失败:', error)
      alert('操作失败')
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string | null, userPhone: string | null) => {
    const identifier = userEmail || userPhone || userId
    if (!confirm(`确定要注销用户 "${identifier}" 吗？\n\n⚠️ 此操作不可恢复，将删除该用户的所有数据！`)) {
      return
    }

    // 二次确认
    if (!confirm('请再次确认：注销后用户数据将永久删除，无法恢复！')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        alert(`用户已注销\n\n删除的数据：\n- 书架图书：${result.data.deletedData.bookshelf} 本\n- 对话记录：${result.data.deletedData.conversations} 条\n- 学习计划：${result.data.deletedData.plans} 个`)
        fetchUsers()
      } else {
        alert(result.message || '注销失败')
      }
    } catch (error) {
      console.error('注销失败:', error)
      alert('注销失败')
    }
  }

  // 格式化手机号（脱敏显示）
  const formatPhone = (phone: string | null) => {
    if (!phone) return '-'
    if (phone.length === 11) {
      return `${phone.slice(0, 3)}****${phone.slice(-4)}`
    }
    return phone
  }

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索邮箱、手机号、用户名或大学..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            搜索
          </button>
        </form>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : data && data.users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      邮箱
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      手机号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      用户名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      大学
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      角色
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      书架
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      注册时间
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      IP地址
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {user.email || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {user.phone || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {user.realName || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {user.university || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.role === 'admin' ? '管理员' : '用户'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {user._count.bookshelf} 本
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            user.isBanned
                              ? 'bg-red-100 text-red-600'
                              : 'bg-green-100 text-green-600'
                          }`}
                        >
                          {user.isBanned ? '已封禁' : '正常'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {user.lastLoginCity || user.lastLoginIp || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                            className="px-3 py-1 rounded text-xs bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                          >
                            详情
                          </button>
                          {user.role !== 'admin' && (
                            <>
                              <button
                                onClick={() => handleBanToggle(user.id, user.isBanned)}
                                className={`px-3 py-1 rounded text-xs ${
                                  user.isBanned
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                    : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                } transition-colors`}
                              >
                                {user.isBanned ? '解封' : '封禁'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.email, user.phone)}
                                className="px-3 py-1 rounded text-xs bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                              >
                                注销
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {data.totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  共 {data.total} 个用户，第 {data.page} / {data.totalPages} 页
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.totalPages}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">暂无用户</div>
        )}
      </div>
    </div>
  )
}

