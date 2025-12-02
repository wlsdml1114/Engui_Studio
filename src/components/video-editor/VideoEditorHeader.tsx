'use client';

import React, { useCallback, useMemo } from 'react';
import { useStudio, VideoProject } from '@/lib/context/StudioContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Play, Pause, Download, Maximize2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoEditorHeaderProps {
  project: VideoProject;
  className?: string;
}

const ASPECT_RATIOS = [
  { value: '16:9' as const, label: '16:9 (Landscape)' },
  { value: '9:16' as const, label: '9:16 (Portrait)' },
  { value: '1:1' as const, label: '1:1 (Square)' },
];

export const VideoEditorHeader = React.memo(function VideoEditorHeader({ project, className }: VideoEditorHeaderProps) {
  const {
    playerState,
    player,
    setPlayerState,
    updateProject,
    setExportDialogOpen,
    tracks,
    addTrack,
    addKeyframe,
  } = useStudio();

  const handleAspectRatioChange = useCallback(async (aspectRatio: '16:9' | '9:16' | '1:1') => {
    await updateProject(project.id, { aspectRatio });
  }, [updateProject, project.id]);

  const handlePlayPause = useCallback(() => {
    if (!player) return;

    if (playerState === 'playing') {
      player.pause();
      setPlayerState('paused');
    } else {
      player.play();
      setPlayerState('playing');
    }
  }, [player, playerState, setPlayerState]);

  const handleExport = useCallback(() => {
    setExportDialogOpen(true);
  }, [setExportDialogOpen]);

  // Helper to get media duration from URL - uses multiple detection methods for reliability
  const getMediaDuration = useCallback(async (url: string, type: 'audio' | 'video'): Promise<number> => {
    return new Promise((resolve) => {
      const TIMEOUT_MS = 15000; // Increased timeout
      let resolved = false;
      
      const resolveOnce = (duration: number, source: string) => {
        if (!resolved) {
          resolved = true;
          console.log(`Duration detected (${source}): ${duration}ms for ${url.substring(0, 50)}...`);
          resolve(duration);
        }
      };
      
      const timeoutId = setTimeout(() => {
        console.warn(`Media duration detection timed out for: ${url}`);
        resolveOnce(5000, 'timeout');
      }, TIMEOUT_MS);
      
      if (type === 'audio') {
        const audio = new Audio();
        audio.preload = 'auto'; // Changed from 'metadata' to 'auto' for better blob URL support
        
        // Try multiple events for duration detection
        const handleDurationChange = () => {
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            clearTimeout(timeoutId);
            const durationMs = audio.duration * 1000;
            resolveOnce(durationMs, 'durationchange');
          }
        };
        
        const handleLoadedMetadata = () => {
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            clearTimeout(timeoutId);
            const durationMs = audio.duration * 1000;
            resolveOnce(durationMs, 'loadedmetadata');
          }
        };
        
        const handleCanPlayThrough = () => {
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            clearTimeout(timeoutId);
            const durationMs = audio.duration * 1000;
            resolveOnce(durationMs, 'canplaythrough');
          }
        };
        
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('canplaythrough', handleCanPlayThrough);
        audio.addEventListener('loadeddata', handleCanPlayThrough);
        
        audio.addEventListener('error', (e) => {
          clearTimeout(timeoutId);
          console.error('Audio duration detection error:', e);
          resolveOnce(5000, 'error');
        });
        
        audio.src = url;
        if (typeof audio.load === 'function') {
          try { audio.load(); } catch (e) { /* ignore */ }
        }
      } else {
        const video = document.createElement('video');
        video.preload = 'auto'; // Changed from 'metadata' to 'auto'
        
        const handleDurationChange = () => {
          if (video.duration && isFinite(video.duration) && video.duration > 0) {
            clearTimeout(timeoutId);
            const durationMs = video.duration * 1000;
            resolveOnce(durationMs, 'durationchange');
          }
        };
        
        const handleLoadedMetadata = () => {
          if (video.duration && isFinite(video.duration) && video.duration > 0) {
            clearTimeout(timeoutId);
            const durationMs = video.duration * 1000;
            resolveOnce(durationMs, 'loadedmetadata');
          }
        };
        
        const handleCanPlayThrough = () => {
          if (video.duration && isFinite(video.duration) && video.duration > 0) {
            clearTimeout(timeoutId);
            const durationMs = video.duration * 1000;
            resolveOnce(durationMs, 'canplaythrough');
          }
        };
        
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplaythrough', handleCanPlayThrough);
        video.addEventListener('loadeddata', handleCanPlayThrough);
        
        video.addEventListener('error', (e) => {
          clearTimeout(timeoutId);
          console.error('Video duration detection error:', e);
          resolveOnce(5000, 'error');
        });
        
        video.src = url;
        if (typeof video.load === 'function') {
          try { video.load(); } catch (e) { /* ignore */ }
        }
      }
    });
  }, []);

  const handleAddMedia = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,audio/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0) return;

      for (const file of files) {
        try {
          // Create object URL for the file
          const url = URL.createObjectURL(file);
          
          // Determine media type
          let mediaType: 'image' | 'video' | 'music' | 'voiceover';
          let trackType: 'video' | 'music' | 'voiceover';
          
          if (file.type.startsWith('image/')) {
            mediaType = 'image';
            trackType = 'video';
          } else if (file.type.startsWith('video/')) {
            mediaType = 'video';
            trackType = 'video';
          } else if (file.type.startsWith('audio/')) {
            // Default to music track - user can drag to voiceover track later
            mediaType = 'music';
            trackType = 'music';
          } else {
            continue;
          }

          // Get actual media duration for audio and video files
          let duration: number;
          let originalDuration: number;
          
          if (file.type.startsWith('video/')) {
            duration = await getMediaDuration(url, 'video');
            originalDuration = duration;
          } else if (file.type.startsWith('audio/')) {
            // Both music and voiceover are audio types
            duration = await getMediaDuration(url, 'audio');
            originalDuration = duration;
          } else {
            // Default 5 seconds for images
            duration = 5000;
            originalDuration = duration;
          }

          // Find or create appropriate track
          let track = tracks.find(t => t.type === trackType);
          if (!track) {
            const trackId = await addTrack({
              projectId: project.id,
              type: trackType,
              label: `${trackType.charAt(0).toUpperCase() + trackType.slice(1)} Track`,
              locked: false,
              order: tracks.length,
            });
            track = { id: trackId, projectId: project.id, type: trackType, label: `${trackType} Track`, locked: false, order: tracks.length };
          }

          // Add keyframe at the end of existing content or at start
          await addKeyframe({
            trackId: track.id,
            timestamp: 0,
            duration,
            data: {
              type: mediaType,
              mediaId: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url,
              prompt: file.name,
              originalDuration, // Store original duration for waveform scaling
            },
          });
        } catch (error) {
          console.error('Failed to add media file:', error);
        }
      }
    };
    
    input.click();
  }, [project.id, tracks, addTrack, addKeyframe, getMediaDuration]);

  // Check if timeline has content - memoized
  const hasContent = useMemo(() => tracks.length > 0, [tracks.length]);

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b border-border bg-background',
        className
      )}
    >
      {/* Left: Project Title */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">{project.title}</h2>
      </div>

      {/* Center: Playback Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddMedia}
          className="gap-2"
          aria-label="Add Media"
        >
          <Plus className="h-4 w-4" />
          Add Media
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handlePlayPause}
          disabled={!player || !hasContent}
          aria-label={playerState === 'playing' ? 'Pause' : 'Play'}
        >
          {playerState === 'playing' ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Right: Aspect Ratio & Export */}
      <div className="flex items-center gap-2">
        {/* Aspect Ratio Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Maximize2 className="h-4 w-4" />
              {project.aspectRatio}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ASPECT_RATIOS.map((ratio) => (
              <DropdownMenuItem
                key={ratio.value}
                onClick={() => handleAspectRatioChange(ratio.value)}
                className={cn(
                  project.aspectRatio === ratio.value && 'bg-accent'
                )}
              >
                {ratio.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Button */}
        <Button
          variant="default"
          size="sm"
          onClick={handleExport}
          disabled={!hasContent}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
    </div>
  );
});
