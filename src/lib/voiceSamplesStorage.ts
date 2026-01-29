// Voice Samples Storage (localStorage)
export interface VoiceSample {
  voiceId: string;
  audio_base64: string;
  text: string;
  cachedAt: number;
}

export interface FavoriteVoice {
  voiceId: string;
  voiceName: string;
  addedAt: number;
}

const VOICE_SAMPLES_KEY = 'elevenlabs_voice_samples';
const FAVORITE_VOICES_KEY = 'elevenlabs_favorite_voices';

export const voiceSamplesStorage = {
  // 샘플 저장
  saveSample: (voiceId: string, audio_base64: string, text: string) => {
    const samples = voiceSamplesStorage.getAllSamples();
    samples[voiceId] = {
      voiceId,
      audio_base64,
      text,
      cachedAt: Date.now(),
    };
    try {
      localStorage.setItem(VOICE_SAMPLES_KEY, JSON.stringify(samples));
    } catch (error) {
      console.error('Failed to save voice sample:', error);
    }
  },

  // 특정 보이스 샘플 가져오기
  getSample: (voiceId: string): VoiceSample | null => {
    const samples = voiceSamplesStorage.getAllSamples();
    return samples[voiceId] || null;
  },

  // 모든 샘플 가져오기
  getAllSamples: (): Record<string, VoiceSample> => {
    try {
      const data = localStorage.getItem(VOICE_SAMPLES_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to get voice samples:', error);
      return {};
    }
  },

  // 오래된 샘플 삭제 (7일 이상)
  cleanupOldSamples: (maxAgeMs: number = 7 * 24 * 60 * 60 * 1000) => {
    const samples = voiceSamplesStorage.getAllSamples();
    const now = Date.now();
    let cleaned = false;

    Object.entries(samples).forEach(([voiceId, sample]) => {
      if (now - sample.cachedAt > maxAgeMs) {
        delete samples[voiceId];
        cleaned = true;
      }
    });

    if (cleaned) {
      try {
        localStorage.setItem(VOICE_SAMPLES_KEY, JSON.stringify(samples));
      } catch (error) {
        console.error('Failed to clean old samples:', error);
      }
    }
  },

  // 즐겨찾기에 추가
  addToFavorites: (voiceId: string, voiceName: string) => {
    const favorites = voiceSamplesStorage.getFavorites();
    if (!favorites.some(f => f.voiceId === voiceId)) {
      favorites.push({
        voiceId,
        voiceName,
        addedAt: Date.now(),
      });
      try {
        localStorage.setItem(FAVORITE_VOICES_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error('Failed to add favorite:', error);
      }
    }
  },

  // 즐겨찾기에서 제거
  removeFromFavorites: (voiceId: string) => {
    const favorites = voiceSamplesStorage.getFavorites().filter(f => f.voiceId !== voiceId);
    try {
      localStorage.setItem(FAVORITE_VOICES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  },

  // 즐겨찾기 목록 가져오기
  getFavorites: (): FavoriteVoice[] => {
    try {
      const data = localStorage.getItem(FAVORITE_VOICES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get favorites:', error);
      return [];
    }
  },

  // 즐겨찾기 여부 확인
  isFavorite: (voiceId: string): boolean => {
    const favorites = voiceSamplesStorage.getFavorites();
    return favorites.some(f => f.voiceId === voiceId);
  },

  // 모든 샘플 삭제
  clearAllSamples: () => {
    try {
      localStorage.removeItem(VOICE_SAMPLES_KEY);
    } catch (error) {
      console.error('Failed to clear samples:', error);
    }
  },

  // 모든 즐겨찾기 삭제
  clearAllFavorites: () => {
    try {
      localStorage.removeItem(FAVORITE_VOICES_KEY);
    } catch (error) {
      console.error('Failed to clear favorites:', error);
    }
  },
};
