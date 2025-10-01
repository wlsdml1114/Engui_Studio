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
  maxRetries?: number; // 최대 재시도 횟수 (기본값: 5)
  retryDelay?: number; // 재시도 간격 (밀리초, 기본값: 1000)
}

// 재시도 가능한 에러인지 확인하는 함수
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.stderr || '';
  
  // 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
  if (errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('504')) {
    return true;
  }
  
  // 네트워크 관련 에러
  if (errorMessage.includes('timeout') || errorMessage.includes('ECONNRESET') || errorMessage.includes('ENOTFOUND')) {
    return true;
  }
  
  // AWS CLI 관련 에러
  if (errorMessage.includes('reached max retries') || errorMessage.includes('Bad Gateway')) {
    return true;
  }
  
  return false;
}

// 지수 백오프를 사용한 재시도 함수
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ${operationName} 시도 ${attempt}/${maxRetries}`);
      const result = await operation();
      
      if (attempt > 1) {
        console.log(`✅ ${operationName} 성공 (${attempt}번째 시도)`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error)) {
        console.log(`❌ ${operationName} 재시도 불가능한 에러:`, error);
        throw error;
      }
      
      if (attempt === maxRetries) {
        console.log(`❌ ${operationName} 최대 재시도 횟수 초과 (${maxRetries}회)`);
        break;
      }
      
      // 지수 백오프 계산 (최대 30초)
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
      console.log(`⏳ ${operationName} 재시도 대기 중... (${delay}ms 후 ${attempt + 1}번째 시도)`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
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
      maxRetries: config?.maxRetries || 5, // 기본값 5회 재시도
      retryDelay: config?.retryDelay || 1000, // 기본값 1초 간격
    };

    // Validate required configuration
    Object.entries(this.config).forEach(([key, value]) => {
      if (!value && !['timeout', 'maxRetries', 'retryDelay'].includes(key)) { // 선택적 필드들
        throw new Error(`Missing required S3 configuration: ${key}`);
      }
    });

    console.log('🔧 S3Service initialized with config:', {
      endpointUrl: this.config.endpointUrl,
      bucketName: this.config.bucketName,
      region: this.config.region,
      accessKeyId: this.config.accessKeyId ? '***' + this.config.accessKeyId.slice(-4) : 'missing',
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay
    });
  }

  // Network Volume 관리를 위한 메서드들

  // 파일 목록 가져오기 (RunPod S3 API용)
  async listFiles(prefix: string = ''): Promise<Array<{
    key: string;
    size: number;
    lastModified: Date;
    type: 'file' | 'directory';
    extension?: string;
  }>> {
    return executeWithRetry(async () => {
      // 루트 디렉토리의 경우 prefix를 빈 문자열로 설정하여 모든 폴더 마커를 가져옴
      const actualPrefix = prefix === '' ? '' : prefix;
      const command = `aws s3api list-objects-v2 --bucket ${this.config.bucketName} --prefix "${actualPrefix}" --delimiter "/" --region ${this.config.region} --endpoint-url ${this.config.endpointUrl}`;
      
      console.log('🔍 Listing files with command:', command);
      const { stdout } = await execAsync(command, {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: this.config.accessKeyId,
          AWS_SECRET_ACCESS_KEY: this.config.secretAccessKey,
          AWS_DEFAULT_REGION: this.config.region,
          AWS_REGION: this.config.region,
        },
        timeout: (this.config.timeout || 3600) * 1000,
      });
      
      const result = JSON.parse(stdout);
      
      // 디버깅: S3 API 응답 확인 (간단하게)
      console.log('🔍 Contents:', result.Contents?.map((c: any) => ({ Key: c.Key, Size: c.Size })));
      console.log('🔍 CommonPrefixes:', result.CommonPrefixes?.map((p: any) => ({ Prefix: p.Prefix })));
      
      // 파일들 처리
      const files = (result.Contents || []).map((obj: any) => {
        const key = obj.Key;
        const size = obj.Size || 0;
        const extension = path.extname(key);
        
        // 폴더 판단 로직:
        // 1. 키가 슬래시로 끝남 (S3 폴더 마커)
        // 2. CommonPrefixes에서 온 경우 (이미 폴더로 확인됨)
        const isDirectory = key.endsWith('/');
        
        return {
          key,
          size,
          lastModified: new Date(obj.LastModified),
          type: isDirectory ? 'directory' as const : 'file' as const,
          extension: isDirectory ? undefined : extension,
        };
      });

      // 폴더들 처리 (CommonPrefixes)
      const folders = (result.CommonPrefixes || []).map((prefix: any) => {
        const key = prefix.Prefix;
        return {
          key,
          size: 0,
          lastModified: new Date(),
          type: 'directory' as const,
          extension: undefined,
        };
      });

      // 파일과 폴더 합치기
      const allItems = [...files, ...folders];

      // 현재 경로와 동일한 항목 필터링 (자기 자신 제거)
      const filteredItems = allItems.filter((item: any) => {
        // 현재 경로와 정확히 일치하는 항목 제거
        if (prefix && item.key === prefix) {
          console.log('🚫 Filtering out self-reference:', item.key);
          return false;
        }
        // CommonPrefixes의 경우 현재 경로로 시작하는지 확인
        if (prefix && item.key.startsWith(prefix) && item.key !== prefix) {
          // 현재 경로의 직접 하위 항목만 표시
          const relativePath = item.key.substring(prefix.length);
          const pathParts = relativePath.split('/').filter((part: string) => part.length > 0);
          if (pathParts.length > 1) {
            console.log('🚫 Filtering out nested item:', item.key);
            return false;
          }
        }
        return true;
      });

      // 디버깅: 각 항목의 key 값 확인 (간단하게)
      console.log('🔍 Found items:', filteredItems.length);

      // 디렉토리와 파일을 구분하여 정렬
      const directories = filteredItems.filter((f: any) => f.type === 'directory');
      const fileList = filteredItems.filter((f: any) => f.type === 'file');
      
      console.log(`✅ Found ${allItems.length} items (${directories.length} directories, ${fileList.length} files)`);
      
      return [...directories, ...fileList];
    }, this.config.maxRetries || 5, this.config.retryDelay || 1000, '파일 목록 조회').catch(async (error) => {
      console.error('❌ Failed to list files after retries:', error);
      
      // 502 Bad Gateway 에러인 경우 특별한 메시지 제공
      if (error instanceof Error && error.message.includes('502')) {
        throw new Error(`RunPod S3 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요. (502 Bad Gateway)`);
      }
      
      throw new Error(`파일 목록을 가져올 수 없습니다: ${error}`);
    });
  }

  // 파일 다운로드 (RunPod S3 API용)
  async downloadFile(key: string): Promise<Buffer> {
    return executeWithRetry(async () => {
      const tempFile = path.join(os.tmpdir(), `s3-download-${Date.now()}-${path.basename(key)}`);
      const command = `aws s3 cp "s3://${this.config.bucketName}/${key}" "${tempFile}" --region ${this.config.region} --endpoint-url ${this.config.endpointUrl}`;
      
      console.log('📥 Downloading file with command:', command);
      await execAsync(command, {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: this.config.accessKeyId,
          AWS_SECRET_ACCESS_KEY: this.config.secretAccessKey,
          AWS_DEFAULT_REGION: this.config.region,
          AWS_REGION: this.config.region,
        },
        timeout: (this.config.timeout || 3600) * 1000,
      });
      
      const fileBuffer = fs.readFileSync(tempFile);
      fs.unlinkSync(tempFile); // 임시 파일 삭제
      
      console.log('✅ File downloaded successfully:', key);
      return fileBuffer;
    }, this.config.maxRetries || 5, this.config.retryDelay || 1000, '파일 다운로드').catch(async (error) => {
      console.error('❌ Failed to download file after retries:', error);
      
      // 502 Bad Gateway 에러인 경우 특별한 메시지 제공
      if (error instanceof Error && error.message.includes('502')) {
        throw new Error(`RunPod S3 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요. (502 Bad Gateway)`);
      }
      
      throw new Error(`파일 다운로드에 실패했습니다: ${error}`);
    });
  }

  // 파일 삭제 (RunPod S3 API용)
  async deleteFile(key: string): Promise<void> {
    return executeWithRetry(async () => {
      const command = `aws s3 rm "s3://${this.config.bucketName}/${key}" --region ${this.config.region} --endpoint-url ${this.config.endpointUrl}`;
      
      console.log('🗑️ Deleting file with command:', command);
      await execAsync(command, {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: this.config.accessKeyId,
          AWS_SECRET_ACCESS_KEY: this.config.secretAccessKey,
          AWS_DEFAULT_REGION: this.config.region,
          AWS_REGION: this.config.region,
        },
        timeout: (this.config.timeout || 3600) * 1000,
      });
      
      console.log('✅ File deleted successfully:', key);
    }, this.config.maxRetries || 5, this.config.retryDelay || 1000, '파일 삭제').catch(async (error) => {
      console.error('❌ Failed to delete file after retries:', error);
      
      // 502 Bad Gateway 에러인 경우 특별한 메시지 제공
      if (error instanceof Error && error.message.includes('502')) {
        throw new Error(`RunPod S3 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요. (502 Bad Gateway)`);
      }
      
      throw new Error(`파일 삭제에 실패했습니다: ${error}`);
    });
  }

  // 폴더 생성 (RunPod S3 API용)
  async createFolder(folderKey: string): Promise<void> {
    let tempEmptyFile: string | null = null;
    
    try {
      // S3에서는 폴더를 빈 파일로 생성 (끝에 / 추가)
      const folderPath = folderKey.endsWith('/') ? folderKey : `${folderKey}/`;
      
      // 폴더 생성 전에 충돌 확인
      const conflictCheckCommand = `aws s3api head-object --bucket ${this.config.bucketName} --key "${folderKey}" --region ${this.config.region} --endpoint-url ${this.config.endpointUrl}`;
      
      try {
        await execAsync(conflictCheckCommand, {
          env: {
            ...process.env,
            AWS_ACCESS_KEY_ID: this.config.accessKeyId,
            AWS_SECRET_ACCESS_KEY: this.config.secretAccessKey,
            AWS_DEFAULT_REGION: this.config.region,
            AWS_REGION: this.config.region,
          },
          timeout: 10000,
        });
        
        // 파일이 존재함 - 자동으로 삭제하고 폴더 생성
        console.log('⚠️ Conflicting file found, deleting it first...');
        const deleteCommand = `aws s3api delete-object --bucket ${this.config.bucketName} --key "${folderKey}" --region ${this.config.region} --endpoint-url ${this.config.endpointUrl}`;
        
        await execAsync(deleteCommand, {
          env: {
            ...process.env,
            AWS_ACCESS_KEY_ID: this.config.accessKeyId,
            AWS_SECRET_ACCESS_KEY: this.config.secretAccessKey,
            AWS_DEFAULT_REGION: this.config.region,
            AWS_REGION: this.config.region,
          },
          timeout: 10000,
        });
        
        console.log('✅ Conflicting file deleted successfully');
      } catch (headError: any) {
        // 파일이 존재하지 않음 (정상)
        if (headError.code === 'NoSuchKey' || headError.message?.includes('NoSuchKey')) {
          console.log('✅ No conflict found, proceeding with folder creation');
        } else {
          console.warn('⚠️ Conflict check failed, proceeding anyway:', headError.message);
        }
      }
      
      // S3에서 폴더를 생성하려면 해당 폴더에 파일을 업로드해야 함
      tempEmptyFile = path.join(os.tmpdir(), `folder-${Date.now()}.txt`);
      fs.writeFileSync(tempEmptyFile, 'This is a folder marker. You can delete this file.');
      
      const command = `aws s3api put-object --bucket ${this.config.bucketName} --key "${folderPath}folder-marker.txt" --body "${tempEmptyFile}" --region ${this.config.region} --endpoint-url ${this.config.endpointUrl}`;
      
      console.log('📁 Creating folder with command:', command);
      await execAsync(command, {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: this.config.accessKeyId,
          AWS_SECRET_ACCESS_KEY: this.config.secretAccessKey,
          AWS_DEFAULT_REGION: this.config.region,
          AWS_REGION: this.config.region,
        },
        timeout: (this.config.timeout || 3600) * 1000,
      });
      
      console.log('✅ Folder created:', folderPath);
      
    } catch (error) {
      console.error('❌ Failed to create folder:', error);
      throw new Error(`폴더 생성에 실패했습니다: ${error}`);
    } finally {
      // 임시 파일 정리
      if (tempEmptyFile && fs.existsSync(tempEmptyFile)) {
        try {
          fs.unlinkSync(tempEmptyFile);
          console.log('🗑️ Temporary file cleaned up');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup temp file:', cleanupError);
        }
      }
    }
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

  async uploadFile(file: Buffer, fileName: string, contentType: string, uploadPath: string = ''): Promise<{ s3Url: string; filePath: string }> {
    console.log(`📤 Uploading file to S3: ${fileName}`);
    
    // 파일명을 안전한 형태로 변환
    const safeFileName = this.sanitizeFileName(fileName);
    
    // 업로드 경로 처리
    let basePath = '';
    if (uploadPath) {
      // 사용자가 지정한 경로가 있으면 그대로 사용
      basePath = uploadPath.endsWith('/') ? uploadPath : `${uploadPath}/`;
    } else {
      // 경로가 지정되지 않았으면 루트에 업로드
      basePath = '';
    }
    // 파일명 중복 처리: 같은 이름의 파일이 있으면 번호를 추가
    let objectKey = basePath ? `${basePath}${safeFileName}` : safeFileName;
    
    // 파일명에서 확장자 분리
    const fileExt = path.extname(safeFileName);
    const fileNameWithoutExt = path.basename(safeFileName, fileExt);
    
    // 중복 파일명 확인 및 처리
    try {
      const checkCommand = `aws s3api head-object --bucket ${this.config.bucketName} --key "${objectKey}" --region ${this.config.region} --endpoint-url ${this.config.endpointUrl}`;
      await execAsync(checkCommand, {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: this.config.accessKeyId,
          AWS_SECRET_ACCESS_KEY: this.config.secretAccessKey,
          AWS_DEFAULT_REGION: this.config.region,
          AWS_REGION: this.config.region,
        },
        timeout: 5000,
      });
      
      // 파일이 존재하면 번호를 추가
      let counter = 1;
      let newObjectKey = basePath ? `${basePath}${fileNameWithoutExt}_${counter}${fileExt}` : `${fileNameWithoutExt}_${counter}${fileExt}`;
      
      while (true) {
        try {
          const checkDuplicateCommand = `aws s3api head-object --bucket ${this.config.bucketName} --key "${newObjectKey}" --region ${this.config.region} --endpoint-url ${this.config.endpointUrl}`;
          await execAsync(checkDuplicateCommand, {
            env: {
              ...process.env,
              AWS_ACCESS_KEY_ID: this.config.accessKeyId,
              AWS_SECRET_ACCESS_KEY: this.config.secretAccessKey,
              AWS_DEFAULT_REGION: this.config.region,
              AWS_REGION: this.config.region,
            },
            timeout: 5000,
          });
          counter++;
          newObjectKey = basePath ? `${basePath}${fileNameWithoutExt}_${counter}${fileExt}` : `${fileNameWithoutExt}_${counter}${fileExt}`;
        } catch {
          // 파일이 존재하지 않으면 사용 가능한 이름
          objectKey = newObjectKey;
          break;
        }
      }
      
      console.log(`📝 File name conflict resolved: ${objectKey}`);
    } catch {
      // 파일이 존재하지 않으면 원래 이름 사용
      console.log(`📝 Using original filename: ${objectKey}`);
    }
    
    console.log(`📤 Uploading: ${fileName} to ${objectKey}`);
    
    // S3에서는 폴더와 파일이 공존할 수 있으므로 경로 충돌 확인 불필요
    // 파일을 업로드하면 자동으로 폴더 구조가 생성됨
    
    return executeWithRetry(async () => {
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
      
      // RunPod S3는 ACL을 지원하지 않으므로 CORS 설정을 건너뜀
      console.log('🔧 Skipping CORS headers (RunPod S3 does not support ACL)');
      
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
    }, this.config.maxRetries || 5, this.config.retryDelay || 1000, '파일 업로드').catch(async (error) => {
      console.error('❌ S3 upload error after retries:', error);
      
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
      
      // 502 Bad Gateway 에러인 경우 특별한 메시지 제공
      if (error instanceof Error && error.message.includes('502')) {
        throw new Error(`RunPod S3 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요. (502 Bad Gateway)`);
      }
      
      throw error;
    });
  }

  async uploadMultipleFiles(files: { buffer: Buffer; fileName: string; contentType: string }[], uploadPath: string = ''): Promise<{ s3Url: string; filePath: string }[]> {
    console.log(`📤 Uploading ${files.length} files to S3...`);
    
    const uploadPromises = files.map(file => 
      this.uploadFile(file.buffer, file.fileName, file.contentType, uploadPath)
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

}

export default S3Service;