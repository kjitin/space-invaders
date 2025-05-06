"use client"

import { useEffect, useRef } from "react"

interface GameOverExplosionProps {
  x: number
  y: number
  onComplete: () => void
}

export function GameOverExplosion({ x, y, onComplete }: GameOverExplosionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to match parent
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    // Convert coordinates to canvas space
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Particles array
    const particles: any[] = []
    const shockwaves: any[] = []
    const debrisCount = 100
    const duration = 120 // frames
    let frame = 0

    // Create initial explosion
    createExplosion()

    // Animation loop
    const animationId = requestAnimationFrame(animate)

    function createExplosion() {
      // Create bright flash
      shockwaves.push({
        x: centerX,
        y: centerY,
        radius: 10,
        maxRadius: Math.min(canvas.width, canvas.height) * 0.8,
        alpha: 1,
        color: "255, 255, 255",
      })

      // Create secondary shockwave
      shockwaves.push({
        x: centerX,
        y: centerY,
        radius: 5,
        maxRadius: Math.min(canvas.width, canvas.height) * 0.6,
        alpha: 0.8,
        color: "255, 200, 50",
        delay: 10,
      })

      // Create debris particles
      for (let i = 0; i < debrisCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 7
        const size = 1 + Math.random() * 4
        const lifetime = 30 + Math.random() * 90

        // Determine particle color
        let color
        const colorRand = Math.random()
        if (colorRand < 0.3) {
          color = "255, 255, 255" // White sparks
        } else if (colorRand < 0.6) {
          color = "255, 200, 50" // Yellow fire
        } else if (colorRand < 0.8) {
          color = "255, 100, 50" // Orange fire
        } else {
          color = "100, 100, 255" // Blue (ship parts)
        }

        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size,
          color,
          lifetime,
          maxLifetime: lifetime,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          deceleration: 0.97 + Math.random() * 0.02,
          // Add gravity
          gravity: 0.05 + Math.random() * 0.05,
          // Add trail
          hasTrail: Math.random() > 0.7,
          // Add secondary explosions
          explodes: Math.random() > 0.9,
          explosionTimer: 20 + Math.random() * 40,
        })
      }
    }

    function createSecondaryExplosion(x: number, y: number) {
      // Create small flash
      shockwaves.push({
        x,
        y,
        radius: 5,
        maxRadius: 40,
        alpha: 0.7,
        color: "255, 200, 50",
      })

      // Create small debris
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 0.5 + Math.random() * 3
        const size = 1 + Math.random() * 2
        const lifetime = 20 + Math.random() * 30

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size,
          color: "255, 150, 50",
          lifetime,
          maxLifetime: lifetime,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
          deceleration: 0.95,
          gravity: 0.03,
        })
      }
    }

    function animate() {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw shockwaves
      for (let i = 0; i < shockwaves.length; i++) {
        const wave = shockwaves[i]

        // Skip if delayed
        if (wave.delay && wave.delay > 0) {
          wave.delay--
          continue
        }

        // Update radius and alpha
        wave.radius += (wave.maxRadius - wave.radius) * 0.1
        wave.alpha *= 0.95

        // Draw shockwave
        const gradient = ctx.createRadialGradient(wave.x, wave.y, 0, wave.x, wave.y, wave.radius)
        gradient.addColorStop(0, `rgba(${wave.color}, 0)`)
        gradient.addColorStop(0.5, `rgba(${wave.color}, ${wave.alpha * 0.5})`)
        gradient.addColorStop(1, `rgba(${wave.color}, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2)
        ctx.fill()

        // Remove if faded
        if (wave.alpha < 0.05) {
          shockwaves.splice(i, 1)
          i--
        }
      }

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Update position
        p.x += p.vx
        p.y += p.vy

        // Apply physics
        p.vx *= p.deceleration
        p.vy *= p.deceleration
        p.vy += p.gravity

        // Update rotation
        if (p.rotation !== undefined) {
          p.rotation += p.rotationSpeed
        }

        // Update lifetime
        p.lifetime--

        // Check for secondary explosions
        if (p.explodes && p.explosionTimer > 0) {
          p.explosionTimer--
          if (p.explosionTimer <= 0) {
            createSecondaryExplosion(p.x, p.y)
          }
        }

        // Draw particle trail
        if (p.hasTrail && p.lifetime > 10) {
          const trailLength = 5
          for (let t = 0; t < trailLength; t++) {
            const trailFactor = t / trailLength
            const trailX = p.x - p.vx * trailFactor * 3
            const trailY = p.y - p.vy * trailFactor * 3
            const trailSize = p.size * (1 - trailFactor)
            const trailAlpha = (p.lifetime / p.maxLifetime) * 0.5 * (1 - trailFactor)

            ctx.fillStyle = `rgba(${p.color}, ${trailAlpha})`
            ctx.beginPath()
            ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        // Draw particle
        const opacity = p.lifetime / p.maxLifetime
        ctx.fillStyle = `rgba(${p.color}, ${opacity})`

        if (p.rotation !== undefined) {
          // Draw as debris
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rotation)

          if (Math.random() > 0.7) {
            // Some debris is rectangular
            ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size)
          } else {
            ctx.beginPath()
            ctx.arc(0, 0, p.size, 0, Math.PI * 2)
            ctx.fill()
          }

          ctx.restore()
        } else {
          // Draw as spark
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }

        // Remove if expired
        if (p.lifetime <= 0) {
          particles.splice(i, 1)
          i--
        }
      }

      // Increment frame counter
      frame++

      // Continue animation or end
      if (frame < duration && (particles.length > 0 || shockwaves.length > 0)) {
        requestAnimationFrame(animate)
      } else {
        onComplete()
      }
    }

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [x, y, onComplete])

  return <canvas ref={canvasRef} className="absolute inset-0 z-30 w-full h-full" style={{ pointerEvents: "none" }} />
}
