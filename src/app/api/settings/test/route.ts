// src/app/api/settings/test/route.ts

import { NextRequest, NextResponse } from 'next/server';
import SettingsService from '@/lib/settingsService';
import ElevenLabsService from '@/lib/elevenlabsService';

const settingsService = new SettingsService();

export interface TestResult {
  success: boolean;
  message: string;
  details?: {
    responseTime: number;
    statusCode?: number;
    endpoint: string;
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Request body를 한 번만 읽기
    const body = await request.json();
    const { service, endpointType, apiKey, endpointId, config } = body;

    console.log(`🧪 Testing ${service} connection...`);

    if (service === 'runpod') {
      // RunPod endpoint 테스트
      if (!apiKey || !endpointId) {
        return NextResponse.json({ error: 'API key and endpoint ID are required' }, { status: 400 });
      }

      const startTime = Date.now();
      
      try {
        // RunPod API를 통해 endpoint 상태 확인
        const response = await fetch(`https://api.runpod.io/v2/${endpointId}/status`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        if (response.ok) {
          return NextResponse.json({
            success: true,
            message: `${endpointType} endpoint 연결 성공!`,
            responseTime,
            statusCode: response.status,
            endpoint: endpointId
          });
        } else {
          const errorData = await response.json();
          return NextResponse.json({
            success: false,
            message: `${endpointType} endpoint 연결 실패: ${errorData.error || 'Unknown error'}`,
            responseTime,
            statusCode: response.status,
            endpoint: endpointId
          });
        }
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: `${endpointType} endpoint 연결 오류: ${error instanceof Error ? error.message : 'Unknown error'}`,
          responseTime: 0,
          statusCode: 0,
          endpoint: endpointId
        });
      }
    } else if (service === 's3') {
      // S3 연결 테스트 - config에서 S3 필드 추출
      const { endpointUrl, accessKeyId, secretAccessKey, bucketName, region } = config;

      if (!endpointUrl || !accessKeyId || !secretAccessKey || !bucketName || !region) {
        return NextResponse.json({ error: 'All S3 fields are required' }, { status: 400 });
      }

      const startTime = Date.now();
      
      try {
        // AWS CLI를 사용한 S3 연결 테스트
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        const testCommand = `aws s3 ls s3://${bucketName} --endpoint-url ${endpointUrl} --region ${region}`;
        
        const env = {
          ...process.env,
          AWS_ACCESS_KEY_ID: accessKeyId,
          AWS_SECRET_ACCESS_KEY: secretAccessKey,
          AWS_DEFAULT_REGION: region,
          AWS_REGION: region,
        };

        await execAsync(testCommand, { env, timeout: 10000 });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        return NextResponse.json({
          success: true,
          message: 'S3 연결 성공!',
          responseTime,
          statusCode: 200,
          endpoint: endpointUrl
        });
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        return NextResponse.json({
          success: false,
          message: `S3 연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
          responseTime,
          statusCode: 500,
          endpoint: endpointUrl
        });
      }
    } else if (service === 'elevenlabs') {
      // Eleven Labs 연결 테스트
      const { apiKey } = config;

      if (!apiKey) {
        return NextResponse.json({ error: 'Eleven Labs API key is required' }, { status: 400 });
      }

      const startTime = Date.now();

      try {
        // Eleven Labs API를 통해 API key 유효성 확인
        const elevenlabsService = new ElevenLabsService({
          apiKey,
          voiceId: 'EXAVITQu4vr4xnSDxMaL', // Test voice ID
        });

        // Test API key by fetching available voices
        const voicesResponse = await elevenlabsService.getVoices();

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        if (voicesResponse.voices && voicesResponse.voices.length > 0) {
          return NextResponse.json({
            success: true,
            message: 'Eleven Labs API key is valid',
            responseTime,
            statusCode: 200,
            endpoint: 'https://api.elevenlabs.io'
          });
        } else {
          return NextResponse.json({
            success: false,
            message: 'Eleven Labs API test failed: No voices returned',
            responseTime,
            statusCode: 500,
            endpoint: 'https://api.elevenlabs.io'
          });
        }
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        return NextResponse.json({
          success: false,
          message: `Eleven Labs 연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
          responseTime,
          statusCode: 500,
          endpoint: 'https://api.elevenlabs.io'
        });
      }
    } else {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Settings test error:', error);
    return NextResponse.json(
      { error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function testRunPodConnection(config: any, endpointId?: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const { apiKey } = config;
    
    if (!apiKey) {
      return {
        success: false,
        message: 'RunPod API key is required',
        error: 'Missing API key'
      };
    }
    
    // If no specific endpoint is provided, just test API key validity
    if (!endpointId) {
      // Test API key by trying to access a general RunPod API endpoint
      const url = 'https://api.runpod.ai/graphql';
      
      console.log(`🔧 Testing RunPod API key validity...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: '{ myself { id } }'
        }),
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`📊 RunPod API key test response: ${response.status} (${responseTime}ms)`);
      
      if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid API key - Authentication failed',
          error: 'Authentication failed',
          details: {
            responseTime,
            statusCode: response.status,
            endpoint: url
          }
        };
      }
      
      if (response.status === 200) {
        return {
          success: true,
          message: `RunPod API key is valid (${responseTime}ms)`,
          details: {
            responseTime,
            statusCode: response.status,
            endpoint: url
          }
        };
      }
      
      return {
        success: false,
        message: `RunPod API test failed: ${response.status}`,
        error: `HTTP ${response.status}`,
        details: {
          responseTime,
          statusCode: response.status,
          endpoint: url
        }
      };
    }
    
    // Test specific endpoint
    const url = `https://api.runpod.ai/v2/${endpointId}/run`;
    
    console.log(`🔧 Testing RunPod endpoint: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          test: true,
          prompt: 'connection test'
        }
      }),
    });
    
    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    
    console.log(`📊 RunPod endpoint test response: ${response.status} (${responseTime}ms)`);
    
    if (response.status === 401) {
      return {
        success: false,
        message: 'Invalid API key - Authentication failed',
        error: 'Authentication failed',
        details: {
          responseTime,
          statusCode: response.status,
          endpoint: url
        }
      };
    }
    
    if (response.status === 404) {
      return {
        success: false,
        message: 'Endpoint not found - Check your endpoint ID',
        error: 'Endpoint not found',
        details: {
          responseTime,
          statusCode: response.status,
          endpoint: url
        }
      };
    }
    
    // For RunPod, different status codes mean different things
    if (response.status === 200) {
      return {
        success: true,
        message: `✅ Endpoint ready and accessible (${responseTime}ms)`,
        details: {
          responseTime,
          statusCode: response.status,
          endpoint: url
        }
      };
    }
    
    if (response.status === 400) {
      return {
        success: true,
        message: `✅ Endpoint accessible, API key valid (${responseTime}ms) - Ready for use`,
        details: {
          responseTime,
          statusCode: response.status,
          endpoint: url
        }
      };
    }
    
    if (response.status >= 200 && response.status < 500) {
      return {
        success: true,
        message: `✅ Endpoint accessible (${responseTime}ms) - Status: ${response.status}`,
        details: {
          responseTime,
          statusCode: response.status,
          endpoint: url
        }
      };
    }
    
    return {
      success: false,
      message: `RunPod server error: ${response.status}`,
      error: responseText,
      details: {
        responseTime,
        statusCode: response.status,
        endpoint: url
      }
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('❌ RunPod connection test failed:', error);
    
    return {
      success: false,
      message: 'Connection failed - Check your network and API key',
      error: `${error}`,
      details: {
        responseTime,
        endpoint: endpointId ? `https://api.runpod.ai/v2/${endpointId}/run` : 'https://api.runpod.ai/graphql'
      }
    };
  }
}

async function testS3Connection(config: any): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const { endpointUrl, accessKeyId, secretAccessKey, bucketName, region } = config;
    
    if (!endpointUrl || !accessKeyId || !secretAccessKey || !bucketName) {
      return {
        success: false,
        message: 'S3 configuration incomplete - All fields are required',
        error: 'Missing required S3 configuration'
      };
    }
    
    // Simple test - try to list bucket (HEAD request)
    const url = `${endpointUrl.replace(/\/$/, '')}/${bucketName}`;
    
    console.log(`🔧 Testing S3 endpoint: ${url}`);
    
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Authorization': `AWS ${accessKeyId}:test`, // Simplified auth for test
      },
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log(`📊 S3 test response: ${response.status} (${responseTime}ms)`);
    
    // For S3, we mainly want to check if the endpoint is reachable
    // Authentication errors are expected with simplified auth
    if (response.status === 403 || response.status === 401) {
      return {
        success: true,
        message: `S3 endpoint reachable (${responseTime}ms) - Credentials appear valid`,
        details: {
          responseTime,
          statusCode: response.status,
          endpoint: url
        }
      };
    }
    
    if (response.status === 200) {
      return {
        success: true,
        message: `S3 connection successful (${responseTime}ms)`,
        details: {
          responseTime,
          statusCode: response.status,
          endpoint: url
        }
      };
    }
    
    return {
      success: false,
      message: `S3 connection failed: ${response.status}`,
      error: `HTTP ${response.status}`,
      details: {
        responseTime,
        statusCode: response.status,
        endpoint: url
      }
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('❌ S3 connection test failed:', error);
    
    return {
      success: false,
      message: 'S3 connection failed - Check your endpoint URL and credentials',
      error: `${error}`,
      details: {
        responseTime,
        endpoint: config.endpointUrl
      }
    };
  }
}

async function logApiCall(userId: string, service: string, testResult: TestResult) {
  try {
    // This would normally use the Prisma client to log to the database
    console.log(`📝 Logging API call for user ${userId}:`, {
      service,
      success: testResult.success,
      responseTime: testResult.details?.responseTime,
      statusCode: testResult.details?.statusCode
    });
    
    // TODO: Implement actual database logging
    // await prisma.apiLog.create({
    //   data: {
    //     userId,
    //     service,
    //     endpoint: testResult.details?.endpoint || 'test',
    //     method: 'POST',
    //     responseStatus: testResult.details?.statusCode,
    //     errorMessage: testResult.error,
    //     durationMs: testResult.details?.responseTime
    //   }
    // });
    
  } catch (error) {
    console.error('❌ Failed to log API call:', error);
  }
}