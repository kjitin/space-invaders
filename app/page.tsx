"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAudio } from "@/components/web-audio-manager"
import { AudioControls } from "@/components/audio-controls"
import { useEffect } from "react"

export default function Home() {
  const { playBackgroundMusic, playSound } = useAudio()

  // Initialize audio context on user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      try {
        // Play a silent sound to initialize audio context
        playSound("shoot")
        // Remove event listeners after first interaction
        document.removeEventListener("click", handleUserInteraction)
        document.removeEventListener("keydown", handleUserInteraction)
      } catch (error) {
        console.error("Error initializing audio:", error)
      }
    }

    document.addEventListener("click", handleUserInteraction)
    document.addEventListener("keydown", handleUserInteraction)

    return () => {
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("keydown", handleUserInteraction)
    }
  }, [playSound])

  const handlePlayClick = () => {
    try {
      playBackgroundMusic()
      playSound("levelUp") // Play a sound to indicate game start
    } catch (error) {
      console.error("Error playing audio:", error)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-900 to-black p-4">
      <div className="absolute top-4 right-4">
        <AudioControls />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-4">Space Invaders 3D</h1>
        <p className="text-xl text-blue-200 max-w-md mx-auto">
          Defend Earth from alien invaders in this classic arcade game reimagined in 3D!
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link href="/play">
          <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700" onClick={handlePlayClick}>
            Play Now
          </Button>
        </Link>
        <Button
          variant="outline"
          className="w-full h-12 text-lg border-blue-500 text-blue-200 hover:bg-blue-800/30"
          onClick={() => playSound("shoot")}
        >
          How to Play
        </Button>
      </div>

      <div className="mt-12 text-blue-300 text-sm">
        <p>Use left and right arrow keys or A/D to move</p>
        <p>Space to shoot</p>
      </div>
    </div>
  )
}
