"use client"

import { Volume2, VolumeX } from "lucide-react"
import { useAudio } from "./web-audio-manager"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useState } from "react"

export function AudioControls() {
  const { isMuted, toggleMute, volume, setVolume, playSound } = useAudio()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100)
    // Play a sound to preview the volume
    setTimeout(() => playSound("shoot"), 100)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMute}
        className="text-white hover:bg-white/20"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </Button>

      {isExpanded && (
        <div className="w-24 bg-black/50 p-2 rounded-full">
          <Slider value={[volume * 100]} min={0} max={100} step={1} onValueChange={handleVolumeChange} />
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-white hover:bg-white/20 text-xs"
      >
        {isExpanded ? "Hide" : "Volume"}
      </Button>
    </div>
  )
}
