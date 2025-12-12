'use client'

/**
 * 侧边栏组件
 * 包含新对话、图书馆入口、历史对话列表
 */

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

interface Conversation {
  id: number
  title: string
}

interface Project {
  id: number | string
  name: string
  memoryAccess: 'default' | 'project-only'
  files?: any[]
  isOptimistic?: boolean
}

interface SidebarProps {
  isOpen: boolean
  conversations?: Conversation[]
  activeConversationId?: number | null
  projects?: Project[]
  activeProjectId?: number | string | null
  onNewConversation?: () => void
  onDeleteConversation?: (id: number) => void
  onRenameConversation?: (id: number, newTitle: string) => void
  onNewProject?: (name: string, memoryAccess: 'default' | 'project-only') => void
  onDeleteProject?: (id: number | string) => void
  onRenameProject?: (id: number | string, newName: string) => void
  onSelectProject?: (id: number | string) => void
  onOpenDeleteModal?: (id: number, title: string) => void
  onOpenCreateProjectModal?: () => void
}

export function Sidebar({
  isOpen,
  conversations = [],
  activeConversationId = null,
  projects = [],
  activeProjectId = null,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onNewProject,
  onDeleteProject,
  onRenameProject,
  onSelectProject,
  onOpenDeleteModal,
  onOpenCreateProjectModal
}: SidebarProps) {
  const [conversationMenuOpen, setConversationMenuOpen] = useState<number | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [historyExpanded, setHistoryExpanded] = useState(true)
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [projectMenuOpen, setProjectMenuOpen] = useState<number | string | null>(null)
  const [renamingProjectId, setRenamingProjectId] = useState<number | string | null>(null)
  const [renameProjectValue, setRenameProjectValue] = useState('')
  const conversationMenuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const projectMenuRef = useRef<HTMLDivElement>(null)
  const renameProjectInputRef = useRef<HTMLInputElement>(null)

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        conversationMenuRef.current &&
        !conversationMenuRef.current.contains(event.target as Node)
      ) {
        setConversationMenuOpen(null)
      }
      if (
        projectMenuRef.current &&
        !projectMenuRef.current.contains(event.target as Node)
      ) {
        setProjectMenuOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 重命名输入框自动聚焦
  useEffect(() => {
    if (renamingId !== null && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  // 重命名项目输入框自动聚焦
  useEffect(() => {
    if (renamingProjectId !== null && renameProjectInputRef.current) {
      renameProjectInputRef.current.focus()
      renameProjectInputRef.current.select()
    }
  }, [renamingProjectId])

  const handleDeleteClick = (conversationId: number, conversationTitle: string) => {
    setConversationMenuOpen(null)
    if (onOpenDeleteModal) {
      onOpenDeleteModal(conversationId, conversationTitle)
    }
  }

  const handleRenameClick = (conversationId: number, currentTitle: string) => {
    setConversationMenuOpen(null)
    setRenamingId(conversationId)
    setRenameValue(currentTitle)
  }

  const handleRenameSubmit = (conversationId: number) => {
    if (renameValue.trim() && onRenameConversation) {
      onRenameConversation(conversationId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const handleRenameCancel = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  // 项目相关处理函数
  const handleNewProjectClick = () => {
    if (onOpenCreateProjectModal) {
      onOpenCreateProjectModal()
    }
  }

  const handleDeleteProject = (id: number | string) => {
    setProjectMenuOpen(null)
    if (onDeleteProject) {
      onDeleteProject(id)
    }
  }

  const handleRenameProjectClick = (id: number | string, currentName: string) => {
    setProjectMenuOpen(null)
    setRenamingProjectId(id)
    setRenameProjectValue(currentName)
  }

  const handleRenameProjectSubmit = (id: number | string) => {
    if (renameProjectValue.trim() && onRenameProject) {
      onRenameProject(id, renameProjectValue.trim())
    }
    setRenamingProjectId(null)
    setRenameProjectValue('')
  }

  const handleRenameProjectCancel = () => {
    setRenamingProjectId(null)
    setRenameProjectValue('')
  }

  return (
    <div
      id="stage-slideover-sidebar"
      className={`fixed left-0 top-0 z-21 h-screen shrink-0 overflow-hidden max-md:hidden bg-white border-r border-gray-200 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{ width: 'var(--sidebar-width, 280px)' }}
    >
      <div className="flex flex-col h-screen p-4 pt-16 overflow-y-auto">
        {/* 新对话按钮 */}
        <button
          onClick={onNewConversation}
          className="w-full flex items-center gap-2 px-3 h-9 text-gray-600 hover:bg-gray-100 hover:text-[#37322F] rounded-lg transition-colors text-left"
          style={{ fontSize: '14px' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          新对话
        </button>

        {/* 间隔 */}
        <div className="h-1.5"></div>

        {/* 图书馆入口 */}
        <Link href="/library-new">
          <button
            className="w-full flex items-center gap-2 px-3 h-9 text-gray-600 hover:bg-gray-100 hover:text-[#37322F] rounded-lg transition-colors text-left"
            style={{ fontSize: '14px' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            图书馆
          </button>
        </Link>

        {/* 计划区域 */}
        <div className="mb-4 mt-4">
          {/* 计划标题 - 一级标题 */}
          <div className="group flex items-center justify-between px-3 py-1.5">
            <span className="text-gray-500" style={{ fontSize: '14px' }}>计划</span>
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-all"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform text-gray-500 ${projectsExpanded ? 'rotate-0' : '-rotate-90'}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* 计划列表 - 二级条目 */}
          {projectsExpanded && (
            <div className="mt-1 space-y-0.5">
              {/* 新计划按钮 - 带加号的文件夹图标 */}
              <button
                onClick={handleNewProjectClick}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 hover:text-[#37322F] rounded-lg transition-colors text-left"
                style={{ fontSize: '14px' }}
              >
                <span className="text-base">📁</span>
                <span className="flex items-center gap-1">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="inline-block"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  新计划
                </span>
              </button>

              {/* 已有计划列表 */}
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`relative group ${
                    projectMenuOpen === project.id ? 'z-[101]' : 'z-0'
                  }`}
                >
                  {renamingProjectId === project.id ? (
                    // 重命名输入框
                    <div className="px-3 py-1.5">
                      <input
                        ref={renameProjectInputRef}
                        type="text"
                        value={renameProjectValue}
                        onChange={(e) => setRenameProjectValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameProjectSubmit(project.id)
                          } else if (e.key === 'Escape') {
                            handleRenameProjectCancel()
                          }
                        }}
                        onBlur={() => handleRenameProjectSubmit(project.id)}
                        className="w-full px-2 py-1 border border-[#37322F] rounded focus:outline-none focus:ring-2 focus:ring-[#37322F]"
                        style={{ fontSize: '14px' }}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => onSelectProject && onSelectProject(project.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
                        activeProjectId === project.id
                          ? 'bg-gray-100 text-[#37322F]'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="text-base">📁</span>
                      <span className={`truncate pr-8 ${
                        activeProjectId === project.id ? 'text-[#37322F]' : 'text-gray-700'
                      }`} style={{ fontSize: '14px' }}>
                        {project.name}
                      </span>
                    </button>
                  )}

                  {/* 更多菜单按钮 */}
                  {renamingProjectId !== project.id && (
                    <div
                      className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity ${
                        projectMenuOpen === project.id
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setProjectMenuOpen(
                            projectMenuOpen === project.id
                              ? null
                              : project.id
                          )
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>

                      {/* 下拉菜单 */}
                      {projectMenuOpen === project.id && (
                        <div
                          ref={projectMenuRef}
                          className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[102]"
                        >
                          <button
                            onClick={() => handleRenameProjectClick(project.id, project.name)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            重命名
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

