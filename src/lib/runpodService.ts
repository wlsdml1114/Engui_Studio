// src/lib/runpodService.ts

interface RunPodJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  output?: any;
  error?: string;
}

interface MultiTalkInput {
  prompt?: string;
  image_path: string;
  audio_paths: {
    person1: string;
    person2?: string;
  };
  audio_type?: string; // 듀얼 오디오 모드용 audio_type
}

interface FluxKontextInput {
  prompt: string;
  image_path: string;
  width: number;
  height: number;
  seed?: number;
  guidance: number; // cfg를 guidance로 변경
}

interface FluxKreaInput {
  prompt: string;
  width: number;
  height: number;
  seed: number;
  guidance: number;
  model?: string;
  lora?: Array<[string, number]>; // [["filename.safetensors", weight]] 형태
}

interface Wan22Input {
  prompt: string;
  image_path: string; // base64 인코딩된 이미지 데이터 (키는 image_path)
  end_image_path?: string; // optional end frame image
  width: number;
  height: number;
  seed: number;
  cfg: number;
  length: number;
  steps: number; // step을 steps로 변경
  context_overlap?: number; // context overlap 추가
  lora_pairs?: Array<{
    high: string;
    low: string;
    high_weight: number;
    low_weight: number;
  }>;
}

interface WanAnimateInput {
  prompt: string;
  image_path?: string;
  video_path?: string;
  positive_prompt: string;
  seed: number;
  cfg: number;
  steps: number;
  width: number;
  height: number;
  fps?: number;
  mode?: string;
  points_store?: {
    positive: Array<{x: number, y: number}>;
    negative: Array<{x: number, y: number}>;
  };
  coordinates?: Array<{x: number, y: number}>;
  neg_coordinates?: Array<{x: number, y: number}>;
}

interface InfiniteTalkInput {
  prompt: string;
  input_type: string; // "image" 또는 "video"
  person_count: string; // "single" 또는 "multi"
  image_path?: string; // S3 경로 또는 로컬 경로 (image 타입일 때)
  video_path?: string; // S3 경로 또는 로컬 경로 (video 타입일 때)
  wav_path: string; // S3 경로 또는 로컬 경로
  wav_path_2?: string; // 다중 인물용 두 번째 오디오 (multi일 때)
  width: number;
  height: number;
  network_volume?: boolean;
}

interface VideoUpscaleInput {
  task_type: string; // "upscale" 또는 "upscale_and_interpolation"
  video_path: string; // S3 경로
}

interface QwenImageEditInput {
  prompt: string;
  image_base64: string; // base64 인코딩된 이미지 데이터
  image_base64_2?: string; // optional second image
  seed: number;
  width: number;
  height: number;
  steps?: number;
  guidance_scale: number;
}

type RunPodInput = MultiTalkInput | FluxKontextInput | FluxKreaInput | Wan22Input | WanAnimateInput | InfiniteTalkInput | VideoUpscaleInput | QwenImageEditInput;

class RunPodService {
  private apiKey: string;
  private endpointId: string;
  private baseUrl: string;
  private generateTimeout: number; // AI 생성 작업 타임아웃 (밀리초)

