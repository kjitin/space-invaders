import Phaser from "phaser"
import { GAME_CONFIG } from "../game-config"

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" })
  }

  preload() {
    // Create a loading text to show we're initializing
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    this.add
      .text(width / 2, height / 2, "Loading game...", {
        font: "24px Arial",
        color: "#ffffff",
      })
      .setOrigin(0.5)

    // Load minimal assets needed for the loading screen
    this.load.image("background", "/placeholder.svg?height=600&width=800")

    // Log debug info if in debug mode
    if (GAME_CONFIG.debug) {
      console.log("Boot scene started")
    }
  }

  create() {
    if (GAME_CONFIG.debug) {
      console.log("Boot scene completed, starting preload")
    }
    // Proceed to the preload scene
    this.scene.start("PreloadScene")
  }
}
