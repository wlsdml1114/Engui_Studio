/**
 * Track Selection Service
 * Provides utilities for selecting appropriate audio tracks for extracted audio
 */

import { VideoTrack, VideoKeyFrame } from './context/StudioContext';

/**
 * Checks if two time ranges overlap
 * @param start1 - Start time of first range (ms)
 * @param end1 - End time of first range (ms)
 * @param start2 - Start time of second range (ms)
 * @param end2 - End time of second range (ms)
 * @returns true if ranges overlap
 */
function hasTimeOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  // Two ranges overlap if one starts before the other ends
  return start1 < end2 && start2 < end1;
}

/**
 * Finds an available audio track for the given timestamp and duration
 * @param tracks - All available tracks
 * @param keyframes - All existing keyframes organized by track ID
 * @param timestamp - Target timestamp for the audio (ms)
 * @param duration - Duration of the audio clip (ms)
 * @returns Track ID or null if no suitable track found
 */
export function findAvailableAudioTrack(
  tracks: VideoTrack[],
  keyframes: Record<string, VideoKeyFrame[]>,
  timestamp: number,
  duration: number
): string | null {
  // Filter to only audio tracks (music and voiceover)
  const audioTracks = tracks.filter(
    (track) => track.type === 'music' || track.type === 'voiceover'
  );

  if (audioTracks.length === 0) {
    return null;
  }

  // Sort tracks to prefer music over voiceover
  const sortedTracks = [...audioTracks].sort((a, b) => {
    if (a.type === 'music' && b.type === 'voiceover') return -1;
    if (a.type === 'voiceover' && b.type === 'music') return 1;
    return 0;
  });

  const targetStart = timestamp;
  const targetEnd = timestamp + duration;

  // Find first track without conflicts
  for (const track of sortedTracks) {
    const trackKeyframes = keyframes[track.id] || [];
    
    // Check if any keyframe on this track conflicts with our target time range
    const hasConflict = trackKeyframes.some((keyframe) => {
      const keyframeStart = keyframe.timestamp;
      const keyframeEnd = keyframe.timestamp + keyframe.duration;
      return hasTimeOverlap(targetStart, targetEnd, keyframeStart, keyframeEnd);
    });

    if (!hasConflict) {
      return track.id;
    }
  }

  // No suitable track found
  return null;
}
