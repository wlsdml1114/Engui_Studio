'use client';

import React, { useState, useCallback } from 'react';
import { VideoTrack } from '@/lib/context/StudioContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Volume2Icon, VolumeXIcon } from 'lucide-react';

interface TrackVolumeControlProps {
  track: VideoTrack;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: (muted: boolean) => void;
}

export function TrackVolumeControl({
  track,
  onVolumeChange,
  onMuteToggle,
}: TrackVolumeControlProps) {
  const [volume, setVolume] = useState(track.volume);
  const [muted, setMuted] = useState(track.muted);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    onVolumeChange(newVolume);
  }, [onVolumeChange]);

  const handleMuteToggle = useCallback(() => {
    const newMuted = !muted;
    setMuted(newMuted);
    onMuteToggle(newMuted);
  }, [muted, onMuteToggle]);

  // Only show for audio tracks (music, voiceover)
  if (track.type === 'video') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleMuteToggle}
        className="p-1"
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? (
          <VolumeXIcon className="w-4 h-4" />
        ) : (
          <Volume2Icon className="w-4 h-4" />
        )}
      </Button>

      <Slider
        value={[volume]}
        onValueChange={handleVolumeChange}
        min={0}
        max={200}
        step={1}
        className="flex-1"
        disabled={muted}
      />

      <span className="text-xs text-muted-foreground w-12 text-right">
        {volume}%
      </span>
    </div>
  );
}
