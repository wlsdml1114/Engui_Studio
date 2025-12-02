'use client';

import React, { useState } from 'react';
import { useStudio, VideoProject } from '@/lib/context/StudioContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportDialogProps {
  project: VideoProject;
}

type ExportFormat = 'mp4' | 'webm';
type ExportQuality = 'low' | 'medium' | 'high';

interface ExportOptions {
  format: ExportFormat;
  quality: ExportQuality;
  resolution: number; // percentage of original resolution
}

type ExportState = 'idle' | 'rendering' | 'completed' | 'error';

export function ExportDialog({ project }: ExportDialogProps) {
  const { exportDialogOpen, setExportDialogOpen } = useStudio();
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'mp4',
    quality: 'high',
    resolution: 100,
  });
  
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setExportState('rendering');
    setProgress(0);
    setErrorMessage(null);
    setDownloadUrl(null);

    try {
      // Simulate export progress
      // In a real implementation, this would call the /api/video-export endpoint
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      // Simulate API call
      const response = await fetch('/api/video-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          options: exportOptions,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const data = await response.json();
      
      if (data.success) {
        setProgress(100);
        setDownloadUrl(data.downloadUrl);
        setExportState('completed');
      } else {
        throw new Error(data.error || 'Export failed');
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
      link.download = `${project.title}.${exportOptions.format}`;
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

  const getQualityLabel = (quality: ExportQuality): string => {
    switch (quality) {
      case 'low':
        return 'Low (Fast)';
      case 'medium':
        return 'Medium (Balanced)';
      case 'high':
        return 'High (Best Quality)';
    }
  };

  return (
    <Dialog open={exportDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Configure export settings for your video project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="flex gap-2">
              <Button
                variant={exportOptions.format === 'mp4' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'mp4' }))}
                disabled={exportState === 'rendering'}
                className="flex-1"
              >
                MP4
              </Button>
              <Button
                variant={exportOptions.format === 'webm' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportOptions(prev => ({ ...prev, format: 'webm' }))}
                disabled={exportState === 'rendering'}
                className="flex-1"
              >
                WebM
              </Button>
            </div>
          </div>

          {/* Quality Selection */}
          <div className="space-y-2">
            <Label>Quality</Label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as ExportQuality[]).map((quality) => (
                <Button
                  key={quality}
                  variant={exportOptions.quality === quality ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportOptions(prev => ({ ...prev, quality }))}
                  disabled={exportState === 'rendering'}
                  className="flex-1"
                >
                  {getQualityLabel(quality)}
                </Button>
              ))}
            </div>
          </div>

          {/* Resolution Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Resolution</Label>
              <span className="text-sm text-muted-foreground">
                {exportOptions.resolution}%
              </span>
            </div>
            <Slider
              value={[exportOptions.resolution]}
              onValueChange={([value]) => setExportOptions(prev => ({ ...prev, resolution: value }))}
              min={25}
              max={100}
              step={25}
              disabled={exportState === 'rendering'}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Progress Bar */}
          {exportState === 'rendering' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rendering...</span>
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
              <span className="text-sm text-green-500">Export completed successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {exportState === 'error' && errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Export Failed</p>
                <p className="text-sm text-destructive/80 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {exportState === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Start Export
              </Button>
            </>
          )}

          {exportState === 'rendering' && (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Rendering...
            </Button>
          )}

          {exportState === 'completed' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </>
          )}

          {exportState === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleExport}>
                Try Again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
