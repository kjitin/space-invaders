import Phaser from "phaser"

export class GameOverScene extends Phaser.Scene {
  private score = 0

  constructor() {
    super({ key: "GameOverScene" })
  }

  init(data: { score: number }) {
    console.log("Game over scene initialized with score:", data.score)
    this.score = data.score || 0
  }

  create() {
    console.log("Creating game over scene")

    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // Create background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)

    // Create game over text
    this.add
      .text(width / 2, height / 2 - 100, "GAME OVER", {
        font: "bold 64px Arial",
        color: "#ff0000",
      })
      .setOrigin(0.5)

    // Create score text
    this.add
      .text(width / 2, height / 2, `SCORE: ${this.score}`, {
        font: "32px Arial",
        color: "#ffffff",
      })
      .setOrigin(0.5)

    // Create restart text
    const restartText = this.add
      .text(width / 2, height / 2 + 100, "Click to restart", {
        font: "24px Arial",
        color: "#00aaff",
      })
      .setOrigin(0.5)

    // Make text interactive
    restartText.setInteractive({ useHandCursor: true })

    // Add hover effect
    restartText.on("pointerover", () => {
      restartText.setScale(1.1)
    })

    restartText.on("pointerout", () => {
      restartText.setScale(1)
    })

    // Add click handler
    restartText.on("pointerdown", () => {
      console.log("Restarting game")
      // Restart the game
      this.scene.start("MainScene")
    })

    // Add some particle effects
    try {
      this.add.particles(0, 0, "particle", {
        speed: { min: 20, max: 50 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 2000,
        blendMode: Phaser.BlendModes.ADD,
        tint: [0xff0000, 0x00aaff],
        frequency: 100,
        quantity: 1,
        emitZone: {
          type: "random",
          source: new Phaser.Geom.Rectangle(0, 0, width, height),
        },
      })
    } catch (error) {
      console.error("Error creating particles:", error)
    }
  }
}
