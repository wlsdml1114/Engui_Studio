'use client';

import React, { HTMLAttributes, MouseEventHandler, createElement, useMemo, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useStudio, VideoTrack, VideoKeyFrame } from '@/lib/context/StudioContext';
import { TrashIcon, VideoIcon, MusicIcon, MicIcon } from 'lucide-react';
import { AudioWaveform } from './AudioWaveform';

// Track type icons mapping
const trackIcons = {
  video: VideoIcon,
  music: MusicIcon,
  voiceover: MicIcon,
};

type VideoTrackRowProps = {
  track: VideoTrack;
  keyframes: VideoKeyFrame[];
  allKeyframes: VideoKeyFrame[]; // All keyframes for snapping
  pixelsPerMs: number;
  onMoveKeyframeToTrack?: (keyframeId: string, targetTrackId: string, timestamp: number) => void;
} & HTMLAttributes<HTMLDivElement>;

export const VideoTrackRow = React.memo(function VideoTrackRow({
  track,
  keyframes,
  allKeyframes,
  pixelsPerMs,
  onMoveKeyframeToTrack,
  className,
  ...props
}: VideoTrackRowProps) {
  const trackRowRef = useRef<HTMLDivElement>(null);

  // Check if this track can accept audio drops (for visual styling)
  const canAcceptAudioDrop = track.type === 'music' || track.type === 'voiceover';

  return (
    <div className="flex flex-col">
      {/* Track Row with Keyframes */}
      <div
        ref={trackRowRef}
        className={cn(
          'relative w-full timeline-container h-16',
          'flex flex-col select-none rounded shrink-0',
          // Add subtle background for audio tracks to show drop zone
          canAcceptAudioDrop ? 'bg-white/5' : 'bg-transparent',
          className
        )}
        data-track-id={track.id}
        data-track-type={track.type}
        {...props}
      >
        {(keyframes || []).map((frame) => (
          <VideoTrackView
            key={frame.id}
            className="absolute top-0 bottom-0"
            style={{
              left: `${frame.timestamp * pixelsPerMs}px`,
              width: `${frame.duration * pixelsPerMs}px`,
            }}
            track={track}
            frame={frame}
            allKeyframes={allKeyframes}
            pixelsPerMs={pixelsPerMs}
            onMoveToTrack={onMoveKeyframeToTrack}
          />
        ))}
      </div>
    </div>
  );
});

type VideoTrackViewProps = {
  track: VideoTrack;
  frame: VideoKeyFrame;
  allKeyframes: VideoKeyFrame[];
  pixelsPerMs: number;
  onMoveToTrack?: (keyframeId: string, targetTrackId: string, timestamp: number) => void;
} & HTMLAttributes<HTMLDivElement>;

