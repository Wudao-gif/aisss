"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Smartphone } from "lucide-react"

export function MobileDownloadButton() {
  const [showQR, setShowQR] = useState(false)

  return (
    <div className="relative" onMouseEnter={() => setShowQR(true)} onMouseLeave={() => setShowQR(false)}>
      <Button variant="ghost" className="text-[#37322f] hover:bg-[#37322f]/5 gap-2">
        <Smartphone className="h-4 w-4" />
        移动端
      </Button>

      {/* QR Code Overlay */}
      {showQR && (
        <div className="absolute top-full right-0 mt-2 p-4 bg-white rounded-lg shadow-xl border border-gray-200 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-lg">
              {/* QR Code placeholder - replace with actual QR code */}
              <img src="/qr-code-for-mobile-app-download.jpg" alt="扫码下载移动端应用" className="w-40 h-40" />
            </div>
            <p className="text-sm text-[#37322f] text-center font-medium">扫码下载移动端应用</p>
          </div>
        </div>
      )}
    </div>
  )
}
