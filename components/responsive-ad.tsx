"use client"

import type React from "react"

import { AdSense } from "./adsense"
import { ADSENSE_CONFIG } from "@/config/adsense"

interface ResponsiveAdProps {
  className?: string
  style?: React.CSSProperties
}

export function ResponsiveAd({ className = "", style = {} }: ResponsiveAdProps) {
  return (
    <div className={`w-full ${className}`}>
      <AdSense
        adSlot={ADSENSE_CONFIG.RESPONSIVE_SLOT}
        adFormat="auto"
        adStyle={{ minHeight: "100px", width: "100%", ...style }}
        className="bg-black/30 rounded-lg overflow-hidden"
      />
    </div>
  )
}
