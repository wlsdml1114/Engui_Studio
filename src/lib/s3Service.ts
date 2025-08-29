// src/lib/s3Service.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

interface S3Config {
  endpointUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  timeout?: number; // 타임아웃 설정 추가 (초 단위)
}

class S3Service {
  private config: S3Config;

  constructor(config?: Partial<S3Config>) {
    // 사용자 설정이 있으면 사용, 없으면 환경변수 사용
    this.config = {
      endpointUrl: config?.endpointUrl || process.env.S3_ENDPOINT_URL!,
      accessKeyId: config?.accessKeyId || process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: config?.secretAccessKey || process.env.S3_SECRET_ACCESS_KEY!,
      bucketName: config?.bucketName || process.env.S3_BUCKET_NAME!,
      region: config?.region || process.env.S3_REGION!,
      timeout: config?.timeout || 3600, // 기본값 3600초 (1시간)
    };

    // Validate required configuration
    Object.entries(this.config).forEach(([key, value]) => {
      if (!value && key !== 'timeout') { // timeout은 선택적
        throw new Error(`Missing required S3 configuration: ${key}`);
      }
    });

    console.log('🔧 S3Service initialized with config:', {
      endpointUrl: this.config.endpointUrl,
      bucketName: this.config.bucketName,
      region: this.config.region,
      accessKeyId: this.config.accessKeyId ? '***' + this.config.accessKeyId.slice(-4) : 'missing',
      timeout: this.config.timeout
    });
  }

  // 파일명을 안전한 형태로 변환하는 함수
  private sanitizeFileName(fileName: string): string {
    // 특수문자 제거 및 안전한 문자로 변환
    return fileName
      .replace(/[()\[\]{}]/g, '') // 괄호 제거
      .replace(/[^a-zA-Z0-9._-]/g, '_') // 특수문자를 언더스코어로 변환
      .replace(/_+/g, '_') // 연속된 언더스코어를 하나로
      .replace(/^_|_$/g, ''); // 앞뒤 언더스코어 제거
  }

  async uploadFile(file: Buffer, fileName: string, contentType: string): Promise<{ s3Url: string; filePath: string }> {
    console.log(`📤 Uploading file to S3: ${fileName}`);
    
    // 파일명을 안전한 형태로 변환
    const safeFileName = this.sanitizeFileName(fileName);
    const objectKey = `input/multitalk/${Date.now()}_${safeFileName}`;
    
    console.log(`🔧 Original filename: ${fileName}`);
    console.log(`🔧 Sanitized filename: ${safeFileName}`);
    console.log(`🔧 Object key: ${objectKey}`);
    
    try {
      // 임시 파일로 저장 (안전한 파일명 사용)
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, safeFileName);
      fs.writeFileSync(tempFilePath, file);
      
      console.log(`💾 Temporary file created: ${tempFilePath}`);
      
      // AWS CLI 명령어 구성
      const awsCommand = `aws s3 cp "${tempFilePath}" s3://${this.config.bucketName}/${objectKey} --region ${this.config.region} --endpoint-url ${this.config.endpointUrl}`;
      
      console.log('🔐 Executing AWS CLI command...');
      console.log(`📝 Command: ${awsCommand.replace(this.config.secretAccessKey, '***')}`);
      
      // AWS CLI 실행
      const { stdout, stderr } = await execAsync(awsCommand, {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: this.config.accessKeyId,
          AWS_SECRET_ACCESS_KEY: this.config.secretAccessKey,
          AWS_DEFAULT_REGION: this.config.region,
          AWS_REGION: this.config.region,
        },
        timeout: (this.config.timeout || 3600) * 1000, // 초를 밀리초로 변환하고 더 길게 설정
      });
      
      if (stderr) {
        console.log('⚠️ AWS CLI stderr:', stderr);
      }
      
      console.log('✅ AWS CLI stdout:', stdout);
      
      // CORS 헤더 설정으로 웹에서 이미지 접근 가능하도록 설정
      try {
        console.log('🔧 Setting CORS headers for web access...');
        const corsCommand = `aws s3api put-object-acl --bucket ${this.config.bucketName} --key ${objectKey} --acl public-read --endpoint-url ${this.config.endpointUrl}`;
        
        const { stdout: corsStdout, stderr: corsStderr } = await execAsync(corsCommand, {
          env: {
            ...process.env,
            AWS_ACCESS_KEY_ID: this.config.accessKeyId,
            AWS_SECRET_ACCESS_KEY: this.config.secretAccessKey,
            AWS_DEFAULT_REGION: this.config.region,
            AWS_REGION: this.config.region,
          },
          timeout: 30000, // 30초 타임아웃
        });
        
        if (corsStderr) {
          console.log('⚠️ CORS setting stderr:', corsStderr);
        } else {
          console.log('✅ CORS headers set successfully:', corsStdout);
        }
      } catch (corsError) {
        console.warn('⚠️ Failed to set CORS headers (non-critical):', corsError);
        // CORS 설정 실패는 치명적이지 않으므로 계속 진행
      }
      
      // 임시 파일 삭제 (Windows 호환)
      try {
        // 잠시 대기 후 삭제 시도
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log(`🗑️ Temporary file deleted: ${tempFilePath}`);
        }
      } catch (deleteError) {
        console.warn(`⚠️ Could not delete temp file immediately: ${tempFilePath}`);
        // 백그라운드에서 나중에 삭제 시도
        setTimeout(() => {
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
              console.log(`🗑️ Temp file cleaned up later: ${tempFilePath}`);
            }
          } catch (finalError) {
            console.error(`❌ Final cleanup failed: ${tempFilePath}`, finalError);
          }
        }, 5000);
      }
      
      // S3 URL과 RunPod 파일 경로 모두 반환
      const s3Url = `${this.config.endpointUrl.replace(/\/$/, '')}/${this.config.bucketName}/${objectKey}`;
      const filePath = `/runpod-volume/${objectKey}`; // RunPod Network Volume 경로
      
      console.log(`✅ File uploaded to S3: ${s3Url}`);
      console.log(`📁 RunPod file path: ${filePath}`);
      
      return { s3Url, filePath };
    } catch (error) {
      console.error('❌ S3 upload error:', error);
      
      // 임시 파일 정리 (Windows 호환)
      try {
        // 잠시 대기 후 삭제 시도
        await new Promise(resolve => setTimeout(resolve, 2000));
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, safeFileName);
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log(`🗑️ Error cleanup: temp file deleted: ${tempFilePath}`);
        }
      } catch (cleanupError) {
        console.warn(`⚠️ Error cleanup failed: ${cleanupError}`);
        // 백그라운드에서 나중에 삭제 시도
        setTimeout(() => {
          try {
            const tempDir = os.tmpdir();
            const tempFilePath = path.join(tempDir, safeFileName);
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
              console.log(`🗑️ Error cleanup delayed: temp file deleted: ${tempFilePath}`);
            }
          } catch (finalError) {
            console.error(`❌ Final error cleanup failed: ${finalError}`);
          }
        }, 10000);
      }
      
      throw error;
    }
  }

  async uploadMultipleFiles(files: { buffer: Buffer; fileName: string; contentType: string }[]): Promise<{ s3Url: string; filePath: string }[]> {
    console.log(`📤 Uploading ${files.length} files to S3...`);
    
    const uploadPromises = files.map(file => 
      this.uploadFile(file.buffer, file.fileName, file.contentType)
    );
    
    try {
      const results = await Promise.all(uploadPromises);
      console.log(`✅ All ${files.length} files uploaded successfully`);
      return results;
    } catch (error) {
      console.error('❌ Failed to upload multiple files:', error);
      throw error;
    }
  }

  async deleteFile(objectKey: string): Promise<void> {
    console.log(`🗑️ Deleting file from S3: ${objectKey}`);
    
    try {
      const awsCommand = `aws s3 rm s3://${this.config.bucketName}/${objectKey} --region ${this.config.region} --endpoint-url ${this.config.endpointUrl}`;
      
      console.log('🔐 Executing AWS CLI delete command...');
      console.log(`📝 Command: ${awsCommand}`);
      
      const { stdout, stderr } = await execAsync(awsCommand, {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: this.config.accessKeyId,
          AWS_SECRET_ACCESS_KEY: this.config.secretAccessKey,
          AWS_DEFAULT_REGION: this.config.region,
          AWS_REGION: this.config.region,
        },
        timeout: (this.config.timeout || 3600) * 1000,
      });
      
      if (stderr) {
        console.log('⚠️ AWS CLI stderr:', stderr);
      }
      
      console.log('✅ AWS CLI stdout:', stdout);
      console.log(`✅ File deleted successfully: ${objectKey}`);
      
    } catch (error) {
      console.error('❌ S3 delete error:', error);
      throw error;
    }
  }
}

export default S3Service;