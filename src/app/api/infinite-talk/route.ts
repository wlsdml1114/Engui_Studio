import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
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
      let runpodResultUrl = 'unknown';

      // 우선순위: RunPod의 network_volume 사용 시 video_path를 통해 S3 경로 수신
      let videoS3Path: string | null = null;
      let base64VideoData: string | null = null;

      // 공통 결과 필드 보존 (폴백용)
      if (result.output.video) {
        runpodResultUrl = result.output.video;
      } else if (result.output.mp4) {
        runpodResultUrl = result.output.mp4;
      } else if (result.output.result) {
        runpodResultUrl = result.output.result;
      }

      // 1) video_path가 경로 형태인지 확인 (network_volume=true 시 기대값)
      if (typeof result.output.video_path === 'string' && result.output.video_path.length > 0) {
        const pathVal = result.output.video_path as string;
        if (!pathVal.startsWith('http') && pathVal.includes('/runpod-volume/')) {
          videoS3Path = pathVal;
        } else if (pathVal.length > 100 && !pathVal.startsWith('http') && !pathVal.startsWith('/runpod-volume/')) {
          // base64 데이터가 video_path에 실려오는 경우
          base64VideoData = pathVal;
        }
      }

      // 2) S3 경로 다운로드 시도
      if (videoS3Path) {
        try {
          // /runpod-volume/ prefix 제거 후 S3 key 생성
          let s3Key = videoS3Path.replace('/runpod-volume/', '');
          if (s3Key.startsWith('/')) s3Key = s3Key.substring(1);

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

          const videoBuffer = await s3Service.downloadFile(s3Key);
          const videoFileName = `infinitetalk_result_${jobId}.mp4`;
          const videoPath = join(LOCAL_STORAGE_DIR, videoFileName);
          writeFileSync(videoPath, videoBuffer);
          resultUrl = `/results/${videoFileName}`;
          runpodResultUrl = videoS3Path;
          console.log(`✅ Infinite Talk video downloaded from S3 and saved: ${videoPath}`);
        } catch (err) {
          console.error('❌ Failed to download Infinite Talk result from S3 path:', err);
          // 폴백을 위해 base64 처리로 전환
          videoS3Path = null;
        }
      }

      // 3) base64 데이터 폴백 처리
      if (!videoS3Path) {
        let videoData: string | null = null;
        // 기존 필드에서도 base64가 올 수 있음
        if (!base64VideoData) {
          const candidate = result.output.video || result.output.mp4 || result.output.result;
          if (typeof candidate === 'string' && candidate.length > 100 && !candidate.startsWith('http')) {
            videoData = candidate;
          }
        } else {
          videoData = base64VideoData;
        }

        if (videoData) {
          const videoBuffer = Buffer.from(videoData, 'base64');
          const videoFileName = `infinitetalk_result_${jobId}.mp4`;
          const videoPath = join(LOCAL_STORAGE_DIR, videoFileName);
          writeFileSync(videoPath, videoBuffer);
          resultUrl = `/results/${videoFileName}`;
          runpodResultUrl = `local:${videoPath}`;
          console.log(`✅ Infinite Talk base64 video saved locally: ${videoPath}`);
        } else if (typeof runpodResultUrl === 'string' && runpodResultUrl.startsWith('http')) {
          // 외부 URL 다운로드 폴백
          const response = await fetch(runpodResultUrl);
          const videoBuffer = await response.arrayBuffer();
          const videoFileName = `infinitetalk_result_${jobId}.mp4`;
          const videoPath = join(LOCAL_STORAGE_DIR, videoFileName);
          writeFileSync(videoPath, Buffer.from(videoBuffer));
          resultUrl = `/results/${videoFileName}`;
          console.log(`✅ Infinite Talk video downloaded from URL and saved: ${videoPath}`);
        }
      }

      // 작업 상태 업데이트
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          resultUrl,
          runpodJobId,
          completedAt: new Date(),
          options: JSON.stringify({
            ...JSON.parse((await prisma.job.findUnique({ where: { id: jobId } }))?.options || '{}'),
            runpodOutput: result.output,
            runpodResultUrl,
          })
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
    const inputType = formData.get('input_type') as string || 'image'; // 'image' 또는 'video'
    const personCount = formData.get('person_count') as string || 'single'; // 'single' 또는 'multi'
    const imageFile = formData.get('image') as File;
    const videoFile = formData.get('video') as File;
    const audioFile = formData.get('audio') as File;
    const audioFile2 = formData.get('audio2') as File; // 다중 인물용 두 번째 오디오
    const audioStartStr = formData.get('audio_start') as string | null;
    const audioEndStr = formData.get('audio_end') as string | null;
    const audio2StartStr = formData.get('audio2_start') as string | null;
    const audio2EndStr = formData.get('audio2_end') as string | null;
    const prompt = formData.get('prompt') as string;
    const width = parseInt(formData.get('width') as string) || 640;
    const height = parseInt(formData.get('height') as string) || 640;

    // 입력 타입과 인물 수 검증
    if (!['image', 'video'].includes(inputType)) {
      return NextResponse.json(
        { success: false, error: 'input_type은 "image" 또는 "video"여야 합니다.' },
        { status: 400 }
      );
    }

    if (!['single', 'multi'].includes(personCount)) {
      return NextResponse.json(
        { success: false, error: 'person_count는 "single" 또는 "multi"여야 합니다.' },
        { status: 400 }
      );
    }

    // 필수 파일 검증
    if (inputType === 'image' && !imageFile) {
      return NextResponse.json(
        { success: false, error: '이미지 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    if (inputType === 'video' && !videoFile) {
      return NextResponse.json(
        { success: false, error: '비디오 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!audioFile || !prompt) {
      return NextResponse.json(
        { success: false, error: '오디오 파일과 프롬프트가 필요합니다.' },
        { status: 400 }
      );
    }

    // 다중 인물인 경우 두 번째 오디오 파일 검증
    if (personCount === 'multi' && !audioFile2) {
      return NextResponse.json(
        { success: false, error: '다중 인물 모드에서는 두 번째 오디오 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('🎭 Infinite Talk job started');
    console.log('📋 User ID:', userId);
    console.log('📋 Input Type:', inputType, '(from formData)');
    console.log('📋 Person Count:', personCount, '(from formData)');
    
    if (inputType === 'image' && imageFile) {
      console.log('📋 Image file:', imageFile.name, imageFile.size, 'bytes');
    } else if (inputType === 'video' && videoFile) {
      console.log('📋 Video file:', videoFile.name, videoFile.size, 'bytes');
    }
    
    console.log('📋 Audio file:', audioFile.name, audioFile.size, 'bytes');
    if (audioStartStr || audioEndStr) {
      console.log('⏱️ Audio trim:', audioStartStr || '0', '->', audioEndStr || 'end');
    }
    
    if (personCount === 'multi' && audioFile2) {
      console.log('📋 Audio file 2:', audioFile2.name, audioFile2.size, 'bytes');
      if (audio2StartStr || audio2EndStr) {
        console.log('⏱️ Audio2 trim:', audio2StartStr || '0', '->', audio2EndStr || 'end');
      }
    }
    
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

    // 현재 워크스페이스 ID 조회
    const currentWorkspaceId = await settingsService.getCurrentWorkspaceId(userId);

    // 데이터베이스에 작업 생성
    const job = await prisma.job.create({
      data: {
        userId,
        workspaceId: currentWorkspaceId,
        type: 'infinitetalk',
        status: 'processing',
        prompt,
        options: JSON.stringify({
          inputType,
          personCount,
          width,
          height,
          imageFileName: imageFile?.name,
          videoFileName: videoFile?.name,
          audioFileName: audioFile.name,
          audioFileName2: audioFile2?.name,
        }),
      },
    });

    console.log('✅ Job created in database:', job.id);

    // S3에 파일 업로드
    console.log('📤 Uploading files to S3...');
    
    let mediaS3Path = '';
    let audioS3Path = '';
    let audioS3Path2 = '';
    let trimmedAudioLocalPath: string | null = null;
    let trimmedAudio2LocalPath: string | null = null;
    let originalAudioLocalPath: string | null = null;
    let originalAudio2LocalPath: string | null = null;

    // 시간 문자열을 초 단위로 변환하는 헬퍼 (hh:mm:ss[.ms] 또는 mm:ss 또는 ss)
    function parseTimeToSeconds(value: string | null): number | undefined {
      if (!value) return undefined;
      const v = value.trim();
      if (!v) return undefined;
      if (/^\d+(\.\d+)?$/.test(v)) return parseFloat(v);
      const parts = v.split(':').map(Number);
      if (parts.some(isNaN)) return undefined;
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 1) return parts[0];
      return undefined;
    }
    const audioStart = parseTimeToSeconds(audioStartStr);
    const audioEnd = parseTimeToSeconds(audioEndStr);
    const audio2Start = parseTimeToSeconds(audio2StartStr);
    const audio2End = parseTimeToSeconds(audio2EndStr);
    
    // 미디어 파일 업로드 (이미지 또는 비디오)
    if (inputType === 'image' && imageFile) {
      const imageFileName = `input/infinitetalk/input_${job.id}_${imageFile.name}`;
      mediaS3Path = await uploadToS3(imageFile, imageFileName);
      console.log('✅ Image uploaded to S3:', mediaS3Path);
    } else if (inputType === 'video' && videoFile) {
      const videoFileName = `input/infinitetalk/input_${job.id}_${videoFile.name}`;
      mediaS3Path = await uploadToS3(videoFile, videoFileName);
      console.log('✅ Video uploaded to S3:', mediaS3Path);
    }
    
    // 첫 번째 오디오 파일 업로드 (트림 적용 가능)
    try {
      const { settings } = await settingsService.getSettings('user-with-settings');
      const s3 = settings.s3!;
      const s3Service = new S3Service({
        endpointUrl: s3!.endpointUrl!,
        accessKeyId: s3!.accessKeyId!,
        secretAccessKey: s3!.secretAccessKey!,
        bucketName: s3!.bucketName || 'my-bucket',
        region: s3!.region || 'us-east-1',
      });

      const needsTrim = audioStart != null || audioEnd != null;
      if (needsTrim) {
        const { ffmpegService } = await import('@/lib/ffmpegService');
        const inputBuffer = Buffer.from(await audioFile.arrayBuffer());
        const inputExt = audioFile.name.split('.').pop() || 'wav';
        const inputLocalPath = join(LOCAL_STORAGE_DIR, 'tmp', `audio_input_${job.id}.${inputExt}`);
        const outputLocalPath = join(LOCAL_STORAGE_DIR, 'tmp', `audio_trimmed_${job.id}.${inputExt}`);
        mkdirSync(join(LOCAL_STORAGE_DIR, 'tmp'), { recursive: true });
        writeFileSync(inputLocalPath, inputBuffer);
        try {
          await ffmpegService.trimAudio(inputLocalPath, outputLocalPath, audioStart, audioEnd);
          const trimmedBuffer = readFileSync(outputLocalPath);
          const trimmedFileName = `input/infinitetalk/audio_${job.id}_trimmed_${audioFile.name}`;
          const uploadRes = await s3Service.uploadFile(trimmedBuffer, trimmedFileName, audioFile.type || 'audio/wav');
          audioS3Path = uploadRes.filePath;
          trimmedAudioLocalPath = join(LOCAL_STORAGE_DIR, 'input', 'infinitetalk', `audio_${job.id}_trimmed_${audioFile.name}`);
          mkdirSync(join(LOCAL_STORAGE_DIR, 'input', 'infinitetalk'), { recursive: true });
          writeFileSync(trimmedAudioLocalPath, trimmedBuffer);
          // 원본 오디오도 로컬 백업으로 저장하여 재사용 가능하게 함
          const origDir = join(LOCAL_STORAGE_DIR, 'input', 'infinitetalk');
          mkdirSync(origDir, { recursive: true });
          originalAudioLocalPath = join(origDir, `audio_${job.id}_${audioFile.name}`);
          writeFileSync(originalAudioLocalPath, inputBuffer);
          console.log('✅ Trimmed audio uploaded to S3:', audioS3Path);
        } finally {
          try { unlinkSync(inputLocalPath); } catch {}
          try { unlinkSync(outputLocalPath); } catch {}
        }
      } else {
        const audioFileName = `input/infinitetalk/audio_${job.id}_${audioFile.name}`;
        audioS3Path = await uploadToS3(audioFile, audioFileName);
        console.log('✅ Audio uploaded to S3:', audioS3Path);
      }
    } catch (e) {
      console.error('❌ Audio upload/trim failed:', e);
      // 폴백: 원본 업로드 시도
      if (!audioS3Path) {
        const audioFileName = `input/infinitetalk/audio_${job.id}_${audioFile.name}`;
        audioS3Path = await uploadToS3(audioFile, audioFileName);
        console.log('✅ Audio uploaded to S3 (fallback original):', audioS3Path);
      }
    }
    
    // 두 번째 오디오 파일 업로드 (다중 인물인 경우)
    if (personCount === 'multi' && audioFile2) {
      try {
        const { settings } = await settingsService.getSettings('user-with-settings');
        const s3 = settings.s3!;
        const s3Service = new S3Service({
          endpointUrl: s3!.endpointUrl!,
          accessKeyId: s3!.accessKeyId!,
          secretAccessKey: s3!.secretAccessKey!,
          bucketName: s3!.bucketName || 'my-bucket',
          region: s3!.region || 'us-east-1',
        });

        const needsTrim2 = audio2Start != null || audio2End != null;
        if (needsTrim2) {
          const { ffmpegService } = await import('@/lib/ffmpegService');
          const inputBuffer2 = Buffer.from(await audioFile2.arrayBuffer());
          const inputExt2 = audioFile2.name.split('.').pop() || 'wav';
          const inputLocalPath2 = join(LOCAL_STORAGE_DIR, 'tmp', `audio2_input_${job.id}.${inputExt2}`);
          const outputLocalPath2 = join(LOCAL_STORAGE_DIR, 'tmp', `audio2_trimmed_${job.id}.${inputExt2}`);
          mkdirSync(join(LOCAL_STORAGE_DIR, 'tmp'), { recursive: true });
          writeFileSync(inputLocalPath2, inputBuffer2);
          try {
            await ffmpegService.trimAudio(inputLocalPath2, outputLocalPath2, audio2Start, audio2End);
            const trimmedBuffer2 = readFileSync(outputLocalPath2);
            const trimmedFileName2 = `input/infinitetalk/audio2_${job.id}_trimmed_${audioFile2.name}`;
            const uploadRes2 = await s3Service.uploadFile(trimmedBuffer2, trimmedFileName2, audioFile2.type || 'audio/wav');
            audioS3Path2 = uploadRes2.filePath;
            trimmedAudio2LocalPath = join(LOCAL_STORAGE_DIR, 'input', 'infinitetalk', `audio2_${job.id}_trimmed_${audioFile2.name}`);
            mkdirSync(join(LOCAL_STORAGE_DIR, 'input', 'infinitetalk'), { recursive: true });
            writeFileSync(trimmedAudio2LocalPath, trimmedBuffer2);
            // 원본 오디오2도 로컬 백업으로 저장하여 재사용 가능하게 함
            const origDir2 = join(LOCAL_STORAGE_DIR, 'input', 'infinitetalk');
            mkdirSync(origDir2, { recursive: true });
            originalAudio2LocalPath = join(origDir2, `audio2_${job.id}_${audioFile2.name}`);
            writeFileSync(originalAudio2LocalPath, inputBuffer2);
            console.log('✅ Trimmed audio2 uploaded to S3:', audioS3Path2);
          } finally {
            try { unlinkSync(inputLocalPath2); } catch {}
            try { unlinkSync(outputLocalPath2); } catch {}
          }
        } else {
          const audioFileName2 = `input/infinitetalk/audio2_${job.id}_${audioFile2.name}`;
          audioS3Path2 = await uploadToS3(audioFile2, audioFileName2);
          console.log('✅ Audio 2 uploaded to S3:', audioS3Path2);
        }
      } catch (e) {
        console.error('❌ Audio2 upload/trim failed:', e);
        if (!audioS3Path2) {
          const audioFileName2 = `input/infinitetalk/audio2_${job.id}_${audioFile2.name}`;
          audioS3Path2 = await uploadToS3(audioFile2, audioFileName2);
          console.log('✅ Audio 2 uploaded to S3 (fallback original):', audioS3Path2);
        }
      }
    }

    // 로컬에 백업 저장
    mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
    
    // infinitetalk 디렉토리 생성
    const infinitetalkDir = join(LOCAL_STORAGE_DIR, 'input', 'infinitetalk');
    mkdirSync(infinitetalkDir, { recursive: true });
    
    // 미디어 파일 로컬 저장
    if (inputType === 'image' && imageFile) {
      const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
      const localImagePath = join(infinitetalkDir, `input_${job.id}_${imageFile.name}`);
      writeFileSync(localImagePath, imageBuffer);
    } else if (inputType === 'video' && videoFile) {
      const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
      const localVideoPath = join(infinitetalkDir, `input_${job.id}_${videoFile.name}`);
      writeFileSync(localVideoPath, videoBuffer);
    }
    
    // 오디오 파일들 로컬 저장 (항상 원본도 보관하여 재사용 가능)
    if (!trimmedAudioLocalPath) {
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      const localAudioPath = join(infinitetalkDir, `audio_${job.id}_${audioFile.name}`);
      writeFileSync(localAudioPath, audioBuffer);
      originalAudioLocalPath = localAudioPath;
    }
    
    if (personCount === 'multi' && audioFile2) {
      if (!trimmedAudio2LocalPath) {
        const audioBuffer2 = Buffer.from(await audioFile2.arrayBuffer());
        const localAudioPath2 = join(infinitetalkDir, `audio2_${job.id}_${audioFile2.name}`);
        writeFileSync(localAudioPath2, audioBuffer2);
        originalAudio2LocalPath = localAudioPath2;
      }
    }
    
    console.log('✅ Files saved locally as backup');

    // RunPod 서비스 초기화
    const runpod = new runpodService(
      settings.runpod.apiKey,
      settings.runpod.endpoints['infinite-talk'],
      settings.runpod.generateTimeout
    );

    // RunPod에 작업 제출
    const runpodInput: any = {
      prompt,
      input_type: inputType,
      person_count: personCount,
      width,
      height,
      network_volume: true
    };

    // 미디어 파일 경로 설정
    if (inputType === 'image') {
      runpodInput.image_path = mediaS3Path;
    } else if (inputType === 'video') {
      runpodInput.video_path = mediaS3Path;
    }

    // 오디오 파일 경로 설정
    runpodInput.wav_path = audioS3Path;
    
    // 다중 인물인 경우 두 번째 오디오 파일 경로 설정
    if (personCount === 'multi' && audioS3Path2) {
      runpodInput.wav_path_2 = audioS3Path2;
    }

    console.log('🚀 Submitting to RunPod...');
    console.log('📤 RunPod Input Data:', JSON.stringify(runpodInput, null, 2));
    const runpodJobId = await runpod.submitJob(runpodInput);
    console.log('✅ RunPod job submitted:', runpodJobId);

    // 데이터베이스 업데이트
    await prisma.job.update({
      where: { id: job.id },
      data: {
        runpodJobId,
        options: JSON.stringify({
          inputType,
          personCount,
          width,
          height,
          imageFileName: imageFile?.name,
          videoFileName: videoFile?.name,
          audioFileName: audioFile.name,
          audioFileName2: audioFile2?.name,
          mediaS3Path,
          audioS3Path,
          audioS3Path2,
          audioWebPath: trimmedAudioLocalPath ? `/results/input/infinitetalk/${basename(trimmedAudioLocalPath)}` : `/results/input/infinitetalk/audio_${job.id}_${audioFile.name}`,
          originalAudioWebPath: originalAudioLocalPath ? `/results/input/infinitetalk/${basename(originalAudioLocalPath)}` : `/results/input/infinitetalk/audio_${job.id}_${audioFile.name}`,
          audioTrimStartStr: audioStartStr || null,
          audioTrimEndStr: audioEndStr || null,
          audioTrimStartSec: typeof audioStart === 'number' ? audioStart : null,
          audioTrimEndSec: typeof audioEnd === 'number' ? audioEnd : null,
          ...(imageFile && {
            imageWebPath: `/results/input/infinitetalk/input_${job.id}_${imageFile.name}`,
            localImagePath: join(infinitetalkDir, `input_${job.id}_${imageFile.name}`)
          }),
          ...(videoFile && {
            videoWebPath: `/results/input/infinitetalk/input_${job.id}_${videoFile.name}`,
            localVideoPath: join(infinitetalkDir, `input_${job.id}_${videoFile.name}`)
          }),
          ...(audioFile2 && {
            audioWebPath2: trimmedAudio2LocalPath ? `/results/input/infinitetalk/${basename(trimmedAudio2LocalPath)}` : `/results/input/infinitetalk/audio2_${job.id}_${audioFile2.name}`,
            originalAudioWebPath2: originalAudio2LocalPath ? `/results/input/infinitetalk/${basename(originalAudio2LocalPath)}` : `/results/input/infinitetalk/audio2_${job.id}_${audioFile2.name}`,
            audio2TrimStartStr: audio2StartStr || null,
            audio2TrimEndStr: audio2EndStr || null,
            audio2TrimStartSec: typeof audio2Start === 'number' ? audio2Start : null,
            audio2TrimEndSec: typeof audio2End === 'number' ? audio2End : null,
          })
        }),
      },
    });

    // 썸네일 생성 (동기 처리로 완료 후 응답)
    let thumbnailSetSuccess = false;
    try {
      if (inputType === 'image' && imageFile) {
        // 이미지 입력인 경우 이미지를 썸네일로 사용
        const thumbnailUrl = `/results/input/infinitetalk/input_${job.id}_${imageFile.name}`;
        await prisma.job.update({
          where: { id: job.id },
          data: { thumbnailUrl },
        });
        console.log(`🖼️ Infinite Talk thumbnail set to input image: ${thumbnailUrl}`);
        thumbnailSetSuccess = true;
      } else if (inputType === 'video' && videoFile) {
        // 비디오 입력인 경우 첫 번째 프레임을 썸네일로 생성
        const localVideoPath = join(infinitetalkDir, `input_${job.id}_${videoFile.name}`);
        console.log(`🎬 Generating thumbnail from input video: ${localVideoPath}`);
        
        // 썸네일 파일명 생성
        const thumbnailFileName = `thumb_${job.id}.jpg`;
        const thumbnailPath = join(LOCAL_STORAGE_DIR, thumbnailFileName);
        
        // FFmpeg로 첫 번째 프레임 추출
        const { ffmpegService } = await import('@/lib/ffmpegService');
        
        try {
          await ffmpegService.extractThumbnail(localVideoPath, thumbnailPath, {
            width: 320,
            height: 240,
            quality: 80,
            format: 'jpg'
          });
          
          // 썸네일 URL 설정
          const thumbnailUrl = `/results/${thumbnailFileName}`;
          await prisma.job.update({
            where: { id: job.id },
            data: { thumbnailUrl },
          });
          
          console.log(`✅ Infinite Talk thumbnail generated: ${thumbnailUrl}`);
          thumbnailSetSuccess = true;
        } catch (ffmpegError) {
          console.error('❌ Failed to generate thumbnail from video:', ffmpegError);
          // FFmpeg 실패 시 비디오 자체를 썸네일로 사용
          const fallbackThumbnailUrl = `/results/input/infinitetalk/input_${job.id}_${videoFile.name}`;
          await prisma.job.update({
            where: { id: job.id },
            data: { thumbnailUrl: fallbackThumbnailUrl },
          });
          console.log(`🎬 Fallback: Infinite Talk thumbnail set to input video: ${fallbackThumbnailUrl}`);
          thumbnailSetSuccess = true;
        }
      }
    } catch (thumbnailError) {
      console.error('❌ Failed to set initial thumbnail:', thumbnailError);
    }

    console.log(`📸 Thumbnail generation ${thumbnailSetSuccess ? 'completed' : 'skipped'}: ${job.id}`);

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
