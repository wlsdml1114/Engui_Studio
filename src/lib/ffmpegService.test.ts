import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { ffmpegService } from './ffmpegService';
import * as fs from 'fs';
import * as path from 'path';

describe('FFmpegService - Audio Extraction', () => {
  const testVideoDir = path.join(process.cwd(), 'public', 'test-videos');
  const testAudioDir = path.join(process.cwd(), 'public', 'results', 'audio');
  const testMutedVideoDir = path.join(process.cwd(), 'public', 'results', 'video');
  
  beforeAll(() => {
    // Create test directories
    if (!fs.existsSync(testVideoDir)) {
      fs.mkdirSync(testVideoDir, { recursive: true });
    }
    if (!fs.existsSync(testAudioDir)) {
      fs.mkdirSync(testAudioDir, { recursive: true });
    }
    if (!fs.existsSync(testMutedVideoDir)) {
      fs.mkdirSync(testMutedVideoDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testAudioDir)) {
      const files = fs.readdirSync(testAudioDir);
      files.forEach(file => {
        if (file.includes('test-') || file.includes('-audio-')) {
          try {
            fs.unlinkSync(path.join(testAudioDir, file));
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      });
    }
    
    if (fs.existsSync(testMutedVideoDir)) {
      const files = fs.readdirSync(testMutedVideoDir);
      files.forEach(file => {
        if (file.includes('test-') || file.includes('-muted-')) {
          try {
            fs.unlinkSync(path.join(testMutedVideoDir, file));
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      });
    }
  });

  /**
   * **Feature: video-audio-track-sync, Property 5: Audio file creation**
   * **Validates: Requirements 3.1**
   * 
   * For any video file with audio, when audio is extracted, 
   * a separate audio file should be created in the workspace storage.
   */
  it('Property 5: Audio file creation - extracted audio files should exist in workspace', async () => {
    // Check if FFmpeg is available before running the test
    const isAvailable = await ffmpegService.isFFmpegAvailable();
    if (!isAvailable) {
      console.warn('FFmpeg not available, skipping audio extraction test');
      return;
    }

    // We need actual video files with audio to test this property
    // For now, we'll test with videos that exist in the public/generations directory
    const generationsDir = path.join(process.cwd(), 'public', 'generations');
    
    if (!fs.existsSync(generationsDir)) {
      console.warn('No generations directory found, skipping test');
      return;
    }

    const videoFiles = fs.readdirSync(generationsDir)
      .filter(file => file.endsWith('.mp4'))
      .slice(0, 3); // Test with up to 3 videos

    if (videoFiles.length === 0) {
      console.warn('No video files found for testing, skipping');
      return;
    }

    // Test each video file
    for (const videoFile of videoFiles) {
      const videoPath = `/generations/${videoFile}`;
      
      try {
        const audioPath = await ffmpegService.extractAudioFromVideo(videoPath);
        
        // Verify the audio file exists
        const fullAudioPath = path.join(process.cwd(), 'public', audioPath);
        expect(fs.existsSync(fullAudioPath)).toBe(true);
        
        // Verify the file has content
        const stats = fs.statSync(fullAudioPath);
        expect(stats.size).toBeGreaterThan(0);
        
        console.log(`✓ Audio extracted and verified: ${audioPath}`);
      } catch (error) {
        // If the video has no audio, that's expected
        if (error instanceof Error && error.message.includes('No audio')) {
          console.log(`✓ Video ${videoFile} has no audio (expected)`);
        } else {
          throw error;
        }
      }
    }
  }, 120000); // 2 minute timeout for multiple extractions

  /**
   * **Feature: video-audio-track-sync, Property 6: Audio file naming convention**
   * **Validates: Requirements 3.2**
   * 
   * For any extracted audio file, the filename should follow the pattern 
   * {source-video-name}-audio-{timestamp}.{ext} and reference the source video.
   */
  it('Property 6: Audio file naming convention - follows pattern with source video reference', async () => {
    // Check if FFmpeg is available
    const isAvailable = await ffmpegService.isFFmpegAvailable();
    if (!isAvailable) {
      console.warn('FFmpeg not available, skipping naming convention test');
      return;
    }

    // Find test videos
    const generationsDir = path.join(process.cwd(), 'public', 'generations');
    
    if (!fs.existsSync(generationsDir)) {
      console.warn('No generations directory found, skipping test');
      return;
    }

    const videoFiles = fs.readdirSync(generationsDir)
      .filter(file => file.endsWith('.mp4'))
      .slice(0, 3);

    if (videoFiles.length === 0) {
      console.warn('No video files found for testing, skipping');
      return;
    }

    // Test naming convention for each video
    for (const videoFile of videoFiles) {
      const videoPath = `/generations/${videoFile}`;
      const videoBasename = path.basename(videoFile, path.extname(videoFile));
      
      try {
        const audioPath = await ffmpegService.extractAudioFromVideo(videoPath);
        const audioFilename = path.basename(audioPath);
        
        // Verify naming pattern: {source-video-name}-audio-{timestamp}.mp3
        expect(audioFilename).toMatch(new RegExp(`^${videoBasename}-audio-\\d+\\.mp3$`));
        
        // Verify it contains the source video name
        expect(audioFilename).toContain(videoBasename);
        
        // Verify it contains '-audio-'
        expect(audioFilename).toContain('-audio-');
        
        // Verify it has a timestamp (numeric)
        const timestampMatch = audioFilename.match(/-audio-(\d+)\.mp3$/);
        expect(timestampMatch).toBeTruthy();
        if (timestampMatch) {
          const timestamp = parseInt(timestampMatch[1]);
          expect(timestamp).toBeGreaterThan(0);
        }
        
        console.log(`✓ Naming convention verified: ${audioFilename}`);
      } catch (error) {
        // If the video has no audio, skip
        if (error instanceof Error && error.message.includes('No audio')) {
          console.log(`✓ Video ${videoFile} has no audio (skipped)`);
        } else {
          throw error;
        }
      }
    }
  }, 120000);

  /**
   * **Feature: video-audio-track-sync, Property 10: Muted video file creation**
   * **Validates: Requirements 1.6, 3.5**
   * 
   * For any video file with audio, when added to a video track, 
   * a muted version of the video should be created and stored in the workspace.
   */
  it('Property 10: Muted video file creation - muted video files should exist in workspace', async () => {
    // Check if FFmpeg is available
    const isAvailable = await ffmpegService.isFFmpegAvailable();
    if (!isAvailable) {
      console.warn('FFmpeg not available, skipping muted video creation test');
      return;
    }

    // Find test videos
    const generationsDir = path.join(process.cwd(), 'public', 'generations');
    
    if (!fs.existsSync(generationsDir)) {
      console.warn('No generations directory found, skipping test');
      return;
    }

    const videoFiles = fs.readdirSync(generationsDir)
      .filter(file => file.endsWith('.mp4'))
      .slice(0, 3); // Test with up to 3 videos

    if (videoFiles.length === 0) {
      console.warn('No video files found for testing, skipping');
      return;
    }

    // Test each video file
    for (const videoFile of videoFiles) {
      const videoPath = `/generations/${videoFile}`;
      
      try {
        const mutedVideoPath = await ffmpegService.createMutedVideo(videoPath);
        
        // Verify the muted video file exists
        const fullMutedVideoPath = path.join(process.cwd(), 'public', mutedVideoPath);
        expect(fs.existsSync(fullMutedVideoPath)).toBe(true);
        
        // Verify the file has content
        const stats = fs.statSync(fullMutedVideoPath);
        expect(stats.size).toBeGreaterThan(0);
        
        // Verify it's smaller or equal to original (no audio = smaller or same if no audio existed)
        const originalPath = path.join(process.cwd(), 'public', videoPath);
        const originalStats = fs.statSync(originalPath);
        expect(stats.size).toBeLessThanOrEqual(originalStats.size);
        
        console.log(`✓ Muted video created and verified: ${mutedVideoPath}`);
      } catch (error) {
        console.error(`Failed to create muted video for ${videoFile}:`, error);
        throw error;
      }
    }
  }, 180000); // 3 minute timeout for video processing

  /**
   * **Feature: video-audio-track-sync, Property 11: Muted video file naming convention**
   * **Validates: Requirements 3.6**
   * 
   * For any muted video file, the filename should follow the pattern 
   * {source-video-name}-muted-{timestamp}.{ext} and reference the source video.
   */
  it('Property 11: Muted video file naming convention - follows pattern with source video reference', async () => {
    // Check if FFmpeg is available
    const isAvailable = await ffmpegService.isFFmpegAvailable();
    if (!isAvailable) {
      console.warn('FFmpeg not available, skipping muted video naming test');
      return;
    }

    // Find test videos
    const generationsDir = path.join(process.cwd(), 'public', 'generations');
    
    if (!fs.existsSync(generationsDir)) {
      console.warn('No generations directory found, skipping test');
      return;
    }

    const videoFiles = fs.readdirSync(generationsDir)
      .filter(file => file.endsWith('.mp4'))
      .slice(0, 3);

    if (videoFiles.length === 0) {
      console.warn('No video files found for testing, skipping');
      return;
    }

    // Test naming convention for each video
    for (const videoFile of videoFiles) {
      const videoPath = `/generations/${videoFile}`;
      const videoBasename = path.basename(videoFile, path.extname(videoFile));
      const videoExt = path.extname(videoFile);
      
      try {
        const mutedVideoPath = await ffmpegService.createMutedVideo(videoPath);
        const mutedVideoFilename = path.basename(mutedVideoPath);
        
        // Verify naming pattern: {source-video-name}-muted-{timestamp}.mp4
        expect(mutedVideoFilename).toMatch(new RegExp(`^${videoBasename}-muted-\\d+\\${videoExt}$`));
        
        // Verify it contains the source video name
        expect(mutedVideoFilename).toContain(videoBasename);
        
        // Verify it contains '-muted-'
        expect(mutedVideoFilename).toContain('-muted-');
        
        // Verify it has a timestamp (numeric)
        const timestampMatch = mutedVideoFilename.match(/-muted-(\d+)\.\w+$/);
        expect(timestampMatch).toBeTruthy();
        if (timestampMatch) {
          const timestamp = parseInt(timestampMatch[1]);
          expect(timestamp).toBeGreaterThan(0);
        }
        
        // Verify it has the same extension as the original
        expect(path.extname(mutedVideoFilename)).toBe(videoExt);
        
        console.log(`✓ Naming convention verified: ${mutedVideoFilename}`);
      } catch (error) {
        console.error(`Failed to verify naming for ${videoFile}:`, error);
        throw error;
      }
    }
  }, 180000);
});
