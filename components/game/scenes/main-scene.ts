import Phaser from "phaser"

interface MainSceneConfig {
  onGameStart: () => void
  onGameOver: (score: number) => void
  onScoreUpdate: (score: number) => void
  onLivesUpdate: (lives: number) => void
  onLevelUpdate: (level: number) => void
  onGameReady: () => void
  isMobile: boolean
  playSound: (sound: "shoot" | "explosion" | "hit" | "enemyDestroyed" | "levelUp" | "gameOver") => void
}

export class MainScene extends Phaser.Scene {
  // Game state
  private gameActive = false
  private score = 0
  private lives = 3
  private level = 1
  private difficulty = 1

  // Game objects
  private player!: Phaser.Physics.Arcade.Sprite
  private enemies!: Phaser.Physics.Arcade.Group
  private playerLasers!: Phaser.Physics.Arcade.Group
  private enemyLasers!: Phaser.Physics.Arcade.Group
  private barriers!: Phaser.Physics.Arcade.Group
  private barrierBlocks!: Phaser.Physics.Arcade.Group
  private stars!: Phaser.GameObjects.Group
  private nebulae!: Phaser.GameObjects.Group

  // Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private spaceKey!: Phaser.Input.Keyboard.Key
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private aKey!: Phaser.Input.Keyboard.Key
  private dKey!: Phaser.Input.Keyboard.Key

  // Mobile controls
  private mobileControls!: {
    left: Phaser.GameObjects.Rectangle
    right: Phaser.GameObjects.Rectangle
    fire: Phaser.GameObjects.Rectangle
  }

  // Timers
  private enemyShootTimer!: Phaser.Time.TimerEvent
  private playerShootCooldown = 0

  // Particles
  private engineParticles!: Phaser.GameObjects.Particles.ParticleEmitter
  private explosionParticles!: Phaser.GameObjects.Particles.ParticleEmitter

  // Callbacks
  private callbacks: MainSceneConfig

  constructor(callbacks: MainSceneConfig) {
    super({ key: "MainScene" })
    this.callbacks = callbacks
  }

