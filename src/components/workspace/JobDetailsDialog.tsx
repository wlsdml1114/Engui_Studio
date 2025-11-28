'use client';

import React from 'react';
import { Job, useStudio } from '@/lib/context/StudioContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Trash2, X, Copy, ExternalLink } from 'lucide-react';
import { getModelById } from '@/lib/models/modelConfig';

interface JobDetailsDialogProps {
    job: Job | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function JobDetailsDialog({ job, open, onOpenChange }: JobDetailsDialogProps) {
    const { deleteJob } = useStudio();

    // If no job, we still render the Dialog but with open=false to prevent unmounting issues
    // or we render empty content if it somehow opens without a job
    const safeOpen = open && !!job;
    const model = job ? getModelById(job.modelId) : null;
    const isVideo = job?.type === 'video';

    const handleDownload = async () => {
        if (!job?.resultUrl) return;
        try {
            const response = await fetch(job.resultUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `job-${job.id}.${isVideo ? 'mp4' : 'png'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(job.resultUrl, '_blank');
        }
    };

    const handleDelete = () => {
        if (job && confirm('Are you sure you want to delete this generation?')) {
            deleteJob(job.id);
            onOpenChange(false);
        }
    };

    const handleCopyPrompt = () => {
        if (job?.prompt) {
            navigator.clipboard.writeText(job.prompt);
        }
    };

    return (
        <Dialog open={safeOpen} onOpenChange={onOpenChange}>
            {job && (
                <DialogContent className="max-w-4xl w-[90vw] h-[85vh] p-0 gap-0 bg-background border-border overflow-hidden flex flex-col md:flex-row">
                    {/* Media Preview - Left/Top Side */}
                    <div className="flex-1 bg-black/90 flex items-center justify-center relative min-h-[300px] md:h-full overflow-hidden">
                        {job.status === 'completed' && job.resultUrl ? (
                            isVideo ? (
                                <video
                                    src={job.resultUrl}
                                    controls
                                    loop
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : (
                                <img
                                    src={job.resultUrl}
                                    alt={job.prompt || 'Generated Image'}
                                    className="max-w-full max-h-full object-contain"
                                />
                            )
                        ) : (
                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                                <div className={`w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin ${job.status === 'processing' || job.status === 'queued' ? 'block' : 'hidden'}`} />
                                <span>{job.status === 'failed' ? 'Generation Failed' : 'Processing...'}</span>
                            </div>
                        )}
                    </div>

                    {/* Details - Right/Bottom Side */}
                    <div className="w-full md:w-[350px] flex flex-col border-t md:border-t-0 md:border-l border-border bg-card">
                        <DialogHeader className="p-4 border-b border-border">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-lg font-semibold">Job Details</DialogTitle>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground font-mono">
                                ID: {job.id}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Prompt Section */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-foreground">Prompt</h3>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyPrompt}>
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                                <div className="bg-muted/30 p-3 rounded-lg border border-border text-sm text-muted-foreground leading-relaxed max-h-[150px] overflow-y-auto">
                                    {job.prompt || 'No prompt provided'}
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Model</span>
                                    <div className="text-sm font-medium">{model?.name || job.modelId}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Provider</span>
                                    <div className="text-sm font-medium">{model?.provider || 'Unknown'}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Status</span>
                                    <div className={`text-sm font-medium capitalize ${job.status === 'completed' ? 'text-green-500' :
                                        job.status === 'failed' ? 'text-red-500' : 'text-blue-500'
                                        }`}>
                                        {job.status}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Cost</span>
                                    <div className="text-sm font-medium">
                                        {job.cost !== undefined && job.cost !== null ? `$${job.cost.toFixed(4)}` : '-'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Created</span>
                                    <div className="text-sm font-medium">
                                        {new Date(job.createdAt).toLocaleTimeString()}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Dimensions</span>
                                    <div className="text-sm font-medium">
                                        -
                                    </div>
                                </div>
                            </div>

                            {/* Error Message */}
                            {job.error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-500">
                                    <span className="font-bold">Error:</span> {job.error}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-border bg-muted/10 flex gap-2">
                            <Button className="flex-1" variant="outline" onClick={handleDownload} disabled={!job.resultUrl}>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={handleDelete}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
}
