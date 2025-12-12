'use client';

import React, { useState, useEffect } from 'react';
import { useStudio, VideoProject } from '@/lib/context/StudioContext';
import { useI18n } from '@/lib/i18n/context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ExportDialogProps {
  project: VideoProject;
}

type ExportState = 'idle' | 'rendering' | 'completed' | 'error';

export function ExportDialog({ project }: ExportDialogProps) {
  const { exportDialogOpen, setExportDialogOpen, tracks, keyframes } = useStudio();
  const { t } = useI18n();
  
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-start export when dialog opens
  useEffect(() => {
    if (exportDialogOpen && exportState === 'idle') {
      handleExport();
    }
  }, [exportDialogOpen]);

  const handleExport = async () => {
    setExportState('rendering');
    setProgress(0);
    setErrorMessage(null);
    setDownloadUrl(null);

    try {
      // Simulate export progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      // Send project data directly to API with default options (mp4, high quality)
      const response = await fetch('/api/video-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: {
            id: project.id,
            title: project.title,
            description: project.description,
            aspectRatio: project.aspectRatio,
            qualityPreset: project.qualityPreset,
            width: project.width,
            height: project.height,
            duration: project.duration,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          },
          tracks: tracks,
          keyframes: keyframes,
          options: {
            format: 'mp4',
            quality: 'high',
            resolution: 100,
          },
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const data = await response.json();
      
      if (data.success) {
        setProgress(100);
        setExportState('completed');
        
        if (data.downloadUrl) {
          setDownloadUrl(data.downloadUrl);
          // Trigger automatic download
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.download = `${project.title}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Auto close dialog after download starts
          setTimeout(() => {
            handleClose();
          }, 1500);
        } else if (data.note) {
          setErrorMessage(data.note);
        } else {
          setErrorMessage('Export completed but no download available');
        }
      } else {
        throw new Error(data.error?.message || data.error || 'Export failed');
      }
    } catch (error) {
      setExportState('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${project.title}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleClose = () => {
    setExportDialogOpen(false);
    // Reset state after a delay to avoid visual glitches
    setTimeout(() => {
      setExportState('idle');
      setProgress(0);
      setDownloadUrl(null);
      setErrorMessage(null);
    }, 300);
  };

  return (
    <Dialog open={exportDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('videoEditor.export.title')}</DialogTitle>
          <DialogDescription>
            {t('videoEditor.export.exportingAs', { title: project.title })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Bar */}
          {exportState === 'rendering' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('videoEditor.export.rendering')}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Message */}
          {exportState === 'completed' && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-500">{t('videoEditor.export.success')}</span>
            </div>
          )}

          {/* Error Message */}
          {(exportState === 'error' || (exportState === 'completed' && errorMessage)) && errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive/80">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {exportState === 'rendering' && (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('videoEditor.export.rendering')}
            </Button>
          )}

          {exportState === 'completed' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t('videoEditor.export.close')}
              </Button>
              {downloadUrl && (
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('videoEditor.export.download')}
                </Button>
              )}
            </>
          )}

          {exportState === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {t('videoEditor.export.close')}
              </Button>
              <Button onClick={handleExport}>
                {t('videoEditor.export.tryAgain')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
