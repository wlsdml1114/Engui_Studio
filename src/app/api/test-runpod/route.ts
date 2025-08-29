// src/app/api/test-runpod/route.ts

import { NextResponse } from 'next/server';
import RunPodService from '@/lib/runpodService';

export async function GET() {
  try {
    console.log('🧪 Testing RunPod connection...');
    
    // Test basic configuration
    const config = {
      apiKey: process.env.RUNPOD_API_KEY ? `✅ Set (${process.env.RUNPOD_API_KEY.substring(0, 10)}...)` : '❌ Missing',
      endpointId: process.env.RUNPOD_ENDPOINT_ID ? `✅ Set (${process.env.RUNPOD_ENDPOINT_ID})` : '❌ Missing',
      s3Config: {
        endpointUrl: process.env.S3_ENDPOINT_URL ? `✅ Set (${process.env.S3_ENDPOINT_URL})` : '❌ Missing',
        accessKeyId: process.env.S3_ACCESS_KEY_ID ? `✅ Set (${process.env.S3_ACCESS_KEY_ID.substring(0, 10)}...)` : '❌ Missing',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ? '✅ Set (hidden)' : '❌ Missing',
        bucketName: process.env.S3_BUCKET_NAME ? `✅ Set (${process.env.S3_BUCKET_NAME})` : '❌ Missing',
        region: process.env.S3_REGION ? `✅ Set (${process.env.S3_REGION})` : '❌ Missing',
      }
    };
    
    console.log('Configuration check:', config);
    
    // Try to create RunPod service and make a test call
    let serviceStatus = '❌ Failed to initialize';
    let testCallResult = '❌ Not attempted';
    
    try {
      const runpodService = new RunPodService();
      serviceStatus = '✅ Service initialized successfully';
      
      // Try a simple test call to check endpoint availability
      const testInput = {
        prompt: 'test',
        image_path: '/test/path',
        audio_paths: {
          person1: '/test/audio1'
        }
      };
      
      console.log('🧪 Making test API call...');
      try {
        await runpodService.submitJob(testInput);
        testCallResult = '✅ Test call successful';
      } catch (apiError) {
        testCallResult = `⚠️ Test call failed: ${apiError}`;
        console.log('Test call error (expected for test):', apiError);
      }
      
    } catch (error) {
      serviceStatus = `❌ Service initialization failed: ${error}`;
    }
    
    return NextResponse.json({
      status: 'RunPod Test Results',
      config,
      serviceStatus,
      testCallResult,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ RunPod test error:', error);
    return NextResponse.json(
      { error: `RunPod test failed: ${error}` },
      { status: 500 }
    );
  }
}