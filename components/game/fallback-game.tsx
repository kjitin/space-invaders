"use client"

import { useEffect, useRef } from "react"

interface FallbackGameProps {
  onGameStart: () => void
  onGameOver: (score: number) => void
  onScoreUpdate: (score: number) => void
  onLivesUpdate: (lives: number) => void
  playSound: (sound: string) => void
}

export default function FallbackGame({
  onGameStart,
  onGameOver,
  onScoreUpdate,
  onLivesUpdate,
  playSound,
}: FallbackGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    // Game variables
    const score = 0
    const lives = 3
    let gameActive = false

    // Player
    const player = {
      x: canvas.width / 2,
      y: canvas.height - 50,
      width: 40,
      height: 20,
      speed: 5,
      color: "#00ffff",
    }

    // Draw player
    const drawPlayer = () => {
      ctx.fillStyle = player.color
      ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height)
    }

    // Game loop
    const gameLoop = () => {
      // Clear canvas
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw player
      drawPlayer()

      // Draw UI
      ctx.fillStyle = "#ffffff"
      ctx.font = "20px Arial"
      ctx.fillText(`Score: ${score}`, 20, 30)
      ctx.fillText(`Lives: ${lives}`, canvas.width - 100, 30)

      if (!gameActive) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.fillStyle = "#ffffff"
        ctx.font = "30px Arial"
        ctx.textAlign = "center"
        ctx.fillText("Click to Start", canvas.width / 2, canvas.height / 2)
        ctx.textAlign = "left"
      }

      requestAnimationFrame(gameLoop)
    }

    // Start game loop
    gameLoop()

    // Handle keyboard input
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameActive) {
        gameActive = true
        onGameStart()
        return
      }

      if (e.key === "ArrowLeft" || e.key === "a") {
        player.x = Math.max(player.width / 2, player.x - player.speed)
      } else if (e.key === "ArrowRight" || e.key === "d") {
        player.x = Math.min(canvas.width - player.width / 2, player.x + player.speed)
      } else if (e.key === " ") {
        playSound("shoot")
      }
    }

    // Handle mouse/touch input
    const handleClick = () => {
      if (!gameActive) {
        gameActive = true
        onGameStart()
      }
    }

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown)
    canvas.addEventListener("click", handleClick)

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      canvas.removeEventListener("click", handleClick)
    }
  }, [onGameStart, onGameOver, onScoreUpdate, onLivesUpdate, playSound])

  return <canvas ref={canvasRef} className="w-full h-full rounded-xl bg-black" />
}
