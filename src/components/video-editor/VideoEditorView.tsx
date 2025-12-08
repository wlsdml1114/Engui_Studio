'use client';

import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useStudio } from '@/lib/context/StudioContext';
import { VideoEditorHeader } from './VideoEditorHeader';
import { ExportDialog } from './ExportDialog';
import { ErrorBoundary } from './ErrorBoundary';
import { cn } from '@/lib/utils';

// Lazy load heavy components
const VideoPreview = lazy(() => import('./VideoPreview').then(m => ({ default: m.VideoPreview })));
const VideoTimeline = lazy(() => import('./VideoTimeline').then(m => ({ default: m.VideoTimeline })));

interface VideoEditorViewProps {
  projectId: string;
  className?: string;
}

const VideoEditorViewInternal = React.memo(function VideoEditorViewInternal({ projectId, className }: VideoEditorViewProps) {
  const {
    currentProject,
    tracks,
    keyframes,
    player,
    playerState,
    currentTimestamp,
    zoom,
    loadProject,
    addTrack,
    setPlayer,
    setPlayerState,
    setCurrentTimestamp,
  } = useStudio();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load project data on mount and create default tracks
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await loadProject(projectId);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
        setIsLoading(false);
      }
    };

    loadProjectData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]); // Only re-run when projectId changes, not when loadProject reference changes

  // Create default tracks after project is loaded (video, music, voiceover)
  useEffect(() => {
    const createDefaultTracks = async () => {
      if (!currentProject || isLoading) return;
      
      const defaultTrackTypes: Array<{ type: 'video' | 'music' | 'voiceover'; label: string }> = [
        { type: 'video', label: 'Video Track' },
        { type: 'music', label: 'Music Track' },
        { type: 'voiceover', label: 'Voiceover Track' },
      ];
      
      for (let i = 0; i < defaultTrackTypes.length; i++) {
        const { type, label } = defaultTrackTypes[i];
        const existingTrack = tracks.find(t => t.type === type);
        
        if (!existingTrack) {
          await addTrack({
            projectId: currentProject.id,
            type,
            label,
            locked: false,
            order: i,
          });
        }
      }
    };
    
    createDefaultTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id, isLoading]); // Only run when project loads

  // Loading state - show first
  if (isLoading) {
    return (
      <div 
        className={cn('flex flex-col h-full items-center justify-center', className)}
        role="status"
        aria-live="polite"
        aria-label="Loading video editor"
      >
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" aria-hidden="true" />
          <p className="text-muted-foreground">Loading video editor...</p>
        </div>
      </div>
    );
  }

  // Error state - check before project not found
  if (error) {
    return (
      <div 
        className={cn('flex flex-col h-full items-center justify-center', className)}
        role="alert"
        aria-live="assertive"
      >
        <div className="text-center space-y-4 max-w-md">
          <div className="text-destructive text-4xl" aria-hidden="true">⚠️</div>
          <h3 className="text-lg font-semibold">Failed to Load Project</h3>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            aria-label="Retry loading project"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Project not found state - only if no error
  if (!currentProject) {
    return (
      <div className={cn('flex flex-col h-full items-center justify-center', className)}>
        <div className="text-center space-y-4">
          <div className="text-muted-foreground text-4xl">📁</div>
          <h3 className="text-lg font-semibold">Project Not Found</h3>
          <p className="text-muted-foreground">
            The requested project could not be found.
          </p>
        </div>
      </div>
    );
  }

  // Calculate timeline height based on track count (more compact)
  // 48px for controls + 32px ruler + tracks * 68px (64px track + 4px gap) + 16px padding
  const timelineMinHeight = 48 + 32 + (tracks.length * 68) + 16;

  // Main editor view
  return (
    <div 
      className={cn('flex flex-col h-full bg-background overflow-hidden', className)}
      role="application"
      aria-label="Video editor"
    >
      {/* Header */}
      <VideoEditorHeader project={currentProject} />

      {/* Main content area - Preview, Timeline, and Properties (vertical layout) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Preview - Lazy loaded - takes remaining space */}
        <div className="flex-1 min-h-[200px] overflow-hidden">
          <Suspense fallback={
            <div 
              className="h-full flex items-center justify-center bg-black/20"
              role="status"
              aria-label="Loading video preview"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
            </div>
          }>
            <VideoPreview
              project={currentProject}
              tracks={tracks}
              keyframes={keyframes}
              onPlayerReady={setPlayer}
              onStateChange={setPlayerState}
              onTimeUpdate={setCurrentTimestamp}
            />
          </Suspense>
        </div>

        {/* Timeline - Lazy loaded - fixed minimum height based on tracks */}
        <div className="shrink-0" style={{ minHeight: `${timelineMinHeight}px` }}>
          <Suspense fallback={
            <div 
              className="border-t border-border bg-background p-4 text-center"
              role="status"
              aria-label="Loading timeline"
            >
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" aria-hidden="true" />
            </div>
          }>
            <VideoTimeline
              project={currentProject}
              tracks={tracks}
              keyframes={keyframes}
              currentTimestamp={currentTimestamp}
              zoom={zoom}
            />
          </Suspense>
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog project={currentProject} />
    </div>
  );
});

// Export wrapped with ErrorBoundary
export function VideoEditorView(props: VideoEditorViewProps) {
  return (
    <ErrorBoundary>
      <VideoEditorViewInternal {...props} />
    </ErrorBoundary>
  );
}
