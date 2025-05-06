import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AudioProvider } from "@/components/web-audio-manager"
import { ADSENSE_CONFIG } from "@/config/adsense"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Space Invaders 3D",
  description: "A 3D space invaders game built with Babylon.js",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add AdSense verification meta tag */}
        <meta name="google-adsense-account" content={ADSENSE_CONFIG.CLIENT_ID} />

        {/* Add AdSense script directly in the head */}
        {ADSENSE_CONFIG.ENABLED && !ADSENSE_CONFIG.DEV_MODE && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CONFIG.CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AudioProvider>{children}</AudioProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
