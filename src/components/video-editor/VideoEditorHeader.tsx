'use client';

import React, { useCallback, useMemo } from 'react';
import { useStudio, VideoProject } from '@/lib/context/StudioContext';
import { Button } from '@/components/ui/button';
import { Download, Plus, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoEditorHeaderProps {
  project: VideoProject;
  className?: string;
}

export const VideoEditorHeader = React.memo(function VideoEditorHeader({ project, className }: VideoEditorHeaderProps) {
  const {
    setExportDialogOpen,
    tracks,
    addTrack,
    addKeyframe,
  } = useStudio();

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
          // Upload file to server first
          const formData = new FormData();
          formData.append('file', file);
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          const uploadData = await uploadResponse.json();
          
          // Use server URL if upload succeeded, otherwise fall back to blob URL
          const url = uploadData.success ? uploadData.url : URL.createObjectURL(file);
          
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
          // Use server URL if available, otherwise use blob URL
          const durationUrl = uploadData.success ? url : URL.createObjectURL(file);
          let duration: number;
          let originalDuration: number;
          
          if (file.type.startsWith('video/')) {
            duration = await getMediaDuration(durationUrl, 'video');
            originalDuration = duration;
          } else if (file.type.startsWith('audio/')) {
            // Both music and voiceover are audio types
            duration = await getMediaDuration(durationUrl, 'audio');
            originalDuration = duration;
          } else {
            // Default 5 seconds for images
            duration = 5000;
            originalDuration = duration;
          }
          
          // Clean up blob URL if it was used
          if (!uploadData.success && durationUrl.startsWith('blob:')) {
            URL.revokeObjectURL(durationUrl);
          }
          
          // Log upload status
          if (uploadData.success) {
            console.log(`✓ File uploaded successfully: ${file.name} -> ${url}`);
          } else {
            console.warn(`⚠ File upload failed for ${file.name}, using blob URL`);
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
              volume: 100,
              muted: false,
            });
            track = { 
              id: trackId, 
              projectId: project.id, 
              type: trackType, 
              label: `${trackType} Track`, 
              locked: false, 
              order: tracks.length,
              volume: 100,
              muted: false,
            };
          }

          // For videos with uploaded files, check for audio and process
          let finalUrl = url;
          if (mediaType === 'video' && uploadData.success) {
            try {
              console.log('Detecting audio in uploaded video:', url);
              // Detect audio using server-side detection
              const audioDetectionResponse = await fetch('/api/video-tracks/detect-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoPath: url }),
              });

              if (audioDetectionResponse.ok) {
                const { hasAudio } = await audioDetectionResponse.json();
                console.log('Audio detection result:', hasAudio);

                if (hasAudio) {
                  console.log('Video has audio, creating muted version...');
                  // Create muted version
                  const mutedResponse = await fetch('/api/video-tracks/create-muted', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoPath: url }),
                  });

                  if (mutedResponse.ok) {
                    const { mutedVideoPath } = await mutedResponse.json();
                    finalUrl = mutedVideoPath;
                    console.log('✓ Using muted video:', mutedVideoPath);
                  }

                  // Extract audio
                  console.log('Extracting audio...');
                  const audioResponse = await fetch('/api/video-tracks/extract-audio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoPath: url }),
                  });

                  if (audioResponse.ok) {
                    const { audioPath } = await audioResponse.json();
                    console.log('✓ Audio extracted:', audioPath);

                    // Find or create audio track
                    let audioTrack = tracks.find(t => t.type === 'music');
                    if (!audioTrack) {
                      const audioTrackId = await addTrack({
                        projectId: project.id,
                        type: 'music',
                        label: 'Music Track',
                        locked: false,
                        order: tracks.length + 1,
                        volume: 100,
                        muted: false,
                      });
                      audioTrack = { 
                        id: audioTrackId, 
                        projectId: project.id, 
                        type: 'music', 
                        label: 'Music Track', 
                        locked: false, 
                        order: tracks.length + 1,
                        volume: 100,
                        muted: false,
                      };
                    }

                    // Add audio keyframe
                    if (audioTrack) {
                      await addKeyframe({
                        trackId: audioTrack.id,
                        timestamp: 0,
                        duration,
                        data: {
                          type: 'music',
                          mediaId: `local-audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          url: audioPath,
                          prompt: `${file.name} (audio)`,
                          originalDuration,
                        },
                      });
                      console.log('✓ Audio keyframe added');
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Audio processing failed:', error);
            }
          }

          // Add video keyframe (with muted video if audio was present)
          if (track) {
            await addKeyframe({
              trackId: track.id,
              timestamp: 0,
              duration,
              data: {
                type: mediaType,
                mediaId: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                url: finalUrl,
                prompt: file.name,
                originalDuration, // Store original duration for waveform scaling
              },
            });
          }
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FolderOpen className="h-4 w-4" />
        <span className="font-medium">{project.title}</span>
      </div>

      {/* Center: Add Media */}
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
      </div>

      {/* Right: Export */}
      <div className="flex items-center gap-2">
        {/* Export Video Button */}
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
