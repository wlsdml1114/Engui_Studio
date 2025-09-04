import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import S3Service from '@/lib/s3Service';
import runpodService from '@/lib/runpodService';
import SettingsService from '@/lib/settingsService';

const prisma = new PrismaClient();
const settingsService = new SettingsService();
const LOCAL_STORAGE_DIR = join(process.cwd(), 'public', 'results');

// S3에 파일 업로드 (기존 S3Service 사용)
async function uploadToS3(file: File, fileName: string): Promise<string> {
  const { settings } = await settingsService.getSettings('user-with-settings');
  
  if (!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || !settings.s3?.secretAccessKey) {
    throw new Error('S3 설정이 완료되지 않았습니다.');
  }

  const s3Service = new S3Service({
    endpointUrl: settings.s3.endpointUrl,
    accessKeyId: settings.s3.accessKeyId,
    secretAccessKey: settings.s3.secretAccessKey,
    bucketName: settings.s3.bucketName || 'my-bucket',
    region: settings.s3.region || 'us-east-1',
  });

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const result = await s3Service.uploadFile(fileBuffer, fileName, file.type);
  
  // RunPod에서 사용할 경로 반환 (runpod-volume 형식)
  return result.filePath;
}

// 백그라운드에서 Infinite Talk 작업 처리
async function processInfiniteTalkJob(jobId: string, runpodJobId: string) {
  console.log(`🔄 Processing Infinite Talk job: ${jobId} (RunPod: ${runpodJobId})`);
  const startTime = Date.now();

  try {
    // RunPod 작업 완료 대기
    const { settings } = await settingsService.getSettings('user-with-settings');
    
    if (!settings.runpod?.apiKey || !settings.runpod?.endpoints?.['infinite-talk']) {
      throw new Error('RunPod 설정이 완료되지 않았습니다.');
    }
    
    const runpod = new runpodService(
      settings.runpod.apiKey,
      settings.runpod.endpoints['infinite-talk'],
      settings.runpod.generateTimeout
    );
    
    const result = await runpod.waitForCompletion(runpodJobId);
    console.log(`✅ Infinite Talk job completed in ${Date.now() - startTime}ms`);

    if (result.status === 'COMPLETED' && result.output) {
      let resultUrl = '';
      
      // 결과 처리 (비디오 파일)
      if (result.output.video || result.output.mp4 || result.output.result) {
        const videoData = result.output.video || result.output.mp4 || result.output.result;
        
        // base64 인코딩된 비디오 데이터인지 확인
        if (typeof videoData === 'string' && videoData.length > 100 && !videoData.startsWith('http')) {
          // base64 디코딩 및 로컬 저장
          const videoBuffer = Buffer.from(videoData, 'base64');
          const videoFileName = `infinitetalk_result_${jobId}.mp4`;
          const videoPath = join(LOCAL_STORAGE_DIR, videoFileName);
          
          writeFileSync(videoPath, videoBuffer);
          resultUrl = `/results/${videoFileName}`;
          
          console.log(`✅ Infinite Talk video saved locally: ${videoPath}`);
        } else if (typeof videoData === 'string' && videoData.startsWith('http')) {
          // 외부 URL에서 다운로드
          const response = await fetch(videoData);
          const videoBuffer = await response.arrayBuffer();
          const videoFileName = `infinitetalk_result_${jobId}.mp4`;
          const videoPath = join(LOCAL_STORAGE_DIR, videoFileName);
          
          writeFileSync(videoPath, Buffer.from(videoBuffer));
          resultUrl = `/results/${videoFileName}`;
          
          console.log(`✅ Infinite Talk video downloaded and saved: ${videoPath}`);
        }
      }

      // 작업 상태 업데이트
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          resultUrl,
          runpodJobId,
        },
      });

      console.log(`✅ Infinite Talk job ${jobId} marked as completed`);
    } else {
      throw new Error(`RunPod job failed: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`❌ Infinite Talk job ${jobId} failed:`, error);
    
    // 작업 상태를 실패로 업데이트
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        runpodJobId,
        options: JSON.stringify({
          ...JSON.parse((await prisma.job.findUnique({ where: { id: jobId } }))?.options || '{}'),
          error: error instanceof Error ? error.message : String(error),
        }),
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const imageFile = formData.get('image') as File;
    const audioFile = formData.get('audio') as File;
    const prompt = formData.get('prompt') as string;
    const width = parseInt(formData.get('width') as string) || 640;
    const height = parseInt(formData.get('height') as string) || 640;

    if (!imageFile || !audioFile || !prompt) {
      return NextResponse.json(
        { success: false, error: '이미지, 오디오 파일, 프롬프트가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('🎭 Infinite Talk job started');
    console.log('📋 User ID:', userId);
    console.log('📋 Image file:', imageFile.name, imageFile.size, 'bytes');
    console.log('📋 Audio file:', audioFile.name, audioFile.size, 'bytes');
    console.log('📋 Prompt:', prompt);
    console.log('📋 Dimensions:', width, 'x', height);

    // 설정 확인
    const { settings } = await settingsService.getSettings('user-with-settings');
    if (!settings.runpod?.apiKey || !settings.runpod?.endpoints?.['infinite-talk']) {
      return NextResponse.json(
        { success: false, error: 'RunPod 설정이 완료되지 않았습니다.' },
        { status: 400 }
      );
    }

    // S3 설정 확인
    if (!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || !settings.s3?.secretAccessKey) {
      return NextResponse.json(
        { success: false, error: 'S3 설정이 완료되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 데이터베이스에 작업 생성
    const job = await prisma.job.create({
      data: {
        userId,
        type: 'infinitetalk',
        status: 'processing',
        prompt,
        options: JSON.stringify({
          width,
          height,
          imageFileName: imageFile.name,
          audioFileName: audioFile.name,
        }),
      },
    });

    console.log('✅ Job created in database:', job.id);

    // S3에 파일 업로드
    const imageFileName = `input/infinitetalk/input_${job.id}_${imageFile.name}`;
    const audioFileName = `input/infinitetalk/audio_${job.id}_${audioFile.name}`;
    
    console.log('📤 Uploading files to S3...');
    const imageS3Path = await uploadToS3(imageFile, imageFileName);
    const audioS3Path = await uploadToS3(audioFile, audioFileName);
    
    console.log('✅ Files uploaded to S3:');
    console.log('  - Image:', imageS3Path);
    console.log('  - Audio:', audioS3Path);

    // 로컬에 백업 저장
    mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
    
    // infinitetalk 디렉토리 생성
    const infinitetalkDir = join(LOCAL_STORAGE_DIR, 'input', 'infinitetalk');
    mkdirSync(infinitetalkDir, { recursive: true });
    
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    
    const localImagePath = join(infinitetalkDir, `input_${job.id}_${imageFile.name}`);
    const localAudioPath = join(infinitetalkDir, `audio_${job.id}_${audioFile.name}`);
    
    writeFileSync(localImagePath, imageBuffer);
    writeFileSync(localAudioPath, audioBuffer);
    
    console.log('✅ Files saved locally as backup');

    // RunPod 서비스 초기화
    const runpod = new runpodService(
      settings.runpod.apiKey,
      settings.runpod.endpoints['infinite-talk'],
      settings.runpod.generateTimeout
    );

    // RunPod에 작업 제출
    const runpodInput = {
      prompt,
      image_path: imageS3Path,
      wav_path: audioS3Path,
      width,
      height,
    };

    console.log('🚀 Submitting to RunPod...');
    const runpodJobId = await runpod.submitJob(runpodInput);
    console.log('✅ RunPod job submitted:', runpodJobId);

    // 데이터베이스 업데이트
    await prisma.job.update({
      where: { id: job.id },
      data: {
        runpodJobId,
        options: JSON.stringify({
          width,
          height,
          imageFileName: imageFile.name,
          audioFileName: audioFile.name,
          imageS3Path,
          audioS3Path,
          imageWebPath: `/results/input/infinitetalk/input_${job.id}_${imageFile.name}`, // 실제 저장된 파일명 사용
          audioWebPath: `/results/input/infinitetalk/audio_${job.id}_${audioFile.name}`,
        }),
      },
    });

    // 백그라운드에서 작업 처리 시작
    processInfiniteTalkJob(job.id, runpodJobId).catch(error => {
      console.error('❌ Background processing failed:', error);
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Infinite Talk 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
    });

  } catch (error) {
    console.error('❌ Infinite Talk API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
