// src/lib/runpodService.ts

interface RunPodJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  output?: any;
  error?: string;
}

// Generic input type - model-specific payload creation is handled by createPayload
export interface RunPodInput {
  [key: string]: any;
}

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

  /**
   * Create model-specific payload for RunPod API
   * Each model has its own payload structure
   */
  private createPayload(modelId: string, input: RunPodInput): { input: Record<string, any> } {
    console.log(`🎭 Creating payload for model: ${modelId}`);
    
    switch (modelId) {
      case 'multitalk':
        return {
          input: {
            prompt: input.prompt || "a man talking",
            image_path: input.image_path,
            audio_paths: input.audio_paths,
            ...(input.audio_type && { audio_type: input.audio_type })
          }
        };

      case 'flux-kontext':
        return {
          input: {
            prompt: input.prompt,
            image_path: input.image_path,
            width: input.width,
            height: input.height,
            seed: input.seed,
            guidance: input.guidance
          }
        };

      case 'flux-krea':
        return {
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

      case 'wan22':
        const wan22Input: Record<string, any> = {
          prompt: input.prompt,
          image_path: input.image_path,
          width: input.width,
          height: input.height,
          seed: input.seed,
          cfg: input.cfg,
          length: input.length,
          steps: input.steps,
          context_overlap: input.context_overlap,
          ...(input.end_image_path && { end_image_path: input.end_image_path })
        };

        // Build lora_pairs array from individual LoRA parameters
        const loraPairs: Array<{high: string, low: string, high_weight: number, low_weight: number}> = [];
        
        for (let i = 1; i <= 4; i++) {
          const highKey = `lora_high_${i}`;
          const lowKey = `lora_low_${i}`;
          const highWeightKey = `lora_high_${i}_weight`;
          const lowWeightKey = `lora_low_${i}_weight`;
          
          const highPath = input[highKey];
          const lowPath = input[lowKey];
          
          // Only add pair if both high and low are provided
          if (highPath && lowPath) {
            // Extract filename from path (remove /runpod-volume/loras/ prefix)
            const highFilename = highPath.replace(/^\/runpod-volume\/loras\//, '');
            const lowFilename = lowPath.replace(/^\/runpod-volume\/loras\//, '');
            
            loraPairs.push({
              high: highFilename,
              low: lowFilename,
              high_weight: input[highWeightKey] ?? 1.0,
              low_weight: input[lowWeightKey] ?? 1.0
            });
          }
        }
        
        // Only add lora_pairs if we have at least one pair
        if (loraPairs.length > 0) {
          wan22Input.lora_pairs = loraPairs;
        }
        
        return { input: wan22Input };

      case 'wan-animate':
        return {
          input: {
            prompt: input.prompt,
            positive_prompt: input.positive_prompt || input.prompt,
            seed: input.seed,
            cfg: input.cfg,
            steps: input.steps,
            width: input.width,
            height: input.height,
            ...(input.fps && { fps: input.fps }),
            ...(input.mode && { mode: input.mode }),
            ...(input.points_store && { points_store: input.points_store }),
            ...(input.coordinates && { coordinates: input.coordinates }),
            ...(input.neg_coordinates && { neg_coordinates: input.neg_coordinates }),
            ...(input.image_path && { image_path: input.image_path }),
            ...(input.video_path && { video_path: input.video_path })
          }
        };

      case 'infinite-talk':
        return {
          input: {
            prompt: input.prompt,
            input_type: input.input_type,
            person_count: input.person_count,
            ...(input.image_path && { image_path: input.image_path }),
            ...(input.video_path && { video_path: input.video_path }),
            wav_path: input.wav_path || input.audio,
            ...(input.wav_path_2 && { wav_path_2: input.wav_path_2 }),
            width: input.width,
            height: input.height,
            ...(input.network_volume && { network_volume: true })
          }
        };

      case 'video-upscale':
        return {
          input: {
            video_path: input.video_path,
            task_type: input.task_type,
            network_volume: true
          }
        };

      case 'qwen-image-edit':
        return {
          input: {
            prompt: input.prompt,
            image_path: input.image_path,
            ...(input.image_path_2 && { image_path_2: input.image_path_2 }),
            seed: input.seed,
            width: input.width,
            height: input.height,
            ...(input.steps && { steps: input.steps }),
            guidance_scale: input.guidance_scale || input.guidance
          }
        };

      case 'z-image':
        const zImageInput: Record<string, any> = {
          prompt: input.prompt,
          seed: input.seed,
          width: input.width,
          height: input.height,
          steps: input.steps,
          cfg: input.cfg,
          ...(input.negativePrompt && { negativePrompt: input.negativePrompt }),
          ...(input.condition_image && { condition_image: input.condition_image }),
          ...(input.use_controlnet !== undefined && { use_controlnet: input.use_controlnet })
        };

        // Add lora array if provided
        // Format: lora: [["/my_volume/loras/style_lora.safetensors", 0.8]]
        if (input.lora && Array.isArray(input.lora) && input.lora.length > 0) {
          zImageInput.lora = input.lora;
          console.log(`🔍 Z-Image LoRA array:`, JSON.stringify(input.lora));
        }

        return { input: zImageInput };

      default:
        // Generic fallback - pass input as-is
        console.log(`⚠️ Unknown model '${modelId}', using generic payload`);
        return { input: { ...input } };
    }
  }

  /**
   * Log payload details for debugging
   */
  private logPayload(modelId: string, payload: { input: Record<string, any> }): void {
    const input = payload.input;
    
    console.log(`📋 ${modelId} payload:`);
    
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined || value === null) continue;
      
      // Truncate long base64 strings
      if (typeof value === 'string' && value.length > 100) {
        console.log(`  - ${key}: [data] (${value.length} characters)`);
      } else if (typeof value === 'object') {
        console.log(`  - ${key}:`, JSON.stringify(value).substring(0, 100));
      } else {
        console.log(`  - ${key}:`, value);
      }
    }
  }

  async submitJob(input: RunPodInput, modelId?: string): Promise<string> {
    console.log('🚀 Submitting job to RunPod...');
    console.log('📋 Endpoint ID:', this.endpointId);

    // Create model-specific payload
    const payload = modelId 
      ? this.createPayload(modelId, input)
      : { input: { ...input } }; // Fallback for backward compatibility

    this.logPayload(modelId || 'unknown', payload);

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
      
      // 404 에러는 job이 아직 준비 중이거나 취소/만료된 경우
      if (response.status === 404) {
        console.log(`🔄 Job ${jobId} not yet registered in RunPod (404) - waiting for initialization...`);
        // IN_QUEUE 상태로 반환하여 계속 polling하도록 함
        // RunPod는 job을 막 생성한 직후에는 404를 반환할 수 있음
        return {
          id: jobId,
          status: 'IN_QUEUE',
          error: undefined
        };
      }
      
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

  /**
   * Submit an upscale job to RunPod
   * @param s3Path - S3 path of the source image/video to upscale
   * @param mediaType - Type of media: 'image' or 'video'
   * @param withInterpolation - Whether to apply frame interpolation (video only)
   * @returns RunPod job ID
   */
  async submitUpscaleJob(s3Path: string, mediaType: 'image' | 'video', withInterpolation: boolean = false): Promise<string> {
    console.log(`🔼 Submitting upscale job: ${mediaType}${withInterpolation ? ' + interpolation' : ''}`);
    console.log(`📥 Source S3 path: ${s3Path}`);

    // Determine task_type
    const taskType = withInterpolation ? 'upscale_and_interpolation' : 'upscale';
    
    // Build payload based on media type
    const payload: any = {
      input: {
        task_type: taskType
      }
    };

    // Add appropriate path key based on media type
    if (mediaType === 'image') {
      payload.input.image_path = s3Path;
    } else {
      payload.input.video_path = s3Path;
    }

    const requestBody = JSON.stringify(payload);
    console.log('📤 Upscale request payload:', requestBody);

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
      console.log('✅ Upscale job submitted successfully, ID:', data.id);

      if (!data.id) {
        throw new Error('RunPod API did not return a job ID');
      }

      return data.id;
    } catch (error) {
      console.error('❌ Upscale job submission failed:', error);
      throw error;
    }
  }
}

export default RunPodService;