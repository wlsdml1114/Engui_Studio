import React, { useEffect, useRef } from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from 'remotion';
import { VideoProject, VideoTrack, VideoKeyFrame } from '@/lib/context/StudioContext';
import { fitMedia, FitMode } from '@/lib/mediaFitting';
import { calculateFinalVolume, volumeToGain } from '@/lib/audioMixing';
import { normalizeUrl } from '@/lib/utils';

// Constants
const FPS = 30;

// Helper function to get aspect ratio dimensions
export function getAspectRatioDimensions(aspectRatio: '16:9' | '9:16' | '1:1'): { width: number; height: number } {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1024, height: 576 };
    case '9:16':
      return { width: 576, height: 1024 };
    case '1:1':
      return { width: 1024, height: 1024 };
    default:
      return { width: 1024, height: 576 };
  }
}

// Helper function to convert milliseconds to frames
export function msToFrames(ms: number, fps: number = FPS): number {
  return Math.ceil((ms / 1000) * fps);
}

// Props for the main composition
export interface VideoCompositionProps {
  project: VideoProject;
  tracks: VideoTrack[];
  keyframes: Record<string, VideoKeyFrame[]>;
}

// Component to render a single video/image keyframe
interface MediaKeyFrameProps {
  keyframe: VideoKeyFrame;
  canvasWidth: number;
  canvasHeight: number;
}

function MediaKeyFrame({ keyframe, canvasWidth, canvasHeight }: MediaKeyFrameProps) {
  // Get fit mode from keyframe data, default to 'contain'
  const fitMode: FitMode = keyframe.data.fitMode || 'contain';
  
  // For now, we'll use a placeholder for media dimensions
  // In a real implementation, we would need to load the media to get its actual dimensions
  // For this implementation, we'll use CSS object-fit which handles this automatically
  
  const getObjectFit = (mode: FitMode): 'contain' | 'cover' | 'fill' => {
    switch (mode) {
      case 'contain':
        return 'contain';
      case 'cover':
        return 'cover';
      case 'fill':
        return 'fill';
      default:
        return 'contain';
    }
  };
  
  const objectFit = getObjectFit(fitMode);
  
  // Normalize URL to handle relative paths (especially on Windows)
  const normalizedUrl = keyframe.data.url ? normalizeUrl(keyframe.data.url) : '';
  
  // Debug log for video URLs
  if (keyframe.data.type === 'video' && normalizedUrl) {
    console.log('[VideoComposition] Video URL - original:', keyframe.data.url, 'normalized:', normalizedUrl);
  }
  
  if (keyframe.data.type === 'video') {
    return (
      <OffthreadVideo
        src={normalizedUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
        }}
      />
    );
  }
  
  if (keyframe.data.type === 'image') {
    return (
      <Img
        src={normalizedUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
        }}
      />
    );
  }
  
  return null;
}

// Component to render audio keyframe using HTML5 Audio with Remotion sync
interface AudioKeyFrameProps {
  keyframe: VideoKeyFrame;
  trackVolume: number;
  trackMuted: boolean;
}

function AudioKeyFrame({ keyframe, trackVolume, trackMuted }: AudioKeyFrameProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastFrameRef = useRef<number>(-1);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const pauseCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const detectedDurationRef = useRef<number | null>(null);
  
  // Calculate the original audio duration (in seconds)
  // Priority: detected duration > originalDuration > keyframe duration
  const getEffectiveDuration = () => {
    if (detectedDurationRef.current && detectedDurationRef.current > 0) {
      return detectedDurationRef.current;
    }
    if (keyframe.data.originalDuration && keyframe.data.originalDuration > 0) {
      return keyframe.data.originalDuration / 1000;
    }
    return keyframe.duration / 1000;
  };
  
  const originalDurationSec = getEffectiveDuration();
  
  // Set up interval to check if playback has stopped (frame not changing)
  useEffect(() => {
    if (keyframe.data.type !== 'music' && keyframe.data.type !== 'voiceover') {
      return;
    }
    
    // Check every 100ms if frame has stopped changing (player paused)
    pauseCheckIntervalRef.current = setInterval(() => {
      const timeSinceLastFrame = Date.now() - lastFrameTimeRef.current;
      // If frame hasn't changed in 200ms, assume player is paused
      if (timeSinceLastFrame > 200 && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }, 100);
    
    return () => {
      if (pauseCheckIntervalRef.current) {
        clearInterval(pauseCheckIntervalRef.current);
      }
    };
  }, [keyframe.data.type]);
  
  useEffect(() => {
    if (keyframe.data.type !== 'music' && keyframe.data.type !== 'voiceover') {
      return;
    }
    
    // Update last frame time
    lastFrameTimeRef.current = Date.now();
    
    // Create audio element if not exists
    if (!audioRef.current && keyframe.data.url) {
      // Normalize URL to handle relative paths (especially on Windows)
      const normalizedUrl = normalizeUrl(keyframe.data.url);
      audioRef.current = new Audio(normalizedUrl);
      audioRef.current.preload = 'auto';
      
      // Detect actual audio duration when loaded
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current && audioRef.current.duration && isFinite(audioRef.current.duration)) {
          detectedDurationRef.current = audioRef.current.duration;
          console.log(`AudioKeyFrame: Detected duration ${audioRef.current.duration}s for ${keyframe.data.url?.substring(0, 50)}...`);
        }
      });
      
      audioRef.current.addEventListener('durationchange', () => {
        if (audioRef.current && audioRef.current.duration && isFinite(audioRef.current.duration)) {
          detectedDurationRef.current = audioRef.current.duration;
        }
      });
    }
    
    const audio = audioRef.current;
    
    // Calculate and apply final volume
    const keyframeVolume = keyframe.data.volume;
    const finalVolume = calculateFinalVolume(trackVolume, keyframeVolume, trackMuted);
    const gain = volumeToGain(finalVolume);
    audio.volume = Math.max(0, Math.min(1, gain)); // Clamp to 0-1 for HTML5 Audio
    
    const currentTimeSec = frame / fps;
    
    // Only update if frame changed significantly (avoid micro-updates)
    if (Math.abs(frame - lastFrameRef.current) < 2 && lastFrameRef.current !== -1) {
      return;
    }
    lastFrameRef.current = frame;
    
    // Use detected duration if available, otherwise fall back to stored duration
    const effectiveDuration = detectedDurationRef.current || originalDurationSec;
    
    // Check if current time is within the audio's actual duration
    if (currentTimeSec >= 0 && currentTimeSec < effectiveDuration) {
      // Sync audio position if it drifted too much (more than 0.3 seconds)
      const drift = Math.abs(audio.currentTime - currentTimeSec);
      if (drift > 0.3 || audio.paused) {
        audio.currentTime = currentTimeSec;
      }
      
      // Play if paused
      if (audio.paused) {
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    } else {
      // Outside audio duration, pause
      if (!audio.paused) {
        audio.pause();
      }
    }
  }, [frame, fps, keyframe.data.type, keyframe.data.url, originalDurationSec]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pauseCheckIntervalRef.current) {
        clearInterval(pauseCheckIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);
  
  // This component doesn't render anything visible
  return null;
}

