"use client"

import type React from "react"

import { useEffect } from "react"
import { ADSENSE_CONFIG } from "@/config/adsense"

interface AdSenseProps {
  adClient?: string
  adSlot: string
  adFormat?: "auto" | "rectangle" | "horizontal" | "vertical"
  adStyle?: React.CSSProperties
  className?: string
}

export function AdSense({
  adClient = ADSENSE_CONFIG.CLIENT_ID,
  adSlot,
  adFormat = "auto",
  adStyle = {},
  className = "",
}: AdSenseProps) {
  useEffect(() => {
    try {
      // Only push ads if enabled and not in dev mode
      if (ADSENSE_CONFIG.ENABLED && !ADSENSE_CONFIG.DEV_MODE) {
        // Try to load ads when the component mounts
        // @ts-ignore
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      }
    } catch (error) {
      console.error("Error loading AdSense ad:", error)
    }
  }, [])

  // In dev mode, show a placeholder instead of actual ads
  if (ADSENSE_CONFIG.DEV_MODE) {
    return (
      <div
        className={`adsense-placeholder ${className}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          border: "1px dashed rgba(255, 255, 255, 0.3)",
          color: "rgba(255, 255, 255, 0.7)",
          padding: "20px",
          textAlign: "center",
          ...adStyle,
        }}
      >
        <div>
          <p>AdSense Placeholder</p>
          <p className="text-xs">Format: {adFormat}</p>
          <p className="text-xs">Slot: {adSlot}</p>
        </div>
      </div>
    )
  }

  // If ads are disabled, don't render anything
  if (!ADSENSE_CONFIG.ENABLED) {
    return null
  }

  return (
    <div className={`adsense-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          overflow: "hidden",
          ...adStyle,
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  )
}

// This component is no longer using Next.js Script component
export function AdSenseScript({ adClient = ADSENSE_CONFIG.CLIENT_ID }: { adClient?: string }) {
  // If ads are disabled, don't render the script
  if (!ADSENSE_CONFIG.ENABLED || ADSENSE_CONFIG.DEV_MODE) {
    return null
  }

  return null // We'll add the script directly to the layout.tsx file
}
