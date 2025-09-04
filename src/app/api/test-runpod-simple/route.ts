// src/app/api/test-runpod-simple/route.ts

import { NextResponse } from 'next/server';
import RunPodService from '@/lib/runpodService';

export async function POST() {
  try {
    console.log('🧪 Simple RunPod API test...');
    
    // Create a simple test payload matching your Python code
    const testInput = {
      prompt: "a person talking naturally",
      image_path: "/runpod-volume/input/multitalk/test_image.jpg",
      audio_paths: {
        person1: "/runpod-volume/input/multitalk/test_audio.wav"
      }
    };
    
    console.log('🔧 Test input:', JSON.stringify(testInput, null, 2));
    
    const runpodService = new RunPodService();
    
    try {
      const jobId = await runpodService.submitJob(testInput);
      
      return NextResponse.json({
        success: true,
        message: 'RunPod job submitted successfully!',
        jobId,
        testInput,
      });
      
    } catch (apiError) {
      console.error('❌ RunPod API error:', apiError);
      
      return NextResponse.json({
        success: false,
        error: `RunPod API error: ${apiError}`,
        testInput,
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
    return NextResponse.json(
      { error: `Test failed: ${error}` },
      { status: 500 }
    );
  }
}