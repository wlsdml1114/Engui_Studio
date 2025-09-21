export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
}

export interface ThumbnailResult {
  success: boolean;
  thumbnail?: string;
  width?: number;
  height?: number;
  quality?: number;
  error?: string;
}

export interface ThumbnailStatus {
  ffmpegAvailable: boolean;
  supportedFormats: string[];
  defaultOptions: {
    width: number;
    height: number;
    quality: number;
    format: string;
  };
}

export class ThumbnailService {
  /**
   * 비디오 파일에서 썸네일 생성
   */
  async generateThumbnail(
    file: File,
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailResult> {
    try {
      const formData = new FormData();
      formData.append('video', file);
      
      if (options.width) {
        formData.append('width', options.width.toString());
      }
      if (options.height) {
        formData.append('height', options.height.toString());
      }
      if (options.quality) {
        formData.append('quality', options.quality.toString());
      }

      const response = await fetch('/api/thumbnail', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to generate thumbnail'
        };
      }

      return {
        success: true,
        thumbnail: result.thumbnail,
        width: result.width,
        height: result.height,
        quality: result.quality
      };

    } catch (error) {
      console.error('Thumbnail generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 썸네일 서비스 상태 확인
   */
  async getStatus(): Promise<ThumbnailStatus> {
    try {
      const response = await fetch('/api/thumbnail');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get thumbnail status');
      }

      return result;

    } catch (error) {
      console.error('Thumbnail status error:', error);
      return {
        ffmpegAvailable: false,
        supportedFormats: [],
        defaultOptions: {
          width: 320,
          height: 240,
          quality: 80,
          format: 'jpg'
        }
      };
    }
  }

  /**
   * 파일이 지원되는 비디오 형식인지 확인
   */
  isSupportedVideoFormat(file: File): boolean {
    const supportedFormats = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'];
    const fileName = file.name.toLowerCase();
    return supportedFormats.some(format => fileName.endsWith(format));
  }

  /**
   * 썸네일을 Blob으로 변환
   */
  thumbnailToBlob(thumbnailDataUrl: string): Blob | null {
    try {
      const base64Data = thumbnailDataUrl.split(',')[1];
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      
      return new Blob([bytes], { type: 'image/jpeg' });
    } catch (error) {
      console.error('Error converting thumbnail to blob:', error);
      return null;
    }
  }

  /**
   * 썸네일을 다운로드 가능한 파일로 변환
   */
  downloadThumbnail(thumbnailDataUrl: string, filename: string = 'thumbnail.jpg'): void {
    try {
      const blob = this.thumbnailToBlob(thumbnailDataUrl);
      if (!blob) {
        throw new Error('Failed to convert thumbnail to blob');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading thumbnail:', error);
    }
  }
}

// 싱글톤 인스턴스
export const thumbnailService = new ThumbnailService();
