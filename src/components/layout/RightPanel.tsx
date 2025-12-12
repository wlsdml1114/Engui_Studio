'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStudio, Job, Workspace } from '@/lib/context/StudioContext';
import { getModelById } from '@/lib/models/modelConfig';
import { JobDetailsDialog } from '@/components/workspace/JobDetailsDialog';
import { Search, Filter, CloudUpload, Info, ChevronDown, Plus, Trash2, FolderPlus, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PropertiesPanel } from '@/components/video-editor/PropertiesPanel';

export default function RightPanel() {
    const { jobs, workspaces, activeWorkspaceId, selectWorkspace, createWorkspace, deleteJob, reuseJobInput, addJob } = useStudio();
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
    const [isMounted, setIsMounted] = useState(false);

    // Workspace Creation State
    const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const { showToast } = useToast();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isCreatingWorkspace && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isCreatingWorkspace]);

    const handleJobClick = (job: Job) => {
        setSelectedJob(job);
        setDetailsOpen(true);
    };

    const handleDeleteJob = (e: React.MouseEvent, jobId: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this generation?')) {
            deleteJob(jobId);
            if (selectedJob?.id === jobId) {
                setDetailsOpen(false);
                setSelectedJob(null);
            }
        }
    };

    const handleCreateWorkspace = async () => {
        if (newWorkspaceName.trim()) {
            await createWorkspace(newWorkspaceName.trim());
            setNewWorkspaceName('');
            setIsCreatingWorkspace(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCreateWorkspace();
        } else if (e.key === 'Escape') {
            setIsCreatingWorkspace(false);
            setNewWorkspaceName('');
        }
    };

    const filteredJobs = jobs.filter(job => {
        if (filter === 'all') return true;
        return job.type === filter;
    });

    // Helper to format time ago
    const timeAgo = (date: number) => {
        const seconds = Math.floor((Date.now() - date) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="flex h-full flex-col bg-card border-l border-border w-[320px]">
            {/* Header */}
            <div className="p-3 border-b border-border flex flex-col gap-3 bg-muted/5">
                {/* Workspace Selector */}
                <div className="flex items-center justify-between">
                    {isCreatingWorkspace ? (
                        <div className="flex items-center gap-1 w-full animate-in fade-in slide-in-from-left-2 duration-200">
                            <Input
                                ref={inputRef}
                                value={newWorkspaceName}
                                onChange={(e) => setNewWorkspaceName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Workspace Name"
                                className="h-7 text-xs"
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500 hover:text-green-600" onClick={handleCreateWorkspace}>
                                <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsCreatingWorkspace(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 px-2 -ml-2 text-sm font-semibold hover:bg-muted/50 w-full justify-between group">
                                    <span className="truncate">{activeWorkspace?.name || 'Select Workspace'}</span>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[280px] bg-[#1a1a2e]/95 backdrop-blur-md border-white/10">
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Switch Workspace</DropdownMenuLabel>
                                {workspaces.map(ws => (
                                    <DropdownMenuItem key={ws.id} onClick={() => selectWorkspace(ws.id)} className="justify-between">
                                        <span className="truncate">{ws.name}</span>
                                        {ws.id === activeWorkspaceId && <Check className="w-3 h-3 text-primary" />}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsCreatingWorkspace(true)} className="text-primary focus:text-primary">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create New Workspace
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Filters & Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-muted/30 rounded-md p-0.5">
                        {(['all', 'image', 'video'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={`px-2 py-0.5 text-[10px] rounded-sm transition-all capitalize ${filter === t
                                    ? 'bg-background shadow-sm text-foreground font-medium'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                            <CloudUpload className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Job List */}
            <div className="flex-1 overflow-y-auto">
                {!isMounted ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center">
                            <FolderPlus className="w-5 h-5 opacity-50" />
                        </div>
                        <div className="text-xs">Loading...</div>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center">
                            <FolderPlus className="w-5 h-5 opacity-50" />
                        </div>
                        <div className="text-xs">No generations yet</div>
                    </div>
                ) : (
                    filteredJobs.map(job => {
                        const model = getModelById(job.modelId);
                        return (
                            <div
                                key={job.id}
                                onClick={() => handleJobClick(job)}
                                className="group flex gap-3 p-3 cursor-pointer transition-all hover:bg-muted/5 border-b border-white/5 last:border-0 relative"
                                draggable={job.status === 'completed' && !!job.resultUrl}
                                onDragStart={(e) => {
                                    if (job.status === 'completed' && job.resultUrl) {
                                        const mediaData = {
                                            id: job.id,
                                            type: job.type,
                                            url: job.resultUrl,
                                            prompt: job.prompt,
                                            duration: 5000, // Default 5 seconds
                                        };
                                        e.dataTransfer.setData('application/json', JSON.stringify(mediaData));
                                        e.dataTransfer.effectAllowed = 'copy';
                                    }
                                }}
                            >
                                {/* Thumbnail */}
                                <div className="w-14 h-14 bg-black/20 rounded-md overflow-hidden flex-shrink-0 relative shadow-sm group-hover:shadow-md transition-shadow">
                                    {job.status === 'completed' && job.resultUrl ? (
                                        job.type === 'video' ? (
                                            <video src={job.resultUrl} className="w-full h-full object-cover" muted />
                                        ) : (
                                            <img src={job.resultUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                        )
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted/20">
                                            {job.status === 'failed' ? (
                                                <span className="text-red-500 text-[10px]">✕</span>
                                            ) : job.status === 'completed' && !job.resultUrl ? (
                                                <span className="text-amber-500 text-[10px]" title="Result missing">?</span>
                                            ) : (
                                                <div className="w-3 h-3 border-2 border-primary/50 border-t-primary rounded-full animate-spin" />
                                            )}
                                        </div>
                                    )}

                                    {/* Type Badge */}
                                    {job.type === 'video' && (
                                        <div className="absolute bottom-0 right-0 bg-purple-500/70 px-1 py-0.5 text-[6px] font-mono text-white uppercase rounded-tl-sm">
                                            VID
                                        </div>
                                    )}
                                    {job.type === 'image' && (
                                        <div className="absolute bottom-0 right-0 bg-blue-500/70 px-1 py-0.5 text-[6px] font-mono text-white uppercase rounded-tl-sm">
                                            IMG
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-foreground truncate pr-2">
                                                {model?.name || job.modelId}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground/50 whitespace-nowrap bg-muted/10 px-1 py-0.5 rounded-[2px] border border-white/5">
                                                {model?.provider}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground line-clamp-1 leading-tight opacity-80">
                                            {job.prompt || 'No prompt'}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[9px] text-muted-foreground/40 font-medium">
                                            {timeAgo(job.createdAt)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {job.status === 'failed' && (
                                                <span className="text-[9px] text-red-500 font-medium">Failed</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons (Bottom Right - Hover) */}
                                {job.status === 'completed' && job.resultUrl && (
                                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <div className="relative group/tooltip">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    reuseJobInput(job.id);
                                                }}
                                                className="p-1.5 text-muted-foreground/70 hover:text-primary hover:bg-primary/10 rounded-md transition-colors shadow-sm bg-background/80 backdrop-blur-sm border border-border/50"
                                                aria-label="Reuse all inputs from this generation"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded shadow-lg border border-border whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                                                Reuse inputs
                                                <div className="absolute top-full right-2 -mt-px w-2 h-2 bg-popover border-r border-b border-border transform rotate-45"></div>
                                            </div>
                                        </div>
                                        
                                        {/* Upscale Button */}
                                        <div className="relative group/tooltip">
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    showToast(`Starting upscale for ${job.type}...`, 'info');
                                                    try {
                                                        const response = await fetch('/api/upscale', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                jobId: job.id,
                                                                type: job.type
                                                            })
                                                        });
                                                        const data = await response.json();
                                                        if (data.success && data.job) {
                                                            console.log('Upscale job created:', data.job.id);
                                                            addJob(data.job);
                                                            showToast('Upscale job created and processing', 'success');
                                                        } else {
                                                            showToast(data.error || 'Failed to create upscale job', 'error');
                                                        }
                                                    } catch (error) {
                                                        console.error('Error creating upscale job:', error);
                                                        showToast('Failed to create upscale job', 'error');
                                                    }
                                                }}
                                                className="p-1.5 text-muted-foreground/70 hover:text-green-500 hover:bg-green-500/10 rounded-md transition-colors shadow-sm bg-background/80 backdrop-blur-sm border border-border/50"
                                                aria-label={`Upscale ${job.type}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                    <path d="M10 3.75a2 2 0 10-4 0 2 2 0 004 0zM17.25 4.5a.75.75 0 000-1.5h-5.5a.75.75 0 000 1.5h5.5zM5 3.75a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM4.25 17a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5zM17.25 17a.75.75 0 000-1.5h-5.5a.75.75 0 000 1.5h5.5zM9 10a.75.75 0 01.75-.75h5.5a.75.75 0 010 1.5h-5.5A.75.75 0 019 10zM4.25 10.75a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5zM10 16.25a2 2 0 10-4 0 2 2 0 004 0zM10 10a2 2 0 10-4 0 2 2 0 004 0z" />
                                                </svg>
                                            </button>
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded shadow-lg border border-border whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                                                Upscale
                                                <div className="absolute top-full right-2 -mt-px w-2 h-2 bg-popover border-r border-b border-border transform rotate-45"></div>
                                            </div>
                                        </div>

                                        {/* Upscale + Frame Interpolation Button (Video only) */}
                                        {job.type === 'video' && (
                                            <div className="relative group/tooltip">
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        showToast('Starting upscale with frame interpolation...', 'info');
                                                        try {
                                                            const response = await fetch('/api/upscale', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    jobId: job.id,
                                                                    type: 'video-interpolation'
                                                                })
                                                            });
                                                            const data = await response.json();
                                                            if (data.success && data.job) {
                                                                console.log('Upscale + FI job created:', data.job.id);
                                                                addJob(data.job);
                                                                showToast('Upscale + FI job created and processing', 'success');
                                                            } else {
                                                                showToast(data.error || 'Failed to create upscale job', 'error');
                                                            }
                                                        } catch (error) {
                                                            console.error('Error creating upscale job:', error);
                                                            showToast('Failed to create upscale job', 'error');
                                                        }
                                                    }}
                                                    className="p-1.5 text-muted-foreground/70 hover:text-purple-500 hover:bg-purple-500/10 rounded-md transition-colors shadow-sm bg-background/80 backdrop-blur-sm border border-border/50"
                                                    aria-label="Upscale + Frame Interpolation"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                                    </svg>
                                                </button>
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded shadow-lg border border-border whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                                                    Upscale + Frame Interpolation
                                                    <div className="absolute top-full right-2 -mt-px w-2 h-2 bg-popover border-r border-b border-border transform rotate-45"></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Delete Button (Top Right - Hover) */}
                                <button
                                    onClick={(e) => handleDeleteJob(e, job.id)}
                                    className="absolute top-2 right-2 p-1.5 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Properties Panel - shows when keyframe is selected */}
            <PropertiesPanel />

            <JobDetailsDialog
                job={selectedJob}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />
        </div>
    );
}
