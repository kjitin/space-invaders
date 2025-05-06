"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AudioControls } from "@/components/audio-controls"
import { useAudio } from "@/components/web-audio-manager"
import { GameOverAd } from "@/components/game-over-ad"
import dynamic from "next/dynamic"

// Dynamically import the game component with no SSR
const SpaceInvadersGame = dynamic(() => import("@/components/game/space-invaders").then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-black rounded-xl">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-lg">Loading game engine...</p>
      </div>
    </div>
  ),
})

export default function PlayPage() {
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [highScore, setHighScore] = useState(0)
  const [gameState, setGameState] = useState<"loading" | "ready" | "playing" | "gameOver" | "error">("loading")
  const [message, setMessage] = useState("Loading game...")
  const [errorMessage, setErrorMessage] = useState("")
  const { playBackgroundMusic, stopBackgroundMusic, playSound } = useAudio()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Check if device is mobile
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Load high score from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return

    const savedHighScore = localStorage.getItem("spaceInvadersHighScore")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore, 10))
    }
  }, [])

  // Handle game events
  const handleGameStart = () => {
    setGameState("playing")
    setMessage("Game started!")
    playBackgroundMusic()
  }

  const handleGameOver = (finalScore: number) => {
    setGameState("gameOver")
    setMessage(`Game Over! Final score: ${finalScore}`)
    stopBackgroundMusic()
    playSound("gameOver")

    if (finalScore > highScore) {
      setHighScore(finalScore)
      localStorage.setItem("spaceInvadersHighScore", finalScore.toString())
    }
  }

  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore)
  }

  const handleLivesUpdate = (newLives: number) => {
    setLives(newLives)
  }

  const handleLevelUpdate = (newLevel: number) => {
    setLevel(newLevel)
    setMessage(`Level ${newLevel}!`)
    playSound("levelUp")
  }

  const handleGameReady = () => {
    setGameState("ready")
    setMessage("Press any key or tap screen to start")
  }

  const handleGameError = (errorMsg: string) => {
    setGameState("error")
    setErrorMessage(errorMsg)
    setMessage("Error loading game")
  }

  // Function to restart the game
  const restartGame = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Game header */}
      <header className="bg-blue-900/50 backdrop-blur-sm py-4 px-6 flex items-center justify-between shadow-md">
        <Link href="/" className="flex items-center gap-2 text-white">
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-blue-800/50 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="font-bold text-white">Score: {score}</span>
          </div>
          <div className="bg-blue-800/50 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="font-bold text-white">Lives: {lives}</span>
          </div>
          <div className="bg-blue-800/50 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="font-bold text-white">Level: {level}</span>
          </div>
          <div className="bg-blue-800/50 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="font-bold text-white">High Score: {highScore}</span>
          </div>
          <AudioControls />
        </div>
      </header>

      {/* Game container */}
      <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-4 left-0 right-0 text-center z-10">
          <div className="inline-block bg-blue-800/50 backdrop-blur-sm px-6 py-2 rounded-full">
            <span className="font-bold text-white">{message}</span>
          </div>
        </div>

        {/* Game component */}
        <div className="w-full max-w-[800px] h-[600px] relative">
          {gameState === "error" ? (
            <div className="w-full h-full flex items-center justify-center bg-black rounded-xl">
              <div className="text-center p-4">
                <div className="text-red-500 text-xl mb-4">⚠️ {errorMessage || "Error loading game"}</div>
                <Button onClick={restartGame} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <SpaceInvadersGame
              onGameStart={handleGameStart}
              onGameOver={handleGameOver}
              onScoreUpdate={handleScoreUpdate}
              onLivesUpdate={handleLivesUpdate}
              onLevelUpdate={handleLevelUpdate}
              onGameReady={handleGameReady}
              onGameError={handleGameError}
              isMobile={isMobile}
              playSound={playSound}
            />
          )}
        </div>

        {gameState === "gameOver" && (
          <>
            {/* Game Over Ad */}
            <GameOverAd />

            <div className="mt-2">
              <Button onClick={restartGame} className="bg-blue-600 hover:bg-blue-700 text-white">
                <RefreshCw className="mr-2 h-4 w-4" />
                Play Again
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Game instructions */}
      <div className="bg-blue-900/50 backdrop-blur-sm p-4 text-center text-white">
        <h2 className="font-bold text-xl mb-2">Controls</h2>
        <p>Left/Right Arrow Keys or A/D: Move ship</p>
        <p>Space: Fire weapon</p>
        <p>Green barriers protect you but can be destroyed by both your shots and enemy fire</p>
        {level > 3 && <p className="text-yellow-300 font-bold">Warning: Difficulty increases with each level!</p>}
        {isMobile && <p>Or use the on-screen buttons below the game</p>}
      </div>
    </div>
  )
}
