'use client';

import React, { HTMLAttributes, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useStudio } from '@/lib/context/StudioContext';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.5;

interface TimelineControlsProps extends HTMLAttributes<HTMLDivElement> {
  currentTimestamp: number;
  duration: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export const TimelineControls = React.memo(function TimelineControls({
  currentTimestamp,
  duration,
  zoom,
  onZoomChange,
  className,
  ...props
}: TimelineControlsProps) {
  const { player, playerState, setPlayerState, setCurrentTimestamp } = useStudio();

  // Format time as MM:SS.ms - memoized
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);

  // Memoize formatted times
  const formattedCurrentTime = useMemo(
    () => formatTime(currentTimestamp),
    [formatTime, currentTimestamp]
  );
  const formattedDuration = useMemo(
    () => formatTime(duration),
    [formatTime, duration]
  );

  // Handle play/pause toggle
  const handlePlayPause = useCallback(() => {
    if (!player) return;

    if (playerState === 'playing') {
      if (typeof player.pause === 'function') {
        player.pause();
        setPlayerState('paused');
      }
    } else {
      if (typeof player.play === 'function') {
        player.play();
        setPlayerState('playing');
      }
    }
  }, [player, playerState, setPlayerState]);

  // Handle go to start
  const handleGoToStart = useCallback(() => {
    setCurrentTimestamp(0);
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(0);
    }
  }, [player, setCurrentTimestamp]);

  // Handle go to end
  const handleGoToEnd = useCallback(() => {
    setCurrentTimestamp(duration);
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(Math.floor(duration * 30));
    }
  }, [player, duration, setCurrentTimestamp]);

  // Handle step backward (1 second)
  const handleStepBackward = useCallback(() => {
    const newTime = Math.max(0, currentTimestamp - 1);
    setCurrentTimestamp(newTime);
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(Math.floor(newTime * 30));
    }
  }, [player, currentTimestamp, setCurrentTimestamp]);

  // Handle step forward (1 second)
  const handleStepForward = useCallback(() => {
    const newTime = Math.min(duration, currentTimestamp + 1);
    setCurrentTimestamp(newTime);
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(Math.floor(newTime * 30));
    }
  }, [player, currentTimestamp, duration, setCurrentTimestamp]);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
    onZoomChange(newZoom);
  }, [zoom, onZoomChange]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    onZoomChange(newZoom);
  }, [zoom, onZoomChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handleStepBackward();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleStepForward();
          break;
        case 'Home':
          event.preventDefault();
          handleGoToStart();
          break;
        case 'End':
          event.preventDefault();
          handleGoToEnd();
          break;
        case '+':
        case '=':
          event.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          event.preventDefault();
          handleZoomOut();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handlePlayPause,
    handleStepBackward,
    handleStepForward,
    handleGoToStart,
    handleGoToEnd,
    handleZoomIn,
    handleZoomOut,
  ]);

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800',
        className
      )}
      role="toolbar"
      aria-label="Timeline controls"
      {...props}
    >
      {/* Time Display */}
      <div className="flex items-center gap-1" role="status" aria-live="polite">
        <span className="text-sm font-mono tabular-nums text-white tracking-tight">
          {formattedCurrentTime}
        </span>
        <span className="text-sm font-mono text-zinc-500 mx-0.5">/</span>
        <span className="text-sm font-mono tabular-nums text-zinc-400 tracking-tight">
          {formattedDuration}
        </span>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-1" role="group" aria-label="Playback controls">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleGoToStart}
          disabled={!player}
          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
          aria-label="Go to start (Home)"
        >
          <ChevronsLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleStepBackward}
          disabled={!player}
          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
          aria-label="Step backward 1 second (Left arrow)"
        >
          <SkipBack className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlayPause}
          disabled={!player}
          className="h-10 w-10 text-white hover:bg-zinc-800"
          aria-label={playerState === 'playing' ? 'Pause (Space)' : 'Play (Space)'}
          aria-pressed={playerState === 'playing'}
        >
          {playerState === 'playing' ? (
            <Pause className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" aria-hidden="true" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleStepForward}
          disabled={!player}
          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
          aria-label="Step forward 1 second (Right arrow)"
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleGoToEnd}
          disabled={!player}
          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
          aria-label="Go to end (End)"
        >
          <ChevronsRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Empty spacer for balance */}
      <div className="w-[150px]" />
    </div>
  );
});

// Export constants for testing
export { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP };
