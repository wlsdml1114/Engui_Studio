'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  url: string;
  width: number;
  height?: number;
  color?: string;
  className?: string;
  // Original audio duration in ms (for proper scaling when clip is stretched)
  originalDuration?: number;
  // Current clip duration in ms
  clipDuration?: number;
  // Volume level (0-200, default 100) - affects waveform amplitude display
  volume?: number;
  // Callback to report the detected audio duration
  onDurationDetected?: (durationMs: number) => void;
}

// Cache for waveform data to avoid re-analyzing the same audio
const waveformCache = new Map<string, { peaks: number[]; duration: number }>();

export const AudioWaveform = React.memo(function AudioWaveform({
  url,
  width,
  height = 40,
  color = 'rgba(255, 255, 255, 0.6)',
  className,
  originalDuration,
  clipDuration,
  volume = 100,
  onDurationDetected,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch and analyze audio to generate waveform data
  useEffect(() => {
    if (!url) return;

    // Check cache first
    const cached = waveformCache.get(url);
    if (cached) {
      setWaveformData(cached.peaks);
      setAudioDuration(cached.duration);
      setIsLoading(false);
      if (onDurationDetected) {
        onDurationDetected(cached.duration);
      }
      return;
    }

    const abortController = new AbortController();
    
    const analyzeAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(url, { signal: abortController.signal });
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Get actual audio duration in ms
        const durationMs = audioBuffer.duration * 1000;
        setAudioDuration(durationMs);
        
        if (onDurationDetected) {
          onDurationDetected(durationMs);
        }
        
        // Get audio data from first channel
        const channelData = audioBuffer.getChannelData(0);
        // Use fixed number of samples for consistent waveform regardless of display width
        const targetSamples = 200; // Fixed sample count for caching
        const blockSize = Math.floor(channelData.length / targetSamples);
        const peaks: number[] = [];

        for (let i = 0; i < targetSamples; i++) {
          const start = i * blockSize;
          let max = 0;
          
          for (let j = 0; j < blockSize; j++) {
            const value = Math.abs(channelData[start + j] || 0);
            if (value > max) max = value;
          }
          
          peaks.push(max);
        }

        // Normalize peaks
        const maxPeak = Math.max(...peaks, 0.01);
        const normalizedPeaks = peaks.map(p => p / maxPeak);
        
        // Cache the result
        waveformCache.set(url, { peaks: normalizedPeaks, duration: durationMs });
        
        setWaveformData(normalizedPeaks);
        setIsLoading(false);
        
        await audioContext.close();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to analyze audio:', err);
          setError('Failed to load waveform');
          setIsLoading(false);
        }
      }
    };

    analyzeAudio();

    return () => {
      abortController.abort();
    };
  }, [url, onDurationDetected]);

  // Draw waveform on canvas with proper scaling
  // The waveform represents the actual audio content at 1:1 time scale
  // - If clip is shorter than original audio: show only the portion that will play
  // - If clip is longer than original audio: show full waveform, rest is empty (audio ends)
  // - Volume affects the amplitude of the waveform display
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;

    // Volume multiplier (0-200% -> 0-2x amplitude, capped at 1.5x for visual clarity)
    const volumeMultiplier = Math.min(1.5, Math.max(0.1, volume / 100));

    // Use the actual audio duration from analysis
    const actualOriginalDuration = originalDuration || audioDuration;
    const actualClipDuration = clipDuration || audioDuration;
    
    if (!actualOriginalDuration || !actualClipDuration) {
      // If we don't have duration info, just show full waveform across the width
      const barWidth = width / waveformData.length;
      const centerY = height / 2;
      
      for (let i = 0; i < waveformData.length; i++) {
        const value = waveformData[i] || 0;
        const x = i * barWidth;
        // Apply volume multiplier to bar height
        const barHeight = Math.max(2, value * volumeMultiplier * (height * 0.8));
        ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 0.5), barHeight);
      }
      return;
    }

    // Calculate how much of the clip width should show waveform
    // If clip is 5s and original is 18s: waveform fills 100% of width (showing first 5s of audio)
    // If clip is 20s and original is 18s: waveform fills 90% of width (18/20), rest is empty
    const audioToClipRatio = actualOriginalDuration / actualClipDuration;
    const waveformWidth = Math.min(width, width * audioToClipRatio);
    
    // How many samples of the original waveform to show
    // If clip is shorter than original, show proportionally fewer samples
    const clipToOriginalRatio = Math.min(1, actualClipDuration / actualOriginalDuration);
    const samplesToShow = Math.ceil(waveformData.length * clipToOriginalRatio);
    
    const barWidth = waveformWidth / samplesToShow;
    const centerY = height / 2;

    for (let i = 0; i < samplesToShow; i++) {
      const value = waveformData[i] || 0;
      const x = i * barWidth;
      // Apply volume multiplier to bar height
      const barHeight = Math.max(2, value * volumeMultiplier * (height * 0.8));
      
      // Draw mirrored bars (top and bottom)
      ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 0.5), barHeight);
    }
  }, [waveformData, width, height, color, originalDuration, clipDuration, audioDuration, volume]);

  if (error) {
    return (
      <div className={cn('flex items-center justify-center text-white/40 text-xs', className)}>
        ♪
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-0.5 bg-white/30 animate-pulse"
              style={{
                height: `${10 + Math.random() * 20}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn('pointer-events-none', className)}
      style={{ width, height }}
    />
  );
});

// Export a utility to get audio duration
export async function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration * 1000);
    });
    audio.addEventListener('error', () => {
      reject(new Error('Failed to load audio'));
    });
    audio.src = url;
  });
}
