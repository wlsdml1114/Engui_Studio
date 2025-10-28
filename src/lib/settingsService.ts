// src/lib/settingsService.ts

import { PrismaClient } from '@prisma/client';
import EncryptionService from './encryptionService';
import { logger } from './logger';

// Global Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma = globalThis.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

interface ServiceConfig {
  runpod: RunPodConfig;
  s3: S3Config;
  workspace?: WorkspaceConfig;
  ui?: UIConfig;
}

interface WorkspaceConfig {
  currentWorkspaceId?: string;
  defaultWorkspaceId?: string;
}

interface UIConfig {
  language?: 'ko' | 'en';
}

interface RunPodConfig {
  apiKey: string;
  generateTimeout?: number;
  endpoints: {
    image: string;
    video: string;
    multitalk: string;
    'flux-kontext': string; // FLUX KONTEXT endpoint 추가
    'flux-krea': string; // FLUX KREA endpoint 추가
    wan22: string; // WAN 2.2 endpoint 추가
    'wan-animate': string; // WAN Animate endpoint 추가
    'infinite-talk': string; // Infinite Talk endpoint 추가
    'video-upscale': string; // Video Upscale endpoint 추가
  };
}

interface S3Config {
  endpointUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  timeout?: number;
  useGlobalNetworking?: boolean;
}

interface Settings {
  runpod: RunPodConfig;
  s3: S3Config;
}

interface ServiceStatus {
  configured: 'configured' | 'partial' | 'missing';
  runpod: 'configured' | 'partial' | 'missing';
  s3: 'configured' | 'partial' | 'missing';
}

class SettingsService {
  private encryption: EncryptionService;

  constructor() {
    this.encryption = new EncryptionService();
  }

  private isSensitiveKey(serviceName: string, configKey: string): boolean {
    // 암호화 비활성화 - 모든 키를 평문으로 처리
    return false;
  }

