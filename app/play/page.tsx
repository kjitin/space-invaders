"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAudio } from "@/components/web-audio-manager"
import { AudioControls } from "@/components/audio-controls"

export default function SpaceInvadersGame() {
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
  const backgroundStarsRef = useRef<any[]>([])
  const nebulaRef = useRef<any[]>([])
  const screenShakeRef = useRef({ active: false, intensity: 0, duration: 0, startTime: 0 })
  const powerUpsRef = useRef<any[]>([])

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

    // Initialize background stars
    const initBackgroundStars = () => {
      backgroundStarsRef.current = []

      // Create different types of stars
      // Small distant stars (many)
      for (let i = 0; i < 200; i++) {
        backgroundStarsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 0.5 + Math.random() * 1,
          brightness: 0.3 + Math.random() * 0.7,
          color: `rgba(255, 255, ${155 + Math.floor(Math.random() * 100)}, ${0.3 + Math.random() * 0.7})`,
          twinkleSpeed: 0.001 + Math.random() * 0.005,
          twinklePhase: Math.random() * Math.PI * 2,
          parallaxFactor: 0.05 + Math.random() * 0.1, // How much they move relative to ship
        })
      }

      // Medium stars (fewer)
      for (let i = 0; i < 50; i++) {
        backgroundStarsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 1.5 + Math.random() * 1,
          brightness: 0.5 + Math.random() * 0.5,
          color: `rgba(${200 + Math.floor(Math.random() * 55)}, ${200 + Math.floor(Math.random() * 55)}, 255, ${0.5 + Math.random() * 0.5})`,
          twinkleSpeed: 0.003 + Math.random() * 0.007,
          twinklePhase: Math.random() * Math.PI * 2,
          parallaxFactor: 0.15 + Math.random() * 0.2,
        })
      }

      // Bright stars (few)
      for (let i = 0; i < 15; i++) {
        backgroundStarsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 2 + Math.random() * 2,
          brightness: 0.7 + Math.random() * 0.3,
          color: `rgba(${220 + Math.floor(Math.random() * 35)}, ${220 + Math.floor(Math.random() * 35)}, 255, ${0.7 + Math.random() * 0.3})`,
          twinkleSpeed: 0.005 + Math.random() * 0.01,
          twinklePhase: Math.random() * Math.PI * 2,
          parallaxFactor: 0.25 + Math.random() * 0.3,
          hasSparks: Math.random() > 0.7, // Some stars have sparks
        })
      }
    }

    // Initialize nebulae
    const initNebulae = () => {
      nebulaRef.current = []

      // Create different colored nebulae
      const colors = [
        { r: 30, g: 50, b: 150 }, // Blue
        { r: 150, g: 30, b: 100 }, // Purple
        { r: 150, g: 50, b: 30 }, // Orange
        { r: 30, g: 100, b: 50 }, // Green
      ]

      // Add 3-5 nebulae
      const nebulaCount = 3 + Math.floor(Math.random() * 3)

      for (let i = 0; i < nebulaCount; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)]
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        const size = 100 + Math.random() * 200

        nebulaRef.current.push({
          x,
          y,
          size,
          color: `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`,
          parallaxFactor: 0.02 + Math.random() * 0.05,
          pulseSpeed: 0.0005 + Math.random() * 0.001,
          pulsePhase: Math.random() * Math.PI * 2,
        })
      }
    }

    // Game objects
    const player = {
      x: canvas.width / 2,
      y: canvas.height - 50,
      width: 40,
      height: 20,
      speed: 5,
      color: "#00AAFF",
      thrusterAnimation: 0,
      shieldActive: false,
      shieldStrength: 0,
      shieldColor: "rgba(0, 150, 255, 0.5)",
      weaponType: "standard", // standard, double, laser
      weaponPower: 1,
      invulnerable: false,
      invulnerableTimer: 0,
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

          // Base enemy colors with gradients
          let enemyColors = {
            primary: row === 0 ? "#FF5555" : row === 1 ? "#55FF55" : "#FFFF55",
            secondary: row === 0 ? "#AA0000" : row === 1 ? "#00AA00" : "#AAAA00",
            highlight: row === 0 ? "#FFAAAA" : row === 1 ? "#AAFFAA" : "#FFFFAA",
            glow: row === 0 ? "rgba(255, 0, 0, 0.3)" : row === 1 ? "rgba(0, 255, 0, 0.3)" : "rgba(255, 255, 0, 0.3)",
          }

          let enemyPoints = (rows - row) * 100
          let enemySize = { width: enemyWidth, height: enemyHeight }
          let enemyHealth = 1
          let enemyAnimation = {
            speed: 0.05,
            phase: Math.random() * Math.PI * 2,
            amplitude: 2,
          }

          // Special enemy types
          if (isBoss) {
            enemyColors = {
              primary: "#FF00FF", // Magenta for boss
              secondary: "#AA00AA",
              highlight: "#FFAAFF",
              glow: "rgba(255, 0, 255, 0.5)",
            }
            enemyPoints = 2000
            enemySize = { width: enemyWidth * 2, height: enemyHeight * 2 }
            enemyHealth = 5
            enemyAnimation = {
              speed: 0.1,
              phase: Math.random() * Math.PI * 2,
              amplitude: 4,
            }
          } else if (isSpecial) {
            enemyColors = {
              primary: "#00FFFF", // Cyan for special
              secondary: "#00AAAA",
              highlight: "#AAFFFF",
              glow: "rgba(0, 255, 255, 0.4)",
            }
            enemyPoints = 500
            enemyHealth = 2
            enemyAnimation = {
              speed: 0.08,
              phase: Math.random() * Math.PI * 2,
              amplitude: 3,
            }
          }

          const enemy = {
            x: startX + col * (enemyWidth + padding),
            y: startY + row * (enemyHeight + padding),
            width: enemySize.width,
            height: enemySize.height,
            speed: (1 + level * 0.2) * difficultyRef.current,
            direction: 1,
            colors: enemyColors,
            points: enemyPoints,
            health: enemyHealth,
            maxHealth: enemyHealth,
            isBoss,
            isSpecial,
            shootChance: isBoss ? 0.02 : isSpecial ? 0.01 : 0.005, // Boss and special enemies shoot more often
            lastShot: 0,
            shotCooldown: isBoss ? 1000 : isSpecial ? 1500 : 2000,
            animation: enemyAnimation,
            animationOffset: Math.random() * Math.PI * 2, // Random starting phase
            dropChance: isBoss ? 0.8 : isSpecial ? 0.3 : 0.1, // Chance to drop power-up
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
          colors: {
            healthy: "#00FF00",
            damaged: "#AAFF00",
            critical: "#FFAA00",
          },
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
              maxHealth: maxHealth,
              // Add slight variation to each block
              colorOffset: Math.random() * 0.2 - 0.1, // -0.1 to 0.1
            }

            barrier.blocks.push(block)
          }
        }

        barriers.push(barrier)
      }

      return barriers
    }

    // Initialize stars and nebulae
    initBackgroundStars()
    initNebulae()

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
      lastPowerUpSpawn: 0,
      powerUpSpawnInterval: 10000, // 10 seconds between random power-ups
      powerUpChance: 0.3, // 30% chance each interval
    }
    gameRef.current = game

    // Draw functions
    const drawPlayer = () => {
      if (!ctx) return

      // Apply screen shake if active
      if (screenShakeRef.current.active) {
        const elapsed = Date.now() - screenShakeRef.current.startTime
        if (elapsed < screenShakeRef.current.duration) {
          const intensity = screenShakeRef.current.intensity * (1 - elapsed / screenShakeRef.current.duration)
          ctx.save()
          ctx.translate((Math.random() * 2 - 1) * intensity, (Math.random() * 2 - 1) * intensity)
        } else {
          screenShakeRef.current.active = false
        }
      }

      // Draw thruster animation
      const thrusterHeight = 10 + Math.sin(Date.now() / 100) * 5
      ctx.fillStyle = "#FF7700"
      ctx.beginPath()
      ctx.moveTo(player.x - 10, player.y + player.height / 2)
      ctx.lineTo(player.x, player.y + player.height / 2 + thrusterHeight)
      ctx.lineTo(player.x + 10, player.y + player.height / 2)
      ctx.closePath()
      ctx.fill()

      // Draw thruster glow
      const thrusterGradient = ctx.createRadialGradient(
        player.x,
        player.y + player.height / 2 + 5,
        0,
        player.x,
        player.y + player.height / 2 + 5,
        15,
      )
      thrusterGradient.addColorStop(0, "rgba(255, 150, 50, 0.5)")
      thrusterGradient.addColorStop(1, "rgba(255, 100, 0, 0)")
      ctx.fillStyle = thrusterGradient
      ctx.beginPath()
      ctx.arc(player.x, player.y + player.height / 2 + 5, 15, 0, Math.PI * 2)
      ctx.fill()

      // Draw ship body with gradient
      const shipGradient = ctx.createLinearGradient(
        player.x - player.width / 2,
        player.y,
        player.x + player.width / 2,
        player.y,
      )
      shipGradient.addColorStop(0, "#0088CC")
      shipGradient.addColorStop(0.5, "#00AAFF")
      shipGradient.addColorStop(1, "#0088CC")

      ctx.fillStyle = shipGradient

      // Draw ship body (more detailed)
      ctx.beginPath()
      ctx.moveTo(player.x, player.y - player.height / 2 - 5) // Nose
      ctx.lineTo(player.x + player.width / 2, player.y) // Right side
      ctx.lineTo(player.x + player.width / 2 - 5, player.y + player.height / 2) // Right back corner
      ctx.lineTo(player.x - player.width / 2 + 5, player.y + player.height / 2) // Left back corner
      ctx.lineTo(player.x - player.width / 2, player.y) // Left side
      ctx.closePath()
      ctx.fill()

      // Draw cockpit with gradient
      const cockpitGradient = ctx.createRadialGradient(player.x, player.y - 5, 0, player.x, player.y - 5, 10)
      cockpitGradient.addColorStop(0, "#AADDFF")
      cockpitGradient.addColorStop(0.7, "#88BBFF")
      cockpitGradient.addColorStop(1, "#0088CC")

      ctx.fillStyle = cockpitGradient
      ctx.beginPath()
      ctx.arc(player.x, player.y - 5, 8, 0, Math.PI * 2)
      ctx.fill()

      // Draw wings with gradient
      const wingGradient = ctx.createLinearGradient(
        player.x - player.width / 2 - 10,
        player.y,
        player.x + player.width / 2 + 10,
        player.y,
      )
      wingGradient.addColorStop(0, "#0066AA")
      wingGradient.addColorStop(0.5, "#0088CC")
      wingGradient.addColorStop(1, "#0066AA")

      ctx.fillStyle = wingGradient

      // Left wing
      ctx.beginPath()
      ctx.moveTo(player.x - player.width / 2, player.y)
      ctx.lineTo(player.x - player.width / 2 - 15, player.y + 10)
      ctx.lineTo(player.x - player.width / 2 - 5, player.y + 10)
      ctx.lineTo(player.x - player.width / 2 + 5, player.y)
      ctx.closePath()
      ctx.fill()

      // Right wing
      ctx.beginPath()
      ctx.moveTo(player.x + player.width / 2, player.y)
      ctx.lineTo(player.x + player.width / 2 + 15, player.y + 10)
      ctx.lineTo(player.x + player.width / 2 + 5, player.y + 10)
      ctx.lineTo(player.x + player.width / 2 - 5, player.y)
      ctx.closePath()
      ctx.fill()

      // Draw engine lights
      ctx.fillStyle = "#FFAA00"
      ctx.beginPath()
      ctx.arc(player.x - 10, player.y + player.height / 2 - 2, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(player.x + 10, player.y + player.height / 2 - 2, 2, 0, Math.PI * 2)
      ctx.fill()

      // Draw ship glow
      const shipGlow = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, player.width)
      shipGlow.addColorStop(0, "rgba(0, 150, 255, 0)")
      shipGlow.addColorStop(0.7, "rgba(0, 150, 255, 0.1)")
      shipGlow.addColorStop(1, "rgba(0, 150, 255, 0)")

      ctx.fillStyle = shipGlow
      ctx.beginPath()
      ctx.arc(player.x, player.y, player.width, 0, Math.PI * 2)
      ctx.fill()

      // Draw shield if active
      if (player.shieldActive && player.shieldStrength > 0) {
        const shieldOpacity = 0.2 + (Math.sin(Date.now() / 200) + 1) * 0.15 // Pulsing effect
        const shieldGradient = ctx.createRadialGradient(
          player.x,
          player.y,
          player.width / 2,
          player.x,
          player.y,
          player.width + 15,
        )
        shieldGradient.addColorStop(0, `rgba(0, 150, 255, ${shieldOpacity * 0.5})`)
        shieldGradient.addColorStop(0.7, `rgba(100, 200, 255, ${shieldOpacity})`)
        shieldGradient.addColorStop(1, "rgba(150, 220, 255, 0)")

        ctx.fillStyle = shieldGradient
        ctx.beginPath()
        ctx.arc(player.x, player.y, player.width + 15, 0, Math.PI * 2)
        ctx.fill()

        // Shield border
        ctx.strokeStyle = `rgba(100, 200, 255, ${shieldOpacity + 0.2})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(player.x, player.y, player.width + 15, 0, Math.PI * 2)
        ctx.stroke()

        // Shield strength indicator
        const shieldPercentage = player.shieldStrength / 100
        ctx.fillStyle = `rgba(255, 255, 255, ${shieldOpacity + 0.3})`
        ctx.font = "10px Arial"
        ctx.textAlign = "center"
        ctx.fillText(`${Math.floor(player.shieldStrength)}%`, player.x, player.y - player.height - 15)
      }

      // Draw invulnerability effect
      if (player.invulnerable) {
        const flickerRate = 100 // ms
        if (Math.floor(Date.now() / flickerRate) % 2 === 0) {
          ctx.globalAlpha = 0.7

          // Draw invulnerability aura
          const invulnerabilityGradient = ctx.createRadialGradient(
            player.x,
            player.y,
            0,
            player.x,
            player.y,
            player.width + 10,
          )
          invulnerabilityGradient.addColorStop(0, "rgba(255, 255, 255, 0.1)")
          invulnerabilityGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.3)")
          invulnerabilityGradient.addColorStop(1, "rgba(255, 255, 255, 0)")

          ctx.fillStyle = invulnerabilityGradient
          ctx.beginPath()
          ctx.arc(player.x, player.y, player.width + 10, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1.0
      }

      // Reset transform if screen shake was applied
      if (screenShakeRef.current.active) {
        ctx.restore()
      }
    }

    const drawEnemies = () => {
      if (!ctx) return

      enemiesRef.current.forEach((enemy) => {
        // Animation offset based on time
        const animOffset =
          Math.sin((Date.now() / 1000) * enemy.animation.speed + enemy.animationOffset) * enemy.animation.amplitude

        // Apply screen shake if active
        if (screenShakeRef.current.active) {
          const elapsed = Date.now() - screenShakeRef.current.startTime
          if (elapsed < screenShakeRef.current.duration) {
            const intensity = screenShakeRef.current.intensity * (1 - elapsed / screenShakeRef.current.duration)
            ctx.save()
            ctx.translate((Math.random() * 2 - 1) * intensity, (Math.random() * 2 - 1) * intensity)
          } else {
            screenShakeRef.current.active = false
          }
        }

        // Draw different shapes for different enemy types
        if (enemy.isBoss) {
          // Draw boss enemy glow
          const bossGlow = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.width + 10)
          bossGlow.addColorStop(0, enemy.colors.glow)
          bossGlow.addColorStop(1, "rgba(0, 0, 0, 0)")

          ctx.fillStyle = bossGlow
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y, enemy.width + 10, 0, Math.PI * 2)
          ctx.fill()

          // Draw boss body with gradient
          const bossGradient = ctx.createLinearGradient(
            enemy.x - enemy.width / 2,
            enemy.y,
            enemy.x + enemy.width / 2,
            enemy.y,
          )
          bossGradient.addColorStop(0, enemy.colors.secondary)
          bossGradient.addColorStop(0.5, enemy.colors.primary)
          bossGradient.addColorStop(1, enemy.colors.secondary)

          ctx.fillStyle = bossGradient

          // Draw boss body (more detailed)
          ctx.beginPath()
          ctx.moveTo(enemy.x, enemy.y - enemy.height / 2) // Top
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - enemy.height / 4) // Upper right
          ctx.lineTo(enemy.x + enemy.width / 2 + 10, enemy.y) // Right point
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height / 4) // Lower right
          ctx.lineTo(enemy.x, enemy.y + enemy.height / 2) // Bottom
          ctx.lineTo(enemy.x - enemy.width / 2, enemy.y + enemy.height / 4) // Lower left
          ctx.lineTo(enemy.x - enemy.width / 2 - 10, enemy.y) // Left point
          ctx.lineTo(enemy.x - enemy.width / 2, enemy.y - enemy.height / 4) // Upper left
          ctx.closePath()
          ctx.fill()

          // Draw boss details
          ctx.fillStyle = enemy.colors.highlight
          ctx.beginPath()
          ctx.arc(enemy.x - enemy.width / 4, enemy.y - enemy.height / 4 + animOffset, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(enemy.x + enemy.width / 4, enemy.y - enemy.height / 4 + animOffset, 5, 0, Math.PI * 2)
          ctx.fill()

          // Draw central "eye"
          const eyeGradient = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, 10)
          eyeGradient.addColorStop(0, "#FFFFFF")
          eyeGradient.addColorStop(0.5, enemy.colors.primary)
          eyeGradient.addColorStop(1, enemy.colors.secondary)

          ctx.fillStyle = eyeGradient
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y, 10, 0, Math.PI * 2)
          ctx.fill()

          // Draw health bar
          const healthBarWidth = enemy.width
          const healthBarHeight = 5
          const healthPercentage = enemy.health / enemy.maxHealth

          ctx.fillStyle = "#FF0000"
          ctx.fillRect(enemy.x - healthBarWidth / 2, enemy.y - enemy.height / 2 - 10, healthBarWidth, healthBarHeight)

          const healthGradient = ctx.createLinearGradient(
            enemy.x - healthBarWidth / 2,
            enemy.y - enemy.height / 2 - 10,
            enemy.x - healthBarWidth / 2 + healthBarWidth * healthPercentage,
            enemy.y - enemy.height / 2 - 10,
          )
          healthGradient.addColorStop(0, "#00FF00")
          healthGradient.addColorStop(1, "#AAFFAA")

          ctx.fillStyle = healthGradient
          ctx.fillRect(
            enemy.x - healthBarWidth / 2,
            enemy.y - enemy.height / 2 - 10,
            healthBarWidth * healthPercentage,
            healthBarHeight,
          )
        } else if (enemy.isSpecial) {
          // Draw special enemy glow
          const specialGlow = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.width + 5)
          specialGlow.addColorStop(0, enemy.colors.glow)
          specialGlow.addColorStop(1, "rgba(0, 0, 0, 0)")

          ctx.fillStyle = specialGlow
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y, enemy.width + 5, 0, Math.PI * 2)
          ctx.fill()

          // Draw special enemy (with a different shape)
          const specialGradient = ctx.createLinearGradient(
            enemy.x,
            enemy.y - enemy.height / 2,
            enemy.x,
            enemy.y + enemy.height / 2,
          )
          specialGradient.addColorStop(0, enemy.colors.primary)
          specialGradient.addColorStop(1, enemy.colors.secondary)

          ctx.fillStyle = specialGradient

          ctx.beginPath()
          ctx.moveTo(enemy.x, enemy.y - enemy.height / 2 - 5 + animOffset) // Top point
          ctx.lineTo(enemy.x + enemy.width / 2 + 5, enemy.y + enemy.height / 2) // Bottom right
          ctx.lineTo(enemy.x - enemy.width / 2 - 5, enemy.y + enemy.height / 2) // Bottom left
          ctx.closePath()
          ctx.fill()

          // Draw special enemy details
          ctx.fillStyle = enemy.colors.highlight
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y - enemy.height / 4 + animOffset, 5, 0, Math.PI * 2)
          ctx.fill()

          // Draw pulsing effect
          const pulseSize = 3 + Math.sin(Date.now() / 300) * 2
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y - enemy.height / 4 + animOffset, pulseSize, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Draw regular enemy glow
          const enemyGlow = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.width)
          enemyGlow.addColorStop(0, enemy.colors.glow)
          enemyGlow.addColorStop(1, "rgba(0, 0, 0, 0)")

          ctx.fillStyle = enemyGlow
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y, enemy.width, 0, Math.PI * 2)
          ctx.fill()

          // Draw regular enemy with gradient
          const enemyGradient = ctx.createLinearGradient(
            enemy.x - enemy.width / 2,
            enemy.y,
            enemy.x + enemy.width / 2,
            enemy.y,
          )
          enemyGradient.addColorStop(0, enemy.colors.secondary)
          enemyGradient.addColorStop(0.5, enemy.colors.primary)
          enemyGradient.addColorStop(1, enemy.colors.secondary)

          ctx.fillStyle = enemyGradient

          // Draw enemy body
          ctx.beginPath()
          ctx.moveTo(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2 + animOffset) // Top left
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - enemy.height / 2 + animOffset) // Top right
          ctx.lineTo(enemy.x + enemy.width / 2 + 5, enemy.y) // Right point
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2) // Bottom right
          ctx.lineTo(enemy.x - enemy.width / 2, enemy.y + enemy.height / 2) // Bottom left
          ctx.lineTo(enemy.x - enemy.width / 2 - 5, enemy.y) // Left point
          ctx.closePath()
          ctx.fill()

          // Draw top part
          ctx.fillStyle = enemy.colors.highlight
          ctx.beginPath()
          ctx.arc(enemy.x, enemy.y - enemy.height / 2 - 3 + animOffset, 5, 0, Math.PI * 2)
          ctx.fill()

          // Draw "eyes"
          ctx.fillStyle = "#000000"
          ctx.beginPath()
          ctx.arc(enemy.x - enemy.width / 4, enemy.y - enemy.height / 6 + animOffset, 2, 0, Math.PI * 2)
          ctx.arc(enemy.x + enemy.width / 4, enemy.y - enemy.height / 6 + animOffset, 2, 0, Math.PI * 2)
          ctx.fill()
        }

        // Reset transform if screen shake was applied
        if (screenShakeRef.current.active) {
          ctx.restore()
        }
      })
    }

    const drawBarriers = () => {
      if (!ctx) return

      barriersRef.current.forEach((barrier) => {
        barrier.blocks.forEach((block) => {
          // Color based on health with gradient
          let blockColor
          let glowColor

          if (block.health === block.maxHealth) {
            // Healthy
            const greenValue = 255 * (1 + block.colorOffset)
            blockColor = `rgb(0, ${Math.min(255, greenValue)}, 0)`
            glowColor = "rgba(0, 255, 0, 0.2)"
          } else if (block.health === block.maxHealth - 1) {
            // Damaged
            const greenValue = 255 * (1 + block.colorOffset)
            const redValue = 170 * (1 + block.colorOffset)
            blockColor = `rgb(${Math.min(255, redValue)}, ${Math.min(255, greenValue)}, 0)`
            glowColor = "rgba(170, 255, 0, 0.2)"
          } else {
            // Critical
            const redValue = 255 * (1 + block.colorOffset)
            const greenValue = 170 * (1 + block.colorOffset)
            blockColor = `rgb(${Math.min(255, redValue)}, ${Math.min(255, greenValue)}, 0)`
            glowColor = "rgba(255, 170, 0, 0.2)"
          }

          // Draw block glow
          ctx.fillStyle = glowColor
          ctx.fillRect(block.x - 1, block.y - 1, block.width + 2, block.height + 2)

          // Draw block with gradient
          const blockGradient = ctx.createLinearGradient(
            block.x,
            block.y,
            block.x + block.width,
            block.y + block.height,
          )
          blockGradient.addColorStop(0, blockColor)
          blockGradient.addColorStop(1, shadeColor(blockColor, -20)) // Darker shade

          ctx.fillStyle = blockGradient
          ctx.fillRect(block.x, block.y, block.width, block.height)

          // Add highlight to top-left edge
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
          ctx.fillRect(block.x, block.y, block.width / 2, 1)
          ctx.fillRect(block.x, block.y, 1, block.height / 2)
        })
      })
    }

    // Helper function to shade colors
    const shadeColor = (color: string, percent: number) => {
      let R = Number.parseInt(color.substring(4, color.indexOf(",")), 10)
      let G = Number.parseInt(color.substring(color.indexOf(",") + 1, color.lastIndexOf(",")), 10)
      let B = Number.parseInt(color.substring(color.lastIndexOf(",") + 1, color.lastIndexOf(")")), 10)

      R = Math.min(255, Math.max(0, R + percent))
      G = Math.min(255, Math.max(0, G + percent))
      B = Math.min(255, Math.max(0, B + percent))

      return `rgb(${R}, ${G}, ${B})`
    }

    const drawProjectiles = () => {
      if (!ctx) return

      projectilesRef.current.forEach((projectile) => {
        // Apply screen shake if active
        if (screenShakeRef.current.active) {
          ctx.save()
          const elapsed = Date.now() - screenShakeRef.current.startTime
          if (elapsed < screenShakeRef.current.duration) {
            const intensity = screenShakeRef.current.intensity * (1 - elapsed / screenShakeRef.current.duration)
            ctx.translate((Math.random() * 2 - 1) * intensity, (Math.random() * 2 - 1) * intensity)
          } else {
            screenShakeRef.current.active = false
          }
        }

        // Draw player projectiles based on weapon type
        if (projectile.type === "laser") {
          // Draw laser beam
          const beamGradient = ctx.createLinearGradient(
            projectile.x,
            projectile.y - 20,
            projectile.x,
            projectile.y + 20,
          )
          beamGradient.addColorStop(0, "rgba(0, 255, 255, 0)")
          beamGradient.addColorStop(0.2, "rgba(0, 255, 255, 0.5)")
          beamGradient.addColorStop(0.5, "rgba(0, 255, 255, 1)")
          beamGradient.addColorStop(0.8, "rgba(0, 255, 255, 0.5)")
          beamGradient.addColorStop(1, "rgba(0, 255, 255, 0)")

          ctx.fillStyle = beamGradient
          ctx.fillRect(projectile.x - 3, projectile.y - 20, 6, 40)

          // Draw laser core
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(projectile.x - 1, projectile.y - 20, 2, 40)

          // Draw laser glow
          const glowGradient = ctx.createRadialGradient(projectile.x, projectile.y, 0, projectile.x, projectile.y, 10)
          glowGradient.addColorStop(0, "rgba(0, 255, 255, 0.7)")
          glowGradient.addColorStop(1, "rgba(0, 255, 255, 0)")

          ctx.fillStyle = glowGradient
          ctx.beginPath()
          ctx.arc(projectile.x, projectile.y, 10, 0, Math.PI * 2)
          ctx.fill()
        } else if (projectile.enhanced) {
          // Draw enhanced projectile (for higher levels)
          const enhancedGradient = ctx.createLinearGradient(
            projectile.x,
            projectile.y - 10,
            projectile.x,
            projectile.y + 10,
          )
          enhancedGradient.addColorStop(0, "#FFFF00")
          enhancedGradient.addColorStop(0.5, "#FFFFFF")
          enhancedGradient.addColorStop(1, "#FFFF00")

          ctx.fillStyle = enhancedGradient
          ctx.fillRect(projectile.x - 3, projectile.y - 10, 6, 20)

          // Add glow effect
          const gradient = ctx.createRadialGradient(projectile.x, projectile.y, 0, projectile.x, projectile.y, 10)
          gradient.addColorStop(0, "rgba(255, 255, 0, 0.7)")
          gradient.addColorStop(1, "rgba(255, 255, 0, 0)")
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(projectile.x, projectile.y, 10, 0, Math.PI * 2)
          ctx.fill()

          // Add particle trail
          for (let i = 0; i < 2; i++) {
            const trailParticle = {
              x: projectile.x + (Math.random() * 6 - 3),
              y: projectile.y + Math.random() * 10,
              size: 1 + Math.random() * 2,
              color: `rgba(255, 255, ${Math.floor(Math.random() * 100) + 100}, ${Math.random() * 0.5 + 0.2})`,
              vx: (Math.random() * 2 - 1) * 0.5,
              vy: Math.random() * 2 + 1,
              lifetime: 20 + Math.random() * 10,
              maxLifetime: 30,
            }
            explosionParticlesRef.current.push(trailParticle)
          }
        } else {
          // Draw regular projectile with gradient
          const projectileGradient = ctx.createLinearGradient(
            projectile.x,
            projectile.y - 8,
            projectile.x,
            projectile.y + 8,
          )
          projectileGradient.addColorStop(0, "#00FFFF")
          projectileGradient.addColorStop(0.5, "#FFFFFF")
          projectileGradient.addColorStop(1, "#00FFFF")

          ctx.fillStyle = projectileGradient
          ctx.fillRect(projectile.x - 2, projectile.y - 8, 4, 16)

          // Add glow
          const glowGradient = ctx.createRadialGradient(projectile.x, projectile.y, 0, projectile.x, projectile.y, 6)
          glowGradient.addColorStop(0, "rgba(0, 255, 255, 0.5)")
          glowGradient.addColorStop(1, "rgba(0, 255, 255, 0)")

          ctx.fillStyle = glowGradient
          ctx.beginPath()
          ctx.arc(projectile.x, projectile.y, 6, 0, Math.PI * 2)
          ctx.fill()
        }

        // Reset transform if screen shake was applied
        if (screenShakeRef.current.active) {
          ctx.restore()
        }
      })

      enemyProjectilesRef.current.forEach((projectile) => {
        // Apply screen shake if active
        if (screenShakeRef.current.active) {
          ctx.save()
          const elapsed = Date.now() - screenShakeRef.current.startTime
          if (elapsed < screenShakeRef.current.duration) {
            const intensity = screenShakeRef.current.intensity * (1 - elapsed / screenShakeRef.current.duration)
            ctx.translate((Math.random() * 2 - 1) * intensity, (Math.random() * 2 - 1) * intensity)
          } else {
            screenShakeRef.current.active = false
          }
        }

        // Draw different projectiles based on type
        if (projectile.isBoss) {
          // Boss projectile (larger, more threatening)
          const bossProjectileGradient = ctx.createRadialGradient(
            projectile.x,
            projectile.y,
            0,
            projectile.x,
            projectile.y,
            6,
          )
          bossProjectileGradient.addColorStop(0, "#FFFFFF")
          bossProjectileGradient.addColorStop(0.3, "#FF00FF")
          bossProjectileGradient.addColorStop(1, "#AA00AA")

          ctx.fillStyle = bossProjectileGradient
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

          // Add particle trail
          for (let i = 0; i < 2; i++) {
            const trailParticle = {
              x: projectile.x + (Math.random() * 6 - 3),
              y: projectile.y - Math.random() * 10,
              size: 1 + Math.random() * 2,
              color: `rgba(255, ${Math.floor(Math.random() * 100)}, 255, ${Math.random() * 0.5 + 0.2})`,
              vx: (Math.random() * 2 - 1) * 0.5,
              vy: -(Math.random() * 2 + 1),
              lifetime: 20 + Math.random() * 10,
              maxLifetime: 30,
            }
            explosionParticlesRef.current.push(trailParticle)
          }
        } else if (projectile.isSpecial) {
          // Special projectile (zigzag pattern)
          const specialProjectileGradient = ctx.createLinearGradient(
            projectile.x - 5,
            projectile.y,
            projectile.x + 5,
            projectile.y,
          )
          specialProjectileGradient.addColorStop(0, "#00AAAA")
          specialProjectileGradient.addColorStop(0.5, "#00FFFF")
          specialProjectileGradient.addColorStop(1, "#00AAAA")

          ctx.fillStyle = specialProjectileGradient

          ctx.beginPath()
          ctx.moveTo(projectile.x, projectile.y - 8)
          ctx.lineTo(projectile.x + 5, projectile.y)
          ctx.lineTo(projectile.x, projectile.y + 8)
          ctx.lineTo(projectile.x - 5, projectile.y)
          ctx.closePath()
          ctx.fill()

          // Add glow
          const glowGradient = ctx.createRadialGradient(projectile.x, projectile.y, 0, projectile.x, projectile.y, 10)
          glowGradient.addColorStop(0, "rgba(0, 255, 255, 0.5)")
          glowGradient.addColorStop(1, "rgba(0, 255, 255, 0)")

          ctx.fillStyle = glowGradient
          ctx.beginPath()
          ctx.arc(projectile.x, projectile.y, 10, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Regular projectile with gradient
          const regularProjectileGradient = ctx.createLinearGradient(
            projectile.x,
            projectile.y - 8,
            projectile.x,
            projectile.y + 8,
          )
          regularProjectileGradient.addColorStop(0, "#FF0000")
          regularProjectileGradient.addColorStop(0.5, "#FFAAAA")
          regularProjectileGradient.addColorStop(1, "#FF0000")

          ctx.fillStyle = regularProjectileGradient
          ctx.fillRect(projectile.x - 2, projectile.y - 8, 4, 16)

          // Add glow
          const glowGradient = ctx.createRadialGradient(projectile.x, projectile.y, 0, projectile.x, projectile.y, 6)
          glowGradient.addColorStop(0, "rgba(255, 0, 0, 0.5)")
          glowGradient.addColorStop(1, "rgba(255, 0, 0, 0)")

          ctx.fillStyle = glowGradient
          ctx.beginPath()
          ctx.arc(projectile.x, projectile.y, 6, 0, Math.PI * 2)
          ctx.fill()
        }

        // Reset transform if screen shake was applied
        if (screenShakeRef.current.active) {
          ctx.restore()
        }
      })
    }

    const drawPowerUps = () => {
      if (!ctx) return

      powerUpsRef.current.forEach((powerUp) => {
        // Apply screen shake if active
        if (screenShakeRef.current.active) {
          ctx.save()
          const elapsed = Date.now() - screenShakeRef.current.startTime
          if (elapsed < screenShakeRef.current.duration) {
            const intensity = screenShakeRef.current.intensity * (1 - elapsed / screenShakeRef.current.duration)
            ctx.translate((Math.random() * 2 - 1) * intensity, (Math.random() * 2 - 1) * intensity)
          } else {
            screenShakeRef.current.active = false
          }
        }

        // Pulsing animation
        const pulseScale = 1 + Math.sin(Date.now() / 200) * 0.1
        const size = powerUp.size * pulseScale

        // Draw glow
        const glowGradient = ctx.createRadialGradient(powerUp.x, powerUp.y, 0, powerUp.x, powerUp.y, size * 1.5)
        glowGradient.addColorStop(0, powerUp.glowColor)
        glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)")

        ctx.fillStyle = glowGradient
        ctx.beginPath()
        ctx.arc(powerUp.x, powerUp.y, size * 1.5, 0, Math.PI * 2)
        ctx.fill()

        // Draw power-up
        ctx.fillStyle = powerUp.color
        ctx.beginPath()

        if (powerUp.type === "shield") {
          // Shield power-up (circle with shield symbol)
          ctx.arc(powerUp.x, powerUp.y, size, 0, Math.PI * 2)
          ctx.fill()

          // Draw shield symbol
          ctx.strokeStyle = "#FFFFFF"
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(powerUp.x, powerUp.y, size * 0.6, Math.PI * 0.25, Math.PI * 0.75, false)
          ctx.stroke()
        } else if (powerUp.type === "weapon") {
          // Weapon power-up (star shape)
          const spikes = 5
          const outerRadius = size
          const innerRadius = size * 0.4

          ctx.beginPath()
          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius
            const angle = (Math.PI * 2 * i) / (spikes * 2)
            const x = powerUp.x + radius * Math.cos(angle)
            const y = powerUp.y + radius * Math.sin(angle)

            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }
          ctx.closePath()
          ctx.fill()

          // Draw weapon symbol
          ctx.fillStyle = "#FFFFFF"
          ctx.beginPath()
          ctx.arc(powerUp.x, powerUp.y, size * 0.3, 0, Math.PI * 2)
          ctx.fill()
        } else if (powerUp.type === "life") {
          // Life power-up (heart shape)
          const heartSize = size * 0.8

          ctx.beginPath()
          ctx.moveTo(powerUp.x, powerUp.y + heartSize * 0.3)
          ctx.bezierCurveTo(
            powerUp.x,
            powerUp.y,
            powerUp.x - heartSize,
            powerUp.y,
            powerUp.x - heartSize,
            powerUp.y - heartSize * 0.5,
          )
          ctx.bezierCurveTo(
            powerUp.x - heartSize,
            powerUp.y - heartSize,
            powerUp.x,
            powerUp.y - heartSize * 1.2,
            powerUp.x,
            powerUp.y - heartSize * 0.5,
          )
          ctx.bezierCurveTo(
            powerUp.x,
            powerUp.y - heartSize * 1.2,
            powerUp.x + heartSize,
            powerUp.y - heartSize,
            powerUp.x + heartSize,
            powerUp.y - heartSize * 0.5,
          )
          ctx.bezierCurveTo(
            powerUp.x + heartSize,
            powerUp.y,
            powerUp.x,
            powerUp.y,
            powerUp.x,
            powerUp.y + heartSize * 0.3,
          )
          ctx.closePath()
          ctx.fill()
        }

        // Add sparkle effect
        if (Math.random() < 0.1) {
          const sparkleSize = 1 + Math.random() * 2
          const sparkleX = powerUp.x + (Math.random() * size * 2 - size)
          const sparkleY = powerUp.y + (Math.random() * size * 2 - size)

          ctx.fillStyle = "#FFFFFF"
          ctx.beginPath()
          ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2)
          ctx.fill()
        }

        // Reset transform if screen shake was applied
        if (screenShakeRef.current.active) {
          ctx.restore()
        }
      })
    }

    const drawBackground = () => {
      if (!ctx) return

      // Draw space background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      bgGradient.addColorStop(0, "#000022")
      bgGradient.addColorStop(0.5, "#000033")
      bgGradient.addColorStop(1, "#000044")

      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw nebulae
      nebulaRef.current.forEach((nebula) => {
        // Apply parallax effect based on player movement
        let parallaxX = 0
        if (playerRef.current && gameRef.current.active) {
          // Calculate how far the player has moved from center
          const playerOffsetX = playerRef.current.x - canvas.width / 2
          parallaxX = -playerOffsetX * nebula.parallaxFactor
        }

        // Apply pulsing effect
        const pulseScale = 1 + Math.sin(Date.now() * nebula.pulseSpeed + nebula.pulsePhase) * 0.1
        const size = nebula.size * pulseScale

        const nebulaGradient = ctx.createRadialGradient(
          nebula.x + parallaxX,
          nebula.y,
          0,
          nebula.x + parallaxX,
          nebula.y,
          size,
        )
        nebulaGradient.addColorStop(0, nebula.color.replace("0.1", "0.2"))
        nebulaGradient.addColorStop(0.7, nebula.color)
        nebulaGradient.addColorStop(1, "rgba(0, 0, 0, 0)")

        ctx.fillStyle = nebulaGradient
        ctx.beginPath()
        ctx.arc(nebula.x + parallaxX, nebula.y, size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw stars with parallax effect
      backgroundStarsRef.current.forEach((star) => {
        // Apply parallax effect based on player movement
        let parallaxX = 0
        if (playerRef.current && gameRef.current.active) {
          // Calculate how far the player has moved from center
          const playerOffsetX = playerRef.current.x - canvas.width / 2
          parallaxX = -playerOffsetX * star.parallaxFactor
        }

        // Apply twinkle effect
        const twinkle = 0.5 + Math.sin(Date.now() * star.twinkleSpeed + star.twinklePhase) * 0.5
        const brightness = star.brightness * twinkle

        // Draw the star
        ctx.fillStyle = star.color.replace(/\d+\.?\d*\)$/, `${brightness})`)
        ctx.beginPath()
        ctx.arc(star.x + parallaxX, star.y, star.size, 0, Math.PI * 2)
        ctx.fill()

        // Add sparks to bright stars
        if (star.hasSparks && Math.random() < 0.05) {
          const sparkAngle = Math.random() * Math.PI * 2
          const sparkDistance = star.size * 2
          const sparkX = star.x + parallaxX + Math.cos(sparkAngle) * sparkDistance
          const sparkY = star.y + Math.sin(sparkAngle) * sparkDistance
          const sparkSize = 0.5 + Math.random() * 1

          ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
          ctx.beginPath()
          ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    }

    const drawUI = () => {
      if (!ctx) return

      // Draw score and lives with glow effect
      ctx.shadowColor = "rgba(0, 150, 255, 0.7)"
      ctx.shadowBlur = 10
      ctx.fillStyle = "#FFFFFF"
      ctx.font = "bold 20px Arial"
      ctx.fillText(`Score: ${score}`, 20, 30)
      ctx.fillText(`Lives: ${lives}`, 20, 60)
      ctx.fillText(`Level: ${level}`, 20, 90)
      ctx.fillText(`High Score: ${highScore}`, canvas.width - 200, 30)

      // Reset shadow
      ctx.shadowBlur = 0
      ctx.shadowColor = "transparent"

      // Display difficulty indicator at higher levels
      if (level > 3) {
        let difficultyText = ""
        let difficultyColor = ""

        if (level <= 5) {
          difficultyText = "MEDIUM"
          difficultyColor = "#FFFF00" // Yellow
        } else if (level <= 8) {
          difficultyText = "HARD"
          difficultyColor = "#FFAA00" // Orange
        } else if (level <= 12) {
          difficultyText = "EXPERT"
          difficultyColor = "#FF5500" // Dark orange
        } else {
          difficultyText = "INSANE"
          difficultyColor = "#FF0000" // Red
        }

        // Create pulsing effect for difficulty
        const pulseFactor = 1 + Math.sin(Date.now() / 300) * 0.2

        ctx.shadowColor = difficultyColor
        ctx.shadowBlur = 10 * pulseFactor
        ctx.fillStyle = difficultyColor
        ctx.font = `bold ${16 * pulseFactor}px Arial`
        ctx.fillText(`Difficulty: ${difficultyText}`, canvas.width - 200, 60)

        // Reset shadow
        ctx.shadowBlur = 0
        ctx.shadowColor = "transparent"
      }

      // Display weapon type
      if (playerRef.current) {
        let weaponText = ""
        let weaponColor = ""

        switch (playerRef.current.weaponType) {
          case "double":
            weaponText = "DOUBLE SHOT"
            weaponColor = "#FFAA00"
            break
          case "laser":
            weaponText = "LASER BEAM"
            weaponColor = "#00FFFF"
            break
          default:
            weaponText = "STANDARD"
            weaponColor = "#FFFFFF"
        }

        ctx.fillStyle = weaponColor
        ctx.font = "16px Arial"
        ctx.fillText(`Weapon: ${weaponText}`, 20, canvas.height - 20)
      }

      // Display shield status if active
      if (playerRef.current && playerRef.current.shieldActive) {
        const shieldPercentage = playerRef.current.shieldStrength

        // Draw shield bar
        const barWidth = 100
        const barHeight = 10
        const barX = 20
        const barY = canvas.height - 40

        // Background
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
        ctx.fillRect(barX, barY, barWidth, barHeight)

        // Shield level
        const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth * (shieldPercentage / 100), barY)
        gradient.addColorStop(0, "#00AAFF")
        gradient.addColorStop(1, "#00FFFF")

        ctx.fillStyle = gradient
        ctx.fillRect(barX, barY, barWidth * (shieldPercentage / 100), barHeight)

        // Border
        ctx.strokeStyle = "#FFFFFF"
        ctx.lineWidth = 1
        ctx.strokeRect(barX, barY, barWidth, barHeight)

        // Text
        ctx.fillStyle = "#FFFFFF"
        ctx.font = "14px Arial"
        ctx.fillText("Shield", barX + barWidth + 10, barY + barHeight)
      }

      if (gameState === "ready") {
        // Create a semi-transparent overlay
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw title with glow
        ctx.shadowColor = "rgba(0, 150, 255, 0.7)"
        ctx.shadowBlur = 15
        ctx.fillStyle = "#FFFFFF"
        ctx.font = "bold 40px Arial"
        ctx.textAlign = "center"
        ctx.fillText("SPACE INVADERS", canvas.width / 2, canvas.height / 3)

        // Draw start message with pulsing effect
        const pulseFactor = 1 + Math.sin(Date.now() / 300) * 0.2
        ctx.font = `bold ${24 * pulseFactor}px Arial`
        ctx.fillText("Press any key or tap screen to start", canvas.width / 2, canvas.height / 2)

        // Draw controls
        ctx.shadowBlur = 5
        ctx.font = "16px Arial"
        ctx.fillText("Use Arrow Keys or A/D to move", canvas.width / 2, canvas.height / 2 + 50)
        ctx.fillText("Space to shoot", canvas.width / 2, canvas.height / 2 + 80)

        // Reset text alignment and shadow
        ctx.textAlign = "left"
        ctx.shadowBlur = 0
        ctx.shadowColor = "transparent"
      } else if (gameState === "gameOver") {
        // Create a semi-transparent overlay with radial gradient
        const gradient = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          0,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width / 2,
        )
        gradient.addColorStop(0, "rgba(0, 0, 0, 0.8)")
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.9)")

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw game over text with glow
        ctx.shadowColor = "rgba(255, 0, 0, 0.7)"
        ctx.shadowBlur = 15
        ctx.fillStyle = "#FF0000"
        ctx.font = "bold 48px Arial"
        ctx.textAlign = "center"
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40)

        // Draw score
        ctx.shadowColor = "rgba(0, 150, 255, 0.7)"
        ctx.shadowBlur = 10
        ctx.fillStyle = "#FFFFFF"
        ctx.font = "24px Arial"
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20)

        // Draw high score
        if (score >= highScore) {
          ctx.fillStyle = "#FFFF00"
          ctx.fillText("NEW HIGH SCORE!", canvas.width / 2, canvas.height / 2 + 60)
        }

        // Reset text alignment and shadow
        ctx.textAlign = "left"
        ctx.shadowBlur = 0
        ctx.shadowColor = "transparent"
      }

      // Draw debug info if needed
      if (debug) {
        ctx.fillStyle = "#FFFF00"
        ctx.font = "12px Arial"
        ctx.fillText(debug, 20, canvas.height - 40)
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

          // Trigger screen shake
          screenShakeRef.current = {
            active: true,
            intensity: 10,
            duration: 1000,
            startTime: Date.now(),
          }

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

          // Trigger screen shake for level up
          screenShakeRef.current = {
            active: true,
            intensity: 5,
            duration: 500,
            startTime: Date.now(),
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

              // Create small particles for block damage
              for (let p = 0; p < 5; p++) {
                const angle = Math.random() * Math.PI * 2
                const speed = 1 + Math.random() * 2
                const size = 1 + Math.random() * 2
                const lifetime = 10 + Math.random() * 20

                let blockColor
                if (block.health === 2) {
                  blockColor = "rgba(170, 255, 0"
                } else if (block.health === 1) {
                  blockColor = "rgba(255, 170, 0"
                } else {
                  blockColor = "rgba(0, 255, 0"
                }

                explosionParticlesRef.current.push({
                  x: block.x + block.width / 2,
                  y: block.y + block.height / 2,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  size,
                  color: `${blockColor}, ${Math.random() * 0.5 + 0.5})`,
                  lifetime,
                  maxLifetime: lifetime,
                })
              }

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

                  // Trigger screen shake for boss explosion
                  screenShakeRef.current = {
                    active: true,
                    intensity: 8,
                    duration: 800,
                    startTime: Date.now(),
                  }
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
                const baseColor = enemy.colors.primary
                const particleColor = baseColor.replace("#", "rgba(").replace("FF", "").replace("55", "") + ", 255"

                // Add colored particles based on enemy type
                const enemyParticleCount = enemy.isBoss ? 40 : enemy.isSpecial ? 25 : 15
                explosionParticlesRef.current.push(
                  ...createExplosion(enemy.x, enemy.y, particleColor + ")", enemyParticleCount),
                )

                // Add some white sparks
                explosionParticlesRef.current.push(...createExplosion(enemy.x, enemy.y, "rgba(255, 255, 255", 8))
              }

              // Chance to drop power-up
              if (Math.random() < enemy.dropChance) {
                const powerUpType = Math.random() < 0.33 ? "shield" : Math.random() < 0.5 ? "weapon" : "life"

                let powerUpColor, powerUpGlowColor

                switch (powerUpType) {
                  case "shield":
                    powerUpColor = "#00AAFF"
                    powerUpGlowColor = "rgba(0, 170, 255, 0.5)"
                    break
                  case "weapon":
                    powerUpColor = "#FFAA00"
                    powerUpGlowColor = "rgba(255, 170, 0, 0.5)"
                    break
                  case "life":
                    powerUpColor = "#FF5555"
                    powerUpGlowColor = "rgba(255, 85, 85, 0.5)"
                    break
                }

                powerUpsRef.current.push({
                  x: enemy.x,
                  y: enemy.y,
                  type: powerUpType,
                  color: powerUpColor,
                  glowColor: powerUpGlowColor,
                  size: 15,
                  speed: 1 + Math.random() * 0.5,
                })
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

              // Create small hit particles
              for (let p = 0; p < 10; p++) {
                const angle = Math.random() * Math.PI * 2
                const speed = 1 + Math.random() * 2
                const size = 1 + Math.random() * 2
                const lifetime = 10 + Math.random() * 20

                explosionParticlesRef.current.push({
                  x: enemy.x,
                  y: enemy.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  size,
                  color: `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`,
                  lifetime,
                  maxLifetime: lifetime,
                })
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

              // Create small particles for block damage
              for (let p = 0; p < 5; p++) {
                const angle = Math.random() * Math.PI * 2
                const speed = 1 + Math.random() * 2
                const size = 1 + Math.random() * 2
                const lifetime = 10 + Math.random() * 20

                let blockColor
                if (block.health === 2) {
                  blockColor = "rgba(170, 255, 0"
                } else if (block.health === 1) {
                  blockColor = "rgba(255, 170, 0"
                } else {
                  blockColor = "rgba(0, 255, 0"
                }

                explosionParticlesRef.current.push({
                  x: block.x + block.width / 2,
                  y: block.y + block.height / 2,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  size,
                  color: `${blockColor}, ${Math.random() * 0.5 + 0.5})`,
                  lifetime,
                  maxLifetime: lifetime,
                })
              }

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
          // Check if player has shield
          if (player.shieldActive && player.shieldStrength > 0) {
            // Shield absorbs the hit
            player.shieldStrength -= projectile.isBoss ? 20 : 10

            // Create shield impact effect
            for (let p = 0; p < 15; p++) {
              const angle = Math.random() * Math.PI * 2
              const speed = 1 + Math.random() * 3
              const size = 1 + Math.random() * 3
              const lifetime = 20 + Math.random() * 20

              explosionParticlesRef.current.push({
                x: projectile.x,
                y: projectile.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                color: `rgba(100, 200, 255, ${Math.random() * 0.7 + 0.3})`,
                lifetime,
                maxLifetime: lifetime,
              })
            }

            // Deactivate shield if depleted
            if (player.shieldStrength <= 0) {
              player.shieldActive = false
            }
          } else if (player.invulnerable) {
            // Player is invulnerable, just create effect
            for (let p = 0; p < 10; p++) {
              const angle = Math.random() * Math.PI * 2
              const speed = 1 + Math.random() * 2
              const size = 1 + Math.random() * 2
              const lifetime = 10 + Math.random() * 20

              explosionParticlesRef.current.push({
                x: projectile.x,
                y: projectile.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                color: `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`,
                lifetime,
                maxLifetime: lifetime,
              })
            }
          } else {
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

              // Trigger screen shake
              screenShakeRef.current = {
                active: true,
                intensity: 5,
                duration: 300,
                startTime: Date.now(),
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
                // Player still has lives, make temporarily invulnerable
                player.invulnerable = true
                player.invulnerableTimer = 2000 // 2 seconds of invulnerability

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
    }

    // Update power-ups
    const updatePowerUps = () => {
      // Spawn random power-ups occasionally
      const now = Date.now()
      if (
        gameRef.current.active &&
        now - gameRef.current.lastPowerUpSpawn > gameRef.current.powerUpSpawnInterval &&
        Math.random() < gameRef.current.powerUpChance
      ) {
        // Only spawn if there aren't too many already
        if (powerUpsRef.current.length < 3) {
          const powerUpType = Math.random() < 0.33 ? "shield" : Math.random() < 0.5 ? "weapon" : "life"

          let powerUpColor, powerUpGlowColor

          switch (powerUpType) {
            case "shield":
              powerUpColor = "#00AAFF"
              powerUpGlowColor = "rgba(0, 170, 255, 0.5)"
              break
            case "weapon":
              powerUpColor = "#FFAA00"
              powerUpGlowColor = "rgba(255, 170, 0, 0.5)"
              break
            case "life":
              powerUpColor = "#FF5555"
              powerUpGlowColor = "rgba(255, 85, 85, 0.5)"
              break
          }

          // Spawn at a random position at the top of the screen
          powerUpsRef.current.push({
            x: Math.random() * (canvas.width - 100) + 50,
            y: 50,
            type: powerUpType,
            color: powerUpColor,
            glowColor: powerUpGlowColor,
            size: 15,
            speed: 1 + Math.random() * 0.5,
          })

          gameRef.current.lastPowerUpSpawn = now
        }
      }

      // Update existing power-ups
      for (let i = 0; i < powerUpsRef.current.length; i++) {
        const powerUp = powerUpsRef.current[i]

        // Move power-up down
        powerUp.y += powerUp.speed

        // Remove if out of bounds
        if (powerUp.y > canvas.height) {
          powerUpsRef.current.splice(i, 1)
          i--
          continue
        }

        // Check for collision with player
        if (
          playerRef.current &&
          Math.abs(powerUp.x - playerRef.current.x) < playerRef.current.width / 2 + powerUp.size &&
          Math.abs(powerUp.y - playerRef.current.y) < playerRef.current.height / 2 + powerUp.size
        ) {
          // Apply power-up effect
          switch (powerUp.type) {
            case "shield":
              playerRef.current.shieldActive = true
              playerRef.current.shieldStrength = 100
              setMessage("Shield activated!")
              break
            case "weapon":
              // Cycle through weapon types
              if (playerRef.current.weaponType === "standard") {
                playerRef.current.weaponType = "double"
                setMessage("Double shot activated!")
              } else if (playerRef.current.weaponType === "double") {
                playerRef.current.weaponType = "laser"
                setMessage("Laser beam activated!")
              } else {
                // If already at max, increase weapon power
                playerRef.current.weaponPower += 1
                setMessage(`Weapon power increased to ${playerRef.current.weaponPower}!`)
              }
              break
            case "life":
              // Add an extra life
              setLives((prev) => Math.min(prev + 1, 5)) // Cap at 5 lives
              setMessage("Extra life gained!")
              break
          }

          // Create collection effect
          for (let p = 0; p < 20; p++) {
            const angle = Math.random() * Math.PI * 2
            const speed = 1 + Math.random() * 3
            const size = 1 + Math.random() * 3
            const lifetime = 20 + Math.random() * 20

            explosionParticlesRef.current.push({
              x: powerUp.x,
              y: powerUp.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size,
              color: `${powerUp.color.replace("#", "rgba(").replace("FF", "").replace("AA", "")}255, ${Math.random() * 0.7 + 0.3})`,
              lifetime,
              maxLifetime: lifetime,
            })
          }

          // Remove power-up
          powerUpsRef.current.splice(i, 1)
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

        // Add slight gravity to some particles
        if (Math.random() < 0.5) {
          particle.vy += 0.05
        }

        // Slow down particles over time
        particle.vx *= 0.99
        particle.vy *= 0.99

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

    // Update player invulnerability
    const updatePlayerInvulnerability = () => {
      if (playerRef.current && playerRef.current.invulnerable) {
        playerRef.current.invulnerableTimer -= 16 // Approximate for one frame

        if (playerRef.current.invulnerableTimer <= 0) {
          playerRef.current.invulnerable = false
        }
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
      drawBarriers() // Draw barriers
      drawPlayer()
      drawEnemies()
      drawProjectiles()
      drawPowerUps()
      drawUI()

      // Draw explosion particles
      if (explosionParticlesRef.current.length > 0) {
        updateAndDrawExplosionParticles(ctx)
      }

      // Update game state if active
      if (gameRef.current.active) {
        updateEnemies(deltaTime)
        updateProjectiles()
        updatePowerUps()
        updatePlayerInvulnerability()

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
          // Different shooting based on weapon type
          if (player.weaponType === "double") {
            // Double shot - two projectiles side by side
            const leftProjectile = {
              x: player.x - 10,
              y: player.y - player.height / 2,
              speed: 10,
              width: 4,
              height: 16,
              enhanced: level > 5,
              type: "standard",
            }

            const rightProjectile = {
              x: player.x + 10,
              y: player.y - player.height / 2,
              speed: 10,
              width: 4,
              height: 16,
              enhanced: level > 5,
              type: "standard",
            }

            projectilesRef.current.push(leftProjectile, rightProjectile)
          } else if (player.weaponType === "laser") {
            // Laser beam - single powerful projectile
            const laserProjectile = {
              x: player.x,
              y: player.y - player.height / 2 - 20,
              speed: 15,
              width: 6,
              height: 40,
              enhanced: true,
              type: "laser",
            }

            projectilesRef.current.push(laserProjectile)
          } else {
            // Standard shot
            const projectile = {
              x: player.x,
              y: player.y - player.height / 2,
              speed: 10,
              width: 4,
              height: 16,
              enhanced: level > 5,
              type: "standard",
            }

            projectilesRef.current.push(projectile)
          }

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
        // Different shooting based on weapon type
        if (player.weaponType === "double") {
          // Double shot - two projectiles side by side
          const leftProjectile = {
            x: player.x - 10,
            y: player.y - player.height / 2,
            speed: 10,
            width: 4,
            height: 16,
            enhanced: level > 5,
            type: "standard",
          }

          const rightProjectile = {
            x: player.x + 10,
            y: player.y - player.height / 2,
            speed: 10,
            width: 4,
            height: 16,
            enhanced: level > 5,
            type: "standard",
          }

          projectilesRef.current.push(leftProjectile, rightProjectile)
        } else if (player.weaponType === "laser") {
          // Laser beam - single powerful projectile
          const laserProjectile = {
            x: player.x,
            y: player.y - player.height / 2 - 20,
            speed: 15,
            width: 6,
            height: 40,
            enhanced: true,
            type: "laser",
          }

          projectilesRef.current.push(laserProjectile)
        } else {
          // Standard shot
          const projectile = {
            x: player.x,
            y: player.y - player.height / 2,
            speed: 10,
            width: 4,
            height: 16,
            enhanced: level > 5,
            type: "standard",
          }

          projectilesRef.current.push(projectile)
        }

        try {
          playSound("shoot")
        } catch (error) {
          console.error("Error playing shoot sound:", error)
        }
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
      // Different shooting based on weapon type
      if (playerRef.current.weaponType === "double") {
        // Double shot - two projectiles side by side
        const leftProjectile = {
          x: playerRef.current.x - 10,
          y: playerRef.current.y - playerRef.current.height / 2,
          speed: 10,
          width: 4,
          height: 16,
          enhanced: level > 5,
          type: "standard",
        }

        const rightProjectile = {
          x: playerRef.current.x + 10,
          y: playerRef.current.y - playerRef.current.height / 2,
          speed: 10,
          width: 4,
          height: 16,
          enhanced: level > 5,
          type: "standard",
        }

        projectilesRef.current.push(leftProjectile, rightProjectile)
      } else if (playerRef.current.weaponType === "laser") {
        // Laser beam - single powerful projectile
        const laserProjectile = {
          x: playerRef.current.x,
          y: playerRef.current.y - playerRef.current.height / 2 - 20,
          speed: 15,
          width: 6,
          height: 40,
          enhanced: true,
          type: "laser",
        }

        projectilesRef.current.push(laserProjectile)
      } else {
        // Standard shot
        const projectile = {
          x: playerRef.current.x,
          y: playerRef.current.y - playerRef.current.height / 2,
          speed: 10,
          width: 4,
          height: 16,
          enhanced: level > 5,
          type: "standard",
        }

        projectilesRef.current.push(projectile)
      }

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
