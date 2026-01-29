'use client';

import React from 'react';
import { Job, useStudio } from '@/lib/context/StudioContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Trash2, X, Copy, ExternalLink } from 'lucide-react';
import { getModelById } from '@/lib/models/modelConfig';
import { useI18n } from '@/lib/i18n/context';

interface JobDetailsDialogProps {
    job: Job | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function JobDetailsDialog({ job, open, onOpenChange }: JobDetailsDialogProps) {
    const { deleteJob } = useStudio();
    const { t } = useI18n();

    // If no job, we still render the Dialog but with open=false to prevent unmounting issues
    // or we render empty content if it somehow opens without a job
    const safeOpen = open && !!job;
    const model = job ? getModelById(job.modelId) : null;
    const isVideo = job?.type === 'video';
    const isAudio = job?.type === 'audio' || job?.type === 'tts' || job?.type === 'music';

    const handleDownload = async () => {
        if (!job?.resultUrl) return;
        try {
            const response = await fetch(job.resultUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            let ext = 'png';
            if (isVideo) ext = 'mp4';
            if (isAudio) ext = 'mp3';

            a.download = `job-${job.id}.${ext}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback
            const a = document.createElement('a');
            a.href = job.resultUrl;
            a.target = '_blank';
            a.download = `job-${job.id}.${isVideo ? 'mp4' : isAudio ? 'mp3' : 'png'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const handleDelete = () => {
        // ... (existing handleDelete)
        if (job && confirm('Are you sure you want to delete this job?')) {
            deleteJob(job.id);
            onOpenChange(false);
        }
    };

    // ... (existing handleCopyPrompt)

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
                    <div className="flex-1 bg-black/90 flex items-center justify-center relative min-h-[300px] md:h-full overflow-hidden p-4">
                        {job.status === 'completed' && job.resultUrl ? (
                            isVideo ? (
                                <video
                                    src={job.resultUrl}
                                    controls
                                    loop
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : isAudio ? (
                                <div className="flex flex-col items-center justify-center w-full max-w-md gap-6 p-8 bg-zinc-900/50 rounded-xl border border-white/10 backdrop-blur-sm">
                                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary animate-pulse">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
                                            <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <audio
                                        src={job.resultUrl}
                                        controls
                                        className="w-full"
                                    />
                                    <div className="text-sm text-muted-foreground text-center">
                                        {job.modelId} • Audio Generated
                                    </div>
                                </div>
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
                                <DialogTitle className="text-lg font-semibold">{t('jobDetails.title')}</DialogTitle>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground font-mono">
                                ID: {job.id}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Prompt Section */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-foreground">{t('jobDetails.prompt')}</h3>
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
                                    <span className="text-xs text-muted-foreground">{t('jobDetails.model')}</span>
                                    <div className="text-sm font-medium">{model?.name || job.modelId}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">Provider</span>
                                    <div className="text-sm font-medium">{model?.provider || 'Unknown'}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">{t('jobDetails.status')}</span>
                                    <div className={`text-sm font-medium capitalize ${job.status === 'completed' ? 'text-green-500' :
                                        job.status === 'failed' ? 'text-red-500' : 'text-blue-500'
                                        }`}>
                                        {job.status}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">{t('jobDetails.createdAt')}</span>
                                    <div className="text-sm font-medium">
                                        {new Date(job.createdAt).toLocaleTimeString()}
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
                                {t('jobDetails.download')}
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