  async getSettings(userId: string): Promise<{ settings: Partial<ServiceConfig>; status: ServiceStatus }> {
    try {
      logger.emoji.loading(`Loading settings for user: ${userId}`);
      
      // Test database connection first
      logger.emoji.testing('Testing database connection...');

      // Check if prisma is properly initialized
      if (!prisma) {
        throw new Error('Prisma client is not initialized');
      }

      logger.emoji.testing('Prisma client is available, attempting to query...');

      const userSettings = await prisma.userSetting.findMany({
        where: { userId },
      });

      logger.emoji.stats(`Found ${userSettings.length} settings for user ${userId}`);
      logger.emoji.search('Raw database settings:', userSettings.map(s => ({
        serviceName: s.serviceName,
        configKey: s.configKey,
        configValue: s.configValue?.substring(0, 30) + '...',
        isEncrypted: s.isEncrypted
      })));

        const settings: any = {
        runpod: {
          apiKey: '',
          endpoints: {
            image: '',
            video: '',
            multitalk: '',
            'flux-kontext': '', // FLUX KONTEXT endpoint 추가
            'flux-krea': '', // FLUX KREA endpoint 추가
            wan22: '', // WAN 2.2 endpoint 추가
            'wan-animate': '', // WAN Animate endpoint 추가
            'infinite-talk': '', // Infinite Talk endpoint 추가
            'video-upscale': '' // Video Upscale endpoint 추가
          },
          generateTimeout: 3600 // 기본값 3600초 (1시간)
        },
        s3: {
          endpointUrl: '',
          accessKeyId: '',
          secretAccessKey: '',
          bucketName: '',
          region: '',
          timeout: 3600, // 기본값 3600초 (1시간)
          useGlobalNetworking: false // 기본값 false (Local network mode)
        },
        workspace: {
          currentWorkspaceId: '',
          defaultWorkspaceId: ''
        },
        ui: {
          language: 'ko' // 기본값 한국어
        }
      };

      logger.emoji.testing('Initial settings structure:', JSON.stringify(settings, null, 2));

      let decryptionErrors = 0;
      let successfulDecryptions = 0;

      // Populate settings from database
      for (const setting of userSettings) {
        try {
          const value = setting.isEncrypted 
            ? this.encryption.decrypt(setting.configValue)
            : setting.configValue;
          
          logger.emoji.testing(`Processing setting: ${setting.serviceName}.${setting.configKey} = ${value.substring(0, 20)}...`);
          
          // 올바른 중첩 구조로 데이터 배치
          if (setting.serviceName === 'runpod') {
            if (setting.configKey === 'apiKey') {
              settings.runpod.apiKey = value;
            } else             if (setting.configKey.startsWith('endpoints.')) {
              const endpointType = setting.configKey.split('.')[1];
              if (endpointType && ['image', 'video', 'multitalk', 'flux-kontext', 'flux-krea', 'wan22', 'wan-animate', 'infinite-talk', 'video-upscale'].includes(endpointType)) {
                settings.runpod.endpoints[endpointType as keyof typeof settings.runpod.endpoints] = value;
              }
            } else if (setting.configKey === 'generateTimeout') {
              // generateTimeout은 숫자로 변환
              settings.runpod.generateTimeout = parseInt(value) || 3600;
            }
          } else if (setting.serviceName === 's3') {
            if (['endpointUrl', 'accessKeyId', 'secretAccessKey', 'bucketName', 'region'].includes(setting.configKey)) {
              // Region을 소문자로 정규화 (AWS CLI expects lowercase)
              const processedValue = setting.configKey === 'region' ? value.toLowerCase() : value;
              settings.s3[setting.configKey as keyof typeof settings.s3] = processedValue;
            } else if (setting.configKey === 'timeout') {
              // timeout은 숫자로 변환
              settings.s3.timeout = parseInt(value) || 3600;
            } else if (setting.configKey === 'useGlobalNetworking') {
              // useGlobalNetworking은 boolean으로 변환
              settings.s3.useGlobalNetworking = value === 'true';
            }
          } else if (setting.serviceName === 'workspace') {
            if (setting.configKey === 'currentWorkspaceId') {
              settings.workspace.currentWorkspaceId = value;
            } else if (setting.configKey === 'defaultWorkspaceId') {
              settings.workspace.defaultWorkspaceId = value;
            }
          } else if (setting.serviceName === 'ui') {
            if (setting.configKey === 'language') {
              settings.ui.language = value as 'ko' | 'en';
            }
          }
          
          successfulDecryptions++;
          
        } catch (decryptError) {
          decryptionErrors++;
          console.error(`❌ Failed to decrypt setting ${setting.configKey}:`, decryptError);
          
          // In development, provide more context
          if (process.env.NODE_ENV === 'development') {
            console.error(`🔍 Setting details:`, {
              key: setting.configKey,
              isEncrypted: setting.isEncrypted,
              valueLength: setting.configValue?.length,
              valuePreview: setting.configValue?.substring(0, 50)
            });
          }
          
          // Skip this setting and continue with others
          continue;
        }
      }

      logger.emoji.stats(`Decryption summary: ${successfulDecryptions} successful, ${decryptionErrors} failed`);

      // If we have decryption errors, suggest clearing the database
      if (decryptionErrors > 0) {
        console.warn(`⚠️  ${decryptionErrors} settings failed to decrypt. Consider clearing the database to start fresh.`);
      }

      logger.emoji.testing('Final restored settings:', JSON.stringify(settings, null, 2));

      // Calculate status
      const status = this.calculateStatus(settings);

      logger.info(`Loaded settings for user ${userId}:`, {
        runpodConfigured: !!settings.runpod.apiKey,
        s3Configured: !!settings.s3.accessKeyId,
        status
      });

      return { settings, status };
    } catch (error) {
      logger.error('Error loading settings:', error);
      throw new Error(`Failed to load settings: ${error}`);
    }
  }

