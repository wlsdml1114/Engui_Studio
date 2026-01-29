import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;
  model?: string;
  stability?: number;
  similarity?: number;
  style?: number;
  useStreaming?: boolean;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url: string;
  description?: string;
  labels?: string[];
  settings?: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
  available_samples?: string[];
}

export interface ElevenLabsModel {
  model_id: string;
  name: string;
  description: string;
  type: string;
}

export interface ElevenLabsVoiceResponse {
  voices: ElevenLabsVoice[];
}

export interface ElevenLabsVoiceSampleResponse {
  audio_base64: string;
  text: string;
}

export interface ElevenLabsModelResponse {
  models: ElevenLabsModel[];
}

export interface ElevenLabsGenerationConfig {
  text: string;
  voice_id: string;
  model_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
}

export interface ElevenLabsMusicConfig {
  text: string;
  model_id: string;
  prompt_instrumentation?: string;
  prompt_genre?: string;
  prompt_tempo?: string;
  prompt_structure?: string;
  duration_seconds?: number;
}

class ElevenLabsService {
  private config: ElevenLabsConfig;

  constructor(config: ElevenLabsConfig) {
    this.config = config;
  }

  public async fetchApi(endpoint: string, options: RequestInit = {}, isBinary: boolean = false) {
    const headers = {
      'xi-api-key': this.config.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    console.log(`[ElevenLabs] Request: ${options.method || 'GET'} https://api.elevenlabs.io/v1/${endpoint}`);
    if (options.body) {
      console.log(`[ElevenLabs] Request Body:`, options.body);
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/${endpoint}`, {
      ...options,
      headers,
    });

    console.log(`[ElevenLabs] Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`[ElevenLabs] Error Response:`, error);
      throw new Error(`Eleven Labs API Error: ${response.status} - ${error}`);
    }

    if (isBinary) {
      console.log(`[ElevenLabs] Response is binary blob`);
      return response.blob();
    }

    const json = await response.json();
    const logJson = { ...json };
    if (logJson.audio_base64) {
      logJson.audio_base64 = '[TRUNCATED_BASE64]';
    }
    console.log(`[ElevenLabs] Response JSON:`, JSON.stringify(logJson, null, 2));
    return json;
  }

  async getVoices(): Promise<ElevenLabsVoiceResponse> {
    return this.fetchApi('voices');
  }

  async getModels(): Promise<ElevenLabsModelResponse> {
    return this.fetchApi('models');
  }

  async getVoice(voiceId: string): Promise<ElevenLabsVoice> {
    return this.fetchApi(`voices/${voiceId}`);
  }

  async getVoiceSamples(voiceId: string, sampleId?: string): Promise<ElevenLabsVoiceSampleResponse> {
    const endpoint = sampleId
      ? `voices/${voiceId}/samples/${sampleId}/audio`
      : `voices/${voiceId}/samples/audio`;

    const response = await this.fetchApi(endpoint);
    return response;
  }

  async getVoiceSampleIds(voiceId: string): Promise<string[]> {
    const response = await this.fetchApi(`voices/${voiceId}/samples`);
    return response.samples || [];
  }

  async searchVoices(query: string): Promise<ElevenLabsVoiceResponse> {
    const params = new URLSearchParams({ query });
    return this.fetchApi(`voices/search?${params}`);
  }

  async generateSpeech(config: ElevenLabsGenerationConfig): Promise<Blob> {
    const voiceSettings = config.voice_settings || {
      stability: this.config.stability ?? 0.8,
      similarity_boost: this.config.similarity ?? 0.8,
      style: this.config.style ?? 0.0,
      use_speaker_boost: true,
    };

    const modelId = config.model_id || this.config.model || 'eleven_multilingual_v2';

    const response = await this.fetchApi('text-to-speech/' + config.voice_id, {
      method: 'POST',
      body: JSON.stringify({
        text: config.text,
        model_id: modelId,
        voice_settings: voiceSettings,
      }),
    }, true);

    return response as Blob;
  }

  async generateMusic(config: ElevenLabsMusicConfig): Promise<Blob> {
    // Construct a comprehensive prompt if specific fields are provided
    let fullPrompt = config.text;
    if (config.prompt_genre) fullPrompt += `, Genre: ${config.prompt_genre}`;
    if (config.prompt_instrumentation) fullPrompt += `, Instruments: ${config.prompt_instrumentation}`;
    if (config.prompt_tempo) fullPrompt += `, Tempo: ${config.prompt_tempo}`;
    if (config.prompt_structure) fullPrompt += `, Structure: ${config.prompt_structure}`;

    // API Reference: https://elevenlabs.io/docs/api-reference/music/compose
    // Endpoint: /v1/music/compose is likely correct based on documentation URL
    // But commonly it might be text-to-music
    // Let's try 'text-to-music' based on patterns, or stick to user hint 'music/compose' if that fails.
    // Given the parameters (music_length_ms), this looks like a new alpha/beta API.
    // Let's try 'text-to-music' first as it follows 'text-to-speech'.
    // Update: User shared link 'music/compose'. Let's use 'music/generation' or just 'music-generation'?
    // Actually, looking at the user request again: "이걸 따라서 payload를 수정해" -> The URL was for reference.
    // The endpoint is likely POST /v1/text-to-music or similar.
    // However, if I check patterns: /v1/sound-generation, /v1/text-to-speech
    // Let's assume it is 'text-to-music'. If it fails, I'll ask user to confirm endpoint.
    // WAIT, actually I will try `text-to-music` as it is standard.

    // Endpoint confirmed by user: /v1/music
    const response = await this.fetchApi('music', {
      method: 'POST',
      body: JSON.stringify({
        prompt: fullPrompt,
        model_id: 'music_v1',
        music_length_ms: (config.duration_seconds || 60) * 1000,
      }),
    }, true);

    return response as Blob;
  }

  async generateWithStreaming(config: ElevenLabsGenerationConfig, onAudioData: (chunk: ArrayBuffer) => void): Promise<void> {
    const voiceSettings = config.voice_settings || {
      stability: this.config.stability ?? 0.8,
      similarity_boost: this.config.similarity ?? 0.8,
      style: this.config.style ?? 0.0,
      use_speaker_boost: true,
    };

    const modelId = config.model_id || this.config.model || 'eleven_multilingual_v2';

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: config.text,
        model_id: modelId,
        voice_settings: voiceSettings,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Eleven Labs API Error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Failed to get stream reader');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        const arrayBuffer = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
        onAudioData(arrayBuffer);
      }
    }
  }

  async convertToAudio(
    text: string,
    voiceId?: string,
    modelId?: string,
    voiceSettings?: {
      stability?: number;
      similarity_boost?: number;
      style?: number;
      use_speaker_boost?: boolean;
    }
  ): Promise<Blob> {
    const config: ElevenLabsGenerationConfig = {
      text,
      voice_id: voiceId || this.config.voiceId || 'EXAVITQu4vr4xnSDxMaL',
      model_id: modelId,
      voice_settings: voiceSettings ? {
        stability: voiceSettings.stability ?? 0.8,
        similarity_boost: voiceSettings.similarity_boost ?? 0.8,
        style: voiceSettings.style ?? 0.0,
        use_speaker_boost: voiceSettings.use_speaker_boost ?? true
      } : undefined,
    };

    return this.generateSpeech(config);
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.apiKey) {
      errors.push('API key is required');
    }

    if (!this.config.voiceId) {
      errors.push('Voice ID is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default ElevenLabsService;
export { ElevenLabsService };