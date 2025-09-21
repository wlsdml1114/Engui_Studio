import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpg' | 'png' | 'webp';
}

export class FFmpegService {
  private ffmpegPath: string;

  constructor() {
    // FFmpeg 경로 설정 (Windows와 macOS/Linux 지원)
    if (process.platform === 'win32') {
      // Windows: 로컬 ffmpeg 폴더 또는 시스템 PATH
      this.ffmpegPath = this.findFFmpegPath();
    } else {
      // macOS/Linux: 시스템 PATH에서 찾기
      this.ffmpegPath = 'ffmpeg';
    }
  }

  private findFFmpegPath(): string {
    // Windows에서 ffmpeg 경로 찾기
    const possiblePaths = [
      path.join(process.cwd(), 'ffmpeg', 'bin', 'ffmpeg.exe'),
      path.join(process.cwd(), 'ffmpeg', 'ffmpeg.exe'),
      'ffmpeg.exe',
      'ffmpeg'
    ];

    for (const ffmpegPath of possiblePaths) {
      if (fs.existsSync(ffmpegPath)) {
        return ffmpegPath;
      }
    }

    // 시스템 PATH에서 찾기
    return 'ffmpeg';
  }

  /**
   * 비디오에서 첫 번째 프레임을 추출하여 썸네일 생성
   */
  async extractThumbnail(
    inputPath: string,
    outputPath: string,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    const {
      width = 320,
      height = 240,
      quality = 80,
      format = 'jpg'
    } = options;

    // 출력 디렉토리 생성
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // FFmpeg 명령어 구성
    const command = `"${this.ffmpegPath}" -i "${inputPath}" -ss 00:00:01 -vframes 1 -vf "scale=${width}:${height}" -q:v ${quality} "${outputPath}"`;

    try {
      console.log(`[FFmpeg] Extracting thumbnail: ${inputPath} -> ${outputPath}`);
      console.log(`[FFmpeg] Command: ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30초 타임아웃
        maxBuffer: 1024 * 1024 * 10 // 10MB 버퍼
      });

      if (stderr && !stderr.includes('frame=')) {
        console.warn(`[FFmpeg] Warning: ${stderr}`);
      }

      // 출력 파일이 생성되었는지 확인
      if (fs.existsSync(outputPath)) {
        console.log(`[FFmpeg] Thumbnail created successfully: ${outputPath}`);
        return outputPath;
      } else {
        throw new Error('Thumbnail file was not created');
      }
    } catch (error) {
      console.error(`[FFmpeg] Error extracting thumbnail:`, error);
      throw new Error(`Failed to extract thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 비디오 정보 가져오기 (길이, 해상도 등)
   */
  async getVideoInfo(inputPath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    fps: number;
    format: string;
  }> {
    const command = `"${this.ffmpegPath}" -i "${inputPath}" -f null -`;

    try {
      const { stderr } = await execAsync(command, {
        timeout: 10000,
        maxBuffer: 1024 * 1024 * 5
      });

      // FFmpeg 출력에서 정보 파싱
      const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      const resolutionMatch = stderr.match(/(\d+)x(\d+)/);
      const fpsMatch = stderr.match(/(\d+(?:\.\d+)?) fps/);

      if (!durationMatch || !resolutionMatch) {
        throw new Error('Could not parse video information');
      }

      const [, hours, minutes, seconds] = durationMatch;
      const [, width, height] = resolutionMatch;
      const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 30;

      const duration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);

      return {
        duration,
        width: parseInt(width),
        height: parseInt(height),
        fps,
        format: path.extname(inputPath).toLowerCase()
      };
    } catch (error) {
      console.error(`[FFmpeg] Error getting video info:`, error);
      throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * FFmpeg가 설치되어 있는지 확인
   */
  async isFFmpegAvailable(): Promise<boolean> {
    try {
      await execAsync(`"${this.ffmpegPath}" -version`, {
        timeout: 5000,
        maxBuffer: 1024 * 1024
      });
      return true;
    } catch (error) {
      console.warn(`[FFmpeg] FFmpeg not available:`, error);
      return false;
    }
  }

  /**
   * 비디오 파일이 유효한지 확인
   */
  async validateVideo(inputPath: string): Promise<boolean> {
    try {
      const command = `"${this.ffmpegPath}" -v error -i "${inputPath}" -f null -`;
      await execAsync(command, {
        timeout: 10000,
        maxBuffer: 1024 * 1024
      });
      return true;
    } catch (error) {
      console.warn(`[FFmpeg] Invalid video file:`, error);
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const ffmpegService = new FFmpegService();
