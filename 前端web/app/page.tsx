"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { SettingsModal } from "@/components/settings-modal"

const TEST_ACCOUNTS = [
  {
    email: "123456@qq.com",
    password: "12345678",
    realName: "吴岛",
    university: "四川大学",
    isBanned: false,
  },
  {
    email: "1234567@qq.com",
    password: "12345678",
    realName: "小张",
    university: "清华大学",
    isBanned: true,
  },
]

// Reusable Badge Component
function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return null
}

export default function LandingPage() {
  const [activeCard, setActiveCard] = useState(0)
  const [progress, setProgress] = useState(0)
  const mountedRef = useRef(true)

  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)
  const placeholders = [
    "Quiz me on vocabulary",
    "Help me with math problems",
    "Explain this concept",
    "Create a study plan",
  ]

  const [activeNavItem, setActiveNavItem] = useState("学习")
  const navItems = ["学习", "查阅", "写作", "演示", "协作"]

  const [conversations] = useState([
    { id: 1, title: "数学问题求解" },
    { id: 2, title: "英语语法学习" },
    { id: 3, title: "物理概念解释" },
    { id: 4, title: "化学实验分析" },
  ])

  const [bookshelfBooks, setBookshelfBooks] = useState<any[]>([])
  const [showAllBooks, setShowAllBooks] = useState(false)
  const [bookshelfManagementOpen, setBookshelfManagementOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<{ id: string; name: string } | null>(null)

  const [inputValue, setInputValue] = useState("")

  const [typingPlaceholder, setTypingPlaceholder] = useState("")
  const [isTypingComplete, setIsTypingComplete] = useState(false)

  const [selectedMode, setSelectedMode] = useState<"学习" | "复习" | "解题">("学习")
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false)
  const modeDropdownRef = useRef<HTMLDivElement>(null)

  const [conversationMenuOpen, setConversationMenuOpen] = useState<number | null>(null)
  const conversationMenuRef = useRef<HTMLDivElement>(null)

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const [loggedInUser, setLoggedInUser] = useState<{
    id?: string
    email?: string | null
    phone?: string | null
    realName?: string | null
    name?: string
    university?: string | null
    avatar?: string
  } | null>(null)
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false)
  const avatarDropdownRef = useRef<HTMLDivElement>(null)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userModalView, setUserModalView] = useState<"profile" | "settings" | "edit-profile">("profile")

  const [mobileQRVisible, setMobileQRVisible] = useState(false)

  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [loginView, setLoginView] = useState<"email" | "wechat">("email")
  const [registrationStep, setRegistrationStep] = useState<
    "email" | "login" | "verification" | "password" | "name" | "university"
  >("email")
  const [verificationCode, setVerificationCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [realName, setRealName] = useState("")
  const [university, setUniversity] = useState("")

  const [isRequestingUniversityChange, setIsRequestingUniversityChange] = useState(false)
  const [newUniversityRequest, setNewUniversityRequest] = useState("")
  const [universityChangeReason, setUniversityChangeReason] = useState("")
  const universitySectionRef = useRef<HTMLDivElement>(null)
  const [isVerifyingName, setIsVerifyingName] = useState(false)

  const [countdown, setCountdown] = useState(60)
  const [isChangingUniversity, setIsChangingUniversity] = useState(false)
  const [newUniversity, setNewUniversity] = useState("")

  useEffect(() => {
    const savedUser = localStorage.getItem("loggedInUser")
    if (savedUser) {
      setLoggedInUser(JSON.parse(savedUser))
    }

    const bookshelf = JSON.parse(localStorage.getItem("bookshelf") || "[]")
    setBookshelfBooks(bookshelf)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(event.target as Node)) {
        setAvatarDropdownOpen(false)
      }
    }

    if (avatarDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [avatarDropdownOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target as Node)) {
        setModeDropdownOpen(false)
      }
    }

    if (modeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [modeDropdownOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (conversationMenuRef.current && !conversationMenuRef.current.contains(event.target as Node)) {
        setConversationMenuOpen(null)
      }
    }

    if (conversationMenuOpen !== null) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [conversationMenuOpen])

  useEffect(() => {
    const handleStorageChange = () => {
      const bookshelf = JSON.parse(localStorage.getItem("bookshelf") || "[]")
      setBookshelfBooks(bookshelf)
    }

    // Listen for storage changes from other tabs/windows
    window.addEventListener("storage", handleStorageChange)

    // Also check periodically for changes in the same tab
    const interval = setInterval(handleStorageChange, 1000)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    let fullText = ""

    if (selectedMode === "解题") {
      fullText = "你可以直接发送题目的照片和文字，我会尽力为你解答。"
    } else if (selectedMode === "学习") {
      if (selectedBook) {
        fullText = `向《${selectedBook.name}》提问`
      } else {
        fullText = "我无法确认你需要学习哪一门课程。"
      }
    } else if (selectedMode === "复习") {
      if (selectedBook) {
        fullText = `向《${selectedBook.name}》提问`
      } else {
        fullText = "我无法确认你需要复习哪一门课程。"
      }
    }

    if (fullText) {
      let currentIndex = 0
      setTypingPlaceholder("")
      setIsTypingComplete(false)

      const typingInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setTypingPlaceholder(fullText.slice(0, currentIndex + 1))
          currentIndex++
        } else {
          setIsTypingComplete(true)
          clearInterval(typingInterval)
        }
      }, 50)

      return () => clearInterval(typingInterval)
    } else {
      setTypingPlaceholder("")
      setIsTypingComplete(false)
    }
  }, [selectedBook, selectedMode])

  useEffect(() => {
    if (!selectedBook && selectedMode !== "解题") {
      const placeholderInterval = setInterval(() => {
        setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
      }, 3000)

      return () => clearInterval(placeholderInterval)
    }
  }, [selectedBook, selectedMode])

  useEffect(() => {
    if (registrationStep === "verification" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [registrationStep, countdown])

  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (!mountedRef.current) return

      setProgress((prev) => {
        if (prev >= 100) {
          if (mountedRef.current) {
            setActiveCard((current) => (current + 1) % 3)
          }
          return 0
        }
        return prev + 2
      })
    }, 100)

    return () => {
      clearInterval(progressInterval)
      mountedRef.current = false
    }
  }, [])

  // useEffect(() => {
  //   const placeholderInterval = setInterval(() => {
  //     setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
  //   }, 3000)

  //   return () => clearInterval(placeholderInterval)
  // }, [])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const toggleLoginModal = () => {
    setLoginModalOpen(!loginModalOpen)
    if (loginModalOpen) {
      setRegistrationStep("email")
      setLoginView("email")
      setEmailError("")
      setCountdown(60)
    }
  }

  const handleOpenProfile = () => {
    setUserModalView("profile")
    setUserModalOpen(true)
    setAvatarDropdownOpen(false)
  }

  const handleOpenSettings = () => {
    setUserModalView("settings")
    setUserModalOpen(true)
    setAvatarDropdownOpen(false)
  }

  const handleCloseUserModal = () => {
    setUserModalOpen(false)
    setUserModalView("profile")
  }

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split("@")
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`
    }
    const visibleStart = localPart.slice(0, 2)
    const visibleEnd = localPart.slice(-1)
    return `${visibleStart}***${visibleEnd}@${domain}`
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleContinue = async () => {
    setEmailError("")

    if (!email.trim()) {
      setEmailError("请输入邮箱地址")
      return
    }

    if (!validateEmail(email)) {
      setEmailError("请输入有效的邮箱格式")
      return
    }

    const account = TEST_ACCOUNTS.find((acc) => acc.email === email)

    if (account) {
      if (account.isBanned) {
        setEmailError("该邮箱已被官方封禁")
        return
      }
      console.log("Email found, proceeding to login")
      setRegistrationStep("login")
      return
    }

    console.log("Email validation passed, sending verification code to:", email)
    setRegistrationStep("verification")
    setCountdown(60)
  }

  const handleLogin = () => {
    if (!password.trim()) {
      setEmailError("请输入密码")
      return
    }

    const account = TEST_ACCOUNTS.find((acc) => acc.email === email)
    if (account && account.password === password) {
      setEmailError("")
      console.log("Login successful")

      const userData = { email: account.email, realName: account.realName, university: account.university }
      setLoggedInUser(userData)
      localStorage.setItem("loggedInUser", JSON.stringify(userData))

      setLoginModalOpen(false)
      alert(`欢迎回来，${account.realName}同学！`)
    } else {
      setEmailError("密码错误，请重试")
    }
  }

  const handleVerificationSubmit = () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setEmailError("请输入6位验证码")
      return
    }
    setEmailError("")
    console.log("Verification code submitted:", verificationCode)
    setRegistrationStep("password")
  }

  const handlePasswordSubmit = () => {
    if (!password.trim() || password.length < 8) {
      setEmailError("密码至少需要8个字符")
      return
    }
    if (password !== confirmPassword) {
      setEmailError("两次输入的密码不一致")
      return
    }
    setEmailError("")
    console.log("Password set successfully")
    setRegistrationStep("name")
  }

  const handleNameSubmit = () => {
    if (!realName.trim()) {
      setEmailError("请输入您的用户名")
      return
    }
    setEmailError("")
    console.log("Real name submitted:", realName)
    setRegistrationStep("university")
  }

  const handleUniversitySubmit = () => {
    if (!university.trim()) {
      setEmailError("请选择您的大学")
      return
    }
    setEmailError("")
    console.log("University bound:", university)

    const userData = { email, realName, university }
    setLoggedInUser(userData)
    localStorage.setItem("loggedInUser", JSON.stringify(userData))

    setLoginModalOpen(false)
    alert("注册成功！欢迎使用")
  }

  const handleBack = () => {
    setEmailError("")
    setPassword("") // Clear password when going back
    if (registrationStep === "login") {
      setRegistrationStep("email")
    } else if (registrationStep === "verification") {
      setRegistrationStep("email")
    } else if (registrationStep === "password") {
      setRegistrationStep("verification")
      setCountdown(60) // Reset countdown when going back to verification
    } else if (registrationStep === "name") {
      setRegistrationStep("password")
    } else if (registrationStep === "university") {
      setRegistrationStep("name")
    }
  }

  const handleResendCode = () => {
    if (countdown === 0) {
      console.log("Resending verification code to:", email)
      setCountdown(60)
    }
  }

  const handleWeChatLogin = () => {
    setLoginView("wechat")
    setEmailError("")
  }

  const handleEmailLogin = () => {
    setLoginView("email")
  }

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser")
    localStorage.removeItem("bookshelf")
    setLoggedInUser(null)
    setBookshelfBooks([])
    setAvatarDropdownOpen(false)
    setSelectedBook(null) // Clear selected book on logout
  }

  const handleCardClick = (index: number) => {
    if (!mountedRef.current) return
    setActiveCard(index)
    setProgress(0)
  }

  const getDashboardContent = () => {
    switch (activeCard) {
      case 0:
        return <div className="text-[#828387] text-sm">Customer Subscription Status and Details</div>
      case 1:
        return <div className="text-[#828387] text-sm">Analytics Dashboard - Real-time Insights</div>
      case 2:
        return <div className="text-[#828387] text-sm">Data Visualization - Charts and Metrics</div>
      default:
        return <div className="text-[#828387] text-sm">Customer Subscription Status and Details</div>
    }
  }

  const handleNavItemClick = (item: string) => {
    setActiveNavItem(item)
  }

  const handleRemoveBook = (bookId: string) => {
    const updatedBookshelf = bookshelfBooks.filter((book) => book.id !== bookId)
    setBookshelfBooks(updatedBookshelf)
    localStorage.setItem("bookshelf", JSON.stringify(updatedBookshelf))
  }

  const handleBookClick = (book: any) => {
    setSelectedBook({ id: book.id, name: book.name })

    if (selectedMode === "解题") {
      setSelectedMode("学习")
    }
  }

  const handleRemoveSelectedBook = () => {
    setSelectedBook(null)
  }

  const handleModeSelect = (mode: "学习" | "复习" | "解题") => {
    setSelectedMode(mode)
    setModeDropdownOpen(false)

    // Clear selected book when switching to 解题 mode
    if (mode === "解题" && selectedBook) {
      setSelectedBook(null)
    }
  }

  const handleDeleteConversation = (conversationId: number) => {
    console.log("Delete conversation:", conversationId)
    setConversationMenuOpen(null)
    // TODO: Implement delete logic
  }

  const handleRenameConversation = (conversationId: number) => {
    console.log("Rename conversation:", conversationId)
    setConversationMenuOpen(null)
    // TODO: Implement rename logic
  }

  const handleArchiveConversation = (conversationId: number) => {
    console.log("Archive conversation:", conversationId)
    setConversationMenuOpen(null)
    // TODO: Implement archive logic
  }

  return (
    <div className="w-full min-h-screen relative bg-[#F7F5F3] overflow-x-hidden flex">
      <div
        id="stage-slideover-sidebar"
        className={`relative z-21 h-full shrink-0 overflow-hidden max-md:hidden bg-white border-r border-gray-200 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "var(--sidebar-width, 280px)" }}
      >
        <div className="flex flex-col h-screen p-4 pt-16">
          <button className="w-full flex items-center gap-3 px-3 py-2 mb-2 bg-gray-100 text-[#37322F] rounded-lg transition-colors font-medium text-left">
            新对话
          </button>

          <Link href="/library">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-[#37322F] rounded-lg transition-colors font-medium text-left">
              图书馆
            </button>
          </Link>

          <div className="relative mb-4 mt-4">
            <input
              type="text"
              placeholder="搜索对话"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:border-transparent pb-1.5"
            />
            <svg
              className="absolute left-3 top-2.5 text-gray-400"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          <div className="flex-1 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-600 mb-3">历史对话</h3>
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`relative group ${conversationMenuOpen === conversation.id ? "z-[101]" : "z-0"}`}
                >
                  <button className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="text-sm font-medium text-[#37322F] truncate pr-8">{conversation.title}</div>
                  </button>

                  <div
                    className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity ${
                      conversationMenuOpen === conversation.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConversationMenuOpen(conversationMenuOpen === conversation.id ? null : conversation.id)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>

                    {conversationMenuOpen === conversation.id && (
                      <div
                        ref={conversationMenuRef}
                        className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[100]"
                      >
                        <button
                          onClick={() => handleRenameConversation(conversation.id)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          重命名
                        </button>
                        <button
                          onClick={() => handleArchiveConversation(conversation.id)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="21 8 21 21 3 21 3 8" />
                            <rect x="1" y="3" width="22" height="5" />
                            <line x1="10" y1="12" x2="14" y2="12" />
                          </svg>
                          归档
                        </button>
                        <button
                          onClick={() => handleDeleteConversation(conversation.id)}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`flex-1 flex flex-col justify-start items-center transition-all duration-300 ${
          sidebarOpen ? "" : "ml-[-280px]"
        }`}
      >
        <button
          onClick={toggleSidebar}
          aria-expanded={sidebarOpen}
          data-state={sidebarOpen ? "open" : "closed"}
          aria-controls="stage-slideover-sidebar"
          className={`fixed top-6 z-50 p-2 bg-white text-[#37322F] rounded-lg hover:bg-gray-50 transition-all duration-300 border border-gray-200 max-md:hidden px-2 my-0 mx-[-6px] ${
            sidebarOpen ? "left-[268px]" : "left-6"
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {sidebarOpen ? (
              <polyline points="15 18 9 12 15 6" />
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        {/* Sichuan University logo next to the collapse button */}
        <div
          className={`fixed top-6 z-50 transition-all duration-300 max-md:hidden ${
            sidebarOpen ? "left-[316px]" : "left-54px]"
          }`}
        >
          <div className="w-16 h-16 flex items-center justify-center"></div>
        </div>

        <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
          <div
            className="relative"
            onMouseEnter={() => setMobileQRVisible(true)}
            onMouseLeave={() => setMobileQRVisible(false)}
          >
            <button className="p-2 bg-white text-[#37322F] rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 max-md:hidden px-2 my-0 mx-[-6px]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </button>

            {/* QR Code Overlay */}
            {mobileQRVisible && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 w-48 z-50">
                <div className="text-center">
                  <p className="text-xs font-medium text-[#37322F] mb-2">扫码下载移动端应用</p>
                  <div className="w-32 h-32 mx-auto bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center mb-2">
                    <img
                      src="/qr-code-for-mobile-app-download.jpg"
                      alt="下载二维码"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-gray-500">使用手机扫描二维码下载</p>
                </div>
              </div>
            )}
          </div>

          <button className="p-2 bg-white text-[#37322F] rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 relative">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
          </button>

          {loggedInUser ? (
            <div className="relative" ref={avatarDropdownRef}>
              <div
                onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
                className="bg-[#37322F] text-white rounded-full flex items-center justify-center font-semibold text-lg cursor-pointer hover:bg-[#2a251f] transition-colors h-8 w-8"
              >
                {loggedInUser.realName?.charAt(0) || loggedInUser.email?.charAt(0)?.toUpperCase() || loggedInUser.phone?.slice(-4) || 'U'}
              </div>

              {avatarDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden">
                  {/* User Header Section */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="bg-[#37322F] text-white rounded-full flex items-center justify-center font-bold text-lg cursor-pointer h-10 w-10 flex-shrink-0 shadow-md">
                      {loggedInUser.realName?.charAt(0) || loggedInUser.email?.charAt(0)?.toUpperCase() || loggedInUser.phone?.slice(-4) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#37322F] text-sm mb-0.5">
                        {loggedInUser.realName || (loggedInUser.phone ? `${loggedInUser.phone.slice(0, 3)}****${loggedInUser.phone.slice(-4)}` : '用户')}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {loggedInUser.email || (loggedInUser.phone ? `${loggedInUser.phone.slice(0, 3)}****${loggedInUser.phone.slice(-4)}` : '')}
                      </div>
                    </div>
                    <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>

                  {/* Plan Section */}
                  <div className="mx-3 mb-2 px-3 py-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-[#37322F] text-sm">免费版本</span>
                      <button className="px-3 py-1 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors text-xs font-medium">
                        升级
                      </button>
                    </div>
                    <button className="w-full flex items-center justify-between py-1.5 text-xs text-gray-600 hover:text-[#37322F] transition-colors group">
                      <div className="flex items-center gap-2">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span>探索会员权益</span>
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-400 group-hover:text-[#37322F] transition-colors"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-100 my-1.5"></div>

                  {/* Menu Items */}
                  <div className="py-1 px-2">
                    <button
                      onClick={handleOpenProfile}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[#37322F] hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-600 flex-shrink-0"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span className="font-medium text-sm flex-1 text-left">个性化</span>
                    </button>

                    <button
                      onClick={handleOpenSettings}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[#37322F] hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-600 flex-shrink-0"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2M2 20h6m0-6 4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m0-6l4.2-4.2" />
                      </svg>
                      <span className="font-medium text-sm flex-1 text-left">设置</span>
                    </button>

                    <button className="w-full flex items-center justify-between px-4 py-2.5 text-[#37322F] hover:bg-gray-50 rounded-lg transition-colors group">
                      <div className="flex items-center gap-3">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-gray-600 flex-shrink-0"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span className="font-medium text-sm">帮助</span>
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-400 group-hover:text-[#37322F] transition-colors"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-100 my-1.5"></div>

                  {/* Logout Section */}
                  <div className="py-1 px-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span className="font-medium text-sm">注销</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={toggleLoginModal}
              className="px-4 py-2 bg-white text-[#37322F] rounded-full hover:bg-gray-50 transition-colors border border-gray-200 font-medium text-sm"
            >
              登录
            </button>
          )}
        </div>

        <div
          className={`fixed top-6 z-40 max-md:hidden transition-all duration-300 ${
            sidebarOpen ? "left-1/2 transform -translate-x-1/2 ml-[140px]" : "left-1/2 transform -translate-x-1/2"
          }`}
        >
          <div className="flex items-center gap-1 bg-white rounded-full p-1 border border-gray-200">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => handleNavItemClick(item)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeNavItem === item ? "bg-[#37322F] text-white shadow-sm" : "text-[#37322F] hover:bg-gray-50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex flex-col justify-start items-center w-full">
          <div className="w-full max-w-7xl mx-auto px-8 relative flex flex-col justify-start items-start min-h-screen">
            <div className="self-stretch pt-[9px] overflow-hidden flex flex-col justify-center items-center gap-4 sm:gap-6 md:gap-8 lg:gap-[66px] relative z-10">
              <div className="pt-16 sm:pt-20 md:pt-24 lg:pt-[120px] pb-8 sm:pb-12 md:pb-16 flex flex-col justify-start items-center px-2 sm:px-4 md:px-0 pl-0 pr-0">
                <div className="w-full max-w-[937px] lg:w-[937px] flex flex-col justify-center items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                  <div className="w-full max-w-[748.71px] lg:w-[748.71px] text-center flex justify-center flex-col text-[#37322F] text-[24px] xs:text-[28px] sm:text-[36px] md:text-[52px] lg:text-[80px] font-normal leading-[1.1] sm:leading-[1.15] md:leading-[1.2] lg:leading-24 font-serif px-2 sm:px-4 md:px-0">
                    <div className="text-[28px] leading-[34px] font-semibold tracking-[0.3px] text-center mx-auto mb-4">
                      你好，{loggedInUser ? `${loggedInUser.realName || ''}同学` : "同学"}有什么可以帮助你的吗？
                    </div>
                  </div>

                  <div className="w-full max-w-[600px] mt-4 relative">
                    <div className="w-full bg-white border border-gray-200 rounded-2xl md:rounded-3xl min-h-[72px] flex flex-col">
                      {/* Textarea container */}
                      <div className="flex-1 relative">
                        {inputValue.length === 0 && (
                          <div className="absolute top-4 left-4 pointer-events-none z-10">
                            <div className="relative h-6 overflow-hidden">
                              {selectedBook ? (
                                <div className="text-gray-400 text-base">
                                  {typingPlaceholder}
                                  {!isTypingComplete && <span className="animate-pulse">|</span>}
                                </div>
                              ) : (
                                <>
                                  {placeholders.map((placeholder, index) => (
                                    <div
                                      key={index}
                                      className={`absolute inset-0 text-gray-400 text-base transition-all duration-500 ${
                                        index === currentPlaceholder
                                          ? "opacity-100 translate-y-0"
                                          : index ===
                                              (currentPlaceholder - 1 + placeholders.length) % placeholders.length
                                            ? "opacity-0 -translate-y-6"
                                            : "opacity-0 translate-y-6"
                                      }`}
                                    >
                                      {placeholder}
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        <textarea
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          className="w-full bg-transparent resize-none outline-none pt-4 pl-4 pr-4 pb-2 text-base text-[#37322F] min-h-[72px] max-h-[200px] overflow-y-auto placeholder-transparent"
                          placeholder="Ask me anything..."
                          rows={1}
                        />
                      </div>

                      {/* Buttons row - separate from textarea */}
                      <div className="px-3 pb-3 flex items-center justify-between border-t border-transparent">
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>

                          {selectedBook && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
                              <span className="text-[#37322F] font-medium">{selectedBook.name}</span>
                              <button
                                onClick={handleRemoveSelectedBook}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative" ref={modeDropdownRef}>
                            <button
                              onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
                            >
                              {selectedMode}
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className={`transition-transform ${modeDropdownOpen ? "rotate-180" : ""}`}
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>

                            {modeDropdownOpen && (
                              <div className="absolute top-full left-0 mt-2 w-24 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-[100]">
                                <button
                                  onClick={() => handleModeSelect("学习")}
                                  className={`w-full px-2 py-1.5 text-left text-sm transition-colors rounded ${
                                    selectedMode === "学习"
                                      ? "bg-gray-100 text-[#37322F] font-medium"
                                      : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  学习
                                </button>
                                <button
                                  onClick={() => handleModeSelect("复习")}
                                  className={`w-full px-2 py-1.5 text-left text-sm transition-colors rounded ${
                                    selectedMode === "复习"
                                      ? "bg-gray-100 text-[#37322F] font-medium"
                                      : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  复习
                                </button>
                                <button
                                  onClick={() => handleModeSelect("解题")}
                                  className={`w-full px-2 py-1.5 text-left text-sm transition-colors rounded ${
                                    selectedMode === "解题"
                                      ? "bg-gray-100 text-[#37322F] font-medium"
                                      : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  解题
                                </button>
                              </div>
                            )}
                          </div>

                          <button className="p-2 bg-[#37322F] text-white hover:bg-[#2a251f] rounded-lg transition-colors">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <line x1="12" y1="19" x2="12" y2="5" />
                              <polyline points="5 12 12 5 19 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {bookshelfBooks.length > 0 && (
                      <div className="mt-10">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {bookshelfBooks.slice(0, showAllBooks ? bookshelfBooks.length : 3).map((book) => (
                            <button
                              key={book.id}
                              onClick={() => handleBookClick(book)}
                              className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                            >
                              <p className="text-sm font-medium text-[#37322F]">{book.name}</p>
                            </button>
                          ))}
                        </div>

                        {/* Buttons row */}
                        <div className="flex items-center justify-center gap-3 mt-4">
                          {bookshelfBooks.length > 3 && (
                            <button
                              onClick={() => setShowAllBooks(!showAllBooks)}
                              className="px-4 py-2 text-sm text-[#37322F] border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              {showAllBooks ? "收起" : "更多"}
                            </button>
                          )}
                          <button
                            onClick={() => setBookshelfManagementOpen(true)}
                            className="px-4 py-2 text-sm text-[#37322F] border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            管理
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loginModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-opacity-90 bg-stone-400 opacity-80" onClick={toggleLoginModal}></div>

            {emailError && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-72 px-6 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium text-center z-10 shadow-lg max-w-sm">
                {emailError}
              </div>
            )}

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
              <button
                onClick={toggleLoginModal}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {loginView === "email" && registrationStep !== "email" && (
                <button
                  onClick={handleBack}
                  className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
              )}

              {loginView === "email" ? (
                <>
                  {registrationStep === "email" && (
                    <>
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold text-[#37322F] mb-2">登录或注册</h2>
                        <p className="text-gray-600">您将获得你在大学期间的得力助手</p>
                      </div>

                      <div className="mb-6">
                        <div className="relative">
                          <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value)
                              if (emailError) setEmailError("")
                            }}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:border-transparent peer placeholder-transparent ${
                              emailError ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="电子邮件地址"
                          />
                          <label
                            htmlFor="email"
                            className="absolute left-4 -top-2.5 bg-white px-1 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#37322F]"
                          >
                            电子邮件地址
                          </label>
                        </div>
                      </div>

                      <button
                        onClick={handleContinue}
                        className="w-full bg-[#37322F] text-white py-3 rounded-lg font-medium hover:bg-[#2a251f] transition-colors mb-6"
                      >
                        继续
                      </button>

                      <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="bg-white px-2 text-gray-500">或</span>
                        </div>
                      </div>

                      <button
                        onClick={handleWeChatLogin}
                        className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mb-6"
                      >
                        <img src="/wechat-logo.svg" alt="WeChat" width="20" height="20" />
                        <span className="text-[#37322F] font-medium">微信登录</span>
                      </button>

                      <p className="text-xs text-gray-500 text-center">
                        继续即表示您同意我们的{" "}
                        <a href="#" className="text-[#37322F] hover:underline">
                          使用条款
                        </a>{" "}
                        和{" "}
                        <a href="#" className="text-[#37322F] hover:underline">
                          隐私政策
                        </a>
                      </p>
                    </>
                  )}

                  {registrationStep === "login" && (
                    <>
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold text-[#37322F] mb-2">输入密码</h2>
                        <p className="text-gray-600">欢迎回来！请输入您的密码</p>
                      </div>

                      <div className="mb-6">
                        <div className="relative">
                          <input
                            type="password"
                            id="loginPassword"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value)
                              if (emailError) setEmailError("")
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:border-transparent peer placeholder-transparent"
                            placeholder="密码"
                          />
                          <label
                            htmlFor="loginPassword"
                            className="absolute left-4 -top-2.5 bg-white px-1 text-sm text-gray-600 peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#37322F]"
                          >
                            密码
                          </label>
                        </div>
                      </div>

                      <button
                        onClick={handleLogin}
                        className="w-full bg-[#37322F] text-white py-3 rounded-lg font-medium hover:bg-[#2a251f] transition-colors mb-4"
                      >
                        登录
                      </button>

                      <button className="w-full text-sm text-[#37322F] hover:underline">忘记密码？</button>
                    </>
                  )}

                  {registrationStep === "verification" && (
                    <>
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold text-[#37322F] mb-2">输入验证码</h2>
                        <p className="text-gray-600">验证码已发送至 {email}</p>
                      </div>

                      <div className="mb-6">
                        <div className="relative">
                          <input
                            type="text"
                            id="verification"
                            value={verificationCode}
                            onChange={(e) => {
                              setVerificationCode(e.target.value)
                              if (emailError) setEmailError("")
                            }}
                            maxLength={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:border-transparent peer placeholder-transparent text-center text-2xl tracking-widest"
                            placeholder="验证码"
                          />
                          <label
                            htmlFor="verification"
                            className="absolute left-4 -top-2.5 bg-white px-1 text-sm text-gray-600 peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#37322F]"
                          >
                            6位验证码
                          </label>
                        </div>
                      </div>

                      <button
                        onClick={handleVerificationSubmit}
                        className="w-full bg-[#37322F] text-white py-3 rounded-lg font-medium hover:bg-[#2a251f] transition-colors mb-4"
                      >
                        验证
                      </button>

                      <button
                        onClick={handleResendCode}
                        disabled={countdown > 0}
                        className={`w-full text-sm ${
                          countdown > 0
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-[#37322F] hover:underline cursor-pointer"
                        }`}
                      >
                        {countdown > 0 ? `重新发送验证码 (${countdown}s)` : "重新发送验证码"}
                      </button>
                    </>
                  )}

                  {registrationStep === "password" && (
                    <>
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold text-[#37322F] mb-2">设置密码</h2>
                        <p className="text-gray-600">请设置您的账户密码</p>
                      </div>

                      <div className="mb-4">
                        <div className="relative">
                          <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value)
                              if (emailError) setEmailError("")
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:border-transparent peer placeholder-transparent"
                            placeholder="密码"
                          />
                          <label
                            htmlFor="password"
                            className="absolute left-4 -top-2.5 bg-white px-1 text-sm text-gray-600 peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#37322F]"
                          >
                            密码（至少8个字符）
                          </label>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="relative">
                          <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value)
                              if (emailError) setEmailError("")
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:border-transparent peer placeholder-transparent"
                            placeholder="确认密码"
                          />
                          <label
                            htmlFor="confirmPassword"
                            className="absolute left-4 -top-2.5 bg-white px-1 text-sm text-gray-600 peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#37322F]"
                          >
                            确认密码
                          </label>
                        </div>
                      </div>

                      <button
                        onClick={handlePasswordSubmit}
                        className="w-full bg-[#37322F] text-white py-3 rounded-lg font-medium hover:bg-[#2a251f] transition-colors"
                      >
                        继续
                      </button>
                    </>
                  )}

                  {registrationStep === "name" && (
                    <>
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold text-[#37322F] mb-2">设置用户名</h2>
                        <p className="text-gray-600">请输入您的用户名</p>
                      </div>

                      <div className="mb-6">
                        <div className="relative">
                          <input
                            type="text"
                            id="realName"
                            value={realName}
                            onChange={(e) => {
                              setRealName(e.target.value)
                              if (emailError) setEmailError("")
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:border-transparent peer placeholder-transparent"
                            placeholder="用户名"
                          />
                          <label
                            htmlFor="realName"
                            className="absolute left-4 -top-2.5 bg-white px-1 text-sm text-gray-600 peer-placeholder-shown:text-base peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#37322F]"
                          >
                            用户名
                          </label>
                        </div>
                      </div>

                      <button
                        onClick={handleNameSubmit}
                        className="w-full bg-[#37322F] text-white py-3 rounded-lg font-medium hover:bg-[#2a251f] transition-colors"
                      >
                        继续
                      </button>
                    </>
                  )}

                  {registrationStep === "university" && (
                    <>
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold text-[#37322F] mb-2">绑定大学</h2>
                        <p className="text-gray-600">请选择您所在的大学</p>
                      </div>

                      <div className="mb-6">
                        <div className="relative">
                          <select
                            id="university"
                            value={university}
                            onChange={(e) => {
                              setUniversity(e.target.value)
                              if (emailError) setEmailError("")
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:border-transparent appearance-none bg-white"
                          >
                            <option value="">请选择大学</option>
                            <option value="北京大学">北京大学</option>
                            <option value="清华大学">清华大学</option>
                            <option value="复旦大学">复旦大学</option>
                            <option value="上海交通大学">上海交通大学</option>
                            <option value="浙江大学">浙江大学</option>
                            <option value="南京大学">南京大学</option>
                            <option value="中国科学技术大学">中国科学技术大学</option>
                            <option value="四川大学">四川大学</option>
                            <option value="其他">其他</option>
                          </select>
                          <label
                            htmlFor="university"
                            className="absolute left-4 -top-2.5 bg-white px-1 text-sm text-gray-600"
                          >
                            选择大学
                          </label>
                          <svg
                            className="absolute right-4 top-4 pointer-events-none"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>

                      <button
                        onClick={handleUniversitySubmit}
                        className="w-full bg-[#37322F] text-white py-3 rounded-lg font-medium hover:bg-[#2a251f] transition-colors"
                      >
                        完成注册
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-[#37322F] mb-2">微信扫码登录</h2>
                    <p className="text-gray-600">使用微信扫描二维码登录</p>
                  </div>

                  <div className="flex justify-center mb-6">
                    <div className="w-48 h-48 bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <svg
                          className="mx-auto mb-2"
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                        </svg>
                        <p className="text-sm text-gray-500">二维码</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-2 text-gray-500">或</span>
                    </div>
                  </div>

                  <button
                    onClick={handleEmailLogin}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mb-6"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <path d="m4 8 8 5 8-5" />
                    </svg>
                    <span className="text-[#37322F] font-medium">邮箱登录</span>
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    继续即表示您同意我们的{" "}
                    <a href="#" className="text-[#37322F] hover:underline">
                      使用条款
                    </a>{" "}
                    和{" "}
                    <a href="#" className="text-[#37322F] hover:underline">
                      隐私政策
                    </a>
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Settings Modal */}
        <SettingsModal
          open={userModalOpen}
          onOpenChange={(open) => !open && handleCloseUserModal()}
        />

        <div
          className={`fixed inset-0 z-[100] bg-[#F7F5F3] transition-transform duration-500 ease-in-out ${
            bookshelfManagementOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="w-full h-full overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-gray-200 px-6 py-4">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div className="w-9"></div>
                <h1 className="text-xl font-semibold text-[#37322F]">我的书架</h1>
                <button
                  onClick={() => setBookshelfManagementOpen(false)}
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
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
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-6 py-8">
              {bookshelfBooks.length === 0 ? (
                <div className="text-center py-16">
                  <svg
                    className="mx-auto mb-4 text-gray-300"
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  <p className="text-gray-500 text-lg mb-2">书架是空的</p>
                  <p className="text-gray-400 text-sm mb-6">从图书馆添加书籍到你的书架</p>
                  <Link href="/library">
                    <button className="px-6 py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors">
                      ���往图书馆
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {bookshelfBooks.map((book) => (
                    <div key={book.id} className="group relative">
                      <div className="relative">
                        <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 mb-3 shadow-sm group-hover:shadow-md transition-shadow">
                          <img
                            src={book.cover || "/placeholder.svg?height=200&width=150"}
                            alt={book.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveBook(book.id)}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                          title="移除"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                      <h3 className="text-sm font-medium text-[#37322F] line-clamp-2 mb-1">{book.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{book.author}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
