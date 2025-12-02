import { NextRequest, NextResponse } from 'next/server';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: NextRequest) {
  console.log('🎬 video-export POST called');

  try {
    const body = await request.json();
    console.log('Request body keys:', Object.keys(body));

    // Get data directly from request body (sent from frontend)
    const { project, tracks, keyframes, options = {} } = body;
    const format = options.format || 'mp4';

    // Validate required data
    if (!project) {
      return NextResponse.json(
        { success: false, error: { message: 'Project data is required' } },
        { status: 400 }
      );
    }

    console.log(`📊 Project: ${project.title}, tracks: ${tracks?.length || 0}`);

    // Check if there's content
    const hasContent = tracks?.length > 0 && 
      Object.values(keyframes || {}).some((kfs: any) => kfs?.length > 0);
    
    if (!hasContent) {
      return NextResponse.json({
        success: true,
        message: 'No content to export',
        downloadUrl: null,
        note: 'Add media to timeline before exporting',
      });
    }

    // Create output directory
    const outputDir = path.join(process.cwd(), 'public', 'exports');
    await mkdir(outputDir, { recursive: true });

    // Generate unique filename
    const exportId = uuidv4();
    const filename = `export_${exportId}.${format}`;
    const outputPath = path.join(outputDir, filename);

    console.log('📦 Bundling Remotion project...');

    // Bundle the Remotion project
    const publicDir = path.join(process.cwd(), 'public');
    const bundleLocation = await bundle({
      entryPoint: path.join(process.cwd(), 'src/lib/remotion/index.tsx'),
      publicDir: publicDir,
      webpackOverride: (config) => {
        return {
          ...config,
          resolve: {
            ...config.resolve,
            alias: {
              ...config.resolve?.alias,
              '@': path.join(process.cwd(), 'src'),
            },
          },
        };
      },
    });

    console.log('✅ Bundle created');

    // Convert relative URLs to absolute file paths for Remotion
    const processedKeyframes: Record<string, any[]> = {};
    
    for (const [trackId, kfs] of Object.entries(keyframes || {})) {
      processedKeyframes[trackId] = (kfs as any[]).map((kf: any) => {
        let url = kf.data?.url || kf.url;
        
        // Skip blob URLs - they won't work in server-side rendering
        if (url?.startsWith('blob:')) {
          console.warn(`⚠️ Skipping blob URL for keyframe ${kf.id}`);
          return { ...kf, data: { ...kf.data, url: null } };
        }
        
        // Convert relative URLs to absolute http:// URLs using localhost
        if (url && !url.startsWith('http')) {
          // Ensure URL starts with /
          const urlPath = url.startsWith('/') ? url : `/${url}`;
          url = `http://localhost:3000${urlPath}`;
        }
        
        console.log(`📁 URL for keyframe ${kf.id}: ${url}`);
        
        return {
          ...kf,
          data: { ...kf.data, url },
        };
      });
    }

    const inputProps = {
      project,
      tracks: tracks || [],
      keyframes: processedKeyframes,
    };

    console.log('📝 Input props tracks:', tracks?.length);
    console.log('📝 Input props keyframes:', Object.keys(keyframes || {}).length);

    // Select composition
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'MainComposition',
      inputProps,
    });

    console.log('🎥 Rendering video...');

    // Collect audio files for later merging
    const audioFiles: { url: string; startTime: number }[] = [];
    for (const [trackId, kfs] of Object.entries(processedKeyframes)) {
      const track = tracks.find((t: any) => t.id === trackId);
      if (track?.type === 'music' || track?.type === 'voiceover') {
        for (const kf of kfs as any[]) {
          if (kf.data?.url) {
            audioFiles.push({
              url: kf.data.url,
              startTime: kf.timestamp / 1000, // Convert to seconds
            });
          }
        }
      }
    }
    
    console.log(`🎵 Found ${audioFiles.length} audio files to merge`);

    // Render the video (without audio from AudioKeyFrame since it uses HTML5 Audio)
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: format === 'webm' ? 'vp8' : 'h264',
      outputLocation: outputPath,
      inputProps,
    });

    console.log('✅ Video rendered to:', outputPath);
    
    // If there are audio files, merge them with FFmpeg
    if (audioFiles.length > 0) {
      console.log('🎵 Merging audio with video using FFmpeg...');
      
      const { execSync } = await import('child_process');
      const tempVideoPath = outputPath.replace(`.${format}`, `_temp.${format}`);
      
      // Rename original video to temp
      const fs = await import('fs/promises');
      await fs.rename(outputPath, tempVideoPath);
      
      try {
        // Convert URLs to file paths
        const audioPaths = audioFiles.map(af => {
          const audioPath = af.url.startsWith('http://localhost:3000/')
            ? path.join(publicDir, af.url.replace('http://localhost:3000/', ''))
            : af.url;
          return { path: audioPath, startTime: af.startTime };
        });
        
        console.log(`🎵 Audio paths:`, audioPaths);
        
        if (audioPaths.length === 1) {
          // Single audio file - simple merge
          const ffmpegCmd = `ffmpeg -y -i "${tempVideoPath}" -i "${audioPaths[0].path}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`;
          console.log(`🎵 FFmpeg command: ${ffmpegCmd}`);
          execSync(ffmpegCmd, { stdio: 'pipe' });
        } else {
          // Multiple audio files - mix them together
          // Build FFmpeg filter complex to mix all audio tracks
          const inputs = audioPaths.map((ap, i) => `-i "${ap.path}"`).join(' ');
          const delays = audioPaths.map((ap, i) => `[${i + 1}:a]adelay=${Math.round(ap.startTime * 1000)}|${Math.round(ap.startTime * 1000)}[a${i}]`).join(';');
          const mixInputs = audioPaths.map((_, i) => `[a${i}]`).join('');
          const filterComplex = `${delays};${mixInputs}amix=inputs=${audioPaths.length}:duration=longest[aout]`;
          
          const ffmpegCmd = `ffmpeg -y -i "${tempVideoPath}" ${inputs} -filter_complex "${filterComplex}" -map 0:v:0 -map "[aout]" -c:v copy -c:a aac "${outputPath}"`;
          console.log(`🎵 FFmpeg command: ${ffmpegCmd}`);
          execSync(ffmpegCmd, { stdio: 'pipe' });
        }
        
        // Clean up temp file
        await fs.unlink(tempVideoPath);
        console.log('✅ Audio merged successfully');
      } catch (ffmpegError) {
        console.error('⚠️ FFmpeg merge failed:', ffmpegError);
        // Restore original video if FFmpeg fails
        await fs.rename(tempVideoPath, outputPath);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Export completed',
      downloadUrl: `/exports/${filename}`,
    });
  } catch (error) {
    console.error('❌ Export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Export failed',
        },
      },
      { status: 500 }
    );
  }
}
