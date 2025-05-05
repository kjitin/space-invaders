"use client"

import type React from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"

type AudioContextType = {
  playBackgroundMusic: () => void
  stopBackgroundMusic: () => void
  playSound: (sound: "shoot" | "explosion" | "hit" | "enemyDestroyed" | "levelUp" | "gameOver") => void
  isMuted: boolean
  toggleMute: () => void
  volume: number
  setVolume: (volume: number) => void
}

const AudioContext = createContext<AudioContextType | null>(null)

export const useAudio = () => {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider")
  }
  return context
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [isInitialized, setIsInitialized] = useState(false)

  // Web Audio API context
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const backgroundOscillatorRef = useRef<OscillatorNode | null>(null)
  const backgroundGainRef = useRef<GainNode | null>(null)

  // Initialize audio on client side only
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      // Create Web Audio API context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      audioContextRef.current = new AudioContext()

      // Create main gain node for volume control
      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.gain.value = volume
      gainNodeRef.current.connect(audioContextRef.current.destination)

      // Load saved mute state from localStorage
      const savedMuteState = localStorage.getItem("spaceInvadersMuted")
      if (savedMuteState) {
        setIsMuted(savedMuteState === "true")
      }

      // Load saved volume from localStorage
      const savedVolume = localStorage.getItem("spaceInvadersVolume")
      if (savedVolume) {
        const parsedVolume = Number.parseFloat(savedVolume)
        setVolume(parsedVolume)

        // Update volume for gain node
        if (gainNodeRef.current) {
          gainNodeRef.current.gain.value = parsedVolume
        }
      }

      setIsInitialized(true)
    } catch (error) {
      console.error("Error initializing audio:", error)
    }

    // Cleanup
    return () => {
      try {
        if (backgroundOscillatorRef.current) {
          backgroundOscillatorRef.current.stop()
        }

        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close()
        }
      } catch (error) {
        console.error("Error cleaning up audio:", error)
      }
    }
  }, [])

  // Update mute state
  useEffect(() => {
    if (!isInitialized) return

    try {
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = isMuted ? 0 : volume
      }

      // Save mute state to localStorage
      localStorage.setItem("spaceInvadersMuted", isMuted.toString())
    } catch (error) {
      console.error("Error updating mute state:", error)
    }
  }, [isMuted, isInitialized, volume])

  // Update volume
  useEffect(() => {
    if (!isInitialized) return

    try {
      if (gainNodeRef.current && !isMuted) {
        gainNodeRef.current.gain.value = volume
      }

      // Save volume to localStorage
      localStorage.setItem("spaceInvadersVolume", volume.toString())
    } catch (error) {
      console.error("Error updating volume:", error)
    }
  }, [volume, isInitialized, isMuted])

  // Generate a simple shoot sound
  const generateShootSound = () => {
    if (!audioContextRef.current || !gainNodeRef.current) return

    try {
      // Create oscillator
      const oscillator = audioContextRef.current.createOscillator()
      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(880, audioContextRef.current.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(110, audioContextRef.current.currentTime + 0.1)

      // Create gain node for this sound
      const gainNode = audioContextRef.current.createGain()
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1)

      // Connect nodes
      oscillator.connect(gainNode)
      gainNode.connect(gainNodeRef.current)

      // Play sound
      oscillator.start()
      oscillator.stop(audioContextRef.current.currentTime + 0.1)
    } catch (error) {
      console.error("Error generating shoot sound:", error)
    }
  }

  // Generate a simple explosion sound
  const generateExplosionSound = () => {
    if (!audioContextRef.current || !gainNodeRef.current) return

    try {
      // Create noise
      const bufferSize = 4096
      const noiseNode = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1)
      noiseNode.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1
        }
      }

      // Create filter
      const filter = audioContextRef.current.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.setValueAtTime(1000, audioContextRef.current.currentTime)
      filter.frequency.exponentialRampToValueAtTime(20, audioContextRef.current.currentTime + 0.3)

      // Create gain node for this sound
      const gainNode = audioContextRef.current.createGain()
      gainNode.gain.setValueAtTime(0.5, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3)

      // Connect nodes
      noiseNode.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(gainNodeRef.current)

      // Play sound
      setTimeout(() => {
        noiseNode.disconnect()
      }, 300)
    } catch (error) {
      console.error("Error generating explosion sound:", error)
    }
  }

  // Generate a simple hit sound
  const generateHitSound = () => {
    if (!audioContextRef.current || !gainNodeRef.current) return

    try {
      // Create oscillator
      const oscillator = audioContextRef.current.createOscillator()
      oscillator.type = "square"
      oscillator.frequency.setValueAtTime(220, audioContextRef.current.currentTime)

      // Create gain node for this sound
      const gainNode = audioContextRef.current.createGain()
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1)

      // Connect nodes
      oscillator.connect(gainNode)
      gainNode.connect(gainNodeRef.current)

      // Play sound
      oscillator.start()
      oscillator.stop(audioContextRef.current.currentTime + 0.1)
    } catch (error) {
      console.error("Error generating hit sound:", error)
    }
  }

  // Generate a simple enemy destroyed sound
  const generateEnemyDestroyedSound = () => {
    if (!audioContextRef.current || !gainNodeRef.current) return

    try {
      // Create oscillator
      const oscillator = audioContextRef.current.createOscillator()
      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(880, audioContextRef.current.currentTime + 0.1)

      // Create gain node for this sound
      const gainNode = audioContextRef.current.createGain()
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1)

      // Connect nodes
      oscillator.connect(gainNode)
      gainNode.connect(gainNodeRef.current)

      // Play sound
      oscillator.start()
      oscillator.stop(audioContextRef.current.currentTime + 0.1)
    } catch (error) {
      console.error("Error generating enemy destroyed sound:", error)
    }
  }

  // Generate a simple level up sound
  const generateLevelUpSound = () => {
    if (!audioContextRef.current || !gainNodeRef.current) return

    try {
      // Create oscillator 1
      const oscillator1 = audioContextRef.current.createOscillator()
      oscillator1.type = "sine"
      oscillator1.frequency.setValueAtTime(440, audioContextRef.current.currentTime)
      oscillator1.frequency.exponentialRampToValueAtTime(880, audioContextRef.current.currentTime + 0.2)

      // Create oscillator 2
      const oscillator2 = audioContextRef.current.createOscillator()
      oscillator2.type = "sine"
      oscillator2.frequency.setValueAtTime(660, audioContextRef.current.currentTime + 0.2)
      oscillator2.frequency.exponentialRampToValueAtTime(1320, audioContextRef.current.currentTime + 0.4)

      // Create gain node for this sound
      const gainNode = audioContextRef.current.createGain()
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.4)

      // Connect nodes
      oscillator1.connect(gainNode)
      oscillator2.connect(gainNode)
      gainNode.connect(gainNodeRef.current)

      // Play sound
      oscillator1.start()
      oscillator1.stop(audioContextRef.current.currentTime + 0.2)
      oscillator2.start(audioContextRef.current.currentTime + 0.2)
      oscillator2.stop(audioContextRef.current.currentTime + 0.4)
    } catch (error) {
      console.error("Error generating level up sound:", error)
    }
  }

  // Generate a simple game over sound
  const generateGameOverSound = () => {
    if (!audioContextRef.current || !gainNodeRef.current) return

    try {
      // Create oscillator 1
      const oscillator1 = audioContextRef.current.createOscillator()
      oscillator1.type = "sawtooth"
      oscillator1.frequency.setValueAtTime(440, audioContextRef.current.currentTime)
      oscillator1.frequency.exponentialRampToValueAtTime(110, audioContextRef.current.currentTime + 0.5)

      // Create oscillator 2
      const oscillator2 = audioContextRef.current.createOscillator()
      oscillator2.type = "sawtooth"
      oscillator2.frequency.setValueAtTime(330, audioContextRef.current.currentTime)
      oscillator2.frequency.exponentialRampToValueAtTime(55, audioContextRef.current.currentTime + 0.5)

      // Create gain node for this sound
      const gainNode = audioContextRef.current.createGain()
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5)

      // Connect nodes
      oscillator1.connect(gainNode)
      oscillator2.connect(gainNode)
      gainNode.connect(gainNodeRef.current)

      // Play sound
      oscillator1.start()
      oscillator1.stop(audioContextRef.current.currentTime + 0.5)
      oscillator2.start()
      oscillator2.stop(audioContextRef.current.currentTime + 0.5)
    } catch (error) {
      console.error("Error generating game over sound:", error)
    }
  }

  // Generate background music
  const playBackgroundMusic = () => {
    if (!audioContextRef.current || !gainNodeRef.current || isMuted) return

    try {
      // Stop any existing background music
      stopBackgroundMusic()

      // Resume audio context if it's suspended (browser autoplay policy)
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume()
      }

      // Create background music oscillators
      const createBackgroundMusic = () => {
        if (!audioContextRef.current) return

        // Create oscillator for bass
        const bassOsc = audioContextRef.current.createOscillator()
        bassOsc.type = "sine"
        bassOsc.frequency.value = 110

        // Create gain node for bass
        const bassGain = audioContextRef.current.createGain()
        bassGain.gain.value = 0.2

        // Create oscillator for melody
        const melodyOsc = audioContextRef.current.createOscillator()
        melodyOsc.type = "square"

        // Create gain node for melody
        const melodyGain = audioContextRef.current.createGain()
        melodyGain.gain.value = 0.1

        // Connect nodes
        bassOsc.connect(bassGain)
        melodyOsc.connect(melodyGain)

        // Create main gain node for background music
        backgroundGainRef.current = audioContextRef.current.createGain()
        backgroundGainRef.current.gain.value = 0.3

        bassGain.connect(backgroundGainRef.current)
        melodyGain.connect(backgroundGainRef.current)
        backgroundGainRef.current.connect(gainNodeRef.current)

        // Start oscillators
        bassOsc.start()
        melodyOsc.start()

        // Simple melody pattern
        let noteIndex = 0
        const notes = [220, 330, 440, 330]

        const playMelody = () => {
          if (!audioContextRef.current || !melodyOsc) return

          melodyOsc.frequency.setValueAtTime(notes[noteIndex], audioContextRef.current.currentTime)
          noteIndex = (noteIndex + 1) % notes.length

          setTimeout(playMelody, 500)
        }

        playMelody()

        // Store reference to oscillator for stopping later
        backgroundOscillatorRef.current = bassOsc
      }

      createBackgroundMusic()
    } catch (error) {
      console.error("Error playing background music:", error)
    }
  }

  const stopBackgroundMusic = () => {
    try {
      if (backgroundOscillatorRef.current) {
        backgroundOscillatorRef.current.stop()
        backgroundOscillatorRef.current = null
      }

      if (backgroundGainRef.current) {
        backgroundGainRef.current.disconnect()
        backgroundGainRef.current = null
      }
    } catch (error) {
      console.error("Error stopping background music:", error)
    }
  }

  const playSound = (sound: "shoot" | "explosion" | "hit" | "enemyDestroyed" | "levelUp" | "gameOver") => {
    if (!isInitialized || isMuted) return

    try {
      // Resume audio context if it's suspended (browser autoplay policy)
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume()
      }

      // Play the appropriate sound
      switch (sound) {
        case "shoot":
          generateShootSound()
          break
        case "explosion":
          generateExplosionSound()
          break
        case "hit":
          generateHitSound()
          break
        case "enemyDestroyed":
          generateEnemyDestroyedSound()
          break
        case "levelUp":
          generateLevelUpSound()
          break
        case "gameOver":
          generateGameOverSound()
          break
      }
    } catch (error) {
      console.error(`Error playing sound '${sound}':`, error)
    }
  }

  const toggleMute = () => {
    setIsMuted((prev) => !prev)
  }

  const value = {
    playBackgroundMusic,
    stopBackgroundMusic,
    playSound,
    isMuted,
    toggleMute,
    volume,
    setVolume,
  }

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}
