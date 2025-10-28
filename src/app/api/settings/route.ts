// src/app/api/settings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import SettingsService from '@/lib/settingsService';
import { getApiMessage } from '@/lib/apiMessages';

// Initialize settings service
let settingsService: SettingsService;

export async function GET(request: NextRequest) {
  try {
    // Initialize settings service if not already done
    if (!settingsService) {
      settingsService = new SettingsService();
    }
    
    // In a real app, get userId from authentication
    const userId = 'user-with-settings'; // 실제 설정이 있는 사용자 ID 사용
    
    console.log(`📖 GET /api/settings - Loading settings for user: ${userId}`);
    
    const result = await settingsService.getSettings(userId);
    
    // Mask sensitive data for client response
    const maskedSettings = settingsService.maskSensitiveData(result.settings);
    
    return NextResponse.json({
      success: true,
      settings: maskedSettings,
      status: result.status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ GET /api/settings error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: `Failed to load settings: ${error}` 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize settings service if not already done
    if (!settingsService) {
      settingsService = new SettingsService();
    }
    
    // In a real app, get userId from authentication
    const userId = 'user-with-settings'; // 실제 설정이 있는 사용자 ID 사용
    
    console.log(`💾 POST /api/settings - Saving settings for user: ${userId}`);
    
    const body = await request.json();
    const { settings } = body;
    
    if (!settings) {
      return NextResponse.json(
        { 
          success: false,
          error: getApiMessage('SETTINGS', 'DATA_REQUIRED') 
        },
        { status: 400 }
      );
    }
    
    // Validate settings structure
    const validationError = validateSettings(settings);
    if (validationError) {
      return NextResponse.json(
        { 
          success: false,
          error: validationError 
        },
        { status: 400 }
      );
    }
    
    await settingsService.saveSettings(userId, settings);
    
    // Return updated settings with status
    const result = await settingsService.getSettings(userId);
    const maskedSettings = settingsService.maskSensitiveData(result.settings);
    
    return NextResponse.json({
      success: true,
      message: getApiMessage('SETTINGS', 'SAVED_SUCCESSFULLY'),
      settings: maskedSettings,
      status: result.status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ POST /api/settings error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: `Failed to save settings: ${error}` 
      },
      { status: 500 }
    );
  }
}

function validateSettings(settings: any): string | null {
  // Basic validation for settings structure
  if (typeof settings !== 'object') {
    return getApiMessage('SETTINGS', 'MUST_BE_OBJECT');
  }
  
  // Validate RunPod settings if provided
  if (settings.runpod) {
    if (settings.runpod.apiKey && typeof settings.runpod.apiKey !== 'string') {
      return getApiMessage('SETTINGS', 'RUNPOD_KEY_MUST_BE_STRING');
    }
    
    if (settings.runpod.endpoints) {
      const endpoints = settings.runpod.endpoints;
      for (const [key, value] of Object.entries(endpoints)) {
        if (value && typeof value !== 'string') {
          return `RunPod endpoint ${key} must be a string`;
        }
      }
    }
  }
  
  // Validate S3 settings if provided
  if (settings.s3) {
    const s3Fields = ['endpointUrl', 'accessKeyId', 'secretAccessKey', 'bucketName', 'region'];
    for (const field of s3Fields) {
      if (settings.s3[field] && typeof settings.s3[field] !== 'string') {
        return `S3 ${field} must be a string`;
      }
    }

    // Validate useGlobalNetworking if provided
    if (settings.s3.useGlobalNetworking !== undefined && typeof settings.s3.useGlobalNetworking !== 'boolean') {
      return 'S3 useGlobalNetworking must be a boolean';
    }
  }
  
  return null;
}