  create() {
    // Create background
    this.createBackground()

    // Create player
    this.createPlayer()

    // Create barriers
    this.createBarriers()

    // Create enemies
    this.createEnemies()

    // Create lasers groups
    this.playerLasers = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: "laser",
      maxSize: 30,
    })

    this.enemyLasers = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: "enemyLaser",
      maxSize: 50,
    })

    // Set up collisions
    this.setupCollisions()

    // Set up controls
    this.setupControls()

    // Set up mobile controls if needed
    if (this.callbacks.isMobile) {
      this.setupMobileControls()
    }

    // Set up enemy shooting
    this.setupEnemyShooting()

    // Set up particles
    this.setupParticles()

    // Set game to ready state
    this.gameActive = false

    // Listen for any key to start the game
    this.input.keyboard?.on("keydown", this.startGame, this)
    this.input.on("pointerdown", this.startGame, this)
  }

  update(time: number, delta: number) {
    if (!this.gameActive) return

    // Update player movement
    this.updatePlayerMovement()

    // Update player shooting
    if (this.playerShootCooldown > 0) {
      this.playerShootCooldown -= delta
    }

    // Check if all enemies are destroyed
    if (this.enemies.countActive() === 0) {
      this.levelUp()
    }

    // Update stars parallax effect
    this.updateStars(delta)
  }

  private createBackground() {
    // Create starfield
    this.stars = this.add.group()
    for (let i = 0; i < 200; i++) {
      const x = Phaser.Math.Between(0, this.game.config.width as number)
      const y = Phaser.Math.Between(0, this.game.config.height as number)
      const scale = Phaser.Math.FloatBetween(0.5, 1.5)
      const alpha = Phaser.Math.FloatBetween(0.3, 1)
      const star = this.add
        .image(x, y, "star")
        .setScale(scale)
        .setAlpha(alpha)
        .setData("parallaxFactor", Phaser.Math.FloatBetween(0.1, 0.3))
      this.stars.add(star)
    }

    // Create nebulae
    this.nebulae = this.add.group()
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(0, this.game.config.width as number)
      const y = Phaser.Math.Between(0, this.game.config.height as number)
      const scale = Phaser.Math.FloatBetween(0.5, 1.5)
      const alpha = Phaser.Math.FloatBetween(0.05, 0.2)
      const tint = Phaser.Display.Color.RandomRGB().color
      const nebula = this.add
        .image(x, y, "nebula")
        .setScale(scale)
        .setAlpha(alpha)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD)
      this.nebulae.add(nebula)
    }
  }

  private createPlayer() {
    // Create player sprite
    const x = (this.game.config.width as number) / 2
    const y = (this.game.config.height as number) - 50

    this.player = this.physics.add.sprite(x, y, "player").setCollideWorldBounds(true).setDepth(10)

    this.player.play("player-idle")

    // Set player data
    this.player.setData("speed", 300)
    this.player.setData("shootDelay", 250)
  }

  private createBarriers() {
    // Create barrier group
    this.barriers = this.physics.add.group()
    this.barrierBlocks = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      defaultKey: "barrier",
      maxSize: 500,
    })

    // Create 4 barriers
    const barrierCount = 4
    const gameWidth = this.game.config.width as number
    const barrierWidth = 60
    const barrierHeight = 40
    const barrierY = (this.game.config.height as number) - 120
    const spacing = gameWidth / (barrierCount + 1)

    for (let i = 0; i < barrierCount; i++) {
      const barrierX = spacing * (i + 1) - barrierWidth / 2

      // Create barrier blocks
      const blockSize = 6
      const blocksWide = Math.floor(barrierWidth / blockSize)
      const blocksHigh = Math.floor(barrierHeight / blockSize)

      for (let row = 0; row < blocksHigh; row++) {
        for (let col = 0; col < blocksWide; col++) {
          // Skip some blocks to create the classic shape
          if (row >= blocksHigh - 3 && col >= Math.floor(blocksWide / 2) - 2 && col <= Math.floor(blocksWide / 2) + 1) {
            continue
          }

          // At higher levels, make barriers weaker by starting with less health
          const maxHealth = this.level <= 3 ? 3 : this.level <= 6 ? 2 : 1

          const blockX = barrierX + col * blockSize + blockSize / 2
          const blockY = barrierY + row * blockSize + blockSize / 2

          const block = this.barrierBlocks
            .create(blockX, blockY, "barrier")
            .setOrigin(0.5)
            .setImmovable(true)
            .setData("health", maxHealth)

          // Set color based on health
          this.updateBarrierBlockColor(block)
        }
      }
    }
  }

  private updateBarrierBlockColor(block: Phaser.Physics.Arcade.Image) {
    const health = block.getData("health")
    switch (health) {
      case 3:
        block.setTint(0x00ff00) // Green
        break
      case 2:
        block.setTint(0xaaff00) // Yellow-green
        break
      case 1:
        block.setTint(0xffaa00) // Orange
        break
      default:
        block.setTint(0xff0000) // Red
    }
  }

  private createEnemies() {
    // Create enemy group
    this.enemies = this.physics.add.group()

    // Calculate enemy formation
    const rows = Math.min(3 + Math.floor(this.level / 2), 6)
    const cols = Math.min(6 + Math.floor(this.level / 2), 12)
    const enemyWidth = 30
    const enemyHeight = 30
    const padding = Math.max(15 - this.level, 8)

    const gameWidth = this.game.config.width as number
    const startX = (gameWidth - cols * (enemyWidth + padding)) / 2 + enemyWidth / 2
    const startY = 50

    // Create enemies
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Add special enemy types at higher levels
        const isSpecial = this.level > 3 && Math.random() < 0.1 * Math.min(this.level / 3, 1)
        const isBoss = this.level > 5 && row === 0 && col === Math.floor(cols / 2) && this.level % 5 === 0

        let enemyType = row === 0 ? "red" : row === 1 ? "green" : "yellow"
        let enemyPoints = (rows - row) * 100
        let enemyHealth = 1
        let enemyTexture = "enemy"
        let enemyScale = 1

        // Special enemy types
        if (isBoss) {
          enemyType = "boss"
          enemyPoints = 2000
          enemyHealth = 5
          enemyTexture = "boss"
          enemyScale = 1
        } else if (isSpecial) {
          enemyType = "special"
          enemyPoints = 500
          enemyHealth = 2
        }

        const x = startX + col * (enemyWidth + padding)
        const y = startY + row * (enemyHeight + padding)

        const enemy = this.enemies
          .create(x, y, enemyTexture)
          .setScale(enemyScale)
          .setData("type", enemyType)
          .setData("points", enemyPoints)
          .setData("health", enemyHealth)
          .setData("isBoss", isBoss)
          .setData("isSpecial", isSpecial)
          .setData("direction", 1)
          .setData("speed", (1 + this.level * 0.2) * this.difficulty)
          .setData("shootChance", isBoss ? 0.02 : isSpecial ? 0.01 : 0.005)
          .setData("lastShot", 0)
          .setData("shotCooldown", isBoss ? 1000 : isSpecial ? 1500 : 2000)

        // Set enemy color
        if (isBoss) {
          enemy.setTint(0xff00ff) // Magenta for boss
          enemy.play("boss-move")
        } else if (isSpecial) {
          enemy.setTint(0x00ffff) // Cyan for special
          enemy.play("enemy-move")
        } else if (enemyType === "red") {
          enemy.setTint(0xff5555) // Red
          enemy.play("enemy-move")
        } else if (enemyType === "green") {
          enemy.setTint(0x55ff55) // Green
          enemy.play("enemy-move")
        } else {
          enemy.setTint(0xffff55) // Yellow
          enemy.play("enemy-move")
        }
      }
    }

    // Set up enemy movement
    this.setupEnemyMovement()
  }

  private setupEnemyMovement() {
    // Create a timeline for enemy movement
    this.time.addEvent({
      delay: 1000 / (this.level * 0.5 + 1),
      callback: this.moveEnemies,
      callbackScope: this,
      loop: true,
    })
  }

  private moveEnemies() {
    if (!this.gameActive) return

    let moveDown = false
    const gameWidth = this.game.config.width as number

    // Check if any enemies hit the edge
    this.enemies.getChildren().forEach((enemy: Phaser.Physics.Arcade.Sprite) => {
      const direction = enemy.getData("direction")
      const speed = enemy.getData("speed")
      const width = enemy.displayWidth

      if (enemy.x + width / 2 + speed * direction > gameWidth || enemy.x - width / 2 + speed * direction < 0) {
        moveDown = true
      }
    })

    // Move enemies
    this.enemies.getChildren().forEach((enemy: Phaser.Physics.Arcade.Sprite) => {
      const direction = enemy.getData("direction")
      const speed = enemy.getData("speed")
      const isBoss = enemy.getData("isBoss")
      const isSpecial = enemy.getData("isSpecial")

      if (moveDown) {
        // Reverse direction
        enemy.setData("direction", -direction)

        // Move down
        enemy.y += 20 + (this.level > 5 ? 10 : 0)

        // Check if enemies reached the bottom
        if (enemy.y + enemy.displayHeight / 2 > this.player.y - this.player.displayHeight) {
          this.gameOver()
        }
      } else {
        // Basic movement
        enemy.x += speed * direction

        // Special movement patterns at higher levels
        if (this.level > 3) {
          if (isSpecial) {
            // Special enemies move in a sine wave pattern
            enemy.y += Math.sin(this.time.now / 500) * 0.5
          } else if (isBoss) {
            // Boss enemies have more complex movement
            if (Math.random() < 0.01) {
              // Occasionally teleport to a new position
              enemy.x = Phaser.Math.Clamp(
                enemy.x + (Math.random() - 0.5) * 100,
                enemy.displayWidth,
                gameWidth - enemy.displayWidth,
              )
            }
          }
        }
      }
    })
  }

  private setupEnemyShooting() {
    // Set up enemy shooting timer
    this.enemyShootTimer = this.time.addEvent({
      delay: Math.max(150, 800 - this.level * 70),
      callback: this.enemyShoot,
      callbackScope: this,
      loop: true,
    })
  }

  private enemyShoot() {
    if (!this.gameActive || this.enemies.countActive() === 0) return

    // Determine how many enemies will shoot based on level and remaining enemies
    const shootCount = Math.min(
      Math.max(1, Math.floor(this.level / 2)),
      Math.min(this.level > 10 ? 5 : 3, Math.ceil(this.enemies.countActive() / 4)),
    )

    // Get random enemies to shoot
    const activeEnemies = this.enemies.getChildren().filter((enemy) => enemy.active)
    const shootingEnemies = Phaser.Utils.Array.Shuffle(activeEnemies).slice(0, shootCount)

    // Create projectiles for each shooting enemy
    shootingEnemies.forEach((enemy: Phaser.Physics.Arcade.Sprite) => {
      const isBoss = enemy.getData("isBoss")
      const isSpecial = enemy.getData("isSpecial")

      // At higher levels, enemies can shoot multiple projectiles at once
      const projectileCount = isBoss ? 3 : isSpecial ? 2 : this.level > 8 ? 2 : 1

      for (let i = 0; i < projectileCount; i++) {
        let offsetX = 0
        if (projectileCount > 1) {
          // Spread multiple projectiles
          offsetX = (i - (projectileCount - 1) / 2) * 10
        }

        const laserX = enemy.x + offsetX
        const laserY = enemy.y + enemy.displayHeight / 2

        // Create laser
        const laser = this.enemyLasers.create(laserX, laserY, isBoss ? "bossLaser" : "enemyLaser")

        if (!laser) return

        laser.setData("isBoss", isBoss)
        laser.setData("isSpecial", isSpecial)

        // Set laser velocity
        const speed = 5 + Math.random() * 2 + (this.level > 7 ? 2 : 0)

        if (isSpecial) {
          // Special projectiles have zigzag pattern
          this.tweens.add({
            targets: laser,
            x: laser.x + Math.sin(laser.y / 20) * 100,
            ease: "Sine.easeInOut",
            duration: 1000,
            repeat: -1,
            yoyo: true,
          })
        } else if (isBoss && this.level > 8) {
          // Boss projectiles home in on player at higher levels
          this.physics.moveToObject(laser, this.player, speed * 60)
        } else {
          // Regular projectiles move straight down
          laser.setVelocityY(speed * 60)
        }

        // Set tint based on enemy type
        if (isBoss) {
          laser.setTint(0xff00ff)
        } else if (isSpecial) {
          laser.setTint(0x00ffff)
        } else {
          laser.setTint(0xff0000)
        }

        // Add glow effect with particles
        if (isBoss || isSpecial) {
          this.addLaserParticles(laser, isBoss ? 0xff00ff : 0x00ffff)
        }
      }

      // Play sound
      this.callbacks.playSound("shoot")
    })
  }

  private addLaserParticles(laser: Phaser.Physics.Arcade.Image, tint: number) {
    const particles = this.add.particles(0, 0, "particle", {
      speed: 20,
      lifespan: 200,
      quantity: 1,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: tint,
      blendMode: Phaser.BlendModes.ADD,
      follow: laser,
    })

    // Destroy particles when laser is destroyed
    laser.on("destroy", () => {
      particles.destroy()
    })
  }

  private setupControls() {
    // Set up keyboard controls
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this.aKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.dKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)

    // Set up space key for shooting
    this.input.keyboard!.on("keydown-SPACE", () => {
      this.playerShoot()
    })
  }

  private setupMobileControls() {
    const gameWidth = this.game.config.width as number
    const gameHeight = this.game.config.height as number

    // Create transparent buttons for mobile controls
    this.mobileControls = {
      left: this.add
        .rectangle(100, gameHeight - 80, 120, 120, 0x0000ff, 0.2)
        .setInteractive()
        .on("pointerdown", () => {
          this.player.setData("moveLeft", true)
        })
        .on("pointerup", () => {
          this.player.setData("moveLeft", false)
        })
        .on("pointerout", () => {
          this.player.setData("moveLeft", false)
        }),

      right: this.add
        .rectangle(260, gameHeight - 80, 120, 120, 0x0000ff, 0.2)
        .setInteractive()
        .on("pointerdown", () => {
          this.player.setData("moveRight", true)
        })
        .on("pointerup", () => {
          this.player.setData("moveRight", false)
        })
        .on("pointerout", () => {
          this.player.setData("moveRight", false)
        }),

      fire: this.add
        .rectangle(gameWidth - 100, gameHeight - 80, 120, 120, 0xff0000, 0.2)
        .setInteractive()
        .on("pointerdown", () => {
          this.playerShoot()
        }),
    }

    // Set depth to ensure they're on top
    this.mobileControls.left.setDepth(100)
    this.mobileControls.right.setDepth(100)
    this.mobileControls.fire.setDepth(100)

    // Add labels
    this.add
      .text(100, gameHeight - 80, "LEFT", {
        font: "bold 18px Arial",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(100)

    this.add
      .text(260, gameHeight - 80, "RIGHT", {
        font: "bold 18px Arial",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(100)

    this.add
      .text(gameWidth - 100, gameHeight - 80, "FIRE", {
        font: "bold 18px Arial",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(100)
  }

  private setupParticles() {
    // Engine particles
    this.engineParticles = this.add
      .particles(0, 0, "particle", {
        speed: { min: 50, max: 100 },
        angle: { min: 80, max: 100 },
        scale: { start: 1, end: 0 },
        lifespan: 300,
        blendMode: Phaser.BlendModes.ADD,
        tint: 0xff6600,
      })
      .setDepth(5)

    // Explosion particles
    this.explosionParticles = this.add
      .particles(0, 0, "particle", {
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 500,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(20)
  }

  private setupCollisions() {
    // Player lasers hit enemies
    this.physics.add.collider(this.playerLasers, this.enemies, this.playerLaserHitEnemy, undefined, this)

    // Enemy lasers hit player
    this.physics.add.collider(this.enemyLasers, this.player, this.enemyLaserHitPlayer, undefined, this)

    // Player lasers hit barrier blocks
    this.physics.add.collider(this.playerLasers, this.barrierBlocks, this.laserHitBarrier, undefined, this)

    // Enemy lasers hit barrier blocks
    this.physics.add.collider(this.enemyLasers, this.barrierBlocks, this.laserHitBarrier, undefined, this)
  }

  private playerLaserHitEnemy(laser: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Sprite) {
    // Destroy laser
    laser.destroy()

    // Reduce enemy health
    const health = enemy.getData("health") - 1
    enemy.setData("health", health)

    // If enemy is destroyed
    if (health <= 0) {
      // Get enemy data
      const points = enemy.getData("points")
      const isBoss = enemy.getData("isBoss")
      const isSpecial = enemy.getData("isSpecial")

      // Update score
      this.score += points
      this.callbacks.onScoreUpdate(this.score)

      // Create explosion
      this.createExplosion(enemy.x, enemy.y, isBoss ? 2 : isSpecial ? 1.5 : 1)

      // Play sound
      this.callbacks.playSound(isBoss ? "explosion" : "enemyDestroyed")

      // Destroy enemy
      enemy.destroy()
    } else {
      // Show hit effect
      this.createHitEffect(enemy.x, enemy.y)

      // Play hit sound
      this.callbacks.playSound("hit")
    }
  }

  private enemyLaserHitPlayer(laser: Phaser.Physics.Arcade.Image, player: Phaser.Physics.Arcade.Sprite) {
    // Get laser data
    const isBoss = laser.getData("isBoss")

    // Destroy laser
    laser.destroy()

    // Reduce lives
    const damage = isBoss && this.level > 8 ? 2 : 1
    this.lives -= damage
    this.callbacks.onLivesUpdate(this.lives)

    // Play hit sound
    this.callbacks.playSound("hit")

    // Create hit effect
    this.createHitEffect(player.x, player.y)

    // Check for game over
    if (this.lives <= 0) {
      this.createExplosion(player.x, player.y, 2)
      this.callbacks.playSound("explosion")
      this.gameOver()
    }
  }

  private laserHitBarrier(laser: Phaser.Physics.Arcade.Image, block: Phaser.Physics.Arcade.Image) {
    // Get laser data
    const isBoss = laser.getData("isBoss")
    const isEnhanced = laser.getData("enhanced")

    // Reduce block health
    const damage = isBoss ? 2 : 1
    const health = block.getData("health") - damage
    block.setData("health", health)

    // Update block color or destroy if health <= 0
    if (health <= 0) {
      block.destroy()
    } else {
      this.updateBarrierBlockColor(block)
    }

    // Destroy laser unless it's enhanced and can penetrate
    if (!(isEnhanced && this.level > 8)) {
      laser.destroy()
    } else {
      // Downgrade enhanced laser after penetration
      laser.setData("enhanced", false)
    }
  }

  private createHitEffect(x: number, y: number) {
    // Create a flash effect
    const flash = this.add.circle(x, y, 20, 0xffffff, 0.8).setDepth(20)

    // Fade out and destroy
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      onComplete: () => {
        flash.destroy()
      },
    })
  }

  private createExplosion(x: number, y: number, scale = 1) {
    // Create explosion sprite
    const explosion = this.add.sprite(x, y, "explosion").setScale(scale).setDepth(20).play("explode")

    // Create particle explosion
    this.explosionParticles.createEmitter({
      x,
      y,
      speed: { min: 50 * scale, max: 200 * scale },
      scale: { start: scale, end: 0 },
      lifespan: 500,
      quantity: 20 * scale,
      tint: [0xffff00, 0xff6600, 0xff0000],
    })

    // Add screen shake for larger explosions
    if (scale > 1) {
      this.cameras.main.shake(200 * scale, 0.01 * scale)
    }
  }

  private updatePlayerMovement() {
    // Get player speed
    const speed = this.player.getData("speed") * (this.level > 8 ? 0.8 : 1) // Harder to maneuver at higher levels

    // Reset velocity
    this.player.setVelocity(0)

    // Check keyboard input
    const left = this.leftKey.isDown || this.aKey.isDown
    const right = this.rightKey.isDown || this.dKey.isDown

    // Check mobile input
    const mobileLeft = this.player.getData("moveLeft")
    const mobileRight = this.player.getData("moveRight")

    // Apply movement
    if ((left || mobileLeft) && !right) {
      this.player.setVelocityX(-speed)
      this.player.play("player-thrust", true)

      // Add engine particles
      this.engineParticles.createEmitter({
        follow: this.player,
        followOffset: { x: 10, y: 20 },
        quantity: 1,
        frequency: 20,
        lifespan: 200,
      })
    } else if ((right || mobileRight) && !left) {
      this.player.setVelocityX(speed)
      this.player.play("player-thrust", true)

      // Add engine particles
      this.engineParticles.createEmitter({
        follow: this.player,
        followOffset: { x: -10, y: 20 },
        quantity: 1,
        frequency: 20,
        lifespan: 200,
      })
    } else {
      this.player.play("player-idle", true)
    }
  }

  private playerShoot() {
    if (!this.gameActive || this.playerShootCooldown > 0) return

    // Create laser
    const laser = this.playerLasers.create(this.player.x, this.player.y - this.player.displayHeight / 2, "laser")

    if (!laser) return

    // Set laser properties
    laser.setVelocityY(-600)

    // Enhanced projectiles at higher levels
    if (this.level > 5) {
      laser.setData("enhanced", true)
      laser.setTint(0xffff00)

      // Add glow effect with particles
      this.addLaserParticles(laser, 0xffff00)
    } else {
      laser.setTint(0x00ffff)
    }

    // Set cooldown
    this.playerShootCooldown = this.player.getData("shootDelay")

    // Play sound
    this.callbacks.playSound("shoot")
  }

  private updateStars(delta: number) {
    // Update star positions for parallax effect
    this.stars.getChildren().forEach((star: Phaser.GameObjects.Image) => {
      const parallaxFactor = star.getData("parallaxFactor")
      star.y += (parallaxFactor * delta) / 16

      // Wrap stars when they go off screen
      if ((star.y > this.game.config.height) as number) {
        star.y = 0
        star.x = Phaser.Math.Between(0, this.game.config.width as number)
      }
    })
  }

  private startGame() {
    if (this.gameActive) return

    // Set game to active
    this.gameActive = true

    // Remove event listeners
    this.input.keyboard?.off("keydown", this.startGame, this)
    this.input.off("pointerdown", this.startGame, this)

    // Notify parent component
    this.callbacks.onGameStart()
  }

  private levelUp() {
    // Increase level
    this.level++
    this.difficulty = Math.pow(1.2, this.level - 1)

    // Update level in parent component
    this.callbacks.onLevelUpdate(this.level)

    // Create new enemies
    this.createEnemies()

    // Update enemy shooting interval
    this.enemyShootTimer.remove()
    this.setupEnemyShooting()

    // Repair barriers slightly between levels
    this.barrierBlocks.getChildren().forEach((block: Phaser.Physics.Arcade.Image) => {
      const health = block.getData("health")

      // At higher levels, repair less or not at all
      if (this.level <= 3) {
        if (health < 3) block.setData("health", health + 1)
      } else if (this.level <= 6) {
        if (health < 2 && Math.random() < 0.7) block.setData("health", health + 1)
      } else if (this.level <= 10) {
        if (health < 2 && Math.random() < 0.3) block.setData("health", health + 1)
      }
      // Above level 10, no repairs

      // Update block color
      this.updateBarrierBlockColor(block)
    })
  }

  private gameOver() {
    // Set game to inactive
    this.gameActive = false

    // Hide player
    this.player.setVisible(false)

    // Notify parent component
    this.callbacks.onGameOver(this.score)

    // Show game over scene after a delay
    this.time.delayedCall(2000, () => {
      this.scene.start("GameOverScene", { score: this.score })
    })
  }
}