  constructor(apiKey?: string, endpointId?: string, generateTimeout?: number) {
    // Use provided credentials or fall back to environment variables
    this.apiKey = apiKey || process.env.RUNPOD_API_KEY!;
    this.endpointId = endpointId || process.env.RUNPOD_ENDPOINT_ID!;
    this.baseUrl = `https://api.runpod.ai/v2/${this.endpointId}`;
    this.generateTimeout = (generateTimeout || 3600) * 1000; // 초를 밀리초로 변환
    
    if (!this.apiKey || !this.endpointId) {
      throw new Error('RunPod API key and endpoint ID are required');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async submitJob(input: RunPodInput): Promise<string> {
    console.log('🚀 Submitting job to RunPod...');
    console.log('📋 Endpoint ID:', this.endpointId);

    // Match the Python code structure exactly
    let payload: any;
    if ('audio_paths' in input) {
      // MultiTalk input
      payload = {
        input: {
          prompt: input.prompt || "a man talking",
          image_path: input.image_path,
          audio_paths: input.audio_paths,
          ...(input.audio_type && { audio_type: input.audio_type }) // audio_type이 있으면 포함
        }
      };

      console.log('🎭 MultiTalk payload created:');
      console.log('  - prompt:', payload.input.prompt);
      console.log('  - image_path:', payload.input.image_path);
      console.log('  - audio_paths:', payload.input.audio_paths);
      console.log('  - audio_type:', payload.input.audio_type || 'not set');
    } else if ('guidance' in input && 'image_path' in input) {
      // FluxKontext input
      payload = {
        input: {
          prompt: input.prompt,
          image_path: input.image_path,
          width: input.width,
          height: input.height,
          seed: input.seed,
          guidance: input.guidance
        }
      };

      console.log('🎭 FluxKontext payload created:');
      console.log('  - prompt:', payload.input.prompt);
      console.log('  - image_path:', payload.input.image_path);
      console.log('  - width:', payload.input.width);
      console.log('  - height:', payload.input.height);
      console.log('  - seed:', payload.input.seed);
      console.log('  - guidance:', payload.input.guidance);
    } else if ('guidance' in input && !('image_path' in input)) {
      // FluxKrea input
      payload = {
        input: {
          prompt: input.prompt,
          width: input.width,
          height: input.height,
          seed: input.seed,
          guidance: input.guidance,
          ...(input.model && { model: input.model }),
          ...(input.lora && { lora: input.lora })
        }
      };

      console.log('🎭 FluxKrea payload created:');
      console.log('  - prompt:', payload.input.prompt);
      console.log('  - width:', payload.input.width);
      console.log('  - height:', payload.input.height);
      console.log('  - seed:', payload.input.seed);
      console.log('  - guidance:', payload.input.guidance);
      if (payload.input.model) {
        console.log('  - model:', payload.input.model);
      }
      if (payload.input.lora) {
        console.log('  - lora:', payload.input.lora);
        console.log('  - lora count:', payload.input.lora.length);
      }
    } else if ('cfg' in input && ('video_path' in input || 'positive_prompt' in input)) {
      // WanAnimate input
      payload = {
        input: {
          prompt: input.prompt,
          positive_prompt: input.positive_prompt,
          seed: input.seed,
          cfg: input.cfg,
          steps: input.steps,
          width: input.width,
          height: input.height,
          ...(input.fps && { fps: input.fps }),
          ...(input.mode && { mode: input.mode }),
          points_store: input.points_store,
          coordinates: input.coordinates,
          neg_coordinates: input.neg_coordinates,
          ...(input.image_path && { image_path: input.image_path }),
          ...(input.video_path && { video_path: input.video_path })
        }
      };

      console.log('🎭 WanAnimate payload created:', {
        prompt: payload.input.prompt,
        seed: payload.input.seed,
        cfg: payload.input.cfg,
        steps: payload.input.steps,
        width: payload.input.width,
        height: payload.input.height,
        fps: payload.input.fps || 'not set',
        mode: payload.input.mode || 'not set',
        ...(payload.input.points_store && { points_store: '✓ set' }),
        ...(payload.input.coordinates && { coordinates: '✓ set' }),
        ...(payload.input.neg_coordinates && { neg_coordinates: '✓ set' })
      });
    } else if ('cfg' in input && !('video_path' in input) && !('positive_prompt' in input)) {
      // Wan22 input
      payload = {
        input: {
          prompt: input.prompt,
          image_path: input.image_path,
          width: input.width,
          height: input.height,
          seed: input.seed,
          cfg: input.cfg,
          length: input.length,
          steps: input.steps, // steps로 변경
          context_overlap: input.context_overlap, // context overlap 추가
          ...(input.end_image_path && { end_image_path: input.end_image_path }), // end_image_path 추가
          ...(input.lora_pairs && { lora_pairs: input.lora_pairs }) // LoRA pairs 추가
        }
      };

      console.log('🎭 Wan22 payload created:');
      console.log('  - prompt:', payload.input.prompt);
      console.log('  - image_path:', `[base64 data] (${payload.input.image_path.length} characters)`);
      console.log('  - end_image_path:', payload.input.end_image_path || 'not set');
      console.log('  - width:', payload.input.width);
      console.log('  - height:', payload.input.height);
      console.log('  - seed:', payload.input.seed);
      console.log('  - cfg:', payload.input.cfg);
      console.log('  - length:', payload.input.length);
      console.log('  - steps:', payload.input.steps);
      console.log('  - context_overlap:', payload.input.context_overlap || 'not set');
      if (payload.input.lora_pairs) {
        console.log('  - lora_pairs:', payload.input.lora_pairs);
      }
    } else if ('wav_path' in input) {
      // InfiniteTalk input
      payload = {
        input: {
          prompt: input.prompt,
          input_type: input.input_type,
          person_count: input.person_count,
          ...(input.image_path && { image_path: input.image_path }),
          ...(input.video_path && { video_path: input.video_path }),
          wav_path: input.wav_path,
          ...(input.wav_path_2 && { wav_path_2: input.wav_path_2 }),
          width: input.width,
          height: input.height,
          ...(input.network_volume && { network_volume: true })
        }
      };

      console.log('🎭 InfiniteTalk payload created:');
      console.log('  - prompt:', payload.input.prompt);
      console.log('  - input_type:', payload.input.input_type);
      console.log('  - person_count:', payload.input.person_count);
      console.log('  - image_path:', payload.input.image_path || 'not set');
      console.log('  - video_path:', payload.input.video_path || 'not set');
      console.log('  - wav_path:', payload.input.wav_path);
      console.log('  - wav_path_2:', payload.input.wav_path_2 || 'not set');
      console.log('  - width:', payload.input.width);
      console.log('  - height:', payload.input.height);
    } else if ('task_type' in input && 'video_path' in input) {
      // Video Upscale input
      payload = {
        input: {
          video_path: input.video_path,
          task_type: input.task_type,
          network_volume: true
        }
      };

      console.log('🎬 Video Upscale payload created:');
      console.log('  - video_path:', payload.input.video_path);
      console.log('  - task_type:', payload.input.task_type);
      console.log('  - network_volume:', payload.input.network_volume);
    } else if ('guidance_scale' in input && 'image_base64' in input && 'width' in input) {
      // Qwen Image Edit input
      payload = {
        input: {
          prompt: input.prompt,
          image_base64: input.image_base64,
          ...(input.image_base64_2 && { image_base64_2: input.image_base64_2 }),
          seed: input.seed,
          width: input.width,
          height: input.height,
          ...(input.steps && { steps: input.steps }),
          guidance_scale: input.guidance_scale
        }
      };

      console.log('🎨 Qwen Image Edit payload created:');
      console.log('  - prompt:', payload.input.prompt);
      console.log('  - image_base64:', `[base64 data] (${payload.input.image_base64.length} characters)`);
      console.log('  - image_base64_2:', payload.input.image_base64_2 ? `[base64 data] (${payload.input.image_base64_2.length} characters)` : 'not set');
      console.log('  - seed:', payload.input.seed);
      console.log('  - width:', payload.input.width);
      console.log('  - height:', payload.input.height);
      console.log('  - steps:', payload.input.steps || 'not set');
      console.log('  - guidance_scale:', payload.input.guidance_scale);
    }

    const requestBody = JSON.stringify(payload);
    
    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/run`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: requestBody,
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`RunPod API error: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('✅ Job submitted successfully, ID:', data.id);

      if (!data.id) {
        throw new Error('RunPod API did not return a job ID');
      }

      return data.id;
    } catch (error) {
      console.error('❌ RunPod API call failed:', error);
      throw error;
    }
  }

  // 네트워크 에러가 재시도 가능한지 확인하는 함수
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || '';

    // 네트워크 관련 에러들 (재시도 가능)
    if (errorMessage.includes('SocketError') ||
        errorMessage.includes('other side closed') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch failed')) {
      return true;
    }

    return false;
  }

