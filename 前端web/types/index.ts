/**
 * 核心数据类型定义
 * 用于整个应用的类型安全
 */

// ==================== 用户相关类型 ====================

export interface User {
  id?: string
  email?: string | null     // 邮箱（可选，用户可以只用手机号注册）
  phone?: string | null     // 手机号（可选，用户可以只用邮箱注册）
  realName?: string | null
  university?: string | null
  avatar?: string
  role?: 'user' | 'admin'  // 用户角色
  isBanned?: boolean       // 是否被封禁
  wechatOpenId?: string | null
  createdAt?: string
}

export interface LoginCredentials {
  email?: string
  phone?: string
  password?: string
  verificationCode?: string
  loginMethod?: 'password' | 'verification'
}

export interface RegisterData {
  email?: string
  phone?: string
  password?: string
  realName?: string
  university?: string
  verificationCode: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  token?: string
  message?: string
}

// ==================== 图书相关类型 ====================

export interface University {
  id: string
  name: string
  logo?: string
  createdAt?: string
}

export interface Book {
  id: string
  name: string
  isbn: string
  author: string
  publisher: string
  coverUrl?: string | null
  fileUrl?: string | null
  fileSize?: number | null
  allowReading?: boolean
  createdAt?: string
  updatedAt?: string
  // 兼容旧版本的字段
  cover?: string
  university?: string
  description?: string
}

export interface BookshelfItem {
  id: string
  userId: string
  bookId: string
  book: Book
  addedAt: string
}

export interface BookResource {
  id: string
  bookId: string
  universityId: string
  name: string
  description: string | null
  fileUrl: string
  fileType: string
  fileSize: number
  allowReading?: boolean
  createdAt: string
  university?: University
}

// 用户上传资源（永久存储，只有管理员可以删除）
export interface UserUploadedResource {
  id: string
  userId: string
  name: string
  description: string | null
  fileUrl: string
  fileType: string
  fileSize: number
  allowReading: boolean
  createdAt: string
}

// 书架资源（包含官方资源快照和用户上传资源的引用）
export interface BookshelfResource {
  id: string
  bookshelfItemId: string
  resourceId: string | null  // 官方资源ID，用户上传的为 null
  userUploadedResourceId: string | null  // 用户上传资源ID，官方资源为 null
  userId: string
  name: string
  description: string | null
  fileUrl: string
  fileType: string
  fileSize: number
  allowReading: boolean
  isUserUploaded: boolean  // 是否用户上传
  createdAt: string
}

// ==================== 对话相关类型 ====================

export interface Conversation {
  id: number
  title: string
  createdAt?: string
  updatedAt?: string
  messages?: Message[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ==================== 学习模式类型 ====================

export type StudyMode = '学习' | '复习' | '解题'

export interface StudySession {
  mode: StudyMode
  book?: BookshelfItem
  startTime: string
}

// ==================== 学习计划类型 ====================

export interface Plan {
  id: string
  userId: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
  files?: PlanFile[]  // 计划中的文件列表
}

export interface PlanFile {
  id: string
  planId: string
  userId: string
  name: string
  description?: string | null
  fileUrl: string
  fileType: string
  fileSize: number
  allowReading: boolean
  createdAt: string
}

// ==================== API 响应类型 ====================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ==================== UI 状态类型 ====================

export interface ModalState {
  isOpen: boolean
  view?: string
}

export interface DropdownState {
  isOpen: boolean
  activeId?: string | number
}

// ==================== 表单类型 ====================

export interface EmailFormData {
  email: string
}

export interface PasswordFormData {
  password: string
  confirmPassword?: string
}

export interface UniversityChangeRequest {
  newUniversity: string
  reason: string
}

// ==================== 错误类型 ====================

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// ==================== 工具类型 ====================

export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type AsyncFunction<T = void> = () => Promise<T>

