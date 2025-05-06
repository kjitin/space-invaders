"use client"

import { AdSense } from "./adsense"
import { ADSENSE_CONFIG } from "@/config/adsense"

export function GameOverAd() {
  return (
    <div className="w-full max-w-md mx-auto my-4">
      <AdSense
        adSlot={ADSENSE_CONFIG.GAME_OVER_SLOT}
        adFormat="rectangle"
        adStyle={{ minHeight: "250px", width: "100%" }}
        className="bg-black/30 rounded-lg overflow-hidden"
      />
    </div>
  )
}