export const VideoTrackView = React.memo(function VideoTrackView({
  className,
  track,
  frame,
  allKeyframes,
  pixelsPerMs,
  onMoveToTrack,
  ...props
}: VideoTrackViewProps) {
  const {
    selectedKeyframeIds,
    selectKeyframe,
    removeKeyframe,
    updateKeyframe,
  } = useStudio();

  const isSelected = selectedKeyframeIds.includes(frame.id);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleOnClick: MouseEventHandler = useCallback((e) => {
    // Ignore double clicks
    if (e.detail > 1) {
      return;
    }
    
    // Only select if we didn't drag (click without movement)
    if (!isDraggingRef.current) {
      selectKeyframe(frame.id);
    }
  }, [selectKeyframe, frame.id]);

  const handleOnDelete = useCallback(async () => {
    await removeKeyframe(frame.id);
  }, [removeKeyframe, frame.id]);

  const imageUrl = useMemo(() => {
    if (frame.data.type === 'image' || frame.data.type === 'video') {
      return frame.data.url;
    }
    return undefined;
  }, [frame.data]);

  const isAudio = useMemo(() => 
    frame.data.type === 'music' || frame.data.type === 'voiceover',
    [frame.data.type]
  );

  const label = useMemo(() => frame.data.prompt || frame.data.type || 'unknown', [frame.data]);

  // Calculate clip width in pixels for waveform
  const clipWidth = useMemo(() => frame.duration * pixelsPerMs, [frame.duration, pixelsPerMs]);

  // Handle drag within track and cross-track movement (mousedown-based)
  // This handles both horizontal movement and cross-track movement for audio clips
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Skip if clicking on buttons or resize handles
    if (
      (e.target as HTMLElement).closest(
        'button,[role="button"],a,input,textarea,select,[data-resize-handle]',
      )
    ) {
      return;
    }

    e.preventDefault();
    
    const trackElement = trackRef.current;
    if (!trackElement) return;

    // Reset drag state
    isDraggingRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = trackElement.offsetLeft;
    const startTimestamp = frame.timestamp;
    const SNAP_THRESHOLD_MS = 100;
    const DRAG_THRESHOLD = 5; // pixels - movement threshold to consider it a drag
    const TRACK_HEIGHT = 64; // Height of each track row
    let targetTrackId: string | null = null;

    // Get all other keyframes for snapping
    const otherKeyframes = allKeyframes.filter(kf => kf.id !== frame.id);
    const snapPoints: number[] = [0];
    
    otherKeyframes.forEach(kf => {
      snapPoints.push(kf.timestamp);
      snapPoints.push(kf.timestamp + kf.duration);
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // Check if we've moved enough to consider it a drag
      if (!isDraggingRef.current && dragStartPosRef.current) {
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > DRAG_THRESHOLD) {
          isDraggingRef.current = true;
        }
      }
      
      if (!isDraggingRef.current) return;
      
      const newLeft = startLeft + deltaX;
      let newTimestamp = Math.max(0, newLeft / pixelsPerMs);
      const clipEnd = newTimestamp + frame.duration;

      // Check for snap points
      for (const snapPoint of snapPoints) {
        if (Math.abs(newTimestamp - snapPoint) < SNAP_THRESHOLD_MS) {
          newTimestamp = snapPoint;
          break;
        }
        if (Math.abs(clipEnd - snapPoint) < SNAP_THRESHOLD_MS) {
          newTimestamp = snapPoint - frame.duration;
          break;
        }
      }

      newTimestamp = Math.max(0, newTimestamp);
      trackElement.style.left = `${newTimestamp * pixelsPerMs}px`;
      
      // For audio clips, check if we're hovering over a different track
      if (isAudio) {
        // Find the track element under the mouse
        const elementsUnderMouse = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
        const trackRowElement = elementsUnderMouse.find(el => el.hasAttribute('data-track-id'));
        
        if (trackRowElement) {
          const hoveredTrackId = trackRowElement.getAttribute('data-track-id');
          const hoveredTrackType = trackRowElement.getAttribute('data-track-type');
          
          // Only allow moving to audio tracks
          if (hoveredTrackId && (hoveredTrackType === 'music' || hoveredTrackType === 'voiceover')) {
            targetTrackId = hoveredTrackId;
            // Visual feedback - highlight the target track
            trackRowElement.classList.add('ring-2', 'ring-blue-500');
          }
        }
        
        // Remove highlight from other tracks
        document.querySelectorAll('[data-track-id].ring-2').forEach(el => {
          if (el.getAttribute('data-track-id') !== targetTrackId) {
            el.classList.remove('ring-2', 'ring-blue-500');
          }
        });
      }
    };

    const handleMouseUp = async () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Remove all track highlights
      document.querySelectorAll('[data-track-id].ring-2').forEach(el => {
        el.classList.remove('ring-2', 'ring-blue-500');
      });
      
      const wasDragging = isDraggingRef.current;
      
      // Reset drag state
      isDraggingRef.current = false;
      dragStartPosRef.current = null;
      
      if (!wasDragging) return;

      const finalLeft = trackElement.offsetLeft;
      const finalTimestamp = Math.max(0, Math.round(finalLeft / pixelsPerMs));

      // Check if we need to move to a different track
      if (isAudio && targetTrackId && targetTrackId !== track.id && onMoveToTrack) {
        console.log(`Moving keyframe ${frame.id} to track ${targetTrackId} at ${finalTimestamp}ms`);
        await onMoveToTrack(frame.id, targetTrackId, finalTimestamp);
      } else if (finalTimestamp !== startTimestamp) {
        await updateKeyframe(frame.id, { timestamp: finalTimestamp });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle resize (right edge)
  const handleResize = (
    e: React.MouseEvent<HTMLDivElement>,
    direction: 'left' | 'right',
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const trackElement = trackRef.current;
    if (!trackElement) return;

    isResizingRef.current = true;
    const startX = e.clientX;
    const startTimestamp = frame.timestamp;
    const startDuration = frame.duration;
    const minDuration = 1000;
    const SNAP_THRESHOLD_MS = 100;

    // Get snap points from other keyframes
    const otherKeyframes = allKeyframes.filter(kf => kf.id !== frame.id);
    const snapPoints: number[] = [0];
    otherKeyframes.forEach(kf => {
      snapPoints.push(kf.timestamp);
      snapPoints.push(kf.timestamp + kf.duration);
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      
      const deltaX = moveEvent.clientX - startX;
      const deltaMs = deltaX / pixelsPerMs;

      if (direction === 'right') {
        let newDuration = Math.max(minDuration, startDuration + deltaMs);
        const newEnd = startTimestamp + newDuration;
        
        for (const snapPoint of snapPoints) {
          if (Math.abs(newEnd - snapPoint) < SNAP_THRESHOLD_MS) {
            newDuration = snapPoint - startTimestamp;
            break;
          }
        }
        
        newDuration = Math.max(minDuration, newDuration);
        trackElement.style.width = `${newDuration * pixelsPerMs}px`;
      } else {
        const rightEdge = startTimestamp + startDuration;
        let newTimestamp = Math.max(0, startTimestamp + deltaMs);
        
        for (const snapPoint of snapPoints) {
          if (Math.abs(newTimestamp - snapPoint) < SNAP_THRESHOLD_MS) {
            newTimestamp = snapPoint;
            break;
          }
        }
        
        newTimestamp = Math.max(0, newTimestamp);
        const newDuration = Math.max(minDuration, rightEdge - newTimestamp);

        trackElement.style.left = `${newTimestamp * pixelsPerMs}px`;
        trackElement.style.width = `${newDuration * pixelsPerMs}px`;
      }
    };

    const handleMouseUp = async () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (!isResizingRef.current) return;
      isResizingRef.current = false;

      const finalLeft = trackElement.offsetLeft;
      const finalWidth = trackElement.offsetWidth;
      const finalTimestamp = Math.max(0, Math.round(finalLeft / pixelsPerMs));
      const finalDuration = Math.max(minDuration, Math.round(finalWidth / pixelsPerMs));

      if (direction === 'right') {
        if (finalDuration !== startDuration) {
          await updateKeyframe(frame.id, { duration: finalDuration });
        }
      } else {
        if (finalTimestamp !== startTimestamp || finalDuration !== startDuration) {
          await updateKeyframe(frame.id, {
            timestamp: finalTimestamp,
            duration: finalDuration,
          });
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={trackRef}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
      aria-checked={isSelected}
      onClick={handleOnClick}
      className={cn(
        'flex flex-col border border-white/10 rounded-lg cursor-grab active:cursor-grabbing relative',
        isSelected && 'ring-2 ring-blue-500',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'flex flex-col select-none rounded overflow-hidden group h-full',
          {
            'bg-sky-600': track.type === 'video',
            'bg-teal-500': track.type === 'music',
            'bg-indigo-500': track.type === 'voiceover',
          },
        )}
      >
        <div className="relative z-60 p-0.5 pl-1 bg-black/10 flex flex-row items-center pointer-events-auto">
          <div className="flex flex-row gap-1 text-sm items-center font-semibold text-white/60 w-full">
            <div className="flex flex-row truncate gap-1 items-center">
              {createElement(trackIcons[track.type], {
                className: 'w-5 h-5 text-white',
              })}
              <span className="line-clamp-1 truncate text-sm mb-[2px] w-full">
                {label}
              </span>
            </div>
            <div className="flex flex-row shrink-0 flex-1 items-center justify-end">
              <button
                type="button"
                className="p-1 rounded hover:bg-black/5 group-hover:text-white"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOnDelete();
                }}
                title="Remove content"
              >
                <TrashIcon className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
        </div>
        <div
          className="p-px flex-1 items-center bg-repeat-x h-full max-h-full overflow-hidden relative"
          style={
            imageUrl
              ? {
                  background: `url(${imageUrl})`,
                  backgroundSize: 'auto 100%',
                }
              : undefined
          }
        >
          {/* Audio Waveform */}
          {isAudio && (
            <div className="absolute inset-0 flex items-center px-1">
              <AudioWaveform
                url={frame.data.url}
                width={Math.max(50, clipWidth - 20)}
                height={36}
                color={track.type === 'music' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.6)'}
                clipDuration={frame.duration}
                originalDuration={frame.data.originalDuration}
                volume={frame.data.volume ?? track.volume ?? 100}
              />
            </div>
          )}
          
          {/* Right trim handle */}
          <div
            data-resize-handle="right"
            className={cn(
              'absolute right-0 z-50 top-0 bg-black/20 group-hover:bg-black/40',
              'rounded-md bottom-0 w-2 m-1 p-px cursor-ew-resize backdrop-blur-md text-white/40',
              'transition-colors flex flex-col items-center justify-center text-xs tracking-tighter',
            )}
            onMouseDown={(e) => handleResize(e, 'right')}
            draggable={false}
          >
            <span className="flex gap-[1px]">
              <span className="w-px h-2 rounded bg-white/40" />
              <span className="w-px h-2 rounded bg-white/40" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
