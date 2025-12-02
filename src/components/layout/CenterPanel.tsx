'use client';

import React from 'react';
import { useStudio } from '@/lib/context/StudioContext';
import { VideoEditorView } from '@/components/video-editor/VideoEditorView';

export default function CenterPanel() {
    const { activeArtifactId, activeTool } = useStudio();

    console.log('CenterPanel render - activeTool:', activeTool, 'activeArtifactId:', activeArtifactId);

    // Check if we're in video editor mode
    const isVideoEditorMode = activeTool === 'speech-sequencer';

    console.log('isVideoEditorMode:', isVideoEditorMode);

    // If in video editor mode, render the VideoEditorView
    if (isVideoEditorMode) {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <VideoEditorView projectId={activeArtifactId || 'default-project'} />
            </div>
        );
    }

    // Mock data for demonstration - in a real app, this would come from a store or API based on activeArtifactId
    const activeArtifact = activeArtifactId ? {
        id: activeArtifactId,
        type: activeArtifactId.includes('image') ? 'image' : 'video',
        url: activeArtifactId.includes('image')
            ? 'https://placehold.co/1024x1024/png'
            : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        title: 'Generated Content'
    } : null;

    return (
        <div className="flex-1 bg-background/50 flex flex-col relative overflow-hidden">
            {/* Toolbar / Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm z-10">
                <h2 className="font-semibold text-sm">Workspace</h2>
                {activeArtifact && (
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                            Download
                        </button>
                        <button className="px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
                            Share
                        </button>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-hidden bg-black/20">
                {activeArtifact ? (
                    <div className="w-full h-full flex items-center justify-center relative group">
                        {activeArtifact.type === 'video' ? (
                            <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-border/50">
                                <video
                                    src={activeArtifact.url}
                                    controls
                                    className="w-full h-full object-contain"
                                    poster="https://placehold.co/1920x1080/png?text=Video+Preview"
                                />
                            </div>
                        ) : (
                            <div className="relative w-full max-w-3xl aspect-square bg-black/50 rounded-lg overflow-hidden shadow-2xl border border-border/50">
                                <img
                                    src={activeArtifact.url}
                                    alt={activeArtifact.title}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground select-none">
                        <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-accent/20">
                            <span className="text-4xl opacity-50">✨</span>
                        </div>
                        <h3 className="text-xl font-medium mb-2 text-foreground">Ready to Create</h3>
                        <p className="max-w-md mx-auto text-sm text-muted-foreground/80">
                            Select a tool from the left panel to start generating content.
                            Your generated artifacts will appear here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
