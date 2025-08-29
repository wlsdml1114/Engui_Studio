// src/app/api/test-db/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Global Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma = globalThis.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export async function GET() {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test basic connection
    console.log('🔧 Testing Prisma client...');
    console.log('🔧 Available methods on prisma:', Object.keys(prisma));
    
    // Try to query existing tables first
    const jobCount = await prisma.job.count();
    console.log(`📊 Found ${jobCount} jobs in database`);
    
    // Check if new models are available
    console.log('🔧 Checking if userSetting is available...');
    if ('userSetting' in prisma) {
      console.log('✅ userSetting model is available');
      const settingCount = await (prisma as any).userSetting.count();
      console.log(`📊 Found ${settingCount} user settings in database`);
    } else {
      console.log('❌ userSetting model is NOT available');
      console.log('Available models:', Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_')));
    }
    
    let testSettingId = null;
    let settingCount = 0;
    
    if ('userSetting' in prisma) {
      // Try to create a test setting
      console.log('🔧 Testing UserSetting creation...');
      const testSetting = await (prisma as any).userSetting.upsert({
        where: {
          userId_serviceName_configKey: {
            userId: 'test-user',
            serviceName: 'test',
            configKey: 'test-key'
          }
        },
        update: {
          configValue: 'test-value-updated',
          updatedAt: new Date()
        },
        create: {
          userId: 'test-user',
          serviceName: 'test',
          configKey: 'test-key',
          configValue: 'test-value',
          isEncrypted: false
        }
      });
      
      console.log('✅ Test setting created/updated:', testSetting.id);
      testSettingId = testSetting.id;
      settingCount = await (prisma as any).userSetting.count();
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      stats: {
        jobs: jobCount,
        settings: settingCount,
        testSettingId,
        hasUserSetting: 'userSetting' in prisma,
        availableModels: Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_'))
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    
    return NextResponse.json({
      success: false,
      error: `Database test failed: ${error}`,
      details: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}