  // 재시도 로직이 포함된 fetch wrapper
  private async fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        return response;
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error) || attempt === maxRetries) {
          throw error;
        }

        console.log(`🔄 Retry attempt ${attempt}/${maxRetries} for network error:`, (error as any).message);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 지수 백오프: 1초, 2초, 3초
      }
    }

    throw lastError;
  }

  async getJobStatus(jobId: string): Promise<RunPodJobResponse> {

    const response = await this.fetchWithRetry(`${this.baseUrl}/status/${jobId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RunPod status API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // 상태가 변경되었을 때만 로그 출력
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      console.log(`📊 Job ${jobId} status:`, data.status);

      // 완료된 경우에만 간단한 출력 정보만 로그
      if (data.status === 'COMPLETED' && data.output) {
        const outputKeys = Object.keys(data.output);
        console.log(`📊 Output keys:`, outputKeys);
      }
    }

    return data;
  }

  async waitForCompletion(jobId: string, maxWaitTime?: number): Promise<RunPodJobResponse> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds
    const timeout = maxWaitTime || this.generateTimeout; // 사용자 지정 타임아웃 또는 기본값 사용

    console.log(`⏰ Waiting for job completion with timeout: ${timeout / 1000}초`);

    while (Date.now() - startTime < timeout) {
      const status = await this.getJobStatus(jobId);

      if (status.status === 'COMPLETED') {
        console.log('✅ Job completed successfully!');
        return status;
      }

      if (status.status === 'FAILED') {
        console.log('❌ Job failed:', status.error);
        throw new Error(`Job failed: ${status.error}`);
      }

      if (status.status === 'IN_QUEUE' || status.status === 'IN_PROGRESS') {
        // 진행 상황은 30초마다만 로그 출력
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed % 30 === 0) {
          console.log(`⏳ Job in progress... (${status.status}) - ${elapsed}초 경과`);
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      throw new Error(`Unknown job status: ${status.status}`);
    }

    throw new Error(`Job timeout: Maximum wait time (${timeout / 1000}초) exceeded`);
  }
}

export default RunPodService;