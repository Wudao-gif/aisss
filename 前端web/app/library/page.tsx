"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"

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

const SAMPLE_BOOKS = [
  {
    id: 1,
    cover: "/images/book-calculo.png",
    name: "高等数学（第七版）上册",
    isbn: "978-7-04-039766-5",
    author: "同济大学数学系",
    publisher: "高等教育出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 2,
    cover: "/images/book-algebra.png",
    name: "线性代数（第六版）",
    isbn: "978-7-04-039683-5",
    author: "同济大学数学系",
    publisher: "高等教育出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 3,
    cover: "/probability-statistics-textbook-cover.jpg",
    name: "概率论与数理统计（第五版）",
    isbn: "978-7-04-051524-2",
    author: "盛骤、谢式千、潘承毅",
    publisher: "高等教育出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 4,
    cover: "/--------.jpg",
    name: "大学物理（第三版）",
    isbn: "978-7-5446-3456-8",
    author: "张三慧",
    publisher: "清华大学出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 5,
    cover: "/c--------.jpg",
    name: "C语言程序设计（第五版）",
    isbn: "978-7-300-25463-2",
    author: "谭浩强",
    publisher: "清华大学出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 6,
    cover: "/--------.jpg",
    name: "数据结构（C语言版）",
    isbn: "978-7-04-039777-1",
    author: "严蔚敏、吴伟民",
    publisher: "清华大学出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 7,
    cover: "/--------.jpg",
    name: "大学英语综合教程1",
    isbn: "978-7-5446-3456-8",
    author: "李荫华",
    publisher: "上海外语教育出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 8,
    cover: "/--------.jpg",
    name: "马克思主义基本原理",
    isbn: "978-7-04-039766-5",
    author: "本书编写组",
    publisher: "高等教育出版社",
    university: "北京大学", // Added university field
  },
  {
    id: 9,
    cover: "/-------.jpg",
    name: "微观经济学（第九版）",
    isbn: "978-7-300-25463-2",
    author: "高鸿业",
    publisher: "中国人民大学出版社",
    university: "北京大学", // Added university field
  },
  {
    id: 10,
    cover: "/-------.jpg",
    name: "宏观经济学（第七版）",
    isbn: "978-7-04-03964-9",
    author: "高鸿业",
    publisher: "中国人民大学出版社",
    university: "复旦大学", // Added university field
  },
  {
    id: 11,
    cover: "/organic-chemistry-textbook.jpg",
    name: "有机化学（第五版）",
    isbn: "978-7-04-039768-9",
    author: "邢其毅、裴伟伟、徐瑞秋、裴坚",
    publisher: "高等教育出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 12,
    cover: "/inorganic-chemistry-textbook.jpg",
    name: "无机化学（第六版）",
    isbn: "978-7-04-051525-9",
    author: "大连理工大学无机化学教研室",
    publisher: "高等教育出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 13,
    cover: "/computer-networks-textbook.jpg",
    name: "计算机网络（第八版）",
    isbn: "978-7-121-38839-6",
    author: "谢希仁",
    publisher: "电子工业出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 14,
    cover: "/operating-systems-textbook.jpg",
    name: "操作系统概念（第九版）",
    isbn: "978-7-111-54432-6",
    author: "Abraham Silberschatz",
    publisher: "机械工业出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 15,
    cover: "/database-systems-textbook.jpg",
    name: "数据库系统概论（第五版）",
    isbn: "978-7-04-040664-0",
    author: "王珊、萨师煊",
    publisher: "高等教育出版社",
    university: "北京大学", // Added university field
  },
  {
    id: 16,
    cover: "/algorithms-textbook.jpg",
    name: "算法导论（第三版）",
    isbn: "978-7-111-40701-0",
    author: "Thomas H. Cormen",
    publisher: "机械工业出版社",
    university: "复旦大学", // Added university field
  },
  {
    id: 17,
    cover: "/software-engineering-textbook.jpg",
    name: "软件工程导论（第六版）",
    isbn: "978-7-04-039777-1",
    author: "张海藩、牟永敏",
    publisher: "清华大学出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 18,
    cover: "/artificial-intelligence-textbook.jpg",
    name: "人工智能：一种现代的方法（第三版）",
    isbn: "978-7-115-37846-2",
    author: "Stuart Russell、Peter Norvig",
    publisher: "人民邮电出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 19,
    cover: "/machine-learning-textbook.jpg",
    name: "机器学习",
    isbn: "978-7-111-54886-7",
    author: "周志华",
    publisher: "清华大学出版社",
    university: "北京大学", // Added university field
  },
  {
    id: 20,
    cover: "/python-programming-textbook.jpg",
    name: "Python编程：从入门到实践（第二版）",
    isbn: "978-7-115-54608-6",
    author: "Eric Matthes",
    publisher: "人民邮电出版社",
    university: "复旦大学", // Added university field
  },
  {
    id: 21,
    cover: "/java-programming-textbook.jpg",
    name: "Java核心技术（第十一版）",
    isbn: "978-7-111-61252-1",
    author: "Cay S. Horstmann",
    publisher: "机械工业出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 22,
    cover: "/web-development-textbook.jpg",
    name: "Web前端开发技术",
    isbn: "978-7-115-48392-2",
    author: "刘伟",
    publisher: "人民邮电出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 23,
    cover: "/digital-circuits-textbook.jpg",
    name: "数字电路与逻辑设计（第三版）",
    isbn: "978-7-04-039769-6",
    author: "王毓银",
    publisher: "高等教育出版社",
    university: "北京大学", // Added university field
  },
  {
    id: 24,
    cover: "/analog-circuits-textbook.jpg",
    name: "模拟电子技术基础（第五版）",
    isbn: "978-7-04-039770-2",
    author: "童诗白、华成英",
    publisher: "高等教育出版社",
    university: "复旦大学", // Added university field
  },
  {
    id: 25,
    cover: "/signal-processing-textbook.jpg",
    name: "信号与系统（第三版）",
    isbn: "978-7-04-039771-9",
    author: "郑君里、应启珩、杨为理",
    publisher: "高等教育出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 26,
    cover: "/communication-principles-textbook.jpg",
    name: "通信原理（第七版）",
    isbn: "978-7-04-039772-6",
    author: "樊昌信、曹丽娜",
    publisher: "国防工业出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 27,
    cover: "/mechanics-textbook.jpg",
    name: "理论力学（第八版）",
    isbn: "978-7-04-039773-3",
    author: "哈尔滨工业大学理论力学教研室",
    publisher: "高等教育出版社",
    university: "北京大学", // Added university field
  },
  {
    id: 28,
    cover: "/materials-science-textbook.jpg",
    name: "材料力学（第六版）",
    isbn: "978-7-04-039774-0",
    author: "刘鸿文",
    publisher: "高等教育出版社",
    university: "复旦大学", // Added university field
  },
  {
    id: 29,
    cover: "/fluid-mechanics-textbook.jpg",
    name: "流体力学（第三版）",
    isbn: "978-7-04-039775-7",
    author: "张也影",
    publisher: "高等教育出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 30,
    cover: "/thermodynamics-textbook.jpg",
    name: "工程热力学（第五版）",
    isbn: "978-7-04-039776-4",
    author: "沈维道、童钧耕",
    publisher: "高等教育出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 31,
    cover: "/mechanical-design-textbook.jpg",
    name: "机械设计（第九版）",
    isbn: "978-7-04-039778-8",
    author: "濮良贵、陈国定、吴立言",
    publisher: "高等教育出版社",
    university: "北京大学", // Added university field
  },
  {
    id: 32,
    cover: "/control-theory-textbook.jpg",
    name: "自动控制原理（第六版）",
    isbn: "978-7-04-039779-5",
    author: "胡寿松",
    publisher: "科学出版社",
    university: "复旦大学", // Added university field
  },
  {
    id: 33,
    cover: "/anatomy-textbook.jpg",
    name: "系统解剖学（第九版）",
    isbn: "978-7-117-26789-1",
    author: "柏树令、应大君",
    publisher: "人民卫生出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 34,
    cover: "/physiology-textbook.jpg",
    name: "生理学（第九版）",
    isbn: "978-7-117-26790-7",
    author: "朱大年、王庭槐",
    publisher: "人民卫生出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 35,
    cover: "/biochemistry-textbook.jpg",
    name: "生物化学与分子生物学（第九版）",
    isbn: "978-7-117-26791-4",
    author: "查锡良、药立波",
    publisher: "人民卫生出版社",
    university: "北京大学", // Added university field
  },
  {
    id: 36,
    cover: "/pathology-textbook.jpg",
    name: "病理学（第九版）",
    isbn: "978-7-117-26792-1",
    author: "李玉林、王恩华",
    publisher: "人民卫生出版社",
    university: "复旦大学", // Added university field
  },
  {
    id: 37,
    cover: "/pharmacology-textbook.jpg",
    name: "药理学（第九版）",
    isbn: "978-7-117-26793-8",
    author: "杨宝峰、陈建国",
    publisher: "人民卫生出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 38,
    cover: "/internal-medicine-textbook.jpg",
    name: "内科学（第九版）",
    isbn: "978-7-117-26794-5",
    author: "葛均波、徐永健、王辰",
    publisher: "人民卫生出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 39,
    cover: "/civil-law-textbook.jpg",
    name: "民法学（第五版）",
    isbn: "978-7-04-039780-1",
    author: "魏振瀛",
    publisher: "北京大学出版社",
    university: "北京大学", // Added university field
  },
  {
    id: 40,
    cover: "/criminal-law-textbook.jpg",
    name: "刑法学（第八版）",
    isbn: "978-7-04-039781-8",
    author: "高铭暄、马克昌",
    publisher: "北京大学出版社",
    university: "复旦大学", // Added university field
  },
  {
    id: 41,
    cover: "/constitutional-law-textbook.jpg",
    name: "宪法学（第四版）",
    isbn: "978-7-04-039782-5",
    author: "周叶中",
    publisher: "高等教育出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 42,
    cover: "/administrative-law-textbook.jpg",
    name: "行政法与行政诉讼法（第七版）",
    isbn: "978-7-04-039783-2",
    author: "姜明安",
    publisher: "北京大学出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 43,
    cover: "/management-textbook.jpg",
    name: "管理学（第十三版）",
    isbn: "978-7-300-25465-6",
    author: "斯蒂芬·罗宾斯",
    publisher: "中国人民大学出版社",
    university: "北京大学", // Added university field
  },
  {
    id: 44,
    cover: "/marketing-textbook.jpg",
    name: "市场营销学（第六版）",
    isbn: "978-7-300-25466-3",
    author: "吴健安",
    publisher: "高等教育出版社",
    university: "复旦大学", // Added university field
  },
  {
    id: 45,
    cover: "/accounting-textbook.jpg",
    name: "会计学原理（第二十版）",
    isbn: "978-7-300-25467-0",
    author: "葛家澍、林志军",
    publisher: "中国人民大学出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 46,
    cover: "/finance-textbook.jpg",
    name: "公司理财（第十一版）",
    isbn: "978-7-111-61253-8",
    author: "斯蒂芬·罗斯",
    publisher: "机械工业出版社",
    university: "清华大学", // Added university field
  },
  {
    id: 47,
    cover: "/chinese-literature-textbook.jpg",
    name: "中国文学史（第三版）",
    isbn: "978-7-04-039784-9",
    author: "袁行霈",
    publisher: "高等教育出版社",
    university: "北京大学", // Added university field
  },
  {
    id: 48,
    cover: "/foreign-literature-textbook.jpg",
    name: "外国文学史（第三版）",
    isbn: "978-7-04-039785-6",
    author: "郑克鲁",
    publisher: "高等教育出版社",
    university: "复旦大学", // Added university field
  },
  {
    id: 49,
    cover: "/modern-chinese-textbook.jpg",
    name: "现代汉语（第六版）",
    isbn: "978-7-04-039786-3",
    author: "黄伯荣、廖序东",
    publisher: "高等教育出版社",
    university: "四川大学", // Added university field
  },
  {
    id: 50,
    cover: "/ancient-chinese-textbook.jpg",
    name: "古代汉语（第四版）",
    isbn: "978-7-04-039787-0",
    author: "王力",
    publisher: "中华书局",
    university: "清华大学", // Added university field
  },
  {
    id: 51,
    cover: "/philosophy-textbook.jpg",
    name: "西方哲学史（第二版）",
    isbn: "978-7-04-039788-7",
    author: "张志伟",
    publisher: "中国人民大学出版社",
    university: "北京大学", // Added university field
  },
  {
    id: 52,
    cover: "/logic-textbook.jpg",
    name: "逻辑学导论（第十三版）",
    isbn: "978-7-04-039789-4",
    author: "罗素",
    publisher: "商务印书馆",
    university: "复旦大学", // Added university field
  },
]

