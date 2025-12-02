'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { VideoComposition, getAspectRatioDimensions, FPS } from './VideoComposition';
import { VideoProject, VideoTrack, VideoKeyFrame } from '@/lib/context/StudioContext';
import { preloadVideo, preloadImage, preloadAudio } from '@remotion/preload';
import { validatePlayerInit } from '@/lib/videoEditorValidation';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPreviewProps {
  project: VideoProject;
  tracks: VideoTrack[];
  keyframes: Record<string, VideoKeyFrame[]>;
  onPlayerReady: (player: PlayerRef) => void;
  onStateChange: (state: 'playing' | 'paused') => void;
  onTimeUpdate: (timestamp: number) => void;
}

export const VideoPreview = React.memo(function VideoPreview({
  project,
  tracks,
  keyframes,
  onPlayerReady,
  onStateChange,
  onTimeUpdate,
}: VideoPreviewProps) {
  const playerRef = useRef<PlayerRef>(null);
  const isInitializedRef = useRef(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Validate player initialization requirements
  useEffect(() => {
    const validation = validatePlayerInit(project);
    if (!validation.valid) {
      setInitError(validation.error || 'Invalid player configuration');
      console.error('Player initialization validation failed:', validation.error);
    } else {
      setInitError(null);
    }
  }, [project]);

  // Preload media for performance
  useEffect(() => {
    const allKeyframes = Object.values(keyframes).flat();
    
    allKeyframes.forEach((keyframe) => {
      const url = keyframe.data.url;
      
      if (keyframe.data.type === 'video') {
        preloadVideo(url);
      } else if (keyframe.data.type === 'image') {
        preloadImage(url);
      } else if (keyframe.data.type === 'music' || keyframe.data.type === 'voiceover') {
        preloadAudio(url);
      }
    });
  }, [keyframes]);

  // Track playing state for animation frame loop
  const isPlayingRef = useRef(false);
  const animationFrameIdRef = useRef<number | null>(null);

  // Animation frame loop to update timestamp during playback
  const startPlayheadUpdate = useCallback(() => {
    const updatePlayhead = () => {
      const player = playerRef.current;
      if (isPlayingRef.current && player && typeof player.getCurrentFrame === 'function') {
        const frame = player.getCurrentFrame();
        const timestamp = frame / FPS;
        onTimeUpdate(timestamp);
        animationFrameIdRef.current = requestAnimationFrame(updatePlayhead);
      }
    };
    animationFrameIdRef.current = requestAnimationFrame(updatePlayhead);
  }, [onTimeUpdate]);

  const stopPlayheadUpdate = useCallback(() => {
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  }, []);

  // Initialize player and set up event listeners
  useEffect(() => {
    const player = playerRef.current;
    if (!player || initError) return;

    // Notify parent that player is ready
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      onPlayerReady(player);
    }

    const handlePlay = () => {
      isPlayingRef.current = true;
      onStateChange('playing');
      startPlayheadUpdate();
    };

    const handlePause = () => {
      isPlayingRef.current = false;
      onStateChange('paused');
      stopPlayheadUpdate();
    };

    const handleSeeked = (e: any) => {
      const frame = e.detail?.frame ?? player.getCurrentFrame?.() ?? 0;
      const timestamp = frame / FPS;
      onTimeUpdate(timestamp);
    };

    const handleEnded = () => {
      isPlayingRef.current = false;
      onStateChange('paused');
      stopPlayheadUpdate();
    };

    // Remotion Player v4 uses addEventListener
    player.addEventListener('play', handlePlay);
    player.addEventListener('pause', handlePause);
    player.addEventListener('seeked', handleSeeked);
    player.addEventListener('ended', handleEnded);

    return () => {
      isPlayingRef.current = false;
      stopPlayheadUpdate();
      player.removeEventListener('play', handlePlay);
      player.removeEventListener('pause', handlePause);
      player.removeEventListener('seeked', handleSeeked);
      player.removeEventListener('ended', handleEnded);
    };
  }, [onPlayerReady, onStateChange, onTimeUpdate, initError, retryCount, startPlayheadUpdate, stopPlayheadUpdate]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setInitError(null);
    setRetryCount(prev => prev + 1);
    isInitializedRef.current = false;
  }, []);

  // Get aspect ratio dimensions - memoized
  const { width, height } = useMemo(
    () => getAspectRatioDimensions(project.aspectRatio),
    [project.aspectRatio]
  );
  
  // Calculate duration in frames - memoized
  const durationInFrames = useMemo(
    () => Math.ceil((project.duration / 1000) * FPS),
    [project.duration]
  );

  // Memoize input props to prevent unnecessary re-renders
  const inputProps = useMemo(
    () => ({ project, tracks, keyframes }),
    [project, tracks, keyframes]
  );

  // Show error state if initialization failed
  if (initError) {
    return (
      <div 
        className="flex-1 flex items-center justify-center bg-black/20 p-4"
        role="alert"
        aria-live="assertive"
      >
        <div className="max-w-md p-6 bg-background rounded-lg border border-border text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold mb-2">Player Initialization Failed</h3>
          <p className="text-muted-foreground mb-4">{initError}</p>
          <Button onClick={handleRetry} className="gap-2" aria-label="Retry player initialization">
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex items-center justify-center bg-black/20 p-4"
      role="region"
      aria-label="Video preview"
    >
      <div 
        className="w-full h-full flex items-center justify-center"
        role="img"
        aria-label={`Video preview for ${project.title}`}
      >
        <Player
          key={retryCount} // Force remount on retry
          ref={playerRef}
          component={VideoComposition}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          fps={FPS}
          compositionWidth={width}
          compositionHeight={height}
          style={{
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: `${width}/${height}`,
          }}
          controls={false}
          clickToPlay={false}
        />
      </div>
    </div>
  );
});
