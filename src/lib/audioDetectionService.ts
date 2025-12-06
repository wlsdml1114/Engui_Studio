/**
 * Audio Detection Service
 * Provides utilities for detecting audio presence in video files
 */

/**
 * Detects if a video file contains an audio track
 * @param videoUrl - URL or path to the video file
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns Promise<boolean> - true if audio is present, false otherwise
 */
export async function hasAudioTrack(
  videoUrl: string,
  timeoutMs: number = 5000
): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    
    let timeoutId: NodeJS.Timeout;
    let resolved = false;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      video.pause();
      video.src = '';
      video.load();
    };

    const resolveOnce = (hasAudio: boolean) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(hasAudio);
      }
    };

    // Set timeout handler
    timeoutId = setTimeout(() => {
      console.warn(`Audio detection timed out after ${timeoutMs}ms for ${videoUrl}`);
      resolveOnce(false);
    }, timeoutMs);

    // Handle metadata loaded event
    video.addEventListener('loadedmetadata', () => {
      try {
        // Method 1: Check audioTracks API (modern browsers)
        const videoWithAudioTracks = video as any;
        if (videoWithAudioTracks.audioTracks && videoWithAudioTracks.audioTracks.length > 0) {
          resolveOnce(true);
          return;
        }

        // Method 2: Check mozHasAudio (Firefox)
        if ('mozHasAudio' in video && (video as any).mozHasAudio) {
          resolveOnce(true);
          return;
        }

        // Method 3: Check webkitAudioDecodedByteCount (Safari/Chrome)
        if ('webkitAudioDecodedByteCount' in video) {
          // Need to play a bit to get accurate count
          video.currentTime = 0.1;
          setTimeout(() => {
            if ((video as any).webkitAudioDecodedByteCount > 0) {
              resolveOnce(true);
            } else {
              resolveOnce(false);
            }
          }, 100);
          return;
        }

        // Method 4: Fallback - assume no audio if no detection method available
        // This is conservative but prevents false positives
        resolveOnce(false);
      } catch (error) {
        console.error('Error detecting audio track:', error);
        resolveOnce(false);
      }
    });

    // Handle error event
    video.addEventListener('error', (e) => {
      console.error('Error loading video for audio detection:', e);
      resolveOnce(false);
    });

    // Start loading the video
    video.src = videoUrl;
    video.load();
  });
}
