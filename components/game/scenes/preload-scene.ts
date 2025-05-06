import Phaser from "phaser"
import { GAME_CONFIG } from "../game-config"

export class PreloadScene extends Phaser.Scene {
  private loadingText!: Phaser.GameObjects.Text
  private progressBar!: Phaser.GameObjects.Rectangle
  private progressBarBg!: Phaser.GameObjects.Rectangle

  constructor() {
    super({ key: "PreloadScene" })
  }

  preload() {
    if (GAME_CONFIG.debug) {
      console.log("Preload scene started")
    }

    // Create loading bar
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // Loading background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000)

    // Progress bar background
    this.progressBarBg = this.add.rectangle(width / 2, height / 2, 400, 30, 0x333333)

    // Progress bar
    this.progressBar = this.add.rectangle(width / 2 - 200, height / 2, 0, 30, 0x00aaff)
    this.progressBar.setOrigin(0, 0.5)

    // Loading text
    this.loadingText = this.add.text(width / 2, height / 2 - 50, "Loading assets...", {
      font: "24px Arial",
      color: "#ffffff",
    })
    this.loadingText.setOrigin(0.5)

    // Update progress bar as assets load
    this.load.on("progress", (value: number) => {
      this.progressBar.width = 400 * value
      this.loadingText.setText(`Loading: ${Math.floor(value * 100)}%`)
    })

    // When loading completes
    this.load.on("complete", () => {
      this.loadingText.setText("Loading complete!")
      if (GAME_CONFIG.debug) {
        console.log("Asset loading complete")
      }
    })

    // Handle loading errors
    this.load.on("loaderror", (file: any) => {
      console.error("Error loading asset:", file.src)
      this.loadingText.setText(`Error loading: ${file.key}`)
      this.loadingText.setColor("#ff0000")
    })

    // Load game assets
    this.loadAssets()
  }

  loadAssets() {
    // Load spritesheets with error handling
    try {
      // Load spritesheets
      this.load.spritesheet("player", "/placeholder.svg?height=40&width=120", {
        frameWidth: 40,
        frameHeight: 40,
      })

      this.load.spritesheet("enemy", "/placeholder.svg?height=30&width=120", {
        frameWidth: 30,
        frameHeight: 30,
      })

      this.load.spritesheet("boss", "/placeholder.svg?height=60&width=180", {
        frameWidth: 60,
        frameHeight: 60,
      })

      this.load.spritesheet("explosion", "/placeholder.svg?height=64&width=320", {
        frameWidth: 64,
        frameHeight: 64,
      })

      // Load images
      this.load.image("laser", "/placeholder.svg?height=16&width=4")
      this.load.image("enemyLaser", "/placeholder.svg?height=16&width=4")
      this.load.image("bossLaser", "/placeholder.svg?height=20&width=8")
      this.load.image("barrier", "/placeholder.svg?height=6&width=6")
      this.load.image("star", "/placeholder.svg?height=2&width=2")
      this.load.image("nebula", "/placeholder.svg?height=200&width=200")

      // Load particle assets
      this.load.image("particle", "/placeholder.svg?height=8&width=8")
    } catch (error) {
      console.error("Error in loadAssets:", error)
      this.loadingText.setText("Error loading game assets")
      this.loadingText.setColor("#ff0000")
    }
  }

  create() {
    if (GAME_CONFIG.debug) {
      console.log("Creating animations")
    }

    try {
      // Create animations
      this.createAnimations()

      if (GAME_CONFIG.debug) {
        console.log("Starting main scene")
      }

      // Start the main scene
      this.scene.start("MainScene")

      // Get callbacks from registry
      const callbacks = this.registry.get("callbacks")
      if (callbacks && callbacks.onGameReady) {
        callbacks.onGameReady()
      }
    } catch (error) {
      console.error("Error in create method:", error)

      // Get callbacks from registry for error reporting
      const callbacks = this.registry.get("callbacks")
      if (callbacks && callbacks.onGameError) {
        callbacks.onGameError("Error initializing game. Please try again.")
      }
    }
  }

  createAnimations() {
    // Player animations
    this.anims.create({
      key: "player-idle",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 0 }),
      frameRate: 10,
      repeat: -1,
    })

    this.anims.create({
      key: "player-thrust",
      frames: this.anims.generateFrameNumbers("player", { start: 1, end: 2 }),
      frameRate: 10,
      repeat: -1,
    })

    // Enemy animations
    this.anims.create({
      key: "enemy-move",
      frames: this.anims.generateFrameNumbers("enemy", { start: 0, end: 1 }),
      frameRate: 2,
      repeat: -1,
    })

    this.anims.create({
      key: "boss-move",
      frames: this.anims.generateFrameNumbers("boss", { start: 0, end: 2 }),
      frameRate: 3,
      repeat: -1,
    })

    // Explosion animation
    this.anims.create({
      key: "explode",
      frames: this.anims.generateFrameNumbers("explosion", { start: 0, end: 4 }),
      frameRate: 15,
      repeat: 0,
      hideOnComplete: true,
    })
  }
}
