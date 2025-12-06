# Implementation Plan

- [x] 1. Create audio detection utility
  - Implement `hasAudioTrack()` function in a new utility file
  - Use HTMLMediaElement APIs to detect audio presence in video files
  - Handle browser compatibility and fallback detection methods
  - Add timeout handling (5 seconds) for detection
  - _Requirements: 1.4, 4.3_

- [x] 1.1 Write property test for audio detection
  - **Property 9: Audio detection before extraction**
  - **Validates: Requirements 4.3**

- [x] 2. Extend FFmpeg service for audio extraction
  - Add `extractAudioFromVideo()` function to `src/lib/ffmpegService.ts`
  - Implement FFmpeg command for audio extraction
  - Handle file path resolution for local and public URLs
  - Add error handling for missing audio tracks and invalid formats
  - Create output directory structure (`public/results/audio/`)
  - _Requirements: 3.1, 3.2_

- [ ] 2.3 Add video muting function to FFmpeg service
  - Add `createMutedVideo()` function to `src/lib/ffmpegService.ts`
  - Implement FFmpeg command to remove audio track: `ffmpeg -i input.mp4 -an -vcodec copy output.mp4`
  - Use video codec copy to avoid re-encoding
  - Handle file path resolution for local and public URLs
  - Create output directory structure (`public/results/video/`)
  - Add error handling for processing failures
  - _Requirements: 1.6, 3.5, 3.6_

- [x] 2.1 Write property test for audio file creation
  - **Property 5: Audio file creation**
  - **Validates: Requirements 3.1**

- [x] 2.2 Write property test for audio file naming
  - **Property 6: Audio file naming convention**
  - **Validates: Requirements 3.2**

- [ ] 2.4 Write property test for muted video creation
  - **Property 10: Muted video file creation**
  - **Validates: Requirements 1.6, 3.5**

- [ ] 2.5 Write property test for muted video naming
  - **Property 11: Muted video file naming convention**
  - **Validates: Requirements 3.6**

- [x] 3. Implement track selection logic
  - Create `findAvailableAudioTrack()` utility function
  - Implement conflict detection algorithm for overlapping keyframes
  - Add preference logic (music over voiceover)
  - Handle case when no suitable track is found
  - _Requirements: 1.5, 2.3_

- [x] 3.1 Write property test for track selection
  - **Property 4: Audio track selection with conflicts**
  - **Validates: Requirements 1.5**

- [x] 4. Integrate audio extraction into VideoTimeline
  - Modify `handleDrop()` in `VideoTimeline.tsx` to detect audio in videos
  - When video has audio, create muted version first before adding video keyframe
  - Use muted video URL for video keyframe instead of original video URL
  - Add async audio extraction call after video keyframe creation
  - Implement track selection and audio keyframe creation
  - Add proper error handling and user notifications
  - Ensure video keyframe is added even if audio extraction fails
  - _Requirements: 1.1, 1.2, 1.3, 1.6, 2.1, 2.2, 3.3, 3.4, 3.7_

- [x] 4.1 Write property test for audio extraction
  - **Property 1: Audio extraction for videos with audio**
  - **Validates: Requirements 1.1, 4.1, 4.2**

- [x] 4.2 Write property test for synchronization
  - **Property 2: Video and audio keyframe synchronization**
  - **Validates: Requirements 1.2, 1.3**

- [x] 4.3 Write property test for silent videos
  - **Property 3: No audio extraction for silent videos**
  - **Validates: Requirements 1.4**

- [x] 4.4 Write property test for URL storage
  - **Property 7: Audio keyframe URL storage**
  - **Validates: Requirements 3.3**

- [x] 4.5 Write property test for duration metadata
  - **Property 8: Audio keyframe duration metadata**
  - **Validates: Requirements 3.4**

- [ ] 4.6 Write property test for muted video usage
  - **Property 12: Video keyframe uses muted video**
  - **Validates: Requirements 3.7**

- [x] 5. Add notification system
  - Implement toast/notification component for user feedback
  - Add success notification for audio extraction
  - Add warning notification for no available tracks
  - Add error notification for extraction failures
  - _Requirements: 2.1, 2.2, 2.3_

- [-] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
