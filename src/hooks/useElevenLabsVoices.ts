'use client';

import { useState, useEffect, useRef } from 'react';
import ElevenLabsService, { ElevenLabsVoice } from '@/lib/elevenlabsService';
import { useStudio } from '@/lib/context/StudioContext';
import { voiceSamplesStorage } from '@/lib/voiceSamplesStorage';

export interface VoiceWithSamples extends ElevenLabsVoice {
  samples?: { audio_base64: string; text: string };
  isLoadingSamples?: boolean;
  isFavorite?: boolean;
}

export function useElevenLabsVoices() {
  const { settings } = useStudio();
  const [voices, setVoices] = useState<VoiceWithSamples[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const elevenlabsService = settings.apiKeys?.elevenlabs
    ? new ElevenLabsService({ apiKey: settings.apiKeys.elevenlabs })
    : null;

  const fetchVoices = async (forceRefresh = false) => {
    if (!elevenlabsService) return;

    setIsLoading(true);
    setError(null);

    const CACHE_KEY = 'elevenlabs-voices-cache';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    // 캐시 확인
    if (!forceRefresh && typeof window !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { timestamp, voices: cachedVoices } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            console.log('📦 Using cached ElevenLabs voices');

            const favorites = voiceSamplesStorage.getFavorites();
            const voicesWithSamples: VoiceWithSamples[] = cachedVoices.map((voice: any) => ({
              ...voice,
              isLoadingSamples: false,
              isFavorite: favorites.some(f => f.voiceId === voice.voice_id),
            }));

            setVoices(voicesWithSamples);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Failed to parse cached voices', e);
        }
      }
    }

    try {
      console.log('🌐 Fetching ElevenLabs voices from API...');
      const response = await elevenlabsService.getVoices();

      // 캐시 저장
      if (typeof window !== 'undefined') {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          voices: response.voices
        }));
      }

      // 즐겨찾기 상태 확인
      const favorites = voiceSamplesStorage.getFavorites();
      const voicesWithSamples: VoiceWithSamples[] = response.voices.map(voice => ({
        ...voice,
        isLoadingSamples: false,
        isFavorite: favorites.some(f => f.voiceId === voice.voice_id),
      }));

      setVoices(voicesWithSamples);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voices');
      setVoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrentAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  };

  const playSample = (voiceId: string, directBase64?: string) => {
    stopCurrentAudio();

    let base64 = directBase64;

    // If direct base64 not provided, try to find in voices
    if (!base64) {
      const voice = voices.find(v => v.voice_id === voiceId);
      base64 = voice?.samples?.audio_base64;
    }

    if (base64) {
      const dataUrl = `data:audio/mpeg;base64,${base64}`;
      const audio = new Audio(dataUrl);

      currentAudioRef.current = audio;

      audio.onended = () => {
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
      };

      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
      });
    }
  };

  const fetchVoiceSamples = async (voiceId: string): Promise<string | null> => {
    if (!elevenlabsService) {
      return null;
    }

    // 캐시에서 먼저 확인
    const cachedSample = voiceSamplesStorage.getSample(voiceId);
    if (cachedSample) {
      setVoices(prev => prev.map(v =>
        v.voice_id === voiceId
          ? { ...v, samples: { audio_base64: cachedSample.audio_base64, text: cachedSample.text }, isLoadingSamples: false }
          : v
      ));
      return cachedSample.audio_base64;
    }

    // Prevent duplicate calls
    const voice = voices.find(v => v.voice_id === voiceId);
    if (voice?.isLoadingSamples) {
      return null;
    }

    // Force reload even if samples already exist
    setVoices(prev => prev.map(v =>
      v.voice_id === voiceId
        ? { ...v, isLoadingSamples: true, samples: undefined }
        : v
    ));

    try {
      let audioBase64: string | null = null;
      let sampleText = "Voice preview";

      // First try to get samples using new API format
      try {
        const sampleResponse = await elevenlabsService.fetchApi(`voices/${voiceId}/samples`);

        if (sampleResponse && sampleResponse.samples && sampleResponse.samples.length > 0) {
          const sampleId = sampleResponse.samples[0];
          const audioResponse = await elevenlabsService.fetchApi(`voices/${voiceId}/samples/${sampleId}/audio`);

          if (audioResponse && audioResponse.audio_base64) {
            audioBase64 = audioResponse.audio_base64;
            sampleText = audioResponse.text || "Voice preview";
          }
        }
      } catch (sampleError) {
        // Silently fail on sample API error and try fallback
      }

      // If no sample found yet, try fallback to preview URL
      if (!audioBase64) {
        try {
          const voiceDetails = await elevenlabsService.getVoice(voiceId);

          if (voiceDetails.preview_url) {
            const previewResponse = await fetch(voiceDetails.preview_url);

            if (!previewResponse.ok) {
              throw new Error(`Failed to fetch audio: ${previewResponse.status}`);
            }

            const blob = await previewResponse.blob();

            // Convert blob to base64
            audioBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve((reader.result as string).split(',')[1]);
              };
              reader.onerror = () => {
                reject(new Error('Failed to read audio file'));
              };
              reader.readAsDataURL(blob);
            });
          }
        } catch (fallbackError) {
          console.error('Fallback audio fetch failed:', fallbackError);
        }
      }

      if (audioBase64) {
        setVoices(prev => prev.map(v =>
          v.voice_id === voiceId
            ? { ...v, samples: { audio_base64: audioBase64!, text: sampleText }, isLoadingSamples: false }
            : v
        ));

        voiceSamplesStorage.saveSample(
          voiceId,
          audioBase64,
          sampleText
        );

        return audioBase64;
      } else {
        setVoices(prev => prev.map(v =>
          v.voice_id === voiceId
            ? { ...v, isLoadingSamples: false }
            : v
        ));
        return null;
      }
    } catch (error) {
      setVoices(prev => prev.map(v =>
        v.voice_id === voiceId
          ? { ...v, isLoadingSamples: false }
          : v
      ));
      return null;
    }
  };

  const toggleFavorite = (voiceId: string, voiceName: string) => {
    const isFav = voiceSamplesStorage.isFavorite(voiceId);
    if (isFav) {
      voiceSamplesStorage.removeFromFavorites(voiceId);
    } else {
      voiceSamplesStorage.addToFavorites(voiceId, voiceName);
    }

    // voices 상태 업데이트
    setVoices(prev => prev.map(v =>
      v.voice_id === voiceId
        ? { ...v, isFavorite: !isFav }
        : v
    ));
  };

  const clearAllSamples = () => {
    voiceSamplesStorage.clearAllSamples();
    setVoices(prev => prev.map(v => ({ ...v, samples: undefined })));
  };

  const cleanupOldSamples = () => {
    voiceSamplesStorage.cleanupOldSamples();
  };

  useEffect(() => {
    // 오래된 샘플 자동 정리 (최초 로드 시)
    cleanupOldSamples();

    if (settings.apiKeys?.elevenlabs) {
      fetchVoices();
    }
  }, [settings.apiKeys?.elevenlabs]);

  return {
    voices,
    isLoading,
    error,
    fetchVoices,
    fetchVoiceSamples,
    playSample,
    toggleFavorite,
    clearAllSamples,
    cleanupOldSamples,
    refetch: () => fetchVoices(true)
  };
}
