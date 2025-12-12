'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  // 基础画像
  grade?: string
  major?: string
  age?: number
  learningGoal?: string
  examDeadline?: string
  languagePreference?: string
  tonePreference?: string
  learningStylePreference?: string
  // 理科能力
  mathSkill?: number
  derivationSkill?: number
  symbolSkill?: number
  graphSkill?: number
  abstractSkill?: number
  // 工科能力
  appliedMathSkill?: number
  modelingSkill?: number
  systemThinkingSkill?: number
  spatialSkill?: number
  codingSkill?: number
  // 医学能力
  medicalTermsSkill?: number
  medicalImageSkill?: number
  clinicalReasoningSkill?: number
  bioFoundationSkill?: number
  memorySkillMedical?: number
  // 文科能力
  readingSkill?: number
  expressionSkill?: number
  logicSkill?: number
  criticalThinkingSkill?: number
  memorySkillHumanities?: number
  // 语言能力
  englishReadingSkill?: number
  englishExpressionSkill?: number
  // 偏好画像
  examplePreference?: string
  explanationDepthPreference?: string
  teachingStylePreference?: string
}

interface Understanding {
  id: string
  conceptName: string
  conceptDescription?: string
  understandingScore: number
  understandingSummary?: string
  misconceptions?: string
  updatedAt: string
}

interface Learning {
  id: string
  dialogId?: string
  userQuerySummary?: string
  aiResponseSummary?: string
  learningSummary?: string
  startTime: string
}

interface Message {
  id: string
  role: string
  content: string
  createdAt: string
}

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: Message[]
}

interface BookGroup<T> {
  bookId: string
  bookName: string
  concepts?: T[]
  records?: T[]
  conversations?: Conversation[]
}

