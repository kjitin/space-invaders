"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAudio } from "@/components/web-audio-manager"
import { AudioControls } from "@/components/audio-controls"

export default function SpaceInvadersGame() {
  // Rest of the code remains the same, just updating the audio-related parts

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [gameState, setGameState] = useState<"loading" | "ready" | "playing" | "gameOver" | "error">("loading")
  const [message, setMessage] = useState("Loading game...")
  const [highScore, setHighScore] = useState(0)
  const [level, setLevel] = useState(1)
  const { playBackgroundMusic, stopBackgroundMusic, playSound } = useAudio()
  const gameRef = useRef<any>({ active: false })
  const playerRef = useRef<any>(null)
  const enemiesRef = useRef<any[]>([])
  const projectilesRef = useRef<any[]>([])
  const enemyProjectilesRef = useRef<any[]>([])
  const barriersRef = useRef<any[]>([])
  const requestRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const keyMapRef = useRef<{ [key: string]: boolean }>({})
  const [isMobile, setIsMobile] = useState(false)
  const [debug, setDebug] = useState("")
  const explosionParticlesRef = useRef<any[]>([])
  const difficultyRef = useRef<number>(1)

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

  // Add this after the gameState useState declaration
  useEffect(() => {
    try {
      if (gameState === "playing") {
        playBackgroundMusic()
      } else if (gameState === "gameOver") {
        stopBackgroundMusic()
        playSound("gameOver")
      }
    } catch (error) {
      console.error("Error handling game state audio:", error)
    }
  }, [gameState, playBackgroundMusic, stopBackgroundMusic, playSound])

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

  // Update difficulty factor when level changes
  useEffect(() => {
    // Exponential difficulty scaling
    difficultyRef.current = Math.pow(1.2, level - 1)
  }, [level])

  // Initialize game using Canvas API
  useEffect(() => {
    if (!canvasRef.current || typeof window === "undefined") return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      setGameState("error")
      setMessage("Could not initialize game. Your browser may not support Canvas.")
      return
    }

    // Set canvas dimensions
    const resizeCanvas = () => {
      const container = containerRef.current
      if (container) {
        // Set canvas size based on container
        const width = Math.min(container.clientWidth - 20, 800)
        const height = Math.min(container.clientHeight - 20, 600)

        canvas.width = width
        canvas.height = height

        // Update player position when canvas is resized
        if (playerRef.current) {
          playerRef.current.y = canvas.height - 50
        }
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Game objects
    const player = {
      x: canvas.width / 2,
      y: canvas.height - 50,
      width: 40,
      height: 20,
      speed: 5,
      color: "#00AAFF",
    }
    playerRef.current = player

    // Create enemies
    const createEnemies = (level: number) => {
      const enemies: any[] = []
      // Increase rows and columns with level
      const rows = Math.min(3 + Math.floor(level / 2), 6)
      const cols = Math.min(6 + Math.floor(level / 2), 12)
      const enemyWidth = 30
      const enemyHeight = 20
      const padding = Math.max(15 - level, 8) // Reduce padding at higher levels for tighter formations
      const startX = (canvas.width - cols * (enemyWidth + padding)) / 2 + enemyWidth / 2
      const startY = 50

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Add special enemy types at higher levels
          const isSpecial = level > 3 && Math.random() < 0.1 * Math.min(level / 3, 1)
          const isBoss = level > 5 && row === 0 && col === Math.floor(cols / 2) && level % 5 === 0

          let enemyColor = row === 0 ? "#FF5555" : row === 1 ? "#55FF55" : "#FFFF55"
          let enemyPoints = (rows - row) * 100
          let enemySize = { width: enemyWidth, height: enemyHeight }
          let enemyHealth = 1

          // Special enemy types
          if (isBoss) {
            enemyColor = "#FF00FF" // Magenta for boss
            enemyPoints = 2000
            enemySize = { width: enemyWidth * 2, height: enemyHeight * 2 }
            enemyHealth = 5
          } else if (isSpecial) {
            enemyColor = "#00FFFF" // Cyan for special
            enemyPoints = 500
            enemyHealth = 2
          }

          const enemy = {
            x: startX + col * (enemyWidth + padding),
            y: startY + row * (enemyHeight + padding),
            width: enemySize.width,
            height: enemySize.height,
            speed: (1 + level * 0.2) * difficultyRef.current,
            direction: 1,
            color: enemyColor,
            points: enemyPoints,
            health: enemyHealth,
            isBoss,
            isSpecial,
            shootChance: isBoss ? 0.02 : isSpecial ? 0.01 : 0.005, // Boss and special enemies shoot more often
            lastShot: 0,
            shotCooldown: isBoss ? 1000 : isSpecial ? 1500 : 2000,
          }
          enemies.push(enemy)
        }
      }

      return enemies
    }

    // Create barriers
    const createBarriers = () => {
      const barriers: any[] = []
      const barrierCount = 4
      const barrierWidth = 60
      const barrierHeight = 40
      const barrierY = canvas.height - 120
      const spacing = canvas.width / (barrierCount + 1)

      for (let i = 0; i < barrierCount; i++) {
        const barrierX = spacing * (i + 1) - barrierWidth / 2

        // Create a barrier with a grid of blocks
        const barrier = {
          x: barrierX,
          y: barrierY,
          width: barrierWidth,
          height: barrierHeight,
          color: "#00FF00",
          blocks: [] as any[],
        }

        // Create individual blocks for the barrier
        const blockSize = 6
        const blocksWide = Math.floor(barrierWidth / blockSize)
        const blocksHigh = Math.floor(barrierHeight / blockSize)

        for (let row = 0; row < blocksHigh; row++) {
          for (let col = 0; col < blocksWide; col++) {
            // Skip some blocks to create the classic shape
            if (
              // Create a small arch in the bottom center
              row >= blocksHigh - 3 &&
              col >= Math.floor(blocksWide / 2) - 2 &&
              col <= Math.floor(blocksWide / 2) + 1
            ) {
              continue
            }

            // At higher levels, make barriers weaker by starting with less health
            const maxHealth = level <= 3 ? 3 : level <= 6 ? 2 : 1

            const block = {
              x: barrierX + col * blockSize,
              y: barrierY + row * blockSize,
              width: blockSize,
              height: blockSize,
              health: maxHealth, // Blocks can take multiple hits
              color: "#00FF00",
            }

            barrier.blocks.push(block)
          }
        }

        barriers.push(barrier)
      }

      return barriers
    }

    // Initialize enemies
    enemiesRef.current = createEnemies(level)

    // Initialize barriers
    barriersRef.current = createBarriers()

    // Game state
    const game = {
      active: false,
      moveDown: false,
      lastEnemyShot: 0,
      enemyShootInterval: Math.max(150, 800 - level * 70), // Faster shooting at higher levels
      projectiles: [],
      enemyProjectiles: [],
    }
    gameRef.current = game

    // Draw functions
    const drawPlayer = () => {
      if (!ctx) return

      ctx.fillStyle = player.color
      ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height)

      // Draw cockpit
      ctx.fillStyle = "#AADDFF"
      ctx.beginPath()
      ctx.arc(player.x, player.y - 5, 8, 0, Math.PI * 2)
      ctx.fill()

      // Draw wings
      ctx.fillStyle = player.color
      ctx.fillRect(player.x - player.width / 2 - 10, player.y, 10, 5)
      ctx.fillRect(player.x + player.width / 2, player.y, 10, 5)
    }

    const drawEnemies = () => {
      if (!ctx) return

      enemiesRef.current.forEach((enemy) => {
        ctx.fillStyle = enemy.color

        // Draw different shapes for different enemy types
        if (enemy.isBoss) {
          // Draw boss enemy (larger with details)
          ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height)

          // Draw boss details
          ctx.fillStyle = "#FFFFFF"
          ctx.beginPath()
          ctx.arc(enemy.x - enemy.width / 4, enemy.y - enemy.height / 4, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(enemy.x + enemy.width / 4, enemy.y - enemy.height / 4, 5, 0, Math.PI * 2)
          ctx.fill()

          // Draw health bar
          const healthBarWidth = enemy.width
          const healthBarHeight = 5
          const healthPercentage = enemy.health / 5

          ctx.fillStyle = "#FF0000"
          ctx.fillRect(enemy.x - healthBarWidth / 2, enemy.y - enemy.height / 2 - 10, healthBarWidth, healthBarHeight)
          ctx.fillStyle = "#00FF00"
          ctx.fillRect(
            enemy.x - healthBarWidth / 2,
            enemy.y - enemy.height / 2 - 10,
            healthBarWidth * healthPercentage,
            healthBarHeight,
          )
        } else if (enemy.isSpecial) {
          // Draw special enemy (with a different shape)
          ctx.beginPath()
          ctx.moveTo(enemy.x, enemy.y - enemy.height / 2)
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2)
          ctx.lineTo(enemy.x - enemy.width / 2, enemy.y + enemy.height / 2)
          ctx.closePath()
          ctx.fill()

          // Draw special enemy details
          ctx.fillStyle = "#FFFFFF"
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y, 5, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Draw regular enemy
          ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height)

          // Draw top part
          ctx.fillStyle = enemy.color
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y - enemy.height / 2 - 5, 5, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    }

    const drawBarriers = () => {
      if (!ctx) return

      barriersRef.current.forEach((barrier) => {
        barrier.blocks.forEach((block) => {
          // Color based on health
          switch (block.health) {
            case 3:
              ctx.fillStyle = "#00FF00" // Green
              break
            case 2:
              ctx.fillStyle = "#AAFF00" // Yellow-green
              break
            case 1:
              ctx.fillStyle = "#FFAA00" // Orange
              break
            default:
              ctx.fillStyle = "#FF0000" // Red (shouldn't happen)
          }

          ctx.fillRect(block.x, block.y, block.width, block.height)
        })
      })
    }

    const drawProjectiles = () => {
      if (!ctx) return

      projectilesRef.current.forEach((projectile) => {
        // Draw player projectiles
        if (projectile.enhanced) {
          // Draw enhanced projectile (for higher levels)
          ctx.fillStyle = "#FFFF00"
          ctx.fillRect(projectile.x - 3, projectile.y - 10, 6, 20)

          // Add glow effect
          const gradient = ctx.createRadialGradient(projectile.x, projectile.y, 0, projectile.x, projectile.y, 10)
          gradient.addColorStop(0, "rgba(255, 255, 0, 0.7)")
          gradient.addColorStop(1, "rgba(255, 255, 0, 0)")
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(projectile.x, projectile.y, 10, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Draw regular projectile
          ctx.fillStyle = "#00FFFF"
          ctx.fillRect(projectile.x - 2, projectile.y - 8, 4, 16)
        }
      })

      enemyProjectilesRef.current.forEach((projectile) => {
        // Draw different projectiles based on type
        if (projectile.isBoss) {
          // Boss projectile (larger, more threatening)
          ctx.fillStyle = "#FF00FF"
          ctx.beginPath()
          ctx.arc(projectile.x, projectile.y, 6, 0, Math.PI * 2)
          ctx.fill()

          // Add glow effect
          const gradient = ctx.createRadialGradient(projectile.x, projectile.y, 0, projectile.x, projectile.y, 12)
          gradient.addColorStop(0, "rgba(255, 0, 255, 0.7)")
          gradient.addColorStop(1, "rgba(255, 0, 255, 0)")
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(projectile.x, projectile.y, 12, 0, Math.PI * 2)
          ctx.fill()
        } else if (projectile.isSpecial) {
          // Special projectile (zigzag pattern)
          ctx.fillStyle = "#00FFFF"
          ctx.beginPath()
          ctx.moveTo(projectile.x, projectile.y - 8)
          ctx.lineTo(projectile.x + 5, projectile.y)
          ctx.lineTo(projectile.x, projectile.y + 8)
          ctx.lineTo(projectile.x - 5, projectile.y)
          ctx.closePath()
          ctx.fill()
        } else {
          // Regular projectile
          ctx.fillStyle = "#FF0000"
          ctx.fillRect(projectile.x - 2, projectile.y - 8, 4, 16)
        }
      })
    }

    const drawBackground = () => {
      if (!ctx) return

      // Draw space background
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw stars
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        const radius = Math.random() * 1.5

        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      // At higher levels, add background effects
      if (level > 3) {
        // Add nebula effect
        const nebulaCount = Math.min(level, 10)
        for (let i = 0; i < nebulaCount; i++) {
          const x = Math.random() * canvas.width
          const y = Math.random() * canvas.height
          const radius = 30 + Math.random() * 50

          // Create a gradient for the nebula
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)

          // Different colors based on level
          if (level > 7) {
            gradient.addColorStop(0, "rgba(255, 0, 100, 0.05)")
            gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
          } else if (level > 5) {
            gradient.addColorStop(0, "rgba(0, 100, 255, 0.03)")
            gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
          } else {
            gradient.addColorStop(0, "rgba(100, 0, 255, 0.02)")
            gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
          }

          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    const drawUI = () => {
      if (!ctx) return

      ctx.fillStyle = "#FFFFFF"
      ctx.font = "16px Arial"
      ctx.fillText(`Score: ${score}`, 20, 30)
      ctx.fillText(`Lives: ${lives}`, 20, 60)
      ctx.fillText(`Level: ${level}`, 20, 90)
      ctx.fillText(`High Score: ${highScore}`, canvas.width - 150, 30)

      // Display difficulty indicator at higher levels
      if (level > 3) {
        let difficultyText = ""
        if (level <= 5) difficultyText = "MEDIUM"
        else if (level <= 8) difficultyText = "HARD"
        else if (level <= 12) difficultyText = "EXPERT"
        else difficultyText = "INSANE"

        ctx.fillStyle = level > 8 ? "#FF0000" : level > 5 ? "#FFAA00" : "#FFFF00"
        ctx.font = "bold 14px Arial"
        ctx.fillText(`Difficulty: ${difficultyText}`, canvas.width - 150, 60)
      }

      if (gameState === "ready") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80)

        ctx.fillStyle = "#FFFFFF"
        ctx.font = "24px Arial"
        ctx.textAlign = "center"
        ctx.fillText("Press any key or tap screen to start", canvas.width / 2, canvas.height / 2)
        ctx.textAlign = "left"
      } else if (gameState === "gameOver") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
        ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120)

        ctx.fillStyle = "#FFFFFF"
        ctx.font = "28px Arial"
        ctx.textAlign = "center"
        ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 20)
        ctx.font = "20px Arial"
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20)
        ctx.textAlign = "left"
      }

      // Draw debug info if needed
      if (debug) {
        ctx.fillStyle = "#FFFF00"
        ctx.font = "12px Arial"
        ctx.fillText(debug, 20, canvas.height - 20)
      }
    }

    // Game logic
    const updateEnemies = (deltaTime: number) => {
      let moveDown = false
      let allDestroyed = true

      // Check if any enemies hit the edge
      enemiesRef.current.forEach((enemy) => {
        if (
          enemy.x + enemy.width / 2 + enemy.speed * enemy.direction > canvas.width ||
          enemy.x - enemy.width / 2 + enemy.speed * enemy.direction < 0
        ) {
          moveDown = true
        }
        allDestroyed = false
      })

      // Move enemies
      enemiesRef.current.forEach((enemy) => {
        if (moveDown) {
          enemy.direction *= -1
          enemy.y += 20 + (level > 5 ? 10 : 0) // Enemies move down faster at higher levels
        }

        // Basic movement
        enemy.x += enemy.speed * enemy.direction * (deltaTime / 16)

        // Special movement patterns at higher levels
        if (level > 3) {
          if (enemy.isSpecial) {
            // Special enemies move in a sine wave pattern
            enemy.y += Math.sin(Date.now() / 500) * 0.5
          } else if (enemy.isBoss) {
            // Boss enemies have more complex movement
            if (Math.random() < 0.01) {
              // Occasionally teleport to a new position
              enemy.x = Math.max(
                enemy.width,
                Math.min(canvas.width - enemy.width, enemy.x + (Math.random() - 0.5) * 100),
              )
            }
          }
        }

        // Check if enemies reached the bottom
        if (enemy.y + enemy.height / 2 > player.y - player.height) {
          gameRef.current.active = false
          setGameState("gameOver")
          setMessage("Game Over! Aliens have invaded!")

          if (score > highScore) {
            setHighScore(score)
            localStorage.setItem("spaceInvadersHighScore", score.toString())
          }
        }

        // Individual enemy shooting (in addition to the wave shooting)
        if (level > 3) {
          // Only at higher levels
          const now = Date.now()
          if (now - enemy.lastShot > enemy.shotCooldown && Math.random() < enemy.shootChance * difficultyRef.current) {
            const projectile = {
              x: enemy.x,
              y: enemy.y + enemy.height / 2,
              speed: 5 + Math.random() * 2 + (level > 7 ? 2 : 0), // Faster projectiles at higher levels
              width: 4,
              height: 16,
              isBoss: enemy.isBoss,
              isSpecial: enemy.isSpecial,
            }

            enemyProjectilesRef.current.push(projectile)
            enemy.lastShot = now
          }
        }
      })

      // Check if all enemies are destroyed
      if (enemiesRef.current.length === 0) {
        setLevel((prevLevel) => {
          const newLevel = prevLevel + 1
          enemiesRef.current = createEnemies(newLevel)
          gameRef.current.enemyShootInterval = Math.max(150, 800 - newLevel * 70)

          // Play level up sound
          try {
            playSound("levelUp")
          } catch (error) {
            console.error("Error playing level up sound:", error)
          }

          // Repair barriers slightly between levels (less repair at higher levels)
          barriersRef.current.forEach((barrier) => {
            barrier.blocks.forEach((block) => {
              // At higher levels, repair less or not at all
              if (newLevel <= 3) {
                if (block.health < 3) block.health += 1
              } else if (newLevel <= 6) {
                if (block.health < 2 && Math.random() < 0.7) block.health += 1
              } else if (newLevel <= 10) {
                if (block.health < 2 && Math.random() < 0.3) block.health += 1
              }
              // Above level 10, no repairs
            })
          })

          setMessage(
            `Level ${newLevel}! ${newLevel <= 10 ? "Barriers partially repaired!" : "No barrier repairs at this level!"}`,
          )
          return newLevel
        })
      }

      // Enemy shooting (wave shooting)
      const now = Date.now()
      if (now - gameRef.current.lastEnemyShot > gameRef.current.enemyShootInterval && enemiesRef.current.length > 0) {
        // Determine how many enemies will shoot based on level and remaining enemies
        const shootCount = Math.min(
          Math.max(1, Math.floor(level / 2)),
          Math.min(level > 10 ? 5 : 3, Math.ceil(enemiesRef.current.length / 4)),
        )

        // Get random enemies to shoot
        const shootingEnemies = []
        const enemiesCopy = [...enemiesRef.current]

        for (let i = 0; i < shootCount; i++) {
          if (enemiesCopy.length === 0) break

          const randomIndex = Math.floor(Math.random() * enemiesCopy.length)
          shootingEnemies.push(enemiesCopy[randomIndex])
          enemiesCopy.splice(randomIndex, 1)
        }

        // Create projectiles for each shooting enemy
        shootingEnemies.forEach((enemy) => {
          // At higher levels, enemies can shoot multiple projectiles at once
          const projectileCount = enemy.isBoss ? 3 : enemy.isSpecial ? 2 : level > 8 ? 2 : 1

          for (let i = 0; i < projectileCount; i++) {
            let offsetX = 0
            if (projectileCount > 1) {
              // Spread multiple projectiles
              offsetX = (i - (projectileCount - 1) / 2) * 10
            }

            const projectile = {
              x: enemy.x + offsetX,
              y: enemy.y + enemy.height / 2,
              speed: 5 + Math.random() * 2 + (level > 7 ? 2 : 0), // Faster projectiles at higher levels
              width: 4,
              height: 16,
              isBoss: enemy.isBoss,
              isSpecial: enemy.isSpecial,
            }

            enemyProjectilesRef.current.push(projectile)
          }
        })

        gameRef.current.lastEnemyShot = now
      }
    }

    const updateProjectiles = () => {
      // Update player projectiles
      for (let i = 0; i < projectilesRef.current.length; i++) {
        const projectile = projectilesRef.current[i]
        projectile.y -= projectile.speed

        // Remove if out of bounds
        if (projectile.y < 0) {
          projectilesRef.current.splice(i, 1)
          i--
          continue
        }

        // Check for collisions with barriers
        let barrierHit = false
        for (let b = 0; b < barriersRef.current.length; b++) {
          const barrier = barriersRef.current[b]

          for (let j = 0; j < barrier.blocks.length; j++) {
            const block = barrier.blocks[j]

            if (
              projectile.x > block.x &&
              projectile.x < block.x + block.width &&
              projectile.y > block.y &&
              projectile.y < block.y + block.height
            ) {
              // Block hit
              block.health--

              // Remove block if destroyed
              if (block.health <= 0) {
                barrier.blocks.splice(j, 1)
                j--
              }

              // Remove projectile (unless it's enhanced and at higher levels)
              if (!projectile.enhanced || level <= 8) {
                projectilesRef.current.splice(i, 1)
                i--
              } else {
                // Enhanced projectiles at high levels can penetrate one barrier block
                projectile.enhanced = false
              }

              barrierHit = true
              break
            }
          }

          if (barrierHit) break
        }

        if (barrierHit) continue

        // Check for collisions with enemies
        for (let j = 0; j < enemiesRef.current.length; j++) {
          const enemy = enemiesRef.current[j]

          if (
            projectile.x > enemy.x - enemy.width / 2 &&
            projectile.x < enemy.x + enemy.width / 2 &&
            projectile.y > enemy.y - enemy.height / 2 &&
            projectile.y < enemy.y + enemy.height / 2
          ) {
            // Enemy hit
            enemy.health--

            // Only remove enemy if health is depleted
            if (enemy.health <= 0) {
              // Award points
              setScore((prevScore) => prevScore + enemy.points)

              // Play sound based on enemy type
              try {
                if (enemy.isBoss) {
                  playSound("explosion")
                } else {
                  playSound("enemyDestroyed")
                }
              } catch (error) {
                console.error("Error playing enemy destroyed sound:", error)
              }

              // Create explosion
              if (ctx) {
                // Flash effect
                ctx.fillStyle = "#FFAA00"
                ctx.beginPath()
                ctx.arc(enemy.x, enemy.y, 20, 0, Math.PI * 2)
                ctx.fill()

                // Add explosion particles based on enemy color
                const baseColor = enemy.color
                const particleColor = baseColor.replace("#", "rgba(").replace("FF", "").replace("55", "") + ", 255"

                // Add colored particles based on enemy type
                const enemyParticleCount = enemy.isBoss ? 40 : enemy.isSpecial ? 25 : 15
                explosionParticlesRef.current.push(
                  ...createExplosion(enemy.x, enemy.y, particleColor + ")", enemyParticleCount),
                )

                // Add some white sparks
                explosionParticlesRef.current.push(...createExplosion(enemy.x, enemy.y, "rgba(255, 255, 255", 8))
              }

              // Remove enemy
              enemiesRef.current.splice(j, 1)
            } else {
              // Enemy still has health, show hit effect
              if (ctx) {
                ctx.fillStyle = "#FFFFFF"
                ctx.beginPath()
                ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2)
                ctx.fill()
              }
            }

            // Remove projectile
            projectilesRef.current.splice(i, 1)
            i--
            break
          }
        }
      }

      // Update enemy projectiles
      for (let i = 0; i < enemyProjectilesRef.current.length; i++) {
        const projectile = enemyProjectilesRef.current[i]
        projectile.y += projectile.speed

        // Special projectile movement patterns
        if (projectile.isSpecial) {
          // Zigzag pattern
          projectile.x += Math.sin(projectile.y / 20) * 2
        } else if (projectile.isBoss) {
          // Homing behavior for boss projectiles at higher levels
          if (level > 8 && playerRef.current) {
            const dx = playerRef.current.x - projectile.x
            const homingFactor = 0.05
            projectile.x += dx * homingFactor
          }
        }

        // Remove if out of bounds
        if (projectile.y > canvas.height) {
          enemyProjectilesRef.current.splice(i, 1)
          i--
          continue
        }

        // Check for collisions with barriers
        let barrierHit = false
        for (let b = 0; b < barriersRef.current.length; b++) {
          const barrier = barriersRef.current[b]

          for (let j = 0; j < barrier.blocks.length; j++) {
            const block = barrier.blocks[j]

            if (
              projectile.x > block.x &&
              projectile.x < block.x + block.width &&
              projectile.y > block.y &&
              projectile.y < block.y + block.height
            ) {
              // Block hit
              // Boss projectiles do more damage to barriers
              block.health -= projectile.isBoss ? 2 : 1

              // Remove block if destroyed
              if (block.health <= 0) {
                barrier.blocks.splice(j, 1)
                j--
              }

              // Remove projectile (boss projectiles can penetrate one barrier block)
              if (!projectile.isBoss) {
                enemyProjectilesRef.current.splice(i, 1)
                i--
              } else {
                projectile.isBoss = false // Downgrade to regular projectile after penetration
              }

              barrierHit = true
              break
            }
          }

          if (barrierHit) break
        }

        if (barrierHit) continue

        // Check for collision with player
        if (
          projectile.x > player.x - player.width / 2 &&
          projectile.x < player.x + player.width / 2 &&
          projectile.y > player.y - player.height / 2 &&
          projectile.y < player.y + player.height / 2
        ) {
          // Player hit
          setLives((prevLives) => {
            // Boss projectiles can do double damage at higher levels
            const damage = projectile.isBoss && level > 8 ? 2 : 1
            const newLives = prevLives - damage

            // Play hit sound
            try {
              playSound("hit")
            } catch (error) {
              console.error("Error playing hit sound:", error)
            }

            // Create explosion
            if (ctx) {
              // Create a flash effect
              ctx.fillStyle = "#FFFFFF"
              ctx.beginPath()
              ctx.arc(player.x, player.y, 40, 0, Math.PI * 2)
              ctx.fill()

              // Add explosion particles
              const primaryColor = "rgba(0, 170, 255"
              const secondaryColor = "rgba(255, 100, 50"
              const whiteColor = "rgba(255, 255, 255"

              // Add blue ship particles
              explosionParticlesRef.current.push(...createExplosion(player.x, player.y, primaryColor + ")", 20))

              // Add orange flame particles
              explosionParticlesRef.current.push(...createExplosion(player.x, player.y, secondaryColor + ")", 15))

              // Add white spark particles
              explosionParticlesRef.current.push(...createExplosion(player.x, player.y, whiteColor + ")", 10))
            }

            // Check game over
            if (newLives <= 0) {
              gameRef.current.active = false
              setGameState("gameOver")
              setMessage("Game Over! You've been destroyed!")

              // Create a bigger final explosion
              if (ctx) {
                const primaryColor = "rgba(0, 170, 255"
                const secondaryColor = "rgba(255, 100, 50"
                const whiteColor = "rgba(255, 255, 255"

                // Add multiple layers of particles for a bigger explosion
                explosionParticlesRef.current.push(...createExplosion(player.x, player.y, primaryColor + ")", 40))
                explosionParticlesRef.current.push(...createExplosion(player.x, player.y, secondaryColor + ")", 30))
                explosionParticlesRef.current.push(...createExplosion(player.x, player.y, whiteColor + ")", 20))

                // Add some slower, larger particles
                for (let i = 0; i < 15; i++) {
                  const angle = Math.random() * Math.PI * 2
                  const speed = 0.5 + Math.random() * 1.5
                  const size = 3 + Math.random() * 5
                  const lifetime = 60 + Math.random() * 40

                  explosionParticlesRef.current.push({
                    x: player.x,
                    y: player.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size,
                    color: i % 2 === 0 ? primaryColor + ")" : secondaryColor + ")",
                    lifetime,
                    maxLifetime: lifetime,
                  })
                }
              }

              if (score > highScore) {
                setHighScore(score)
                localStorage.setItem("spaceInvadersHighScore", score.toString())
              }
            } else {
              setMessage(`Hit! ${newLives} lives remaining`)
            }

            return newLives
          })

          // Remove projectile
          enemyProjectilesRef.current.splice(i, 1)
          i--
        }
      }
    }

    const createExplosion = (x: number, y: number, color: string, particleCount = 30) => {
      const particles = []

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 3
        const size = 1 + Math.random() * 3
        const lifetime = 30 + Math.random() * 30

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size,
          color,
          lifetime,
          maxLifetime: lifetime,
        })
      }

      return particles
    }

    const updateAndDrawExplosionParticles = (ctx: CanvasRenderingContext2D) => {
      // Update particles
      for (let i = 0; i < explosionParticlesRef.current.length; i++) {
        const particle = explosionParticlesRef.current[i]

        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Update lifetime
        particle.lifetime -= 1

        // Remove dead particles
        if (particle.lifetime <= 0) {
          explosionParticlesRef.current.splice(i, 1)
          i--
          continue
        }

        // Draw particle with fading opacity
        const opacity = particle.lifetime / particle.maxLifetime
        ctx.fillStyle = particle.color.replace(")", `, ${opacity})`)
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Game loop
    const gameLoop = (timestamp: number) => {
      if (!ctx) return

      // Calculate delta time
      const deltaTime = timestamp - (lastTimeRef.current || timestamp)
      lastTimeRef.current = timestamp

      // Clear canvas
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw background
      drawBackground()

      // Draw game objects
      drawPlayer()
      drawEnemies()
      drawBarriers() // Draw barriers
      drawProjectiles()
      drawUI()

      // Draw explosion particles
      if (explosionParticlesRef.current.length > 0) {
        updateAndDrawExplosionParticles(ctx)
      }

      // Update game state if active
      if (gameRef.current.active) {
        updateEnemies(deltaTime)
        updateProjectiles()

        // Update player position based on key state
        updatePlayerPosition()
      }

      // Continue game loop
      requestRef.current = requestAnimationFrame(gameLoop)
    }

    // Start game loop
    requestRef.current = requestAnimationFrame(gameLoop)

    // Player movement update
    const updatePlayerPosition = () => {
      if (!gameRef.current.active) return

      // Debug key state
      setDebug(`Keys: Left=${keyMapRef.current["ArrowLeft"] || keyMapRef.current["a"] || keyMapRef.current["A"] ? "true" : "false"}, 
                Right=${keyMapRef.current["ArrowRight"] || keyMapRef.current["d"] || keyMapRef.current["D"] ? "true" : "false"}`)

      // Player speed decreases slightly at higher levels (harder to maneuver)
      const playerSpeed = level > 8 ? player.speed * 0.8 : player.speed

      if (
        (keyMapRef.current["ArrowLeft"] || keyMapRef.current["a"] || keyMapRef.current["A"]) &&
        player.x > player.width / 2
      ) {
        player.x -= playerSpeed
      }

      if (
        (keyMapRef.current["ArrowRight"] || keyMapRef.current["d"] || keyMapRef.current["D"]) &&
        player.x < canvas.width - player.width / 2
      ) {
        player.x += playerSpeed
      }
    }

    // Game is ready to play
    setGameState("ready")
    setMessage("Press any key or tap screen to start")

    // Cleanup
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  // Set up keyboard controls - separate from the main game initialization
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Update key state
      keyMapRef.current[e.key] = true

      // Start game on any key press
      if (gameState === "ready") {
        gameRef.current.active = true
        setGameState("playing")
        setMessage("Game started!")
      }

      // Shoot on space
      if (e.key === " " && gameRef.current.active) {
        const player = playerRef.current
        if (player) {
          const projectile = {
            x: player.x,
            y: player.y - player.height / 2,
            speed: 10,
            width: 4,
            height: 16,
            // Enhanced projectiles at higher levels
            enhanced: level > 5,
          }

          projectilesRef.current.push(projectile)

          try {
            playSound("shoot")
          } catch (error) {
            console.error("Error playing shoot sound:", error)
          }
        }
      }

      // Prevent default for arrow keys and space to avoid page scrolling
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keyMapRef.current[e.key] = false
    }

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [gameState, level, playSound])

  // Handle canvas click/tap for mobile
  const handleCanvasClick = () => {
    if (gameState === "ready") {
      gameRef.current.active = true
      setGameState("playing")
      setMessage("Game started!")
    } else if (gameState === "playing") {
      // Fire on tap/click in playing state
      const player = playerRef.current
      if (player) {
        const projectile = {
          x: player.x,
          y: player.y - player.height / 2,
          speed: 10,
          width: 4,
          height: 16,
          // Enhanced projectiles at higher levels
          enhanced: level > 5,
        }

        projectilesRef.current.push(projectile)
      }
    }
  }

  // Handle mobile controls
  const moveLeft = () => {
    if (playerRef.current && gameRef.current.active) {
      // Player speed decreases slightly at higher levels (harder to maneuver)
      const playerSpeed = level > 8 ? playerRef.current.speed * 1.6 : playerRef.current.speed * 2

      playerRef.current.x -= playerSpeed
      if (playerRef.current.x < playerRef.current.width / 2) {
        playerRef.current.x = playerRef.current.width / 2
      }
    }
  }

  const moveRight = () => {
    if (playerRef.current && gameRef.current.active && canvasRef.current) {
      // Player speed decreases slightly at higher levels (harder to maneuver)
      const playerSpeed = level > 8 ? playerRef.current.speed * 1.6 : playerRef.current.speed * 2

      playerRef.current.x += playerSpeed
      if (playerRef.current.x > canvasRef.current.width - playerRef.current.width / 2) {
        playerRef.current.x = canvasRef.current.width - playerRef.current.width / 2
      }
    }
  }

  const shoot = () => {
    if (gameRef.current.active && playerRef.current) {
      const projectile = {
        x: playerRef.current.x,
        y: playerRef.current.y - playerRef.current.height / 2,
        speed: 10,
        width: 4,
        height: 16,
        // Enhanced projectiles at higher levels
        enhanced: level > 5,
      }

      projectilesRef.current.push(projectile)

      try {
        playSound("shoot")
      } catch (error) {
        console.error("Error playing shoot sound:", error)
      }
    }
  }

  // Function to restart the game
  const restartGame = () => {
    setScore(0)
    setLives(3)
    setLevel(1)
    setGameState("loading")

    // Reset game objects
    projectilesRef.current = []
    enemyProjectilesRef.current = []

    // Reset explosion particles
    explosionParticlesRef.current = []

    // Reload the page to restart the game
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
      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center p-4 relative"
        tabIndex={0} // Make container focusable
      >
        {gameState === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-blue-900/80 p-8 rounded-xl shadow-xl text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-lg">Loading game...</p>
              <p className="text-blue-200 text-sm mt-2">This may take a few moments</p>
            </div>
          </div>
        )}

        {gameState === "error" && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-red-900/80 p-8 rounded-xl shadow-xl text-center">
              <p className="text-white text-lg">{message}</p>
              <Button onClick={restartGame} className="mt-4 bg-red-600 hover:bg-red-700 text-white">
                Try Again
              </Button>
            </div>
          </div>
        )}

        <div className="absolute top-4 left-0 right-0 text-center z-10">
          <div className="inline-block bg-blue-800/50 backdrop-blur-sm px-6 py-2 rounded-full">
            <span className="font-bold text-white">{message}</span>
          </div>
        </div>

        {/* Game canvas */}
        <canvas
          ref={canvasRef}
          className="w-full max-w-[800px] h-[600px] bg-black rounded-xl shadow-2xl"
          style={{ touchAction: "none" }}
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasClick}
        />

        {gameState === "gameOver" && (
          <div className="mt-6">
            <Button onClick={restartGame} className="bg-blue-600 hover:bg-blue-700 text-white">
              <RefreshCw className="mr-2 h-4 w-4" />
              Play Again
            </Button>
          </div>
        )}

        {/* Mobile controls */}
        {isMobile && gameState === "playing" && (
          <div className="w-full max-w-[800px] mt-4 flex justify-between">
            <div className="flex gap-2">
              <Button className="h-16 w-16 bg-blue-800/50 rounded-full" onTouchStart={moveLeft} onClick={moveLeft}>
                <ChevronLeft size={32} />
              </Button>
              <Button className="h-16 w-16 bg-blue-800/50 rounded-full" onTouchStart={moveRight} onClick={moveRight}>
                <ChevronRight size={32} />
              </Button>
            </div>
            <Button className="h-16 w-16 bg-red-600/50 rounded-full" onTouchStart={shoot} onClick={shoot}>
              Fire
            </Button>
          </div>
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
