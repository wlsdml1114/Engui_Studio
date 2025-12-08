'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { VideoKeyFrame } from '@/lib/context/StudioContext';
import { FitMode } from '@/lib/mediaFitting';

interface KeyframeFitSelectorProps {
  keyframe: VideoKeyFrame;
  onFitModeChange: (fitMode: FitMode) => void;
}

export function KeyframeFitSelector({
  keyframe,
  onFitModeChange,
}: KeyframeFitSelectorProps) {
  const fitMode = keyframe.data.fitMode ?? 'contain';

  // Only show for image/video keyframes
  if (keyframe.data.type !== 'image' && keyframe.data.type !== 'video') {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Fit Mode</Label>
      <div className="flex gap-1">
        <Button
          variant={fitMode === 'contain' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFitModeChange('contain')}
          className="flex-1 text-xs h-7"
        >
          Contain
        </Button>
        <Button
          variant={fitMode === 'cover' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFitModeChange('cover')}
          className="flex-1 text-xs h-7"
        >
          Cover
        </Button>
        <Button
          variant={fitMode === 'fill' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFitModeChange('fill')}
          className="flex-1 text-xs h-7"
        >
          Fill
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        {fitMode === 'contain' && 'Fit entire media with letterbox/pillarbox'}
        {fitMode === 'cover' && 'Fill canvas, crop if needed'}
        {fitMode === 'fill' && 'Stretch to fill canvas'}
      </div>
    </div>
  );
}