// Component to render a track's keyframes as sequences
interface TrackSequenceProps {
  track: VideoTrack;
  keyframes: VideoKeyFrame[];
  canvasWidth: number;
  canvasHeight: number;
}

function VideoTrackSequence({ track, keyframes, canvasWidth, canvasHeight }: TrackSequenceProps) {
  // Sort keyframes by timestamp
  const sortedKeyframes = [...keyframes].sort((a, b) => a.timestamp - b.timestamp);
  
  return (
    <>
      {sortedKeyframes.map((keyframe) => {
        const startFrame = msToFrames(keyframe.timestamp);
        const durationFrames = msToFrames(keyframe.duration);
        
        return (
          <Sequence
            key={keyframe.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <AbsoluteFill>
              <MediaKeyFrame 
                keyframe={keyframe} 
                canvasWidth={canvasWidth} 
                canvasHeight={canvasHeight} 
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </>
  );
}

function AudioTrackSequence({ track, keyframes, canvasWidth, canvasHeight }: TrackSequenceProps) {
  // Sort keyframes by timestamp
  const sortedKeyframes = [...keyframes].sort((a, b) => a.timestamp - b.timestamp);
  
  // Get track volume and muted state, with defaults
  const trackVolume = track.volume ?? 100;
  const trackMuted = track.muted ?? false;
  
  return (
    <>
      {sortedKeyframes.map((keyframe) => {
        const startFrame = msToFrames(keyframe.timestamp);
        // For audio, use originalDuration if available (actual audio length)
        // This ensures the Sequence doesn't end before the audio finishes
        const audioDuration = keyframe.data.originalDuration || keyframe.duration;
        const durationFrames = msToFrames(audioDuration);
        
        console.log(`AudioTrackSequence: keyframe ${keyframe.id}, duration=${keyframe.duration}ms, originalDuration=${keyframe.data.originalDuration}ms, using=${audioDuration}ms, frames=${durationFrames}`);
        
        // Skip if no valid URL
        if (!keyframe.data.url) {
          console.warn(`Skipping audio keyframe ${keyframe.id} - no URL`);
          return null;
        }
        
        return (
          <Sequence
            key={keyframe.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            {/* HTML5 audio for preview playback */}
            <AudioKeyFrame 
              keyframe={keyframe} 
              trackVolume={trackVolume}
              trackMuted={trackMuted}
            />
          </Sequence>
        );
      })}
    </>
  );
}

// Main composition component
export function MainComposition({ project, tracks, keyframes }: VideoCompositionProps) {
  // Get canvas dimensions from project settings
  // Use project's width and height if available, otherwise fall back to aspect ratio calculation
  const { width: canvasWidth, height: canvasHeight } = project.width && project.height
    ? { width: project.width, height: project.height }
    : getAspectRatioDimensions(project.aspectRatio);
  
  // Separate tracks by type
  const videoTracks = tracks.filter(t => t.type === 'video');
  const audioTracks = tracks.filter(t => t.type === 'music' || t.type === 'voiceover');
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Render video tracks (layered) */}
      {videoTracks.map((track) => {
        const trackKeyframes = keyframes[track.id] || [];
        return (
          <VideoTrackSequence
            key={track.id}
            track={track}
            keyframes={trackKeyframes}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        );
      })}
      
      {/* Render audio tracks */}
      {audioTracks.map((track) => {
        const trackKeyframes = keyframes[track.id] || [];
        return (
          <AudioTrackSequence
            key={track.id}
            track={track}
            keyframes={trackKeyframes}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        );
      })}
    </AbsoluteFill>
  );
}

// Export the composition for use with Remotion Player
export const VideoComposition: React.FC<VideoCompositionProps> = (props) => {
  return <MainComposition {...props} />;
};

// Export constants for use in other components
export { FPS };
