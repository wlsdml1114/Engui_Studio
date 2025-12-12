# Design Document

## Overview

This feature adds automatic audio extraction and synchronization when video media containing audio is added to the video editor timeline. The system will detect audio in video files, extract it to a separate audio file, create a muted version of the video for the video track, and create a synchronized audio keyframe on an appropriate audio track (music or voiceover). This prevents duplicate audio playback and enables users to edit video and audio independently without manual extraction steps.

## Architecture

The audio extraction and synchronization feature will be implemented as an extension to the existing media drop handling in the `VideoTimeline` component. The architecture follows these key principles:

1. **Detection-First Approach**: Check for audio presence before attempting extraction
2. **Asynchronous Processing**: Audio extraction happens asynchronously to avoid blocking the UI
3. **Graceful Degradation**: If audio extraction fails, the video is still added to the timeline
4. **Track Selection Logic**: Automatically select the most appropriate audio track based on availability and conflicts

### Component Interaction Flow

```
User drops video → VideoTimeline.handleDrop()
                 ↓
            Detect audio presence
                 ↓
         Has audio? ──No──→ Add video keyframe (original)
                 ↓
                Yes
                 ↓
    Create muted video (async) → FFmpeg Service
                 ↓
         Save muted video → File System
                 ↓
         Add video keyframe (muted version)
                 ↓
    Extract audio (async) → FFmpeg Service
                 ↓
         Save audio file → File System
                 ↓
    Find available audio track
                 ↓
    Add audio keyframe (synchronized)
```

## Components and Interfaces

### 1. Audio Detection Service

A new utility function to detect if a video file contains audio:

```typescript
/**
 * Detects if a video file contains an audio track
 * @param videoUrl - URL or path to the video file
 * @returns Promise<boolean> - true if audio is present
 */
async function hasAudioTrack(videoUrl: string): Promise<boolean>
```

Implementation approach:
- Create a temporary video element
- Load the video metadata
- Check for audio tracks using `HTMLMediaElement.audioTracks` or `mozHasAudio`/`webkitAudioDecodedByteCount`
- Fallback to attempting audio context creation if browser APIs are limited

### 2. Audio Extraction Service

Extend the existing `ffmpegService.ts` to include audio extraction:

```typescript
/**
 * Extracts audio from a video file and saves it as a separate audio file
 * @param videoPath - Path to the source video file
 * @param outputPath - Path where the extracted audio should be saved
 * @returns Promise<string> - Path to the extracted audio file
 */
async function extractAudioFromVideo(
  videoPath: string,
  outputPath: string
): Promise<string>
```

Implementation details:
- Use FFmpeg to extract audio: `ffmpeg -i input.mp4 -vn -acodec copy output.mp3`
- Support multiple audio formats (mp3, wav, aac)
- Handle file path resolution for both local and public URLs
- Implement error handling for missing audio tracks

### 2.1. Video Muting Service

Add a new function to `ffmpegService.ts` to create muted video files:

```typescript
/**
 * Creates a muted version of a video file (removes audio track)
 * @param videoPath - Path to the source video file
 * @param outputPath - Path where the muted video should be saved
 * @returns Promise<string> - Path to the muted video file
 */
async function createMutedVideo(
  videoPath: string,
  outputPath: string
): Promise<string>
```

Implementation details:
- Use FFmpeg to remove audio: `ffmpeg -i input.mp4 -an -vcodec copy output.mp4`
- Preserve video codec and quality (use copy to avoid re-encoding)
- Handle file path resolution for both local and public URLs
- Implement error handling for processing failures

### 3. Track Selection Logic

A new utility function to find the best audio track for the extracted audio:

```typescript
/**
 * Finds an available audio track for the given timestamp
 * @param tracks - All available tracks
 * @param keyframes - All existing keyframes
 * @param timestamp - Target timestamp for the audio
 * @param duration - Duration of the audio clip
 * @returns string | null - Track ID or null if no suitable track found
 */
function findAvailableAudioTrack(
  tracks: VideoTrack[],
  keyframes: Record<string, VideoKeyFrame[]>,
  timestamp: number,
  duration: number
): string | null
```

Selection algorithm:
1. Filter tracks to only audio tracks (music, voiceover)
2. For each audio track, check for conflicts at the target timestamp
3. A conflict exists if any keyframe overlaps with [timestamp, timestamp + duration]
4. Return the first track without conflicts
5. Prefer music track over voiceover if both are available
6. Return null if no suitable track is found

### 4. Enhanced VideoTimeline Component

Modify the `handleDrop` function in `VideoTimeline.tsx`:

