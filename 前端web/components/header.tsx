"use client"

import { Button } from "@/components/ui/button"
import { MobileDownloadButton } from "@/components/mobile-download-button"

export function Header() {
  const handleLoginClick = () => {
    window.open("/login", "_blank")
  }

  return (
    <div className="fixed top-4 right-8 z-50 flex items-center gap-3">
      <MobileDownloadButton />
      <Button
        variant="ghost"
        className="text-[#37322f] hover:bg-[#37322f]/5"
        onClick={handleLoginClick}
      >
        登录
      </Button>
    </div>
  )
}
