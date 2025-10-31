// src/lib/s3Service.ts

import { exec, spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

interface S3Config {
  endpointUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  timeout?: number;
  useGlobalNetworking?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

// 재시도 가능한 에러인지 확인하는 함수
function isRetryableError(error: any): boolean {
  if (!error) return false;

  const errorMessage = (error.message || error.Code || '').toString().toLowerCase();

  // Network errors
  if (
    errorMessage.includes('econnreset') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('econnrefused')
  ) {
    return true;
  }

  // AWS service errors (but NOT authentication errors)
  if (
    errorMessage.includes('503') ||
    errorMessage.includes('502') ||
    errorMessage.includes('504') ||
    errorMessage.includes('throttling') ||
    errorMessage.includes('requestlimitexceeded')
  ) {
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
      logger.emoji.testing(`${operationName} 시도 ${attempt}/${maxRetries}`);
      const result = await operation();

      if (attempt > 1) {
        logger.info(`${operationName} 성공 (${attempt}번째 시도)`);
      }

      return result;
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error)) {
        logger.error(`${operationName} 재시도 불가능한 에러:`, error);
        throw error;
      }

      if (attempt === maxRetries) {
        logger.error(`${operationName} 최대 재시도 횟수 초과 (${maxRetries}회)`);
        break;
      }

      // 지수 백오프 계산 (최대 30초)
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
      logger.emoji.testing(
        `${operationName} 재시도 대기 중... (${delay}ms 후 ${attempt + 1}번째 시도)`
      );

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
      region: (config?.region || process.env.S3_REGION || 'us-east-1').toLowerCase(),
      timeout: config?.timeout || 3600,
      useGlobalNetworking: config?.useGlobalNetworking ?? false,
      maxRetries: config?.maxRetries || 3, // AWS CLI는 5회보다는 3회가 적당
      retryDelay: config?.retryDelay || 1000,
    };

    // Validate required configuration
    Object.entries(this.config).forEach(([key, value]) => {
      if (
        !value &&
        ![
          'timeout',
          'maxRetries',
          'retryDelay',
          'useGlobalNetworking',
        ].includes(key)
      ) {
        throw new Error(`Missing required S3 configuration: ${key}`);
      }
    });

    logger.emoji.testing('S3Service initialized with config:', {
      endpointUrl: this.config.endpointUrl,
      bucketName: this.config.bucketName,
      region: this.config.region,
      accessKeyId: this.config.accessKeyId ? '***' + this.config.accessKeyId.slice(-4) : 'missing',
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      useGlobalNetworking: this.config.useGlobalNetworking ? '✅ Enabled' : '🔒 Disabled (AWS CLI)',
    });
  }

  // AWS CLI 명령어 실행 (execFile 사용)
  private async runAwsCommand(args: string[], options?: { silent?: boolean }): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const isSilent = options?.silent === true;

      if (!isSilent) {
        logger.emoji.search('🔍 Starting AWS CLI process with args:', args);
        logger.emoji.search('🔐 AWS Config:', {
          accessKeyId: this.config.accessKeyId ? '***' + this.config.accessKeyId.slice(-4) : 'MISSING',
          accessKeyIdLength: this.config.accessKeyId?.length,
          secretAccessKeyLength: this.config.secretAccessKey?.length,
          secretAccessKey: this.config.secretAccessKey ? '***' : 'MISSING',
          region: this.config.region,
          bucketName: this.config.bucketName,
          endpointUrl: this.config.endpointUrl,
        });
      }

      // 자격증명 검증
      if (!this.config.accessKeyId || !this.config.secretAccessKey) {
        const missingFields = [];
        if (!this.config.accessKeyId) missingFields.push('accessKeyId');
        if (!this.config.secretAccessKey) missingFields.push('secretAccessKey');
        return reject(new Error(`Missing AWS credentials: ${missingFields.join(', ')}`));
      }

      // 빈 문자열 체크
      if (this.config.accessKeyId.trim() === '' || this.config.secretAccessKey.trim() === '') {
        const emptyFields = [];
        if (this.config.accessKeyId.trim() === '') emptyFields.push('accessKeyId (empty string)');
        if (this.config.secretAccessKey.trim() === '') emptyFields.push('secretAccessKey (empty string)');
        return reject(new Error(`AWS credentials are empty: ${emptyFields.join(', ')}`));
      }

      const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: this.config.accessKeyId,
        AWS_SECRET_ACCESS_KEY: this.config.secretAccessKey,
        AWS_DEFAULT_REGION: this.config.region,
        AWS_REGION: this.config.region,
      };

      if (!isSilent) {
        logger.emoji.search('🔐 Env vars being set:', {
          AWS_ACCESS_KEY_ID_SET: !!env.AWS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY_SET: !!env.AWS_SECRET_ACCESS_KEY,
          AWS_DEFAULT_REGION: env.AWS_DEFAULT_REGION,
        });

        logger.emoji.search('🚀 Executing AWS CLI command:', ['aws', ...args].join(' '));
      }

      // 리전 정규화 (AWS CLI는 소문자 region을 기대함)
      const normalizedArgs = args.map((arg, idx, arr) => {
        if (arg === '--region' && idx + 1 < arr.length) {
          const region = arr[idx + 1];
          if (region !== region.toLowerCase()) {
            if (!isSilent) {
              logger.emoji.search(`📝 Normalizing region: ${region} → ${region.toLowerCase()}`);
            }
            arr[idx + 1] = region.toLowerCase();
          }
        }
        return arg;
      });

      // execFile을 사용하여 AWS CLI 실행 (더 안정적)
      execFile('aws', normalizedArgs, {
        env,
        timeout: (this.config.timeout || 3600) * 1000,
        maxBuffer: 10 * 1024 * 1024, // 10MB 버퍼
      }, (error: any, stdout: string, stderr: string) => {
        if (!isSilent) {
          logger.emoji.search(`📊 AWS CLI process completed`);
          logger.emoji.search('📤 stdout length:', stdout.length);
          logger.emoji.search('stdout preview:', stdout.substring(0, 500));
          logger.emoji.search('❌ stderr length:', stderr.length);
          logger.emoji.search('❌ stderr content:', stderr);
          logger.emoji.search('Exit code:', error?.code || 0);
        }

        if (error && error.code !== 0) {
          const errorMsg = stderr || stdout || error.message || `AWS CLI exited with code ${error.code}`;
          if (!isSilent) {
            logger.error(`❌ AWS CLI exited with code ${error.code}`);
            logger.error('Error details:', errorMsg);
          }
          return reject(new Error(`AWS CLI exited with code ${error.code}: ${errorMsg}`));
        }

        if (error && error.signal) {
          if (!isSilent) {
            logger.error('❌ AWS CLI killed by signal:', error.signal);
          }
          return reject(new Error(`AWS CLI killed by signal ${error.signal}`));
        }

        resolve({ stdout, stderr });
      });
    });
  }

  // 파일 목록 가져오기
  async listFiles(prefix: string = ''): Promise<
    Array<{
      key: string;
      size: number;
      lastModified: Date;
      type: 'file' | 'directory';
      extension?: string;
    }>
  > {
    return executeWithRetry(
      async () => {
        const args = [
          's3api',
          'list-objects-v2',
          '--bucket',
          this.config.bucketName,
          '--region',
          this.config.region,
          '--endpoint-url',
          this.config.endpointUrl,
          '--delimiter',
          '/',
          '--output',
          'json',
        ];

        if (prefix && prefix.length > 0) {
          args.push('--prefix', prefix);
        }

        logger.emoji.search(`Listing files in ${prefix || 'root'}...`);
        logger.emoji.search('AWS CLI args:', args.join(' '));

        const { stdout, stderr } = await this.runAwsCommand(args);

        if (stderr && stderr.length > 0) {
          logger.emoji.search('AWS CLI stderr:', stderr);

          // stderr에서 특정 에러 메시지 추출
          if (stderr.includes('NoCredentialsError') || stderr.includes('Unable to locate credentials')) {
            throw new Error('AWS credentials not found or invalid');
          }
          if (stderr.includes('InvalidAccessKeyId')) {
            throw new Error('Invalid AWS Access Key ID');
          }
          if (stderr.includes('SignatureDoesNotMatch')) {
            throw new Error('Invalid AWS Secret Access Key');
          }
          if (stderr.includes('endpoint')) {
            throw new Error(`Cannot connect to S3 endpoint: ${stderr}`);
          }
        }

        // stdout가 비어있으면 빈 버킷 응답으로 취급
        let result;
        if (!stdout || stdout.trim().length === 0) {
          logger.emoji.search('📭 Empty stdout from AWS CLI - bucket might be empty');
          result = {
            Contents: [],
            CommonPrefixes: []
          };
        } else {
          try {
            result = JSON.parse(stdout);
            logger.emoji.search('✅ Successfully parsed AWS CLI JSON output');
          } catch (parseError) {
            logger.error('Failed to parse AWS CLI JSON output:', stdout.substring(0, 200));
            logger.error('Parse error:', parseError);
            throw new Error(`Failed to parse AWS CLI response: ${parseError}`);
          }
        }

        logger.emoji.search('Contents:', result.Contents?.map((c: any) => ({ Key: c.Key, Size: c.Size })));
        logger.emoji.search('CommonPrefixes:', result.CommonPrefixes?.map((p: any) => ({ Prefix: p.Prefix })));

        // 파일들 처리
        const files = (result.Contents || []).map((obj: any) => {
          const key = obj.Key!;
          const size = obj.Size || 0;
          const extension = path.extname(key);
          const isDirectory = key.endsWith('/');

          return {
            key,
            size,
            lastModified: obj.LastModified ? new Date(obj.LastModified) : new Date(),
            type: isDirectory ? ('directory' as const) : ('file' as const),
            extension: isDirectory ? undefined : extension,
          };
        });

        // 폴더들 처리 (CommonPrefixes)
        const folders = (result.CommonPrefixes || []).map((p: any) => {
          const key = p.Prefix!;
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

        // 현재 경로와 동일한 항목 필터링
        const filteredItems = allItems.filter(item => {
          if (prefix && item.key === prefix) {
            logger.emoji.search('🚫 Filtering out self-reference:', item.key);
            return false;
          }
          if (prefix && item.key.startsWith(prefix) && item.key !== prefix) {
            const relativePath = item.key.substring(prefix.length);
            const pathParts = relativePath.split('/').filter((part: any) => part.length > 0);
            if (pathParts.length > 1) {
              logger.emoji.search('🚫 Filtering out nested item:', item.key);
              return false;
            }
          }
          return true;
        });

        const directories = filteredItems.filter(f => f.type === 'directory');
        const fileList = filteredItems.filter(f => f.type === 'file');

        logger.info(`Found ${allItems.length} items (${directories.length} directories, ${fileList.length} files)`);

        return [...directories, ...fileList];
      },
      this.config.maxRetries || 3,
      this.config.retryDelay || 1000,
      '파일 목록 조회'
    ).catch(async error => {
      logger.error('Failed to list files after retries:', error);

      if (error instanceof Error && error.message.includes('SignatureDoesNotMatch')) {
        throw new Error(`S3 인증 실패: Access Key ID와 Secret Access Key를 확인해주세요.`);
      }

      if (error instanceof Error && error.message.includes('502')) {
        throw new Error(`RunPod S3 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요. (502 Bad Gateway)`);
      }

      throw new Error(`파일 목록을 가져올 수 없습니다: ${error}`);
    });
  }

  // 파일 다운로드
  async downloadFile(key: string): Promise<Buffer> {
    return executeWithRetry(
      async () => {
        const downloadFile = path.join(os.tmpdir(), `s3-download-${Date.now()}`);

        const args = [
          's3',
          'cp',
          `s3://${this.config.bucketName}/${key}`,
          downloadFile,
          '--region',
          this.config.region,
          '--endpoint-url',
          this.config.endpointUrl,
        ];

        logger.emoji.search(`Downloading file: ${key}`);

        const { stdout, stderr } = await this.runAwsCommand(args);

        if (stderr && stderr.length > 0) {
          logger.emoji.search('AWS CLI stderr:', stderr);
        }

        // 다운로드된 파일 읽기
        const fileBuffer = fs.readFileSync(downloadFile);
        fs.unlinkSync(downloadFile); // 임시 파일 삭제

        logger.info(`✅ File downloaded successfully: ${key}`);

        return fileBuffer;
      },
      this.config.maxRetries || 3,
      this.config.retryDelay || 1000,
      '파일 다운로드'
    ).catch(async error => {
      logger.error('Failed to download file after retries:', error);

      if (error instanceof Error && error.message.includes('502')) {
        throw new Error(`RunPod S3 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요. (502 Bad Gateway)`);
      }

      throw new Error(`파일 다운로드에 실패했습니다: ${error}`);
    });
  }

  // 파일 삭제
  async deleteFile(key: string): Promise<void> {
    return executeWithRetry(
      async () => {
        const args = [
          's3',
          'rm',
          `s3://${this.config.bucketName}/${key}`,
          '--region',
          this.config.region,
          '--endpoint-url',
          this.config.endpointUrl,
        ];

        logger.emoji.search(`Deleting file: ${key}`);

        const { stdout, stderr } = await this.runAwsCommand(args);

        if (stderr && stderr.length > 0) {
          logger.emoji.search('AWS CLI stderr:', stderr);
        }

        logger.info(`✅ File deleted successfully: ${key}`);
      },
      this.config.maxRetries || 3,
      this.config.retryDelay || 1000,
      '파일 삭제'
    ).catch(async error => {
      logger.error('Failed to delete file after retries:', error);

      if (error instanceof Error && error.message.includes('502')) {
        throw new Error(`RunPod S3 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요. (502 Bad Gateway)`);
      }

      throw new Error(`파일 삭제에 실패했습니다: ${error}`);
    });
  }

  // 폴더 생성
  async createFolder(folderKey: string): Promise<void> {
    try {
      const folderPath = folderKey.endsWith('/') ? folderKey : `${folderKey}/`;

      logger.emoji.search(`Creating folder: ${folderPath}`);

      // 임시 파일 생성
      const tempFile = path.join(os.tmpdir(), `folder-marker-${Date.now()}.txt`);
      fs.writeFileSync(tempFile, 'This is a folder marker. You can delete this file.');

      const args = [
        's3api',
        'put-object',
        '--bucket',
        this.config.bucketName,
        '--key',
        folderPath + 'folder-marker.txt',
        '--body',
        tempFile,
        '--region',
        this.config.region,
        '--endpoint-url',
        this.config.endpointUrl,
      ];

      const { stdout, stderr } = await this.runAwsCommand(args);

      // 임시 파일 삭제
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      if (stderr && stderr.length > 0) {
        logger.emoji.search('AWS CLI stderr:', stderr);
      }

      logger.info(`✅ Folder created: ${folderPath}`);
    } catch (error) {
      logger.error('Failed to create folder:', error);
      throw new Error(`폴더 생성에 실패했습니다: ${error}`);
    }
  }

  // 파일명 안전화
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[()\[\]{}]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // 파일 업로드
  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
    uploadPath: string = ''
  ): Promise<{ s3Url: string; filePath: string }> {
    const safeFileName = this.sanitizeFileName(fileName);

    // 업로드 경로 처리
    let basePath = '';
    if (uploadPath) {
      basePath = uploadPath.endsWith('/') ? uploadPath : `${uploadPath}/`;
    }

    let objectKey = basePath ? `${basePath}${safeFileName}` : safeFileName;

    logger.info(`📤 Uploading file to S3: ${fileName}`);

    return executeWithRetry(
      async () => {
        // 파일명 중복 처리
        const fileExt = path.extname(safeFileName);
        const fileNameWithoutExt = path.basename(safeFileName, fileExt);

        try {
          // 파일 존재 여부 확인
          const checkArgs = [
            's3api',
            'head-object',
            '--bucket',
            this.config.bucketName,
            '--key',
            objectKey,
            '--region',
            this.config.region,
            '--endpoint-url',
            this.config.endpointUrl,
          ];

          await this.runAwsCommand(checkArgs, { silent: true });

          // 파일이 존재하면 번호를 추가
          logger.emoji.search(`📂 File exists, checking for available numbered name...`);
          let counter = 1;
          let newObjectKey = basePath
            ? `${basePath}${fileNameWithoutExt}_${counter}${fileExt}`
            : `${fileNameWithoutExt}_${counter}${fileExt}`;

          while (true) {
            try {
              const checkDuplicateArgs = [
                's3api',
                'head-object',
                '--bucket',
                this.config.bucketName,
                '--key',
                newObjectKey,
                '--region',
                this.config.region,
                '--endpoint-url',
                this.config.endpointUrl,
              ];

              await this.runAwsCommand(checkDuplicateArgs, { silent: true });
              counter++;
              newObjectKey = basePath
                ? `${basePath}${fileNameWithoutExt}_${counter}${fileExt}`
                : `${fileNameWithoutExt}_${counter}${fileExt}`;
            } catch {
              objectKey = newObjectKey;
              break;
            }
          }

          logger.info(`📝 File name conflict resolved: ${objectKey}`);
        } catch (error: any) {
          // 파일이 존재하지 않으면 원래 이름 사용 (404는 정상)
          if (error instanceof Error && error.message.includes('404')) {
            logger.emoji.search(`✅ File does not exist, using original filename: ${objectKey}`);
          } else {
            logger.emoji.search(`⚠️ HeadObject check failed (expected for new files): ${objectKey}`);
          }
        }

        // 임시 파일로 저장
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, safeFileName);
        fs.writeFileSync(tempFilePath, file);

        try {
          const uploadArgs = [
            's3',
            'cp',
            tempFilePath,
            `s3://${this.config.bucketName}/${objectKey}`,
            '--region',
            this.config.region,
            '--endpoint-url',
            this.config.endpointUrl,
          ];

          logger.emoji.search(`📤 Uploading: ${fileName} to ${objectKey}`);

          const { stdout, stderr } = await this.runAwsCommand(uploadArgs);

          if (stderr && stderr.length > 0) {
            logger.emoji.search('AWS CLI stderr:', stderr);
          }

          logger.info(`✅ File uploaded to S3`);

          // S3 URL과 RunPod 파일 경로 반환
          const s3Url = `${this.config.endpointUrl.replace(/\/$/, '')}/${this.config.bucketName}/${objectKey}`;
          const filePath = `/runpod-volume/${objectKey}`;

          logger.info(`✅ File uploaded to S3: ${s3Url}`);
          logger.info(`📁 RunPod file path: ${filePath}`);

          return { s3Url, filePath };
        } finally {
          // 임시 파일 삭제
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      },
      this.config.maxRetries || 3,
      this.config.retryDelay || 1000,
      '파일 업로드'
    ).catch(async error => {
      logger.error('S3 upload error after retries:', error);

      if (error instanceof Error && error.message.includes('502')) {
        throw new Error(`RunPod S3 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요. (502 Bad Gateway)`);
      }

      throw error;
    });
  }

  // 여러 파일 업로드
  async uploadMultipleFiles(
    files: { buffer: Buffer; fileName: string; contentType: string }[],
    uploadPath: string = ''
  ): Promise<{ s3Url: string; filePath: string }[]> {
    logger.info(`📤 Uploading ${files.length} files to S3...`);

    const uploadPromises = files.map(file =>
      this.uploadFile(file.buffer, file.fileName, file.contentType, uploadPath)
    );

    try {
      const results = await Promise.all(uploadPromises);
      logger.info(`✅ All ${files.length} files uploaded successfully`);
      return results;
    } catch (error) {
      logger.error('Failed to upload multiple files:', error);
      throw error;
    }
  }
}

export default S3Service;