export default function LibraryPage() {
  const [loggedInUser, setLoggedInUser] = useState<{ email: string; realName: string; university?: string } | null>(
    null,
  )
  const [university, setUniversity] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredBooks, setFilteredBooks] = useState(SAMPLE_BOOKS)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showSearchBackdrop, setShowSearchBackdrop] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false)
  const avatarDropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userModalView, setUserModalView] = useState<"profile" | "settings" | "edit-profile">("profile")
  const [isRequestingUniversityChange, setIsRequestingUniversityChange] = useState(false) // This state is now handled by isChangingUniversity
  const [isChangingUniversity, setIsChangingUniversity] = useState(false) // New state for university change request
  const [newUniversityRequest, setNewUniversityRequest] = useState("")
  const [newUniversity, setNewUniversity] = useState("") // New state for new university selection
  const [universityChangeReason, setUniversityChangeReason] = useState("")
  const universitySectionRef = useRef<HTMLDivElement>(null)
  const [isVerifyingName, setIsVerifyingName] = useState(false)

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
  const [universityInput, setUniversityInput] = useState("")
  const [countdown, setCountdown] = useState(60)

  const [copiedISBN, setCopiedISBN] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<(typeof SAMPLE_BOOKS)[0] | null>(null)
  const [bookAdded, setBookAdded] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const resourceListRef = useRef<HTMLDivElement>(null)

  const [showOnlyReadable, setShowOnlyReadable] = useState(false)
  const [sortBy, setSortBy] = useState<"time" | "size">("time")
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState("")

  const [resourcesExpanded, setResourcesExpanded] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const booksPerPage = 15 // 3 rows × 5 columns

  const [activeNavItem, setActiveNavItem] = useState("学习") // Fixed: Declare setActiveNavItem
  const navItems = ["学习", "查阅", "写作", "演示", "协作"]

  const displayBooks = useMemo(() => {
    return loggedInUser && university ? SAMPLE_BOOKS.filter((book) => book.university === university) : SAMPLE_BOOKS
  }, [loggedInUser, university])

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split("@")
    if (localPart.length <= 3) {
      return `${localPart.charAt(0)}***@${domain}`
    }
    const visibleStart = localPart.slice(0, 2)
    const visibleEnd = localPart.slice(-1)
    return `${visibleStart}***${visibleEnd}@${domain}`
  }

  useEffect(() => {
    const savedUser = localStorage.getItem("loggedInUser")
    if (savedUser) {
      const user = JSON.parse(savedUser)
      setLoggedInUser(user)

      // Find the user's university from TEST_ACCOUNTS
      const account = TEST_ACCOUNTS.find((acc) => acc.email === user.email)
      if (account) {
        setUniversity(account.university)
      } else if (user.university) {
        // Also check if university was stored directly in user object
        setUniversity(user.university)
      }
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(event.target as Node)) {
        setAvatarDropdownOpen(false)
      }
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node) && drawerOpen) {
        handleCloseDrawer()
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false)
      }
      // The following block is removed because the university change logic is now handled within the edit-profile view
      // if (
      //   userModalOpen &&
      //   !universitySectionRef.current?.contains(event.target as Node) &&
      //   isRequestingUniversityChange
      // ) {
      //   // If user clicks outside the university change section within the modal, reset state
      //   // Only reset if the click is not on the modal itself or the navigation sidebar
      //   const modalContent = document.querySelector(".fixed.inset-0 .absolute .rounded-2xl")
      //   if (modalContent && !modalContent.contains(event.target as Node)) {
      //     setIsRequestingUniversityChange(false)
      //     setNewUniversityRequest("")
      //     setUniversityChangeReason("")
      //   }
      // }
    }

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && drawerOpen) {
        handleCloseDrawer()
      }
      if (event.key === "Escape" && loginModalOpen) {
        toggleLoginModal()
      }
      if (event.key === "Escape" && userModalOpen) {
        handleCloseUserModal()
      }
      if (event.key === "Escape" && isSearchFocused) {
        setIsSearchFocused(false)
        // Close backdrop when Escape key is pressed while search is focused
        setShowSearchBackdrop(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscKey)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [
    drawerOpen,
    avatarDropdownOpen,
    sortDropdownOpen,
    loginModalOpen,
    userModalOpen,
    isRequestingUniversityChange,
    isSearchFocused,
    showSearchBackdrop, // Added showSearchBackdrop to dependencies
  ]) // Added loginModalOpen, userModalOpen, isRequestingUniversityChange, and isSearchFocused

  useEffect(() => {
    if (registrationStep === "verification" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [registrationStep, countdown])

  useEffect(() => {
    // Initialize filteredBooks with all books if search query is cleared
    if (searchQuery.trim().length === 0) {
      setFilteredBooks(displayBooks)
    }
  }, [searchQuery, displayBooks])

  const indexOfLastBook = currentPage * booksPerPage
  const indexOfFirstBook = indexOfLastBook - booksPerPage
  const currentBooks = filteredBooks.slice(indexOfFirstBook, indexOfLastBook)
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleCardClick = (book: (typeof SAMPLE_BOOKS)[0]) => {
    setSelectedBook(book)
    setDrawerOpen(true)

    const bookshelf = JSON.parse(localStorage.getItem("bookshelf") || "[]")
    const isAdded = bookshelf.some((b: any) => b.id === book.id)
    setBookAdded(isAdded)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setTimeout(() => setSelectedBook(null), 300) // Clear after animation
  }

  // The useEffect for drawer outside click and esc key is now part of the main useEffect.

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleSearch = () => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) {
      setFilteredBooks(displayBooks)
      return
    }

    const results = displayBooks.filter(
      (book) =>
        book.name.toLowerCase().includes(query) ||
        book.isbn.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.publisher.toLowerCase().includes(query),
    )

    setFilteredBooks(results)

    if (results.length > 5) {
      // More than 5 results: restore search box to normal
      searchInputRef.current?.blur()
      setIsSearchFocused(false)
      setShowSearchBackdrop(false)
    } else {
      // 5 or fewer results: keep search box enlarged AND keep backdrop blur
      setIsSearchFocused(true)
      setShowSearchBackdrop(true)
    }
  }

  const toggleLoginModal = () => {
    setLoginModalOpen(!loginModalOpen)
    if (loginModalOpen) {
      setRegistrationStep("email")
      setLoginView("email")
      setEmailError("")
      setCountdown(60)
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setRealName("")
      setUniversityInput("")
      setVerificationCode("")
    }
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

  const handleLoginSubmit = () => {
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

      // Update university
      setUniversity(account.university)

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
    if (!universityInput.trim()) {
      setEmailError("请选择您的大学")
      return
    }
    setEmailError("")
    console.log("University bound:", universityInput)

    const userData = { email, realName, university: universityInput }
    setLoggedInUser(userData)
    localStorage.setItem("loggedInUser", JSON.stringify(userData))

    setUniversity(universityInput)

    setLoginModalOpen(false)
    alert("注册成功！欢迎使用")
  }

  const handleBack = () => {
    setEmailError("")
    setPassword("")
    setConfirmPassword("")
    setVerificationCode("")
    if (registrationStep === "login") {
      setRegistrationStep("email")
    } else if (registrationStep === "verification") {
      setRegistrationStep("email")
    } else if (registrationStep === "password") {
      setRegistrationStep("verification")
      setCountdown(60)
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
    setAvatarDropdownOpen(false)
    setUniversity("")
    setUserModalOpen(false)
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
    // Reset university change request state if modal is closed
    if (isChangingUniversity) {
      setIsChangingUniversity(false)
      setNewUniversity("")
      setUniversityChangeReason("")
    }
    // Also reset the old state variable to maintain consistency if it was ever used
    if (isRequestingUniversityChange) {
      setIsRequestingUniversityChange(false)
      setNewUniversityRequest("")
      setUniversityChangeReason("")
    }
  }

  const handleNavItemClick = (item: string) => {
    setActiveNavItem(item)
    if (item === "学习") {
      window.location.href = "/"
    }
  }

  const handleCopyISBN = (isbn: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(isbn)
    setCopiedISBN(isbn)
    setTimeout(() => setCopiedISBN(null), 1500)
  }

  const scrollToResourceList = () => {
    if (resourceListRef.current) {
      resourceListRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const availableUniversities = [
    "北京大学",
    "清华大学",
    "复旦大学",
    "上海交通大学",
    "浙江大学",
    "南京大学",
    "中国科学技术大学",
    "四川大学",
  ]

  const sampleComments = [
    {
      id: 1,
      userEmail: "zhang123@qq.com",
      content: "请问有没有这本书的配套视频讲解资源？",
      time: "2024-03-20 14:30",
      replies: [
        {
          id: 11,
          userEmail: "li.teacher@scu.edu.cn",
          content: "我这里有一套完整的视频讲解，可以分享给大家。",
          time: "2024-03-20 15:45",
        },
        {
          id: 12,
          userEmail: "wangxiaoming@163.com",
          content: "太好了！期待分享！",
          time: "2024-03-20 16:20",
        },
      ],
    },
    {
      id: 2,
      userEmail: "liu2024@gmail.com",
      content: "第七版的课后习题答案有些题目解析不够详细，有没有更详细的版本？",
      time: "2024-03-19 10:15",
      replies: [],
    },
    {
      id: 3,
      userEmail: "chen_student@scu.edu.cn",
      content: "求分享教学课件PPT，谢谢！",
      time: "2024-03-18 09:00",
      replies: [
        {
          id: 31,
          userEmail: "zhao456@qq.com",
          content: "我也需要，一起等待！",
          time: "2024-03-18 11:30",
        },
      ],
    },
  ]

  return (
    <div className="w-full min-h-screen relative bg-[#F7F5F3] overflow-x-hidden">
      {/* Sidebar */}
      <div
        id="stage-slideover-sidebar"
        className={`fixed left-0 top-0 z-21 h-screen shrink-0 overflow-hidden max-md:hidden bg-white border-r border-gray-200 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${showSearchBackdrop ? "opacity-40" : "opacity-100"}`}
        style={{ width: "var(--sidebar-width, 280px)" }}
      >
        <div className="flex flex-col h-screen p-4 pt-16">
          <Link href="/">
            <button className="w-full flex items-center gap-3 px-3 py-2 mb-2 text-gray-600 hover:bg-gray-100 hover:text-[#37322F] rounded-lg transition-colors font-medium text-left">
              新对话
            </button>
          </Link>

          <button className="w-full flex items-center gap-3 px-3 py-2 bg-gray-100 text-[#37322F] rounded-lg transition-colors font-medium text-left">
            图书馆
          </button>

          <div className="relative mb-4 mt-4"></div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex flex-col justify-start items-center transition-all duration-300 ${
          sidebarOpen ? "ml-[280px]" : "ml-0"
        }`}
      >
        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          aria-expanded={sidebarOpen}
          data-state={sidebarOpen ? "open" : "closed"}
          aria-controls="stage-slideover-sidebar"
          className={`fixed top-6 p-2 bg-white text-[#37322F] rounded-lg hover:bg-gray-50 transition-[left] duration-300 border border-gray-200 max-md:hidden px-2 my-0 mx-[-6px] ${
            sidebarOpen ? "left-[268px]" : "left-6"
          } ${showSearchBackdrop ? "z-30 opacity-40" : "z-50 opacity-100"}`}
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

        {/* Right side buttons */}
        <div
          className={`fixed top-6 right-6 flex items-center gap-3 z-[60] ${showSearchBackdrop ? "opacity-40" : "opacity-100"}`}
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
                {loggedInUser.email.charAt(0).toUpperCase()}
              </div>

              {/* Increased z-index to z-[100] to ensure dropdown is always at the highest layer, above search box and all other elements */}
              {avatarDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[100] overflow-hidden">
                  {/* User Header Section */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="bg-[#37322F] text-white rounded-full flex items-center justify-center font-bold text-lg cursor-pointer h-10 w-10 flex-shrink-0 shadow-md">
                      {loggedInUser.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#37322F] text-sm mb-0.5">{loggedInUser.realName}</div>
                      <div className="text-xs text-gray-600 truncate">{loggedInUser.email}</div>
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
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.26 12 2" />
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
                      <span className="font-medium text-sm flex-1 text-left">退出登录</span>
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

        {/* Fixed top navigation */}
        <div
          className={`fixed top-6 z-40 max-md:hidden transition-all duration-300 ${
            sidebarOpen ? "left-1/2 transform -translate-x-1/2 ml-[140px]" : "left-1/2 transform -translate-x-1/2"
          } ${showSearchBackdrop ? "opacity-40" : "opacity-100"}`}
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

        {/* Main Library Content */}
        <div className={`w-full max-w-6xl mx-auto pt-32 transition-all duration-300 ${sidebarOpen ? "px-8" : "px-4"}`}>
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-[#37322F] mb-2">
              {loggedInUser && university ? university : "全国高校图书数据集"}
            </h1>
            <p className="text-sm text-gray-600">
              {loggedInUser && university
                ? `收录「${university}」指定教材与权威辅材，支持阅读与加书架，助力模型优化。`
                : "探索并收录全国院校的教材与辅材，一键加书架，随时接入 AI。"}
            </p>
          </div>

          {showSearchBackdrop && (
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => {
                setIsSearchFocused(false)
                setShowSearchBackdrop(false)
              }}
            />
          )}

          <div className="mb-8 flex justify-center relative z-50">
            <div
              className={`relative w-full max-w-2xl transition-all duration-300 ${isSearchFocused ? "scale-105" : "scale-100"}`}
            >
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索图书名称、ISBN、作者或出版社..."
                className="w-full pl-12 pr-24 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-0 focus:border-gray-400 shadow-sm transition-all duration-300"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSearch()
                  }
                }}
                onFocus={() => {
                  setIsSearchFocused(true)
                  setShowSearchBackdrop(true)
                }}
                onBlur={(e) => {
                  // Delay blur to allow button click
                  setTimeout(() => {
                    setIsSearchFocused(false)
                    setShowSearchBackdrop(false)
                  }, 150)
                }}
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                width="20"
                height="20"
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
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-[#37322F] text-white rounded-lg text-sm hover:bg-[#4a4340] transition-colors"
              >
                搜索
              </button>
            </div>
          </div>

          {copiedISBN && (
            <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[60] px-4 py-2 bg-[#37322F] text-white text-sm rounded-lg shadow-lg">
              已复制 ISBN
            </div>
          )}

          <div
            className={`grid gap-5 pb-8 ${
              sidebarOpen ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-5" : "grid-cols-1 md:grid-cols-4 lg:grid-cols-5"
            } ${searchQuery.trim() && filteredBooks.length <= 5 ? "relative z-50" : ""}`}
          >
            {currentBooks.length > 0 ? (
              currentBooks.map((book) => (
                <button
                  key={book.id}
                  onClick={() => handleCardClick(book)}
                  className="group relative w-[205px] h-[315px] bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:ring-offset-2 [contain:layout_paint_size]"
                  tabIndex={0}
                >
                  {/* Cover Image - Always visible */}
                  <div className="absolute inset-0 w-full h-full">
                    <img
                      src={book.cover || "/placeholder.svg"}
                      alt={book.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Hover/Focus overlay */}
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-y-2 group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-all duration-200 ease-out flex flex-col px-4 py-[18px] overflow-y-auto min-w-0 rounded-2xl">
                    <h3
                      className="font-semibold text-[#37322F] mb-4 line-clamp-2 text-[15px] leading-[26px] break-words min-w-0"
                      style={{ fontWeight: 600 }}
                      title={book.name}
                    >
                      {book.name}
                    </h3>

                    <div className="space-y-3 text-[13px] min-w-0 flex-1">
                      {/* ISBN row with copy button */}
                      <div className="flex items-center h-6 min-w-0 group/isbn gap-2">
                        <span className="w-16 flex-shrink-0 text-gray-500 font-normal">ISBN</span>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className="text-gray-700 font-normal truncate min-w-0 tabular-nums whitespace-nowrap"
                            style={{ fontVariantNumeric: "tabular-nums", hyphens: "none" }}
                            title={book.isbn}
                          >
                            {book.isbn}
                          </span>
                          <button
                            onClick={(e) => handleCopyISBN(book.isbn, e)}
                            className="opacity-0 group-hover/isbn:opacity-100 transition-opacity flex-shrink-0 p-0.5 hover:bg-gray-100 rounded"
                            title="复制 ISBN"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Author row */}
                      <div className="flex items-center h-6 min-w-0 gap-2">
                        <span className="w-16 flex-shrink-0 text-gray-500 font-normal">作者</span>
                        <span
                          className="flex-1 min-w-0 text-gray-700 font-normal truncate whitespace-nowrap"
                          title={book.author}
                        >
                          {(() => {
                            const authors = book.author.split(/[,、，]/).map((a) => a.trim())
                            if (authors.length > 3) {
                              return `${authors.slice(0, 3).join(" · ")} 等`
                            }
                            return authors.join(" · ")
                          })()}
                        </span>
                      </div>

                      {/* Publisher row */}
                      <div className="flex items-center h-6 min-w-0 gap-2">
                        <span className="w-16 flex-shrink-0 text-gray-500 font-normal">出版社</span>
                        <span
                          className="flex-1 min-w-0 text-gray-600 font-normal truncate whitespace-nowrap"
                          title={book.publisher}
                        >
                          {book.publisher}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200/80 h-11 flex items-center">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">教材</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">数学</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">未找到相关教材</p>
                <p className="text-gray-400 text-sm mt-2">请尝试其他关键词</p>
              </div>
            )}
          </div>

          {filteredBooks.length > booksPerPage && (
            <div className="flex justify-center items-center gap-2 pb-12">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-gray-300 text-[#37322F] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? "bg-[#37322F] text-white"
                      : "border border-gray-300 text-[#37322F] hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-gray-300 text-[#37322F] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {drawerOpen && selectedBook && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 z-90 transition-opacity duration-300" />

          {/* Drawer */}
          <div
            ref={drawerRef}
            className={`fixed right-0 top-0 h-screen w-[680px] bg-white shadow-2xl z-[100] transform transition-transform duration-300 ${
              drawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full">
              {/* A. Header (flexible height, min 64px) */}
              <div className="flex-shrink-0 min-h-20 border-b border-gray-200 px-6 py-4 flex items-start gap-4">
                {/* Book cover on the left */}
                <div className="flex-shrink-0 w-16 h-20 rounded overflow-hidden bg-gray-100">
                  <img
                    src={selectedBook.cover || "/placeholder.svg"}
                    alt={selectedBook.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Book info on the right */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <h2 className="text-[15px] font-semibold text-[#37322F] line-clamp-1 leading-6">
                    {selectedBook.name}
                  </h2>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyISBN(selectedBook.isbn, e as any)
                    }}
                    className="text-xs text-gray-500 hover:text-[#37322F] transition-colors text-left w-fit"
                    title="复制 ISBN"
                  >
                    ISBN：{selectedBook.isbn}
                  </button>
                  <p className="text-xs text-gray-600 truncate">作者：{selectedBook.author}</p>
                  <p className="text-xs text-gray-500 truncate">出版社：{selectedBook.publisher}</p>
                </div>

                {/* Action buttons on the far right */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => window.open(`/book/${selectedBook.id}`, "_blank")}
                    className="px-3 py-1.5 border border-gray-300 text-[#37322F] rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium flex items-center gap-1.5"
                    title="在新页打开"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    打开
                  </button>
                  <button
                    onClick={handleCloseDrawer}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="关闭 (Esc)"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {/* C. Resource List */}
                <div className="mb-6" ref={resourceListRef}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#37322F]">资源列表</h3>
                      {university && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px]">
                          {university}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Toggle switch for "仅看可阅读的" */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-gray-600">仅看可阅读的</span>
                        <div
                          className={`relative w-9 h-5 rounded-full transition-colors ${
                            showOnlyReadable ? "bg-[#37322F]" : "bg-gray-300"
                          }`}
                          onClick={() => setShowOnlyReadable(!showOnlyReadable)}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                              showOnlyReadable ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </div>
                      </label>

                      {/* Sort dropdown */}
                      <div className="relative" ref={sortDropdownRef}>
                        <button
                          onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                          className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                        >
                          排序
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`transition-transform ${sortDropdownOpen ? "rotate-180" : ""}`}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        {sortDropdownOpen && (
                          <div className="absolute right-0 mt-1 w-20 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() => {
                                setSortBy("time")
                                setSortDropdownOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2 text-xs transition-colors rounded-t-lg ${
                                sortBy === "time"
                                  ? "bg-gray-100 text-[#37322F] font-medium"
                                  : "text-[#37322F] hover:bg-gray-50"
                              }`}
                            >
                              时间排序
                            </button>
                            <button
                              onClick={() => {
                                setSortBy("size")
                                setSortDropdownOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2 text-xs transition-colors rounded-b-lg ${
                                sortBy === "size"
                                  ? "bg-gray-100 text-[#37322F] font-medium"
                                  : "text-[#37322F] hover:bg-gray-50"
                              }`}
                            >
                              大小排序
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(() => {
                      let resources = [
                        {
                          title: "课后习题答案（第七版）.pdf",
                          readable: true,
                          size: "2.3 MB",
                          sizeBytes: 2411724,
                          date: "2024-03-15",
                        },
                        {
                          title: "教学课件.pptx",
                          readable: false,
                          size: "15.8 MB",
                          sizeBytes: 16560742,
                          date: "2024-03-10",
                        },
                        {
                          title: "历年考试真题.pdf",
                          readable: true,
                          size: "1.2 MB",
                          sizeBytes: 1258291,
                          date: "2024-03-20",
                        },
                        {
                          title: "知识点总结笔记.docx",
                          readable: false,
                          size: "856 KB",
                          sizeBytes: 876544,
                          date: "2024-03-05",
                        },
                        {
                          title: "章节练习题.pdf",
                          readable: true,
                          size: "3.5 MB",
                          sizeBytes: 3670016,
                          date: "2024-03-18",
                        },
                      ]

                      // Filter by readable if toggle is on
                      if (showOnlyReadable) {
                        resources = resources.filter((r) => r.readable)
                      }

                      // Sort by selected option
                      if (sortBy === "time") {
                        resources.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      } else if (sortBy === "size") {
                        resources.sort((a, b) => b.sizeBytes - a.sizeBytes)
                      }

                      const displayedResources = resourcesExpanded ? resources : resources.slice(0, 3)

                      return displayedResources.map((resource, index) => {
                        const fileExtension = resource.title.split(".").pop()?.toUpperCase() || "FILE"
                        const displayTitle = resource.title.replace(/\.[^.]+$/, "")

                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors h-16"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#37322F] truncate">{displayTitle}</p>
                              <p className="text-xs text-gray-500">
                                {fileExtension} · {resource.size} · {resource.date}
                              </p>
                            </div>
                            <div className="flex items-center ml-4">
                              <button
                                onClick={() => {
                                  if (!loggedInUser) {
                                    toggleLoginModal()
                                  } else if (resource.readable) {
                                    // Handle reading the resource
                                    console.log("Reading resource:", resource.title)
                                  }
                                }}
                                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                                  loggedInUser && resource.readable
                                    ? "bg-[#37322F] text-white hover:bg-[#2a251f] cursor-pointer"
                                    : loggedInUser && !resource.readable
                                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                      : "bg-[#37322F] text-white hover:bg-[#2a251f] cursor-pointer"
                                }`}
                              >
                                阅读
                              </button>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>

                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={() => setResourcesExpanded(!resourcesExpanded)}
                      className="px-4 py-2 text-sm text-[#37322F] hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      {resourcesExpanded ? (
                        <>
                          收起
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="transform rotate-180"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </>
                      ) : (
                        <>
                          展开全部
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#37322F] mb-3">评论区</h3>

                  {/* Comments List */}
                  <div className="space-y-4 mb-4">
                    {sampleComments.map((comment) => (
                      <div key={comment.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                        {/* Main Comment */}
                        <div className="flex gap-3">
                          {/* Avatar - first character of email */}
                          <div className="flex-shrink-0 w-8 h-8 bg-[#37322F] text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {comment.userEmail.charAt(0).toUpperCase()}
                          </div>

                          {/* Comment Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-[#37322F]">{maskEmail(comment.userEmail)}</span>
                              <span className="text-xs text-gray-400">{comment.time}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
                            <button
                              onClick={() => {
                                setReplyingTo(comment.id)
                                setReplyContent("")
                              }}
                              className="text-xs text-gray-500 hover:text-[#37322F] transition-colors"
                            >
                              回复
                            </button>

                            {/* Reply Input for this comment */}
                            {replyingTo === comment.id && (
                              <div className="mt-3 flex gap-2">
                                <input
                                  type="text"
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder="写下你的回复..."
                                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:border-transparent"
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    if (replyContent.trim()) {
                                      console.log("Reply to comment", comment.id, ":", replyContent)
                                      setReplyingTo(null)
                                      setReplyContent("")
                                    }
                                  }}
                                  className="px-4 py-2 bg-[#37322F] text-white text-sm rounded-lg hover:bg-[#2a251f] transition-colors"
                                >
                                  发送
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyingTo(null)
                                    setReplyContent("")
                                  }}
                                  className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  取消
                                </button>
                              </div>
                            )}

                            {/* Nested Replies */}
                            {comment.replies.length > 0 && (
                              <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex gap-3">
                                    {/* Reply Avatar - first character of email */}
                                    <div className="flex-shrink-0 w-7 h-7 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
                                      {reply.userEmail.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Reply Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-[#37322F]">
                                          {maskEmail(reply.userEmail)}
                                        </span>
                                        <span className="text-xs text-gray-400">{reply.time}</span>
                                      </div>
                                      <p className="text-sm text-gray-700">{reply.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* New Comment Input has been removed from here */}
                </div>
              </div>

              {/* E. Action Area (bottom fixed bar, 56px) */}
              <div className="flex-shrink-0 h-14 border-t border-gray-200 px-6 flex items-center gap-3">
                {/* Comment input and send button */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={loggedInUser ? "写评论..." : "请先登录后评论"}
                    disabled={!loggedInUser}
                    className="w-full pl-3 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#37322F] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && newComment.trim() && loggedInUser) {
                        console.log("New comment:", newComment)
                        setNewComment("")
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newComment.trim() && loggedInUser) {
                        console.log("New comment:", newComment)
                        setNewComment("")
                      }
                    }}
                    disabled={!loggedInUser || !newComment.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-[#37322F] hover:bg-gray-100 rounded transition-colors disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    title="发送"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>

                {loggedInUser ? (
                  <div className="flex items-center gap-3">
                    <button className="px-6 py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors font-medium whitespace-nowrap">
                      在线阅读
                    </button>
                    <button
                      onClick={() => {
                        const bookshelf = JSON.parse(localStorage.getItem("bookshelf") || "[]")

                        if (bookAdded) {
                          // Remove from bookshelf
                          const updatedBookshelf = bookshelf.filter((b: any) => b.id !== selectedBook?.id)
                          localStorage.setItem("bookshelf", JSON.stringify(updatedBookshelf))
                          setBookAdded(false)
                        } else {
                          // Add to bookshelf
                          const newBook = {
                            id: selectedBook?.id,
                            name: selectedBook?.name,
                            cover: selectedBook?.cover,
                            author: selectedBook?.author,
                          }
                          bookshelf.push(newBook)
                          localStorage.setItem("bookshelf", JSON.stringify(bookshelf))
                          setBookAdded(true)
                        }
                      }}
                      className={`px-6 py-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
                        bookAdded
                          ? "bg-gray-100 text-gray-600 border border-gray-300 cursor-default"
                          : "border border-gray-300 text-[#37322F] hover:bg-gray-50"
                      }`}
                    >
                      {bookAdded ? "已加入书架" : "加入书架"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={toggleLoginModal}
                    className="px-6 py-2 bg-[#37322F] text-white rounded-lg hover:bg-[#2a251f] transition-colors font-medium whitespace-nowrap"
                  >
                    登录后使用
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {loginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-stone-400 opacity-80" onClick={toggleLoginModal}></div>

          {/* Removed duplicate emailError display */}

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

            {emailError && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-72 px-6 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium text-center z-10 shadow-lg max-w-sm">
                {emailError}
              </div>
            )}

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
                      onClick={handleLoginSubmit}
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
                          value={universityInput}
                          onChange={(e) => {
                            setUniversityInput(e.target.value)
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

      <SettingsModal
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
      />
    </div>
  )
}