interface UserMemoryData {
  user: { id: string; email?: string; phone?: string; realName?: string; university?: string; createdAt: string }
  userProfile: UserProfile | null
  understandingsByBook: BookGroup<Understanding>[]
  learningsByBook: BookGroup<Learning>[]
  conversationsByBook: BookGroup<Conversation>[]
  stats: { totalBooks: number; totalConcepts: number; totalLearnings: number; totalConversations: number; hasProfile: boolean }
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params)
  const router = useRouter()
  const [data, setData] = useState<UserMemoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'understanding' | 'learning' | 'conversations'>('profile')

  useEffect(() => { fetchUserMemory() }, [userId])

  const fetchUserMemory = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/users/${userId}/memory`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (result.success) setData(result.data)
      else alert(result.message || 'Failed to fetch user memory')
    } catch (error) { console.error('Failed to fetch user memory:', error) }
    finally { setLoading(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return <div className="text-center text-gray-500 py-8">用户不存在</div>
  }

  return (
    <div className="space-y-6">
      <UserHeader data={data} router={router} />
      <StatsCards stats={data.stats} />
      <TabContent activeTab={activeTab} setActiveTab={setActiveTab} data={data} />
    </div>
  )
}

function UserHeader({ data, router }: { data: UserMemoryData; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.push('/admin/users')} className="text-gray-500 hover:text-gray-700">← 返回用户列表</button>
      </div>
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl">👤</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{data.user.realName || data.user.email || data.user.phone || '未知用户'}</h1>
          <div className="text-gray-500 text-sm mt-1">
            {data.user.email && <span className="mr-4">📧 {data.user.email}</span>}
            {data.user.phone && <span className="mr-4">📱 {data.user.phone}</span>}
            {data.user.university && <span>🏫 {data.user.university}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsCards({ stats }: { stats: UserMemoryData['stats'] }) {
  return (
    <div className="grid grid-cols-5 gap-4">
      <div className="bg-white rounded-lg shadow p-4 text-center">
        <div className="text-3xl font-bold text-blue-600">{stats.totalBooks}</div>
        <div className="text-gray-500 text-sm">学习教材数</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4 text-center">
        <div className="text-3xl font-bold text-green-600">{stats.totalConcepts}</div>
        <div className="text-gray-500 text-sm">知识点数</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4 text-center">
        <div className="text-3xl font-bold text-purple-600">{stats.totalLearnings}</div>
        <div className="text-gray-500 text-sm">学习记录数</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4 text-center">
        <div className="text-3xl font-bold text-indigo-600">{stats.totalConversations || 0}</div>
        <div className="text-gray-500 text-sm">对话数</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4 text-center">
        <div className="text-3xl font-bold text-orange-600">{stats.hasProfile ? '✓' : '✗'}</div>
        <div className="text-gray-500 text-sm">用户画像</div>
      </div>
    </div>
  )
}

function TabContent({ activeTab, setActiveTab, data }: {
  activeTab: 'profile' | 'understanding' | 'learning' | 'conversations'
  setActiveTab: (tab: 'profile' | 'understanding' | 'learning' | 'conversations') => void
  data: UserMemoryData
}) {
  const tabs = [
    { key: 'profile' as const, label: '👤 用户画像' },
    { key: 'understanding' as const, label: '📚 知识点理解' },
    { key: 'learning' as const, label: '📝 学习轨迹' },
    { key: 'conversations' as const, label: '💬 对话记录' },
  ]

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b flex flex-wrap">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 font-medium text-sm ${activeTab === tab.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-6">
        {activeTab === 'profile' && <ProfileTab profile={data.userProfile} />}
        {activeTab === 'understanding' && <UnderstandingTab groups={data.understandingsByBook} />}
        {activeTab === 'learning' && <LearningTab groups={data.learningsByBook} />}
        {activeTab === 'conversations' && <ConversationsTab groups={data.conversationsByBook} />}
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-800 mt-1">{value || '-'}</div>
    </div>
  )
}

function SkillCard({ label, value, max = 3 }: { label: string; value: number; max?: number }) {
  const percent = max === 3 ? (value / 3) * 100 : value
  const color = percent >= 66 ? 'bg-green-500' : percent >= 33 ? 'bg-yellow-500' : 'bg-gray-300'
  const levelLabels = max === 3 ? ['未评估', '初级', '中级', '高级'] : null
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
        </div>
        <span className="text-sm font-medium text-gray-700">{levelLabels ? levelLabels[value] : value}</span>
      </div>
    </div>
  )
}

function ProfileTab({ profile }: { profile: UserProfile | null }) {
  if (!profile) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-4xl mb-4">👤</div>
        <div className="text-gray-500">暂无用户画像数据</div>
        <div className="text-gray-400 text-sm mt-2">用户对话后会自动生成画像</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 基础画像 */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">📋 基础画像（Identity）</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard label="年级" value={profile.grade} />
          <InfoCard label="专业" value={profile.major} />
          <InfoCard label="年龄" value={profile.age?.toString()} />
          <InfoCard label="学习目标" value={profile.learningGoal} />
          <InfoCard label="考试截止日期" value={profile.examDeadline ? new Date(profile.examDeadline).toLocaleDateString('zh-CN') : undefined} />
          <InfoCard label="语言偏好" value={profile.languagePreference} />
          <InfoCard label="语气偏好" value={profile.tonePreference} />
          <InfoCard label="学习方式偏好" value={profile.learningStylePreference} />
        </div>
      </div>
      {/* 理科能力 */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">🔬 理科能力（Science Skills）</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SkillCard label="数学基础能力" value={profile.mathSkill || 0} />
          <SkillCard label="推导理解能力" value={profile.derivationSkill || 0} />
          <SkillCard label="符号理解能力" value={profile.symbolSkill || 0} />
          <SkillCard label="图形理解能力" value={profile.graphSkill || 0} />
          <SkillCard label="抽象思维能力" value={profile.abstractSkill || 0} />
        </div>
      </div>
      {/* 工科能力 */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">⚙️ 工科能力（Engineering Skills）</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SkillCard label="应用数学能力" value={profile.appliedMathSkill || 0} />
          <SkillCard label="建模能力" value={profile.modelingSkill || 0} />
          <SkillCard label="系统思维能力" value={profile.systemThinkingSkill || 0} />
          <SkillCard label="空间想象能力" value={profile.spatialSkill || 0} />
          <SkillCard label="编程能力" value={profile.codingSkill || 0} />
        </div>
      </div>
      {/* 医学能力 */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">🏥 医学能力（Medical Skills）</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SkillCard label="医学术语理解" value={profile.medicalTermsSkill || 0} />
          <SkillCard label="图像/图表理解" value={profile.medicalImageSkill || 0} />
          <SkillCard label="病例推理能力" value={profile.clinicalReasoningSkill || 0} />
          <SkillCard label="生物基础能力" value={profile.bioFoundationSkill || 0} />
          <SkillCard label="记忆能力(医)" value={profile.memorySkillMedical || 0} />
        </div>
      </div>
      {/* 文科能力 */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">📖 文科能力（Humanities Skills）</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SkillCard label="阅读理解能力" value={profile.readingSkill || 0} />
          <SkillCard label="文本表达能力" value={profile.expressionSkill || 0} />
          <SkillCard label="逻辑分析能力" value={profile.logicSkill || 0} />
          <SkillCard label="观点辨析能力" value={profile.criticalThinkingSkill || 0} />
          <SkillCard label="记忆能力(文)" value={profile.memorySkillHumanities || 0} />
        </div>
      </div>
      {/* 语言能力 */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">🌐 语言能力（Language Skills）</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkillCard label="英语阅读能力" value={profile.englishReadingSkill || 0} />
          <SkillCard label="英语表达能力" value={profile.englishExpressionSkill || 0} />
        </div>
      </div>
      {/* 偏好画像 */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">⭐ 偏好画像（Preferences）</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoCard label="例子偏好" value={profile.examplePreference} />
          <InfoCard label="讲解深度偏好" value={profile.explanationDepthPreference} />
          <InfoCard label="讲解风格偏好" value={profile.teachingStylePreference} />
        </div>
      </div>
    </div>
  )
}

// 知识点理解 Tab - 按教材折叠展开
function UnderstandingTab({ groups }: { groups: BookGroup<Understanding>[] }) {
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set())

  const toggleBook = (bookId: string) => {
    setExpandedBooks(prev => {
      const next = new Set(prev)
      if (next.has(bookId)) next.delete(bookId)
      else next.add(bookId)
      return next
    })
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-4xl mb-4">📚</div>
        <div className="text-gray-500">暂无知识点理解数据</div>
        <div className="text-gray-400 text-sm mt-2">用户书架上的教材会在这里显示</div>
      </div>
    )
  }

  const scoreLabels = ['未学习', '初步了解', '基本掌握', '熟练']
  const scoreColors = ['bg-gray-200 text-gray-600', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700']

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-500 mb-4">📖 用户书架（点击展开查看知识点理解详情）</div>
      {groups.map((group) => {
        const isExpanded = expandedBooks.has(group.bookId)
        return (
          <div key={group.bookId} className="border rounded-lg overflow-hidden">
            {/* 书籍标题 - 可点击展开 */}
            <button
              onClick={() => toggleBook(group.bookId)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📖</span>
                <span className="font-medium text-gray-800">{group.bookName}</span>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                  {group.concepts?.length || 0} 个知识点
                </span>
              </div>
              <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {/* 展开的知识点列表 */}
            {isExpanded && (
              <div className="p-4 space-y-3 bg-white">
                {group.concepts?.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">暂无知识点记录</div>
                ) : (
                  group.concepts?.map((c) => (
                    <div key={c.id} className="border rounded-lg p-4 bg-gray-50">
                      {/* 知识点名称和评分 */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-gray-800">{c.conceptName}</div>
                          {c.conceptDescription && (
                            <div className="text-sm text-gray-500 mt-1">{c.conceptDescription}</div>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${scoreColors[c.understandingScore]}`}>
                          {scoreLabels[c.understandingScore]}（{c.understandingScore}/3）
                        </span>
                      </div>
                      {/* 理解摘要 */}
                      {c.understandingSummary && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <div className="text-xs text-gray-500 mb-1">📝 用户理解摘要</div>
                          <div className="text-sm text-gray-700">{c.understandingSummary}</div>
                        </div>
                      )}
                      {/* 常见误区 */}
                      {c.misconceptions && (
                        <div className="mt-2 p-3 bg-red-50 rounded border border-red-100">
                          <div className="text-xs text-red-500 mb-1">⚠️ 用户常见误区</div>
                          <div className="text-sm text-red-700">{c.misconceptions}</div>
                        </div>
                      )}
                      {/* 更新时间 */}
                      <div className="mt-3 text-xs text-gray-400">
                        最后更新: {new Date(c.updatedAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// 学习轨迹 Tab - 按教材折叠展开
function LearningTab({ groups }: { groups: BookGroup<Learning>[] }) {
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set())

  const toggleBook = (bookId: string) => {
    setExpandedBooks(prev => {
      const next = new Set(prev)
      if (next.has(bookId)) next.delete(bookId)
      else next.add(bookId)
      return next
    })
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-4xl mb-4">📝</div>
        <div className="text-gray-500">暂无学习轨迹数据</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-500 mb-4">📖 用户书架（点击展开查看学习轨迹）</div>
      {groups.map((group) => {
        const isExpanded = expandedBooks.has(group.bookId)
        return (
          <div key={group.bookId} className="border rounded-lg overflow-hidden">
            {/* 书籍标题 - 可点击展开 */}
            <button
              onClick={() => toggleBook(group.bookId)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📖</span>
                <span className="font-medium text-gray-800">{group.bookName}</span>
                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                  {group.records?.length || 0} 条对话记录
                </span>
              </div>
              <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {/* 展开的学习轨迹列表 */}
            {isExpanded && (
              <div className="p-4 space-y-3 bg-white">
                {group.records?.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">暂无对话记录</div>
                ) : (
                  group.records?.map((r) => (
                    <div key={r.id} className="border rounded-lg p-4 bg-gray-50">
                      {/* 对话ID和时间 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-gray-500">
                          {r.dialogId && <span className="mr-2">对话ID: {r.dialogId.slice(0, 8)}...</span>}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(r.startTime).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      {/* 用户问题 */}
                      {r.userQuerySummary && (
                        <div className="mb-2 p-3 bg-blue-50 rounded border border-blue-100">
                          <div className="text-xs text-blue-500 mb-1">👤 用户问题摘要</div>
                          <div className="text-sm text-gray-700">{r.userQuerySummary}</div>
                        </div>
                      )}
                      {/* AI回答 */}
                      {r.aiResponseSummary && (
                        <div className="mb-2 p-3 bg-green-50 rounded border border-green-100">
                          <div className="text-xs text-green-500 mb-1">🤖 AI回答摘要</div>
                          <div className="text-sm text-gray-700">{r.aiResponseSummary}</div>
                        </div>
                      )}
                      {/* 学习总结 */}
                      {r.learningSummary && (
                        <div className="p-3 bg-yellow-50 rounded border border-yellow-100">
                          <div className="text-xs text-yellow-600 mb-1">📚 学习总结</div>
                          <div className="text-sm text-gray-700">{r.learningSummary}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// 对话记录 Tab - 按教材折叠展开
function ConversationsTab({ groups }: { groups: BookGroup<Conversation>[] }) {
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set())
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set())

  const toggleBook = (bookId: string) => {
    setExpandedBooks(prev => {
      const next = new Set(prev)
      if (next.has(bookId)) next.delete(bookId)
      else next.add(bookId)
      return next
    })
  }

  const toggleConversation = (convId: string) => {
    setExpandedConversations(prev => {
      const next = new Set(prev)
      if (next.has(convId)) next.delete(convId)
      else next.add(convId)
      return next
    })
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-4xl mb-4">💬</div>
        <div className="text-gray-500">暂无对话记录</div>
        <div className="text-gray-400 text-sm mt-2">用户与 AI 的对话会在这里显示</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-500 mb-4">📖 用户书架（点击展开查看对话记录）</div>
      {groups.map((group) => {
        const isExpanded = expandedBooks.has(group.bookId)
        return (
          <div key={group.bookId} className="border rounded-lg overflow-hidden">
            {/* 书籍标题 - 可点击展开 */}
            <button
              onClick={() => toggleBook(group.bookId)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📖</span>
                <span className="font-medium text-gray-800">{group.bookName}</span>
                <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded">
                  {group.conversations?.length || 0} 个对话
                </span>
              </div>
              <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {/* 展开的对话列表 */}
            {isExpanded && (
              <div className="p-4 space-y-3 bg-white">
                {group.conversations?.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">暂无对话记录</div>
                ) : (
                  group.conversations?.map((conv) => {
                    const isConvExpanded = expandedConversations.has(conv.id)
                    return (
                      <div key={conv.id} className="border rounded-lg overflow-hidden">
                        {/* 对话标题 */}
                        <button
                          onClick={() => toggleConversation(conv.id)}
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">💬</span>
                            <span className="font-medium text-gray-700">{conv.title || '未命名对话'}</span>
                            <span className="text-xs text-gray-400">
                              {conv.messages?.length || 0} 条消息
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">
                              {new Date(conv.updatedAt).toLocaleString('zh-CN')}
                            </span>
                            <span className={`text-gray-400 transition-transform ${isConvExpanded ? 'rotate-180' : ''}`}>▼</span>
                          </div>
                        </button>

                        {/* 展开的消息列表 */}
                        {isConvExpanded && (
                          <div className="p-4 space-y-3 bg-white max-h-96 overflow-y-auto">
                            {conv.messages?.length === 0 ? (
                              <div className="text-center text-gray-400 py-4">暂无消息</div>
                            ) : (
                              conv.messages?.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`p-3 rounded-lg ${
                                    msg.role === 'user'
                                      ? 'bg-blue-50 border border-blue-100 ml-8'
                                      : msg.role === 'assistant'
                                      ? 'bg-green-50 border border-green-100 mr-8'
                                      : 'bg-gray-50 border border-gray-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium">
                                      {msg.role === 'user' ? '👤 用户' : msg.role === 'assistant' ? '🤖 AI' : '⚙️ 系统'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {new Date(msg.createdAt).toLocaleString('zh-CN')}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {msg.content.length > 500 ? msg.content.slice(0, 500) + '...' : msg.content}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

