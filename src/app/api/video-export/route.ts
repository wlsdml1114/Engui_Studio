import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { mkdir, rm, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// Export options interface
export interface ExportOptions {
  format?: 'mp4' | 'webm';
  quality?: 'low' | 'medium' | 'high';
  resolution?: 'original' | '720p' | '1080p';
}

// Progress update interface
interface ProgressUpdate {
  progress: number;
  status: 'bundling' | 'rendering' | 'complete' | 'error';
  message: string;
  downloadUrl?: string;
  error?: string;
}

// Helper to get resolution dimensions
function getResolutionDimensions(
  aspectRatio: '16:9' | '9:16' | '1:1',
  resolution: string
): { width: number; height: number } {
  const baseResolutions = {
    '16:9': { original: { width: 1024, height: 576 }, '720p': { width: 1280, height: 720 }, '1080p': { width: 1920, height: 1080 } },
    '9:16': { original: { width: 576, height: 1024 }, '720p': { width: 720, height: 1280 }, '1080p': { width: 1080, height: 1920 } },
    '1:1': { original: { width: 1024, height: 1024 }, '720p': { width: 1280, height: 1280 }, '1080p': { width: 1920, height: 1920 } },
  };

  return baseResolutions[aspectRatio][resolution as keyof typeof baseResolutions[typeof aspectRatio]] || baseResolutions[aspectRatio].original;
}

// Helper to get codec settings based on quality
function getCodecSettings(quality: string, format: string) {
  const qualitySettings = {
    low: { crf: 28, videoBitrate: '1M' },
    medium: { crf: 23, videoBitrate: '2.5M' },
    high: { crf: 18, videoBitrate: '5M' },
  };

  const settings = qualitySettings[quality as keyof typeof qualitySettings] || qualitySettings.medium;

  if (format === 'webm') {
    return {
      codec: 'vp8' as const,
      videoBitrate: settings.videoBitrate,
    };
  }

  return {
    codec: 'h264' as const,
    crf: settings.crf,
  };
}

// POST /api/video-export - Export video project
export async function POST(request: NextRequest) {
  let bundleLocation: string | null = null;
  let outputLocation: string | null = null;

  try {
    const { projectId, options = {} } = await request.json();

    // Validate projectId
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INVALID_PROJECT_ID',
            message: 'projectId is required and must be a string'
          }
        },
        { status: 400 }
      );
    }

    // Fetch project with tracks and keyframes
    const project = await prisma.videoProject.findUnique({
      where: { id: projectId },
      include: {
        tracks: {
          orderBy: { order: 'asc' },
          include: {
            keyframes: {
              orderBy: { timestamp: 'asc' }
            }
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Video project not found'
          }
        },
        { status: 404 }
      );
    }

    // Check if project has any tracks with keyframes
    const hasContent = project.tracks.some(track => track.keyframes.length > 0);
    if (!hasContent) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMPTY_PROJECT',
            message: 'Cannot export empty project. Add media to timeline first.'
          }
        },
        { status: 400 }
      );
    }

    // Parse export options with defaults
    const exportOptions: Required<ExportOptions> = {
      format: options.format || 'mp4',
      quality: options.quality || 'medium',
      resolution: options.resolution || 'original',
    };

    // Validate export options
    if (!['mp4', 'webm'].includes(exportOptions.format)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'format must be either mp4 or webm'
          }
        },
        { status: 400 }
      );
    }

    if (!['low', 'medium', 'high'].includes(exportOptions.quality)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_QUALITY',
            message: 'quality must be one of: low, medium, high'
          }
        },
        { status: 400 }
      );
    }

    if (!['original', '720p', '1080p'].includes(exportOptions.resolution)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_RESOLUTION',
            message: 'resolution must be one of: original, 720p, 1080p'
          }
        },
        { status: 400 }
      );
    }

    console.log(`🎬 Starting export for project ${projectId} with options:`, exportOptions);

    // Get resolution dimensions
    const { width, height } = getResolutionDimensions(
      project.aspectRatio as '16:9' | '9:16' | '1:1',
      exportOptions.resolution
    );

    // Get codec settings
    const codecSettings = getCodecSettings(exportOptions.quality, exportOptions.format);

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'public', 'exports');
    await mkdir(outputDir, { recursive: true });

    // Generate unique filename
    const exportId = uuidv4();
    const filename = `export_${exportId}.${exportOptions.format}`;
    outputLocation = path.join(outputDir, filename);

    // Bundle the Remotion project
    console.log('📦 Bundling Remotion project...');
    const compositionPath = path.join(process.cwd(), 'src', 'components', 'video-editor', 'VideoComposition.tsx');
    
    bundleLocation = await bundle({
      entryPoint: compositionPath,
      webpackOverride: (config) => config,
    });

    console.log('✅ Bundle created at:', bundleLocation);

    // Transform project data for composition
    const keyframesMap: Record<string, any[]> = {};
    project.tracks.forEach(track => {
      keyframesMap[track.id] = track.keyframes.map(kf => ({
        id: kf.id,
        trackId: kf.trackId,
        timestamp: kf.timestamp,
        duration: kf.duration,
        data: {
          type: kf.dataType,
          mediaId: kf.mediaId,
          url: kf.url,
          prompt: kf.prompt,
        }
      }));
    });

    const inputProps = {
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        aspectRatio: project.aspectRatio,
        duration: project.duration,
        createdAt: project.createdAt.getTime(),
        updatedAt: project.updatedAt.getTime(),
      },
      tracks: project.tracks.map(t => ({
        id: t.id,
        projectId: t.projectId,
        type: t.type,
        label: t.label,
        locked: t.locked,
        order: t.order,
      })),
      keyframes: keyframesMap,
    };

    // Select composition
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'MainComposition',
      inputProps,
    });

    console.log('🎥 Rendering video...');

    // Render the video
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: codecSettings.codec,
      outputLocation,
      inputProps,
      ...(codecSettings.codec === 'h264' && { crf: codecSettings.crf }),
      ...(codecSettings.codec === 'vp8' && { videoBitrate: codecSettings.videoBitrate }),
      overwrite: true,
      onProgress: ({ progress }) => {
        console.log(`📊 Render progress: ${Math.round(progress * 100)}%`);
      },
    });

    console.log('✅ Video rendered successfully:', outputLocation);

    // Generate download URL
    const downloadUrl = `/api/video-export/download?file=${filename}`;

    // Clean up bundle
    if (bundleLocation) {
      await rm(bundleLocation, { recursive: true, force: true });
    }

    return NextResponse.json({
      success: true,
      downloadUrl,
      filename,
      exportId,
    });

  } catch (error) {
    console.error('❌ Video export error:', error);

    // Clean up on error
    if (bundleLocation) {
      try {
        await rm(bundleLocation, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Failed to clean up bundle:', cleanupError);
      }
    }

    if (outputLocation) {
      try {
        await unlink(outputLocation);
      } catch (cleanupError) {
        console.error('Failed to clean up output file:', cleanupError);
      }
    }

    // Determine error type and return appropriate response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export video',
          details: errorMessage,
        }
      },
      { status: 500 }
    );
  }
}