```typescript
const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
  // ... existing normalization code ...
  
  // Add video keyframe first
  const videoKeyframeId = await addKeyframe(videoKeyframeData);
  
  // If video type, check for audio and extract
  if (normalizedType === 'video') {
    try {
      const hasAudio = await hasAudioTrack(mediaUrl);
      
      if (hasAudio) {
        // Extract audio asynchronously
        const audioPath = await extractAudioFromVideo(mediaUrl);
        
        // Find available audio track
        const audioTrackId = findAvailableAudioTrack(
          tracks,
          keyframes,
          timestamp,
          duration
        );
        
        if (audioTrackId) {
          // Add synchronized audio keyframe
          await addKeyframe({
            trackId: audioTrackId,
            timestamp,
            duration,
            data: {
              type: 'music', // or 'voiceover' based on track type
              mediaId: `${mediaId}-audio`,
              url: audioPath,
              prompt: `${mediaName} (audio)`,
              originalDuration: duration,
            },
          });
          
          // Show success notification
          showNotification('Audio extracted and added to timeline');
        } else {
          // Show warning notification
          showNotification('No available audio track for extracted audio', 'warning');
        }
      }
    } catch (error) {
      console.error('Audio extraction failed:', error);
      showNotification('Failed to extract audio from video', 'error');
    }
  }
  
  // ... rest of existing code ...
};
```

## Data Models

### Extended VideoKeyFrame Data

No changes to the existing `VideoKeyFrame` interface are required. The audio keyframe will use the existing structure:

```typescript
{
  id: string;
  trackId: string; // ID of the audio track
  timestamp: number; // Same as video keyframe
  duration: number; // Same as video keyframe
  data: {
    type: 'music' | 'voiceover';
    mediaId: string; // Reference to extracted audio
    url: string; // Path to extracted audio file
    prompt?: string; // Description
    originalDuration: number; // For waveform rendering
  };
}
```

### Audio File Naming Convention

Extracted audio files will follow this naming pattern:
```
{original-video-filename}-audio-{timestamp}.mp3
```

Example: `flux-krea-abc123.mp4` → `flux-krea-abc123-audio-1701234567.mp3`

Files will be stored in: `public/results/audio/`

### Muted Video File Naming Convention

Muted video files will follow this naming pattern:
```
{original-video-filename}-muted-{timestamp}.mp4
```

Example: `flux-krea-abc123.mp4` → `flux-krea-abc123-muted-1701234567.mp4`

Files will be stored in: `public/results/video/`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, the following redundancies were identified:
- Properties 4.1 and 4.2 are redundant with Property 1.1 (all test the same extraction behavior)
- Properties 1.2 and 1.3 can be combined into a single synchronization property

The following properties provide unique validation value:

### Property 1: Audio extraction for videos with audio
*For any* video file with an audio track, when added to a video track at any timestamp, the system should create a corresponding audio keyframe on an available audio track.
**Validates: Requirements 1.1, 4.1, 4.2**

### Property 2: Video and audio keyframe synchronization
*For any* video with audio added to the timeline, the created audio keyframe should have the same timestamp and duration as the video keyframe.
**Validates: Requirements 1.2, 1.3**

### Property 3: No audio extraction for silent videos
*For any* video file without an audio track, when added to a video track, the system should not create any audio keyframe.
**Validates: Requirements 1.4**

### Property 4: Audio track selection with conflicts
*For any* video with audio being added at a timestamp where some audio tracks have conflicting keyframes, the system should select the first audio track (music or voiceover) that has no overlap at the target timestamp and duration.
**Validates: Requirements 1.5**

### Property 5: Audio file creation
*For any* video file with audio, when audio is extracted, a separate audio file should be created in the workspace storage.
**Validates: Requirements 3.1**

### Property 6: Audio file naming convention
*For any* extracted audio file, the filename should follow the pattern `{source-video-name}-audio-{timestamp}.{ext}` and reference the source video.
**Validates: Requirements 3.2**

### Property 7: Audio keyframe URL storage
*For any* audio keyframe created from video extraction, the keyframe data should contain a valid URL pointing to the extracted audio file.
**Validates: Requirements 3.3**

### Property 8: Audio keyframe duration metadata
*For any* audio keyframe created from video extraction, the keyframe data should contain the originalDuration field set to the audio's actual duration.
**Validates: Requirements 3.4**

### Property 9: Audio detection before extraction
*For any* video file being added to the timeline, the system should call the audio detection function before attempting audio extraction.
**Validates: Requirements 4.3**

### Property 10: Muted video file creation
*For any* video file with audio, when added to a video track, a muted version of the video should be created and stored in the workspace.
**Validates: Requirements 1.6, 3.5**

### Property 11: Muted video file naming convention
*For any* muted video file, the filename should follow the pattern `{source-video-name}-muted-{timestamp}.{ext}` and reference the source video.
**Validates: Requirements 3.6**

