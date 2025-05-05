"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PlayGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [birdsLeft, setBirdsLeft] = useState(3)
  const [gameState, setGameState] = useState<"ready" | "aiming" | "flying" | "ended" | "error">("ready")
  const [message, setMessage] = useState("Drag the bird to launch!")

  useEffect(() => {
    // Make sure we're in a browser environment
    if (typeof window === "undefined" || !canvasRef.current) return

    let engine: any, render: any, world: any, mouseConstraint: any
    let bird: any
    let cleanup = () => {}

    // Safely import Matter.js
    const initPhysics = async () => {
      try {
        // Dynamically import Matter.js
        const Matter = await import("matter-js").catch((err) => {
          console.error("Failed to load Matter.js:", err)
          setGameState("error")
          setMessage("Error loading game engine. Please try again.")
          return null
        })

        // Check if Matter loaded correctly
        if (!Matter || !Matter.Engine) {
          console.error("Matter.js did not load correctly")
          setGameState("error")
          setMessage("Error loading game engine. Please try again.")
          return
        }

        const { Engine, Render, World, Bodies, Body, Events, Mouse, MouseConstraint, Vector } = Matter

        // Create engine and world
        engine = Engine.create({
          gravity: { x: 0, y: 1 },
        })
        world = engine.world

        // Get canvas element
        const canvas = canvasRef.current
        if (!canvas) return

        // Create renderer
        render = Render.create({
          canvas: canvas,
          engine: engine,
          options: {
            width: canvas.width,
            height: canvas.height,
            wireframes: false,
            background: "#8CD0FF",
          },
        })

        // Create ground
        const ground = Bodies.rectangle(canvas.width / 2, canvas.height - 20, canvas.width, 40, {
          isStatic: true,
          render: { fillStyle: "#8BC34A" },
        })

        // Create slingshot base
        const slingshotBase = Bodies.rectangle(150, canvas.height - 100, 20, 80, {
          isStatic: true,
          render: { fillStyle: "#795548" },
        })

        // Create bird (initially static)
        bird = Bodies.circle(150, canvas.height - 150, 20, {
          density: 0.004,
          frictionAir: 0.01,
          restitution: 0.3,
          render: { fillStyle: "#FF4D4D" },
        })
        Body.setStatic(bird, true)

        // Create structures and pigs
        const createStructure = () => {
          const blockWidth = 50
          const blockHeight = 50
          const startX = canvas.width - 200
          const startY = canvas.height - 40

          // Create blocks
          const blocks = [
            // Bottom row
            Bodies.rectangle(startX, startY - blockHeight / 2, blockWidth, blockHeight, {
              render: { fillStyle: "#FFCC80" },
            }),
            Bodies.rectangle(startX + blockWidth, startY - blockHeight / 2, blockWidth, blockHeight, {
              render: { fillStyle: "#FFCC80" },
            }),

            // Middle row
            Bodies.rectangle(startX + blockWidth / 2, startY - blockHeight * 1.5, blockWidth, blockHeight, {
              render: { fillStyle: "#FFCC80" },
            }),

            // Top row
            Bodies.rectangle(startX + blockWidth / 2, startY - blockHeight * 2.5, blockWidth, blockHeight, {
              render: { fillStyle: "#FFCC80" },
            }),
          ]

          // Create pig
          const pig = Bodies.circle(startX + blockWidth / 2, startY - blockHeight * 3.5, 20, {
            render: { fillStyle: "#4CAF50" },
            label: "pig",
          })

          return [...blocks, pig]
        }

        const structure = createStructure()

        // Add all bodies to the world
        World.add(world, [ground, slingshotBase, bird, ...structure])

        // Setup mouse control
        const mouse = Mouse.create(render.canvas)
        mouseConstraint = MouseConstraint.create(engine, {
          mouse: mouse,
          constraint: {
            stiffness: 0.2,
            render: {
              visible: false,
            },
          },
        })

        World.add(world, mouseConstraint)
        render.mouse = mouse

        // Variables for slingshot mechanics
        let isDragging = false
        const startPoint = { x: 150, y: canvas.height - 150 }
        let endPoint = { x: 0, y: 0 }
        const maxDistance = 100

        // Event listeners for slingshot mechanics
        Events.on(mouseConstraint, "mousedown", (event: any) => {
          const mousePosition = event.mouse.position
          const distance = Vector.magnitude(
            Vector.sub({ x: bird.position.x, y: bird.position.y }, { x: mousePosition.x, y: mousePosition.y }),
          )

          if (distance < 30 && gameState === "ready") {
            isDragging = true
            setGameState("aiming")
            setMessage("Pull back to aim!")
          }
        })

        Events.on(mouseConstraint, "mousemove", (event: any) => {
          if (isDragging) {
            const mousePosition = event.mouse.position

            // Calculate distance from start point
            const offset = Vector.sub({ x: startPoint.x, y: startPoint.y }, { x: mousePosition.x, y: mousePosition.y })

            // Limit the drag distance
            const distance = Vector.magnitude(offset)
            if (distance > maxDistance) {
              const direction = Vector.normalise(offset)
              offset.x = direction.x * maxDistance
              offset.y = direction.y * maxDistance
            }

            // Update bird position
            Body.setPosition(bird, {
              x: startPoint.x - offset.x,
              y: startPoint.y - offset.y,
            })

            // Store end point for launch calculation
            endPoint = {
              x: bird.position.x,
              y: bird.position.y,
            }
          }
        })

        Events.on(mouseConstraint, "mouseup", () => {
          if (isDragging) {
            isDragging = false

            // Calculate launch velocity
            const launchVector = Vector.mult(
              Vector.normalise(Vector.sub({ x: startPoint.x, y: startPoint.y }, { x: endPoint.x, y: endPoint.y })),
              Vector.magnitude(Vector.sub({ x: startPoint.x, y: startPoint.y }, { x: endPoint.x, y: endPoint.y })) / 2,
            )

            // Make bird dynamic and apply force
            Body.setStatic(bird, false)
            Body.setVelocity(bird, launchVector)

            // Update game state
            setGameState("flying")
            setMessage("Bird launched!")
            setBirdsLeft((prev) => prev - 1)

            // Check for game end after 5 seconds
            setTimeout(() => {
              if (birdsLeft <= 1) {
                checkGameEnd()
              } else {
                resetBird()
              }
            }, 5000)
          }
        })

        // Collision detection for scoring
        Events.on(engine, "collisionStart", (event: any) => {
          const pairs = event.pairs

          for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i]

            // Check if bird hit a pig
            if (
              (pair.bodyA.label === "pig" && pair.bodyB === bird) ||
              (pair.bodyB.label === "pig" && pair.bodyA === bird)
            ) {
              // Remove the pig
              const pig = pair.bodyA.label === "pig" ? pair.bodyA : pair.bodyB
              World.remove(world, pig)

              // Update score
              setScore((prev) => prev + 1000)
              setMessage("Direct hit! +1000 points")

              // Check if all pigs are gone
              const remainingPigs = world.bodies.filter((body: any) => body.label === "pig")
              if (remainingPigs.length === 0) {
                setMessage("You won! All pigs defeated!")
                setTimeout(() => {
                  checkGameEnd()
                }, 2000)
              }
            }
          }
        })

        // Function to reset bird for next shot
        const resetBird = () => {
          World.remove(world, bird)

          const newBird = Bodies.circle(150, canvas.height - 150, 20, {
            density: 0.004,
            frictionAir: 0.01,
            restitution: 0.3,
            render: { fillStyle: "#FF4D4D" },
          })

          Body.setStatic(newBird, true)
          World.add(world, newBird)

          // Update references
          bird = newBird

          setGameState("ready")
          setMessage("Drag the bird to launch!")
        }

        // Function to check if game is over
        const checkGameEnd = () => {
          if (birdsLeft <= 0) {
            setGameState("ended")
            setMessage(score > 0 ? "Game over! You scored " + score + " points!" : "Game over! Try again!")
          }
        }

        // Run the engine
        Engine.run(engine)
        Render.run(render)

        // Setup cleanup function
        cleanup = () => {
          try {
            if (mouseConstraint) Events.off(mouseConstraint)
            if (engine) Events.off(engine)
            if (render && render.canvas) {
              Render.stop(render)
              World.clear(world, false)
              Engine.clear(engine)
              if (render.canvas.parentNode) {
                render.canvas.remove()
              }
              if (render.textures) {
                render.textures = {}
              }
            }
          } catch (err) {
            console.error("Error during cleanup:", err)
          }
        }
      } catch (error) {
        console.error("Error initializing physics:", error)
        setGameState("error")
        setMessage("Error loading game engine. Please try again.")
      }
    }

    // Initialize physics
    initPhysics()

    // Cleanup on component unmount
    return () => {
      cleanup()
    }
  }, [])

  // Function to restart the game
  const restartGame = () => {
    setScore(0)
    setBirdsLeft(3)
    setGameState("ready")
    setMessage("Drag the bird to launch!")
    window.location.reload() // Simple reload to reset the game
  }

  return (
    <div className="min-h-screen bg-[#8CD0FF] flex flex-col">
      {/* Game header */}
      <header className="bg-[#5AB1F7] py-4 px-6 flex items-center justify-between shadow-md">
        <Link href="/" className="flex items-center gap-2 text-white">
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="font-bold text-white">Score: {score}</span>
          </div>
          <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="font-bold text-white">Birds: {birdsLeft}</span>
          </div>
        </div>
      </header>

      {/* Game canvas */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-4 left-0 right-0 text-center">
          <div className="inline-block bg-white/20 backdrop-blur-sm px-6 py-2 rounded-full">
            <span className="font-bold text-white">{message}</span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border-4 border-[#5AB1F7] rounded-xl shadow-xl max-w-full h-auto"
        />

        {(gameState === "ended" || gameState === "error") && (
          <div className="mt-6">
            <Button onClick={restartGame} className="bg-[#FF4D4D] hover:bg-[#E03E3E] text-white">
              <RefreshCw className="mr-2 h-4 w-4" />
              {gameState === "error" ? "Try Again" : "Play Again"}
            </Button>
          </div>
        )}
      </div>

      {/* Game instructions */}
      <div className="bg-[#8BC34A] p-4 text-center text-white">
        <h2 className="font-bold text-xl mb-2">How to Play</h2>
        <p>1. Drag the red bird to pull back the slingshot</p>
        <p>2. Release to launch the bird toward the green pigs</p>
        <p>3. Destroy all pigs to win the level</p>
      </div>
    </div>
  )
}
