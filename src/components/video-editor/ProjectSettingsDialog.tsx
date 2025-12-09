'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VideoProject, VideoTrack, VideoKeyFrame } from '@/lib/context/StudioContext';
import {
  AspectRatio,
  QualityPreset,
  getResolutionConfig,
} from '@/lib/resolutionConfig';
import { downloadProjectAsJSON, parseProjectFile } from '@/lib/videoProjectIO';
import { Upload, Download, FolderOpen } from 'lucide-react';

interface ProjectSettingsDialogProps {
  project: VideoProject;
  tracks: VideoTrack[];
  keyframes: Record<string, VideoKeyFrame[]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<VideoProject>) => Promise<void>;
  onImport: (file: File) => Promise<void>;
}

export function ProjectSettingsDialog({
  project,
  tracks,
  keyframes,
  open,
  onOpenChange,
  onSave,
  onImport,
}: ProjectSettingsDialogProps) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    (project.aspectRatio as AspectRatio) || '16:9'
  );
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('720p');
  const [confirmResolutionChange, setConfirmResolutionChange] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Handle export project as JSON
  const handleExportJSON = () => {
    downloadProjectAsJSON(project, tracks, keyframes);
  };

  // Handle import project from JSON
  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        await onImport(file);
        onOpenChange(false);
      } catch (error) {
        alert(`Failed to import project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    
    input.click();
  };

  // Reset form when project changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(project.title);
      setDescription(project.description || '');
      setAspectRatio((project.aspectRatio as AspectRatio) || '16:9');
      
      // Infer quality preset from current dimensions
      const currentAspectRatio = (project.aspectRatio as AspectRatio) || '16:9';
      const shortSide = currentAspectRatio === '16:9' 
        ? (project as any).height || 720
        : (project as any).width || 720;
      
      if (shortSide <= 480) {
        setQualityPreset('480p');
      } else if (shortSide <= 720) {
        setQualityPreset('720p');
      } else {
        setQualityPreset('1080p');
      }
      
      setConfirmResolutionChange(false);
    }
  }, [open, project]);

  const resolutionConfig = getResolutionConfig(aspectRatio, qualityPreset);
  
  // Check if resolution settings have changed
  const resolutionChanged =
    aspectRatio !== project.aspectRatio ||
    resolutionConfig.width !== (project as any).width ||
    resolutionConfig.height !== (project as any).height;

  const handleSave = async () => {
    // If resolution changed and not yet confirmed, show confirmation
    if (resolutionChanged && !confirmResolutionChange) {
      setConfirmResolutionChange(true);
      return;
    }

    setIsSaving(true);
    try {
      // Generate default name if empty
      const finalTitle = title.trim() || `Project ${new Date().toLocaleDateString()}`;
      
      const updates: any = {
        title: finalTitle,
        description: description.trim(),
        aspectRatio,
      };
      
      // If resolution changed, include new dimensions and quality preset
      if (resolutionChanged) {
        updates.width = resolutionConfig.width;
        updates.height = resolutionConfig.height;
        updates.qualityPreset = qualityPreset;
      }
      
      await onSave(updates);

      onOpenChange(false);
      setConfirmResolutionChange(false);
    } catch (error) {
      console.error('Failed to save project settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setConfirmResolutionChange(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Configure your project settings including name, description, and resolution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Save/Load Section */}
          <div className="flex gap-2 pb-4 border-b">
            <Button
              variant="outline"
              onClick={handleExportJSON}
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Save Project
            </Button>
            <Button
              variant="outline"
              onClick={handleImportJSON}
              className="flex-1 gap-2"
            >
              <Upload className="h-4 w-4" />
              Load Project
            </Button>
          </div>

          {/* Project Info */}
          <div>
            <Label htmlFor="title">Project Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Video Project"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project description..."
              className="mt-1"
            />
          </div>

          {/* Resolution Settings */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Resolution Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Aspect Ratio</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={aspectRatio === '16:9' ? 'default' : 'outline'}
                    onClick={() => setAspectRatio('16:9')}
                    className="flex-1"
                  >
                    16:9
                  </Button>
                  <Button
                    type="button"
                    variant={aspectRatio === '9:16' ? 'default' : 'outline'}
                    onClick={() => setAspectRatio('9:16')}
                    className="flex-1"
                  >
                    9:16
                  </Button>
                </div>
              </div>

              <div>
                <Label>Quality</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={qualityPreset === '480p' ? 'default' : 'outline'}
                    onClick={() => setQualityPreset('480p')}
                    className="flex-1"
                  >
                    480p
                  </Button>
                  <Button
                    type="button"
                    variant={qualityPreset === '720p' ? 'default' : 'outline'}
                    onClick={() => setQualityPreset('720p')}
                    className="flex-1"
                  >
                    720p
                  </Button>
                  <Button
                    type="button"
                    variant={qualityPreset === '1080p' ? 'default' : 'outline'}
                    onClick={() => setQualityPreset('1080p')}
                    className="flex-1"
                  >
                    1080p
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="text-sm font-medium">Output Resolution</div>
              <div className="text-2xl font-bold">
                {resolutionConfig.width} × {resolutionConfig.height}
              </div>
              <div className="text-xs text-muted-foreground">
                {resolutionConfig.aspectRatio} • {resolutionConfig.qualityPreset}
              </div>
            </div>

            {resolutionChanged && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm font-medium text-yellow-800">
                  Resolution Change Warning
                </div>
                <div className="text-xs text-yellow-700 mt-1">
                  Changing resolution will re-fit all existing media to the new dimensions.
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving
              ? 'Saving...'
              : resolutionChanged && !confirmResolutionChange
              ? 'Confirm Changes'
              : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
