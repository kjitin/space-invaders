// Client-side configuration for the game
// This avoids using environment variables on the client

export const GAME_CONFIG = {
  // Game settings
  defaultLives: 3,
  defaultLevel: 1,

  // Asset paths
  assetPath: "/assets/game",

  // Game dimensions
  width: 800,
  height: 600,

  // Difficulty settings
  difficultyMultiplier: 1.2,

  // Local storage keys
  highScoreKey: "spaceInvadersHighScore",

  // Debug mode - set to false in production
  debug: false,
}
