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

interface Wan22Input {
  prompt: string;
  image_path: string; // base64 인코딩된 이미지 데이터 (키는 image_path)
  width: number;
  height: number;
  seed: number;
  cfg: number;
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
}

type RunPodInput = MultiTalkInput | FluxKontextInput | Wan22Input | InfiniteTalkInput;

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
    console.log('📋 API Key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'MISSING');
    console.log('📋 Endpoint ID:', this.endpointId);
    console.log('📋 Base URL:', this.baseUrl);
    console.log('📋 Input:', JSON.stringify(input, null, 2));
    
    const headers = this.getHeaders();
    console.log('📋 Headers:', headers);
    
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
    } else if ('cfg' in input) {
      // Wan22 input
      payload = {
        input: {
          prompt: input.prompt,
          image_path: input.image_path,
          width: input.width,
          height: input.height,
          seed: input.seed,
          cfg: input.cfg
        }
      };
      
      console.log('🎭 Wan22 payload created:');
      console.log('  - prompt:', payload.input.prompt);
      console.log('  - image_path:', `${payload.input.image_path.substring(0, 50)}... (${payload.input.image_path.length} characters)`);
      console.log('  - width:', payload.input.width);
      console.log('  - height:', payload.input.height);
      console.log('  - seed:', payload.input.seed);
      console.log('  - cfg:', payload.input.cfg);
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
          height: input.height
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
    } else {
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
    }
    
    const requestBody = JSON.stringify(payload);
    console.log('📋 Request Body:', requestBody);
    
    try {
      const response = await fetch(`${this.baseUrl}/run`, {
        method: 'POST',
        headers,
        body: requestBody,
      });

      console.log('📋 Response Status:', response.status);
      console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('📋 Response Text:', responseText);

      if (!response.ok) {
        throw new Error(`RunPod API error: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('✅ Job submitted successfully:', data);
      
      if (!data.id) {
        throw new Error('RunPod API did not return a job ID');
      }
      
      return data.id;
    } catch (error) {
      console.error('❌ RunPod API call failed:', error);
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<RunPodJobResponse> {
    console.log(`🔍 Checking job status: ${jobId}`);
    
    const response = await fetch(`${this.baseUrl}/status/${jobId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RunPod status API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`📊 Job ${jobId} status:`, data.status);
    
    // base64 데이터가 포함된 응답은 전체 출력하지 않음 (성능상 이유)
    if (data.output) {
      const outputKeys = Object.keys(data.output);
      console.log(`📊 Job ${jobId} output keys:`, outputKeys);
      
      // base64 데이터가 있는지 확인하고 길이만 로그
      if (data.output.image_base64) {
        console.log(`🖼️ Job ${jobId} has image_base64 data, length:`, data.output.image_base64.length);
      }
      if (data.output.video_base64) {
        console.log(`🎬 Job ${jobId} has video_base64 data, length:`, data.output.video_base64.length);
      }
      if (data.output.video && typeof data.output.video === 'string' && data.output.video.length > 100) {
        console.log(`🎬 Job ${jobId} has video data, length:`, data.output.video.length);
      }
      if (data.output.mp4 && typeof data.output.mp4 === 'string' && data.output.mp4.length > 100) {
        console.log(`🎬 Job ${jobId} has mp4 data, length:`, data.output.mp4.length);
      }
      if (data.output.result && typeof data.output.result === 'string' && data.output.result.length > 100) {
        console.log(`🎬 Job ${jobId} has result data, length:`, data.output.result.length);
      }
    } else {
      console.log(`📊 Job ${jobId} full response:`, JSON.stringify(data, null, 2));
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
        console.log(`⏳ Job in progress... (${status.status})`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }
      
      throw new Error(`Unknown job status: ${status.status}`);
    }
    
    throw new Error(`Job timeout: Maximum wait time (${timeout / 1000}초) exceeded`);
  }
}

export default RunPodService;