  async saveSettings(userId: string, settings: Partial<ServiceConfig>): Promise<void> {
    try {
      logger.info(`Saving settings for user: ${userId}`);
      
      // Flatten the nested settings structure for database storage
      const flatSettings: Array<{
        serviceName: string;
        configKey: string;
        configValue: string;
        isEncrypted: boolean;
      }> = [];

      // Process RunPod settings
      if (settings.runpod) {
        // API Key
        if (settings.runpod.apiKey) {
          flatSettings.push({
            serviceName: 'runpod',
            configKey: 'apiKey',
            configValue: settings.runpod.apiKey,
            isEncrypted: this.isSensitiveKey('runpod', 'apiKey')
          });
        }

        // Endpoints
        if (settings.runpod.endpoints) {
          Object.entries(settings.runpod.endpoints).forEach(([endpointType, endpointId]) => {
            if (endpointId) {
              flatSettings.push({
                serviceName: 'runpod',
                configKey: `endpoints.${endpointType}`,
                configValue: endpointId,
                isEncrypted: false
              });
            }
          });
        }

        // Generate Timeout
        if (settings.runpod.generateTimeout !== undefined) {
          flatSettings.push({
            serviceName: 'runpod',
            configKey: 'generateTimeout',
            configValue: String(settings.runpod.generateTimeout),
            isEncrypted: false
          });
        }
      }

      // Process S3 settings
      if (settings.s3) {
        Object.entries(settings.s3).forEach(([key, value]) => {
          if (value !== undefined && value !== '') { // timeout은 0일 수 있으므로 undefined 체크
            flatSettings.push({
              serviceName: 's3',
              configKey: key,
              configValue: String(value), // 모든 값을 문자열로 변환
              isEncrypted: this.isSensitiveKey('s3', key)
            });
          }
        });
      }

      // Process workspace settings
      if (settings.workspace) {
        Object.entries(settings.workspace).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            flatSettings.push({
              serviceName: 'workspace',
              configKey: key,
              configValue: String(value),
              isEncrypted: false
            });
          }
        });
      }

      // Process UI settings
      if (settings.ui) {
        Object.entries(settings.ui).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            flatSettings.push({
              serviceName: 'ui',
              configKey: key,
              configValue: String(value),
              isEncrypted: false
            });
          }
        });
      }

      logger.emoji.testing(`Flattened ${flatSettings.length} settings to save`);

      // Save each setting using upsert
      for (const setting of flatSettings) {
        const configValue = setting.isEncrypted 
          ? this.encryption.encrypt(setting.configValue)
          : setting.configValue;

        await prisma.userSetting.upsert({
          where: {
            userId_serviceName_configKey: {
              userId,
              serviceName: setting.serviceName,
              configKey: setting.configKey
            }
          },
          update: {
            configValue,
            isEncrypted: setting.isEncrypted,
            updatedAt: new Date()
          },
          create: {
            userId,
            serviceName: setting.serviceName,
            configKey: setting.configKey,
            configValue,
            isEncrypted: setting.isEncrypted
          }
        });
      }

      logger.info(`Successfully saved ${flatSettings.length} settings`);
      
    } catch (error) {
      logger.error('Failed to save settings:', error);
      throw new Error(`Failed to save settings: ${error}`);
    }
  }

  async getDecryptedSetting(userId: string, serviceName: string, configKey: string): Promise<string | null> {
    try {
      const setting = await prisma.userSetting.findUnique({
        where: {
          userId_serviceName_configKey: {
            userId,
            serviceName,
            configKey
          }
        }
      });

      if (!setting) {
        return null;
      }

      return setting.isEncrypted 
        ? this.encryption.decrypt(setting.configValue)
        : setting.configValue;
    } catch (error) {
      console.error('❌ Error getting decrypted setting:', error);
      return null;
    }
  }

  // Helper method to flatten nested settings object


  

  // Calculate configuration status
  private calculateStatus(settings: any): ServiceStatus {
    const runpodStatus = this.getServiceStatus(settings.runpod, [
      'apiKey',
      'endpoints.image',
      'endpoints.video', 
      'endpoints.multitalk',
      'endpoints.flux-kontext',
      'endpoints.flux-krea',
      'endpoints.wan22',
      'endpoints.wan-animate',
      'endpoints.infinite-talk',
      'endpoints.video-upscale'
      // generateTimeout은 선택적 설정이므로 상태 계산에서 제외
    ]);

    const s3Status = this.getServiceStatus(settings.s3, [
      'endpointUrl',
      'accessKeyId',
      'secretAccessKey',
      'bucketName',
      'region'
      // timeout은 선택적 설정이므로 상태 계산에서 제외
    ]);

    return {
      configured: 'configured', // This field is not directly used in the new ServiceStatus interface
      runpod: runpodStatus,
      s3: s3Status
    };
  }

  private getServiceStatus(serviceConfig: any, requiredFields: string[]): 'configured' | 'partial' | 'missing' {
    if (!serviceConfig) return 'missing';

    let configuredCount = 0;
    
    for (const field of requiredFields) {
      const value = this.getNestedValue(serviceConfig, field);
      // 숫자 타입이거나 문자열이면서 비어있지 않은 경우를 체크
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string') {
          if (value.trim() !== '') {
            configuredCount++;
          }
        } else {
          // 숫자 타입이거나 다른 타입인 경우
          configuredCount++;
        }
      }
    }

    if (configuredCount === 0) return 'missing';
    if (configuredCount === requiredFields.length) return 'configured';
    return 'partial';
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // 권한 데이터를 위해 워크스페이스 ID 가져오기
  async getCurrentWorkspaceId(userId: string): Promise<string | null> {
    try {
      const { settings } = await this.getSettings(userId);
      return settings.workspace?.currentWorkspaceId || settings.workspace?.defaultWorkspaceId || null;
    } catch (error) {
      console.error('❌ Error getting current workspace ID:', error);
      return null;
    }
  }

  // 현재 워크스페이스 설정
  async setCurrentWorkspaceId(userId: string, workspaceId: string): Promise<void> {
    try {
      const { settings } = await this.getSettings(userId);
      if (!settings.workspace) {
        settings.workspace = {};
      }
      settings.workspace.currentWorkspaceId = workspaceId;
      await this.saveSettings(userId, settings);
    } catch (error) {
      console.error('❌ Error setting current workspace ID:', error);
      throw error;
    }
  }

  // 언어 설정 가져오기
  async getLanguagePreference(userId: string): Promise<'ko' | 'en'> {
    try {
      const { settings } = await this.getSettings(userId);
      return settings.ui?.language || 'ko';
    } catch (error) {
      console.error('❌ Error getting language preference:', error);
      return 'ko';
    }
  }

  // 언어 설정 저장하기
  async setLanguagePreference(userId: string, language: 'ko' | 'en'): Promise<void> {
    try {
      const { settings } = await this.getSettings(userId);
      if (!settings.ui) {
        settings.ui = {};
      }
      settings.ui.language = language;
      await this.saveSettings(userId, settings);
    } catch (error) {
      console.error('❌ Error setting language preference:', error);
      throw error;
    }
  }

  // Mask sensitive data for display
  maskSensitiveData(settings: Partial<ServiceConfig>): Partial<ServiceConfig> {
    const masked = { ...settings };
    
    // Mask RunPod API key
    if (masked.runpod?.apiKey) {
      masked.runpod.apiKey = this.encryption.maskSensitiveData(masked.runpod.apiKey);
    }
    
    // Mask S3 secret access key
    if (masked.s3?.secretAccessKey) {
      masked.s3.secretAccessKey = this.encryption.maskSensitiveData(masked.s3.secretAccessKey);
    }
    
    return masked;
  }
}

export default SettingsService;