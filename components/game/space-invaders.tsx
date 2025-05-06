"use client"

import { useEffect, useRef, useState } from "react"

interface SpaceInvadersGameProps {
  onGameStart: () => void
  onGameOver: (score: number) => void
  onScoreUpdate: (score: number) => void
  onLivesUpdate: (lives: number) => void
  onLevelUpdate: (level: number) => void
  onGameReady: () => void
  onGameError: (message: string) => void
  isMobile: boolean
  playSound: (sound: "shoot" | "explosion" | "hit" | "enemyDestroyed" | "levelUp" | "gameOver") => void
}

export default function SpaceInvadersGame({
  onGameStart,
  onGameOver,
  onScoreUpdate,
  onLivesUpdate,
  onLevelUpdate,
  onGameReady,
  onGameError,
  isMobile,
  playSound,
}: SpaceInvadersGameProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined" || !gameContainerRef.current) return

    let game: any = null
    let cleanup = () => {}

    const initGame = async () => {
      try {
        setIsLoading(true)

        // Dynamically import Phaser - use a direct import to avoid environment variable issues
        const Phaser = (await import("phaser")).default

        // Import scene classes only after Phaser is loaded
        const bootSceneModule = await import("./scenes/boot-scene")
        const preloadSceneModule = await import("./scenes/preload-scene")
        const mainSceneModule = await import("./scenes/main-scene")
        const gameOverSceneModule = await import("./scenes/game-over-scene")

        const BootScene = bootSceneModule.BootScene
        const PreloadScene = preloadSceneModule.PreloadScene
        const MainScene = mainSceneModule.MainScene
        const GameOverScene = gameOverSceneModule.GameOverScene

        // Game configuration
        const config = {
          type: Phaser.AUTO,
          width: 800,
          height: 600,
          parent: gameContainerRef.current,
          backgroundColor: "#000000",
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          physics: {
            default: "arcade",
            arcade: {
              gravity: { y: 0 },
              debug: false,
            },
          },
          scene: [
            BootScene,
            PreloadScene,
            new MainScene({
              onGameStart,
              onGameOver,
              onScoreUpdate,
              onLivesUpdate,
              onLevelUpdate,
              onGameReady,
              isMobile,
              playSound,
            }),
            GameOverScene,
          ],
        }

        // Create the game
        game = new Phaser.Game(config)

        // Pass callbacks to the game registry
        game.registry.set("callbacks", {
          onGameStart,
          onGameOver,
          onScoreUpdate,
          onLivesUpdate,
          onLevelUpdate,
          onGameReady,
          onGameError,
          playSound,
        })

        setIsLoading(false)

        // Setup cleanup function
        cleanup = () => {
          if (game) {
            game.destroy(true)
            game = null
          }
        }
      } catch (error) {
        console.error("Error initializing game:", error)
        setLoadingError("Failed to load game engine. Please try again.")
        onGameError("Failed to load game engine. Please try again.")
        setIsLoading(false)
      }
    }

    // Initialize the game
    initGame()

    // Cleanup on unmount
    return () => {
      cleanup()
    }
  }, [
    onGameStart,
    onGameOver,
    onScoreUpdate,
    onLivesUpdate,
    onLevelUpdate,
    onGameReady,
    onGameError,
    isMobile,
    playSound,
  ])

  if (loadingError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black rounded-xl">
        <div className="text-center p-4">
          <div className="text-red-500 text-xl mb-4">⚠️ {loadingError}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black rounded-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading game engine...</p>
        </div>
      </div>
    )
  }

  return <div ref={gameContainerRef} className="w-full h-full rounded-xl overflow-hidden bg-black" />
}
