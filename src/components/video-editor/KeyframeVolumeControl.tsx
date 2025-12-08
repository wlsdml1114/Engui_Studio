'use client';

import React, { useState, useCallback, useRef } from 'react';
import { VideoKeyFrame } from '@/lib/context/StudioContext';
import { Button } from '@/components/ui/button';
import { Volume2Icon } from 'lucide-react';
import { calculateFinalVolume } from '@/lib/audioMixing';

interface KeyframeVolumeControlProps {
  keyframe: VideoKeyFrame;
  trackVolume: number;
  trackMuted: boolean;
  onVolumeChange: (volume: number | null) => void;
}

export function KeyframeVolumeControl({
  keyframe,
  trackVolume = 100,
  trackMuted = false,
  onVolumeChange,
}: KeyframeVolumeControlProps) {
  const keyframeVolume = keyframe.data.volume ?? null;
  const effectiveVolume = keyframeVolume ?? trackVolume;
  const [volume, setVolume] = useState(effectiveVolume);
  const useCustomVolumeRef = useRef(keyframeVolume !== null);
  const [useCustomVolume, setUseCustomVolume] = useState(useCustomVolumeRef.current);

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    onVolumeChange(value);
  }, [onVolumeChange]);

  const handleToggleCustomVolume = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newUseCustom = !useCustomVolumeRef.current;
    useCustomVolumeRef.current = newUseCustom;
    setUseCustomVolume(newUseCustom);
    onVolumeChange(newUseCustom ? volume : null);
  }, [volume, onVolumeChange]);

  if (keyframe.data.type !== 'music' && keyframe.data.type !== 'voiceover') {
    return null;
  }

  const finalVolume = calculateFinalVolume(
    trackVolume,
    useCustomVolume ? volume : null,
    trackMuted
  );

  return (
    <div className="space-y-3">
      {/* Toggle Button */}
      <div className="flex items-center gap-2">
        <Button
          variant={useCustomVolume ? "default" : "outline"}
          size="sm"
          onClick={handleToggleCustomVolume}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-xs h-7"
        >
          {useCustomVolume ? 'Custom' : 'Track Default'}
        </Button>
        <span className="text-xs text-muted-foreground">
          {useCustomVolume ? 'Using custom volume' : `Using track (${trackVolume}%)`}
        </span>
      </div>

      {/* Volume Slider */}
      <div 
        className="flex items-center gap-3"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          type="range"
          value={useCustomVolume ? volume : trackVolume}
          onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
          min={0}
          max={200}
          step={1}
          disabled={!useCustomVolume}
          className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer 
            ${useCustomVolume ? 'bg-muted accent-primary' : 'bg-muted/50 opacity-50'}`}
        />
        <span className={`text-sm font-mono w-12 text-right ${useCustomVolume ? 'text-foreground' : 'text-muted-foreground'}`}>
          {useCustomVolume ? volume : trackVolume}%
        </span>
      </div>

      {/* Final Volume Display */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
        <span>Final output:</span>
        <span className="text-foreground font-medium">{Math.round(finalVolume)}%</span>
      </div>
    </div>
  );
}