### Property 12: Video keyframe uses muted video
*For any* video with audio added to a video track, the video keyframe should reference the muted video file URL, not the original video URL.
**Validates: Requirements 3.7**


## Error Handling

### Audio Detection Errors

- **Network Errors**: If the video URL is inaccessible, log the error and proceed without audio extraction
- **Browser API Limitations**: If audio detection APIs are not available, attempt extraction anyway and handle extraction failures gracefully
- **Timeout**: If audio detection takes longer than 5 seconds, assume no audio and proceed

### Audio Extraction Errors

- **FFmpeg Not Available**: Display error message to user and log to console
- **Invalid Video Format**: Display error message indicating unsupported format
- **Extraction Failure**: Log detailed error, display user-friendly message, but still add video keyframe
- **File System Errors**: If audio file cannot be saved, display error and clean up partial files

### Track Selection Errors

- **No Audio Tracks Available**: Display warning notification suggesting user create an audio track
- **All Tracks Occupied**: Display warning notification about conflicting keyframes
- **Track Creation Failure**: Log error and notify user

### General Error Handling Principles

1. **Non-Blocking**: Audio extraction failures should never prevent video keyframe creation
2. **User Feedback**: Always provide clear feedback about what succeeded and what failed
3. **Graceful Degradation**: System should work even if audio extraction is unavailable
4. **Cleanup**: Failed extractions should clean up any partial files created

## Testing Strategy

### Unit Testing

Unit tests will cover specific scenarios and edge cases:

1. **Audio Detection**:
   - Test with video files that have audio
   - Test with video files without audio
   - Test with invalid video URLs
   - Test timeout handling

2. **Track Selection**:
   - Test with no audio tracks
   - Test with one available audio track
   - Test with multiple available audio tracks
   - Test with all tracks occupied
   - Test preference for music over voiceover

3. **File Naming**:
   - Test naming convention with various video filenames
   - Test handling of special characters in filenames
   - Test uniqueness of generated filenames

### Property-Based Testing

Property-based tests will verify universal properties across many inputs using **fast-check** (JavaScript/TypeScript property testing library). Each test will run a minimum of 100 iterations.

1. **Property 1: Audio extraction for videos with audio**
   - Generate: Random video files with audio, random timestamps
   - Test: Audio keyframe is created on an audio track
   - Tag: `**Feature: video-audio-track-sync, Property 1: Audio extraction for videos with audio**`

2. **Property 2: Video and audio keyframe synchronization**
   - Generate: Random video files with audio, random timestamps and durations
   - Test: Audio keyframe timestamp and duration match video keyframe
   - Tag: `**Feature: video-audio-track-sync, Property 2: Video and audio keyframe synchronization**`

3. **Property 3: No audio extraction for silent videos**
   - Generate: Random video files without audio
   - Test: No audio keyframe is created
   - Tag: `**Feature: video-audio-track-sync, Property 3: No audio extraction for silent videos**`

4. **Property 4: Audio track selection with conflicts**
   - Generate: Random track configurations with existing keyframes, random video additions
   - Test: Selected track has no conflicts at target timestamp
   - Tag: `**Feature: video-audio-track-sync, Property 4: Audio track selection with conflicts**`

5. **Property 5: Audio file creation**
   - Generate: Random video files with audio
   - Test: Audio file exists in workspace after extraction
   - Tag: `**Feature: video-audio-track-sync, Property 5: Audio file creation**`

6. **Property 6: Audio file naming convention**
   - Generate: Random video filenames
   - Test: Extracted audio filename follows pattern
   - Tag: `**Feature: video-audio-track-sync, Property 6: Audio file naming convention**`

7. **Property 7: Audio keyframe URL storage**
   - Generate: Random video files with audio
   - Test: Audio keyframe data contains valid URL
   - Tag: `**Feature: video-audio-track-sync, Property 7: Audio keyframe URL storage**`

8. **Property 8: Audio keyframe duration metadata**
   - Generate: Random video files with audio
   - Test: Audio keyframe data contains originalDuration field
   - Tag: `**Feature: video-audio-track-sync, Property 8: Audio keyframe duration metadata**`

9. **Property 9: Audio detection before extraction**
   - Generate: Random video files
   - Test: Detection function is called before extraction function
   - Tag: `**Feature: video-audio-track-sync, Property 9: Audio detection before extraction**`

### Integration Testing

Integration tests will verify the complete flow:

1. End-to-end test: Add video with audio to timeline and verify both video and audio keyframes are created
2. Test interaction with existing keyframes and track selection
3. Test error recovery when extraction fails
4. Test notification system integration

### Testing Tools

- **Unit Tests**: Vitest
- **Property-Based Tests**: fast-check
- **Test Utilities**: React Testing Library for component testing
- **Mocking**: Mock FFmpeg service for controlled testing scenarios
