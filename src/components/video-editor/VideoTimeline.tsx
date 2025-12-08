'use client';

import React, { HTMLAttributes, useRef, MouseEvent, DragEvent, useState, useMemo, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useStudio, VideoProject, VideoTrack, VideoKeyFrame } from '@/lib/context/StudioContext';
import { TimelineRuler } from './TimelineRuler';
import { VideoTrackRow } from './VideoTrackRow';
import { TimelineControls } from './TimelineControls';
import { validateKeyframeData } from '@/lib/videoEditorValidation';
import { AlertCircle } from 'lucide-react';
import { hasAudioTrack } from '@/lib/audioDetectionService';
import { findAvailableAudioTrack } from '@/lib/trackSelectionService';

const BASE_PIXELS_PER_SECOND = 100;
const TRACK_TYPE_ORDER = ['video', 'music', 'voiceover'] as const;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_SENSITIVITY = 0.005; // Increased for faster zoom response

interface VideoTimelineProps extends HTMLAttributes<HTMLDivElement> {
  project: VideoProject;
  tracks: VideoTrack[];
  keyframes: Record<string, VideoKeyFrame[]>;
  currentTimestamp: number;
  zoom: number;
}

export const VideoTimeline = React.memo(function VideoTimeline({
  project,
  tracks,
  keyframes,
  currentTimestamp,
  zoom,
  className,
  ...props
}: VideoTimelineProps) {
  const { setCurrentTimestamp, addKeyframe, addTrack, updateKeyframe, removeKeyframe, player, setZoom, clearSelection } = useStudio();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Memoize calculations
  const durationSeconds = useMemo(() => project.duration / 1000, [project.duration]);
  const pixelsPerSecond = useMemo(() => BASE_PIXELS_PER_SECOND * zoom, [zoom]);
  const timelineWidth = useMemo(() => pixelsPerSecond * durationSeconds, [pixelsPerSecond, durationSeconds]);
  const pixelsPerMs = useMemo(() => pixelsPerSecond / 1000, [pixelsPerSecond]);

  // Sort tracks by type order - memoized
  const sortedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => {
      const orderA = TRACK_TYPE_ORDER.indexOf(a.type as any);
      const orderB = TRACK_TYPE_ORDER.indexOf(b.type as any);
      return orderA - orderB;
    });
  }, [tracks]);



  // Calculate playhead position - memoized
  // currentTimestamp is in seconds, convert to pixels
  const playheadPosition = useMemo(
    () => currentTimestamp * pixelsPerSecond,
    [currentTimestamp, pixelsPerSecond]
  );

  const handleTimelineClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Check if click was on empty space (not on a keyframe)
    const target = event.target as HTMLElement;
    const isKeyframeClick = target.closest('[aria-checked]');
    
    // Clear selection when clicking on empty space
    if (!isKeyframeClick) {
      clearSelection();
    }

    const relativeX = event.clientX - rect.left;
    // Convert pixels to seconds
    const timestamp = relativeX / pixelsPerSecond;
    
    // Clamp timestamp to valid range
    const clampedTimestamp = Math.max(0, Math.min(durationSeconds, timestamp));
    setCurrentTimestamp(clampedTimestamp);

    // Seek player if available
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(Math.floor(clampedTimestamp * 30)); // Assuming 30 FPS
    }
  }, [pixelsPerSecond, durationSeconds, setCurrentTimestamp, player, clearSelection]);

  const getTrackIdForMediaType = useCallback(async (mediaType: string): Promise<string> => {
    // Map media type to track type
    let trackType: 'video' | 'music' | 'voiceover';
    if (mediaType === 'image' || mediaType === 'video') {
      trackType = 'video';
    } else if (mediaType === 'music') {
      trackType = 'music';
    } else {
      trackType = 'voiceover';
    }

    // Find existing track of this type
    const existingTrack = tracks.find(t => t.type === trackType);
    if (existingTrack) {
      return existingTrack.id;
    }

    // Create new track
    const trackId = await addTrack({
      projectId: project.id,
      type: trackType,
      label: `${trackType.charAt(0).toUpperCase() + trackType.slice(1)} Track`,
      locked: false,
      order: tracks.length,
      volume: 100, // Default volume
      muted: false, // Default not muted
    });

    return trackId;
  }, [tracks, addTrack, project.id]);

  // Helper to get media duration from URL - uses multiple detection methods for reliability
  const getMediaDuration = useCallback(async (url: string, type: string): Promise<number> => {
    return new Promise((resolve) => {
      const TIMEOUT_MS = 15000; // Increased timeout for blob URLs
      let resolved = false;
      
      const resolveOnce = (duration: number, source: string) => {
        if (!resolved) {
          resolved = true;
          console.log(`Duration detected (${source}): ${duration}ms for ${url.substring(0, 50)}...`);
          resolve(duration);
        }
      };
      
      // Timeout fallback
      const timeoutId = setTimeout(() => {
        console.warn(`Media duration detection timed out for: ${url}`);
        resolveOnce(5000, 'timeout');
      }, TIMEOUT_MS);
      
      if (type === 'music' || type === 'voiceover') {
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
        // Force load for some browsers (skip in test environment where load() is not implemented)
        if (typeof audio.load === 'function') {
          try {
            audio.load();
          } catch (e) {
            // Ignore load errors in test environment
          }
        }
      } else if (type === 'video') {
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
        // Force load for some browsers (skip in test environment where load() is not implemented)
        if (typeof video.load === 'function') {
          try {
            video.load();
          } catch (e) {
            // Ignore load errors in test environment
          }
        }
      } else {
        clearTimeout(timeoutId);
        resolveOnce(5000, 'default'); // Default for images
      }
    });
  }, []);

  const handleDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setValidationError(null);
    setNotification(null);
    
    try {
      const mediaDataStr = event.dataTransfer.getData('application/json');
      if (!mediaDataStr) return;

      const rawMediaData = JSON.parse(mediaDataStr);
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Normalize media data from different sources (Library, RightPanel, etc.)
      // Library uses: mediaType, mediaUrl/audioUrl/videoUrl
      // Direct drops use: type, url
      const mediaType = rawMediaData.type || rawMediaData.mediaType;
      const mediaUrl = rawMediaData.url || rawMediaData.mediaUrl || rawMediaData.audioUrl || rawMediaData.videoUrl || rawMediaData.resultUrl;
      const mediaId = rawMediaData.id || rawMediaData.jobId || `media-${Date.now()}`;
      const mediaName = rawMediaData.prompt || rawMediaData.audioName || rawMediaData.name || '';
      
      // Map 'audio' type to 'music' - user can drag to voiceover track later
      let normalizedType: 'image' | 'video' | 'music' | 'voiceover' = mediaType;
      if (mediaType === 'audio') {
        normalizedType = 'music';
      }
      
      console.log('Drop data normalized:', { mediaType, normalizedType, mediaUrl, mediaId, mediaName });

      const relativeX = event.clientX - rect.left;
      const timestamp = Math.max(0, (relativeX / timelineWidth) * durationSeconds * 1000);

      // Get or create appropriate track
      const trackId = await getTrackIdForMediaType(normalizedType);

      // Always get actual media duration from the file for accurate timeline placement
      // This ensures the keyframe duration matches the actual media length
      let duration: number;
      let originalDuration: number;
      
      if (mediaUrl && (normalizedType === 'music' || normalizedType === 'voiceover' || normalizedType === 'video')) {
        // For audio and video, always detect duration from the actual file
        console.log(`Detecting duration for ${normalizedType} from: ${mediaUrl}`);
        duration = await getMediaDuration(mediaUrl, normalizedType);
        originalDuration = duration;
        console.log(`Duration detected: ${duration}ms`);
      } else if (rawMediaData.duration) {
        // Use provided duration if available (e.g., for images)
        duration = rawMediaData.duration;
        originalDuration = rawMediaData.originalDuration || duration;
      } else {
        // Default fallback for images without duration
        duration = 5000;
        originalDuration = duration;
      }

      // Prepare keyframe data
      const keyframeData = {
        trackId,
        timestamp,
        duration,
        data: {
          type: normalizedType,
          mediaId: mediaId,
          url: mediaUrl,
          prompt: rawMediaData.prompt,
          originalDuration, // Store original duration for waveform scaling
        },
      };

      // Validate keyframe data before adding
      const validation = validateKeyframeData(keyframeData);
      if (!validation.valid) {
        setValidationError(validation.error || 'Invalid keyframe data');
        console.error('Keyframe validation failed:', validation.error);
        return;
      }

      // If video type, check for audio and create muted version if needed
      let finalVideoUrl = mediaUrl;
      if (normalizedType === 'video' && mediaUrl) {
        // Skip audio processing for blob URLs (browser-only, can't be processed server-side)
        const isBlobUrl = mediaUrl.startsWith('blob:');
        
        if (isBlobUrl) {
          console.log('Blob URL detected, skipping server-side audio processing:', mediaUrl);
          // For blob URLs, use client-side detection only
          try {
            const hasAudio = await hasAudioTrack(mediaUrl);
            if (hasAudio) {
              console.warn('Blob URL video has audio but cannot be processed server-side. Audio will play from video track.');
              setNotification({
                message: 'Video uploaded from file - audio cannot be separated. Please use generated videos for audio separation.',
                type: 'warning',
              });
            }
          } catch (error) {
            console.warn('Failed to detect audio in blob URL:', error);
          }
        } else {
          // For regular URLs (generated videos), process audio
          try {
            // Detect audio presence using server-side detection (more reliable)
            console.log('Detecting audio in video:', mediaUrl);
            const audioDetectionResponse = await fetch('/api/video-tracks/detect-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoPath: mediaUrl }),
            });

            let hasAudio = false;
            if (audioDetectionResponse.ok) {
              const { hasAudio: detected } = await audioDetectionResponse.json();
              hasAudio = detected;
              console.log('Audio detection result:', hasAudio);
            } else {
              console.warn('Audio detection failed, falling back to client-side detection');
              // Fallback to client-side detection
              hasAudio = await hasAudioTrack(mediaUrl);
            }
          
          if (hasAudio) {
            console.log('Video has audio, creating muted version...');
            // Create muted version of the video for the video track
            const mutedResponse = await fetch('/api/video-tracks/create-muted', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoPath: mediaUrl }),
            });

            if (mutedResponse.ok) {
              const { mutedVideoPath } = await mutedResponse.json();
              finalVideoUrl = mutedVideoPath;
              console.log('✓ Using muted video for video track:', mutedVideoPath);
            } else {
              const errorData = await mutedResponse.json();
              console.error('Failed to create muted video:', errorData);
              console.warn('Using original video with audio');
            }

            console.log('Extracting audio from video...');

            // Extract audio asynchronously
            // Note: This requires server-side API call since FFmpeg runs on server
            const audioResponse = await fetch('/api/video-tracks/extract-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoPath: mediaUrl }),
            });

            if (!audioResponse.ok) {
              throw new Error('Failed to extract audio from video');
            }

            const { audioPath } = await audioResponse.json();
            console.log('✓ Audio extracted:', audioPath);
            
            // Find available audio track
            const audioTrackId = findAvailableAudioTrack(
              tracks,
              keyframes,
              timestamp,
              duration
            );
            
            console.log('Available audio track:', audioTrackId);
            
            if (audioTrackId) {
              // Determine track type for audio keyframe
              const audioTrack = tracks.find(t => t.id === audioTrackId);
              const audioType = audioTrack?.type === 'voiceover' ? 'voiceover' : 'music';
              
              // Add synchronized audio keyframe
              await addKeyframe({
                trackId: audioTrackId,
                timestamp,
                duration,
                data: {
                  type: audioType,
                  mediaId: `${mediaId}-audio`,
                  url: audioPath,
                  prompt: `${mediaName} (audio)`,
                  originalDuration: duration,
                },
              });
              
              console.log('✓ Audio keyframe added to track:', audioTrackId);
            } else {
              console.warn('No available audio track found');
              // Show warning notification
              setNotification({
                message: 'No available audio track for extracted audio',
                type: 'warning',
              });
            }
            } else {
              console.log('Video has no audio, skipping extraction');
            }
          } catch (error) {
            console.error('Audio extraction failed:', error);
            setNotification({
              message: 'Failed to extract audio from video',
              type: 'error',
            });
            // Don't throw - continue with video keyframe
          }
        }
      }

      // Update keyframe data with final video URL (muted if audio was present)
      keyframeData.data.url = finalVideoUrl;

      // Add video keyframe with muted video URL if audio was present
      await addKeyframe(keyframeData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add media';
      setValidationError(errorMessage);
      console.error('Failed to handle drop:', error);
    }
  }, [timelineWidth, durationSeconds, getTrackIdForMediaType, addKeyframe, getMediaDuration, tracks, keyframes]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Handle moving a keyframe to a different track (for audio track switching)
  const handleMoveKeyframeToTrack = useCallback(async (keyframeId: string, targetTrackId: string, timestamp: number) => {
    // Find the keyframe in all tracks
    let sourceKeyframe: VideoKeyFrame | null = null;
    let sourceTrackId: string | null = null;
    
    for (const [trackId, trackKeyframes] of Object.entries(keyframes)) {
      const found = trackKeyframes.find(kf => kf.id === keyframeId);
      if (found) {
        sourceKeyframe = found;
        sourceTrackId = trackId;
        break;
      }
    }
    
    if (!sourceKeyframe || !sourceTrackId) {
      console.warn('Source keyframe not found:', keyframeId);
      return;
    }
    
    // If same track, just update timestamp (position change within track)
    if (sourceTrackId === targetTrackId) {
      if (Math.round(timestamp) !== sourceKeyframe.timestamp) {
        await updateKeyframe(keyframeId, { timestamp: Math.round(timestamp) });
        console.log(`Moved keyframe ${keyframeId} to new position ${timestamp}ms within same track`);
      }
      return;
    }
    
    // Get target track to update media type
    const targetTrack = tracks.find(t => t.id === targetTrackId);
    if (!targetTrack) {
      console.warn('Target track not found:', targetTrackId);
      return;
    }
    
    // Update the keyframe's trackId and media type
    const newMediaType = targetTrack.type === 'voiceover' ? 'voiceover' : 'music';
    
    // Remove from source and add to target
    await removeKeyframe(keyframeId);
    await addKeyframe({
      trackId: targetTrackId,
      timestamp: Math.round(timestamp),
      duration: sourceKeyframe.duration,
      data: {
        ...sourceKeyframe.data,
        type: newMediaType,
      },
    });
    
    console.log(`Moved keyframe ${keyframeId} from ${sourceTrackId} to ${targetTrackId} at ${timestamp}ms`);
  }, [keyframes, tracks, removeKeyframe, addKeyframe, updateKeyframe]);

  // Format time for accessibility
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    if (minutes > 0 || seconds >= 1) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${ms}ms`;
    }
  }, []);

  // Handle wheel zoom (Alt+Wheel or Ctrl+Wheel for mouse, pinch for trackpad)
  const handleWheel = useCallback((event: WheelEvent) => {
    // Check if Alt or Ctrl is pressed (for mouse wheel zoom)
    // Or if it's a pinch gesture (ctrlKey is true for trackpad pinch on macOS)
    if (event.altKey || event.ctrlKey) {
      event.preventDefault();
      
      // Calculate zoom delta
      // For trackpad pinch, deltaY is typically smaller and smoother
      // For mouse wheel, deltaY is larger (usually 100 or -100)
      const delta = -event.deltaY * ZOOM_SENSITIVITY;
      
      // Apply zoom with exponential scaling for smoother feel
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * (1 + delta)));
      setZoom(newZoom);
    }
  }, [zoom, setZoom]);

  // Attach wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    timeline.addEventListener('wheel', handleWheel, { passive: false });
    return () => timeline.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Keyboard navigation for timeline
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if timeline is focused
      if (!timelineRef.current?.contains(document.activeElement)) {
        return;
      }

      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case 'Home':
          event.preventDefault();
          setCurrentTimestamp(0);
          if (player && typeof player.seekTo === 'function') {
            player.seekTo(0);
          }
          break;
        case 'End':
          event.preventDefault();
          setCurrentTimestamp(durationSeconds);
          if (player && typeof player.seekTo === 'function') {
            player.seekTo(Math.floor(durationSeconds * 30)); // Assuming 30 FPS
          }
          break;
        case 'PageUp':
          event.preventDefault();
          {
            const newTime = Math.max(0, currentTimestamp - 5);
            setCurrentTimestamp(newTime);
            if (player && typeof player.seekTo === 'function') {
              player.seekTo(Math.floor(newTime * 30));
            }
          }
          break;
        case 'PageDown':
          event.preventDefault();
          {
            const newTime = Math.min(durationSeconds, currentTimestamp + 5);
            setCurrentTimestamp(newTime);
            if (player && typeof player.seekTo === 'function') {
              player.seekTo(Math.floor(newTime * 30));
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTimestamp, durationSeconds, player, setCurrentTimestamp]);

  return (
    <div
      className={cn('border-t border-border bg-background flex flex-col h-full', className)}
      role="region"
      aria-label="Video timeline"
      {...props}
    >
      {/* Validation Error Display */}
      {validationError && (
        <div 
          className="bg-destructive/10 border-l-4 border-destructive p-3 flex items-start gap-2"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Validation Error</p>
            <p className="text-sm text-destructive/90">{validationError}</p>
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="text-destructive hover:text-destructive/80 text-sm font-medium"
            aria-label="Dismiss validation error"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Notification Display */}
      {notification && (
        <div 
          className={cn(
            "border-l-4 p-3 flex items-start gap-2",
            notification.type === 'success' && "bg-green-500/10 border-green-500",
            notification.type === 'warning' && "bg-yellow-500/10 border-yellow-500",
            notification.type === 'error' && "bg-destructive/10 border-destructive"
          )}
          role="status"
          aria-live="polite"
        >
          <AlertCircle 
            className={cn(
              "w-5 h-5 flex-shrink-0 mt-0.5",
              notification.type === 'success' && "text-green-500",
              notification.type === 'warning' && "text-yellow-500",
              notification.type === 'error' && "text-destructive"
            )} 
            aria-hidden="true" 
          />
          <div className="flex-1">
            <p className={cn(
              "text-sm",
              notification.type === 'success' && "text-green-500",
              notification.type === 'warning' && "text-yellow-500",
              notification.type === 'error' && "text-destructive"
            )}>
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className={cn(
              "text-sm font-medium",
              notification.type === 'success' && "text-green-500 hover:text-green-500/80",
              notification.type === 'warning' && "text-yellow-500 hover:text-yellow-500/80",
              notification.type === 'error' && "text-destructive hover:text-destructive/80"
            )}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Timeline Controls */}
      <TimelineControls
        currentTimestamp={currentTimestamp}
        duration={durationSeconds}
        zoom={zoom}
        onZoomChange={setZoom}
      />
      
      <div
        ref={timelineRef}
        className="relative overflow-x-auto overflow-y-auto flex-1"
        onClick={handleTimelineClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        data-timeline-zoom={zoom}
        role="group"
        aria-label="Timeline tracks"
        tabIndex={0}
        aria-describedby="timeline-instructions"
      >
        {/* Timeline content wrapper */}
        <div className="relative" style={{ width: timelineWidth, minHeight: `${32 + (sortedTracks.length * 68) + 12}px` }}>
          {/* Timeline Ruler - Fixed height area above tracks */}
          <div className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-700" style={{ height: '32px' }}>
            <TimelineRuler
              duration={durationSeconds}
              zoom={zoom}
              timelineWidth={timelineWidth}
            />
          </div>

          {/* Playhead indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
            style={{ left: `${playheadPosition}px` }}
            role="presentation"
            aria-label={`Playhead at ${formatTime(currentTimestamp)}`}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" aria-hidden="true" />
          </div>

          {/* Track rows - positioned below ruler */}
          <div className="relative pt-1 space-y-1 pb-2">
            {sortedTracks.map((track) => (
              <VideoTrackRow
                key={track.id}
                track={track}
                keyframes={keyframes[track.id] || []}
                allKeyframes={Object.values(keyframes).flat()}
                pixelsPerMs={pixelsPerMs}
                onMoveKeyframeToTrack={handleMoveKeyframeToTrack}
                style={{ height: '64px' }}
              />
            ))}
          </div>

          {/* Empty state */}
          {sortedTracks.length === 0 && (
            <div 
              className="absolute inset-0 flex items-center justify-center text-muted-foreground pt-8"
              role="status"
            >
              <p>Drag and drop media here to start editing</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden instructions for screen readers */}
      <div id="timeline-instructions" className="sr-only">
        Timeline keyboard shortcuts: Home to go to start, End to go to end, Page Up to skip back 5 seconds, Page Down to skip forward 5 seconds. Click on timeline to seek to position. Drag and drop media to add to timeline. Use Alt+Scroll or Ctrl+Scroll to zoom, or pinch on trackpad.
      </div>
    </div>
  );
});

// Export constants for testing
export { BASE_PIXELS_PER_SECOND, TRACK_TYPE_ORDER };
