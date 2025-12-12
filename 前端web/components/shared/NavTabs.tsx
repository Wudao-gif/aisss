'use client'

/**
 * 顶部导航选项卡组件
 * 5 个选项卡：学习、查阅、写作、演示、协作
 */

interface NavTabsProps {
  activeItem: string
  onItemClick: (item: string) => void
  sidebarOpen: boolean
}

const NAV_ITEMS = ['学习', '查阅', '写作', '演示', '协作']

export function NavTabs({ activeItem, onItemClick, sidebarOpen }: NavTabsProps) {
  return (
    <div
      className={`fixed top-6 z-40 max-md:hidden transition-all duration-300 ${
        sidebarOpen ? 'left-1/2 transform -translate-x-1/2 ml-[140px]' : 'left-1/2 transform -translate-x-1/2'
      }`}
    >
      <div className="flex items-center gap-1 bg-white rounded-full p-1 border border-gray-200">
        {NAV_ITEMS.map((item) => (
          <button
            key={item}
            onClick={() => onItemClick(item)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeItem === item ? 'bg-[#37322F] text-white shadow-sm' : 'text-[#37322F] hover:bg-gray-50'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

