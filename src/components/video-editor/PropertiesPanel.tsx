'use client';

import React from 'react';
import { useStudio, VideoKeyFrame, VideoTrack } from '@/lib/context/StudioContext';
import { KeyframeVolumeControl } from './KeyframeVolumeControl';
import { KeyframeFitSelector } from './KeyframeFitSelector';
import { SettingsIcon, Volume2Icon, ImageIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FitMode } from '@/lib/mediaFitting';
import { useI18n } from '@/lib/i18n/context';

export function PropertiesPanel() {
  const { selectedKeyframeIds, tracks, keyframes, updateKeyframe, clearSelection } = useStudio();
  const { t } = useI18n();
  
  // Get the first selected keyframe
  const selectedKeyframeId = selectedKeyframeIds[0];
  
  // Don't render if no keyframe is selected
  if (!selectedKeyframeId) {
    return null;
  }
  
  // Find the keyframe and track
  let selectedKeyframe: VideoKeyFrame | null = null;
  let selectedTrack: VideoTrack | null = null;
  
  for (const track of tracks) {
    const trackKeyframes = keyframes[track.id] || [];
    for (const keyframe of trackKeyframes) {
      if (keyframe.id === selectedKeyframeId) {
        selectedKeyframe = keyframe;
        selectedTrack = track;
        break;
      }
    }
    if (selectedKeyframe) break;
  }
  
  if (!selectedKeyframe || !selectedTrack) {
    return null;
  }
  
  const isAudio = selectedTrack.type === 'music' || selectedTrack.type === 'voiceover';
  
  const handleVolumeChange = async (volume: number | null) => {
    await updateKeyframe(selectedKeyframe!.id, {
      data: {
        ...selectedKeyframe!.data,
        volume: volume ?? undefined,
      },
    });
  };
  
  const handleFitModeChange = async (fitMode: FitMode) => {
    await updateKeyframe(selectedKeyframe!.id, {
      data: {
        ...selectedKeyframe!.data,
        fitMode,
      },
    });
  };

  return (
    <div className="border-t border-border bg-muted/5 animate-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground">
          <SettingsIcon className="w-4 h-4" />
          <span className="font-medium text-sm">{t('videoEditor.properties.title')}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Keyframe Info */}
      <div className="px-3 py-2 border-b border-border/30 bg-muted/10">
        <div className="text-xs text-muted-foreground">
          <span className="capitalize">{selectedTrack.type}</span>
          <span className="mx-1">•</span>
          <span className="capitalize">{selectedKeyframe.data.type}</span>
        </div>
        <div className="text-xs text-muted-foreground/70 mt-1 truncate" title={selectedKeyframe.data.url}>
          {selectedKeyframe.data.prompt || selectedKeyframe.data.url.split('/').pop()}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3">
        {isAudio ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Volume2Icon className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-medium">{t('videoEditor.properties.audioSettings')}</span>
            </div>
            <KeyframeVolumeControl
              keyframe={selectedKeyframe}
              trackVolume={selectedTrack.volume}
              trackMuted={selectedTrack.muted}
              onVolumeChange={handleVolumeChange}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <ImageIcon className="w-4 h-4 text-green-400" />
              <span className="text-xs font-medium">{t('videoEditor.properties.visualSettings')}</span>
            </div>
            <KeyframeFitSelector
              keyframe={selectedKeyframe}
              onFitModeChange={handleFitModeChange}
            />
          </div>
        )}
      </div>
      
      {/* Time Info */}
      <div className="px-3 py-2 border-t border-border/30 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>{t('videoEditor.properties.start')}</span>
          <span className="text-foreground">{(selectedKeyframe.timestamp / 1000).toFixed(2)}s</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>{t('videoEditor.properties.duration')}</span>
          <span className="text-foreground">{(selectedKeyframe.duration / 1000).toFixed(2)}s</span>
        </div>
      </div>
    </div>
  );
}
