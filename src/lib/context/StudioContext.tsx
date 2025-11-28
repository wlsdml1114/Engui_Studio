'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type StudioTool =
    | 'video-generation'
    | 'wan-animate'
    | 'video-upscale'
    | 'flux-kontext'
    | 'flux-krea'
    | 'qwen-image-edit'
    | 'multitalk'
    | 'infinite-talk'
    | 'speech-sequencer'
    | 's3-storage'
    | 'settings';

export interface StudioSettings {
    apiKeys: {
        openai?: string;
        google?: string;
        kling?: string;
        runpod?: string;
    };
    runpod: {
        endpoints: Record<string, string>; // modelId -> endpointId
    };
    storage: {
        endpointUrl?: string;
        bucket?: string;
        region?: string;
        accessKey?: string;
        secretKey?: string;
    };
}

export interface Workspace {
    id: string;
    name: string;
    isDefault: boolean;
    createdAt: string;
}

export interface Job {
    id: string;
    modelId: string;
    type: 'image' | 'video' | 'audio';
    status: 'queued' | 'processing' | 'completed' | 'failed';
    prompt: string;
    createdAt: number;
    resultUrl?: string;
    error?: string;
    endpointId?: string;
    cost?: number;
    workspaceId?: string;
}

const defaultSettings: StudioSettings = {
    apiKeys: {},
    runpod: { endpoints: {} },
    storage: {}
};

interface StudioContextType {
    activeTool: StudioTool;
    setActiveTool: (tool: StudioTool) => void;
    selectedModel: string | null;
    setSelectedModel: (model: string | null) => void;
    activeArtifactId: string | null;
    setActiveArtifactId: (id: string | null) => void;
    settings: StudioSettings;
    updateSettings: (settings: Partial<StudioSettings>) => void;

    // Jobs
    jobs: Job[];
    addJob: (job: Job) => void;
    updateJobStatus: (id: string, status: Job['status'], resultUrl?: string, error?: string, cost?: number) => void;
    deleteJob: (id: string) => void;

    // Workspaces
    workspaces: Workspace[];
    activeWorkspaceId: string | null;
    createWorkspace: (name: string) => Promise<void>;
    selectWorkspace: (id: string) => void;
    deleteWorkspace: (id: string) => Promise<void>;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export function StudioProvider({ children }: { children: ReactNode }) {
    const [activeTool, setActiveTool] = useState<StudioTool>('video-generation');
    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

    // Workspace State
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

    const [jobs, setJobs] = useState<Job[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('engui_jobs');
            return saved ? JSON.parse(saved) : [];
        }
        return [];
    });

    // Persist jobs to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('engui_jobs', JSON.stringify(jobs));
        }
    }, [jobs]);

    const [settings, setSettings] = useState<StudioSettings>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('engui_settings');
            return saved ? JSON.parse(saved) : defaultSettings;
        }
        return defaultSettings;
    });

    const updateSettings = (newSettings: Partial<StudioSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            if (typeof window !== 'undefined') {
                localStorage.setItem('engui_settings', JSON.stringify(updated));
            }

            // Sync to server
            // Map 'storage' to 's3' for the API
            const apiSettings: any = { ...updated };
            if (updated.storage) {
                apiSettings.s3 = updated.storage;
                delete apiSettings.storage;
            }

            // Map 'apiKeys.runpod' to 'runpod.apiKey' for the API
            if (updated.apiKeys?.runpod) {
                if (!apiSettings.runpod) apiSettings.runpod = {};
                apiSettings.runpod.apiKey = updated.apiKeys.runpod;
            }

            fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: apiSettings })
            }).catch(err => console.error('Failed to sync settings:', err));

            return updated;
        });
    };

    // Fetch settings from server on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/settings');
                const data = await response.json();
                if (data.success && data.settings) {
                    setSettings(prev => {
                        // Deep merge is better, but simple merge for now
                        const merged = { ...prev, ...data.settings };

                        // Map 's3' from API to 'storage' in state
                        if (data.settings.s3) {
                            merged.storage = { ...prev.storage, ...data.settings.s3 };
                            delete (merged as any).s3;
                        }

                        // Map 'runpod.apiKey' from API to 'apiKeys.runpod' in state
                        if (data.settings.runpod?.apiKey) {
                            if (!merged.apiKeys) merged.apiKeys = {};
                            merged.apiKeys.runpod = data.settings.runpod.apiKey;
                        }

                        // Ensure nested objects exist
                        if (data.settings.runpod) {
                            merged.runpod = { ...prev.runpod, ...data.settings.runpod };
                            if (data.settings.runpod.endpoints) {
                                merged.runpod.endpoints = { ...prev.runpod.endpoints, ...data.settings.runpod.endpoints };
                            }
                        }

                        if (typeof window !== 'undefined') {
                            localStorage.setItem('engui_settings', JSON.stringify(merged));
                        }
                        return merged;
                    });
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            }
        };

        fetchSettings();
    }, []);

    // --- Workspace Actions ---

    const fetchWorkspaces = async () => {
        try {
            const response = await fetch('/api/workspaces?userId=default-user');
            const data = await response.json();
            if (data.workspaces) {
                setWorkspaces(data.workspaces);
                // Set default workspace if none active
                if (!activeWorkspaceId && data.workspaces.length > 0) {
                    // Prefer default workspace, otherwise first one
                    const defaultWs = data.workspaces.find((w: Workspace) => w.isDefault) || data.workspaces[0];
                    setActiveWorkspaceId(defaultWs.id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch workspaces:', error);
        }
    };

    const createWorkspace = async (name: string) => {
        try {
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, userId: 'default-user' })
            });
            const data = await response.json();
            if (data.workspace) {
                setWorkspaces(prev => [...prev, data.workspace]);
                setActiveWorkspaceId(data.workspace.id);
            }
        } catch (error) {
            console.error('Failed to create workspace:', error);
        }
    };

    const deleteWorkspace = async (id: string) => {
        // Optimistic update not ideal here as we need to handle jobs deletion or migration
        // For now, just API call
        // TODO: Implement API for delete
        console.log('Delete workspace not implemented yet in API');
    };

    const selectWorkspace = (id: string) => {
        setActiveWorkspaceId(id);
    };

    // --- Job Actions ---

    const fetchJobs = async () => {
        if (!activeWorkspaceId) return;

        try {
            const response = await fetch(`/api/jobs?workspaceId=${activeWorkspaceId}&limit=50`);
            const data = await response.json();
            if (data.success) {
                setJobs(data.jobs);
            }
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        }
    };

    const addJob = async (job: Job) => {
        const jobWithWorkspace = { ...job, workspaceId: activeWorkspaceId || undefined };

        // Optimistic update
        setJobs(prev => [jobWithWorkspace, ...prev]);

        try {
            await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobWithWorkspace)
            });
        } catch (error) {
            console.error('Failed to save job:', error);
        }
    };

    const updateJobStatus = async (id: string, status: Job['status'], resultUrl?: string, error?: string, cost?: number) => {
        // Optimistic update
        setJobs(prev => prev.map(job =>
            job.id === id ? { ...job, status, resultUrl, error, cost } : job
        ));

        try {
            await fetch(`/api/jobs/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, resultUrl, error, cost })
            });
        } catch (error) {
            console.error('Failed to update job:', error);
        }
    };

    const deleteJob = async (id: string) => {
        // Optimistic update
        setJobs(prev => prev.filter(job => job.id !== id));

        try {
            await fetch(`/api/jobs/${id}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Failed to delete job:', error);
        }
    };

    // Initial Load
    useEffect(() => {
        fetchWorkspaces();
    }, []);

    // Fetch jobs when workspace changes
    useEffect(() => {
        if (activeWorkspaceId) {
            fetchJobs();
        }
    }, [activeWorkspaceId]);

    // Polling Logic
    useEffect(() => {
        const interval = setInterval(async () => {
            const activeJobs = jobs.filter(job => job.status === 'queued' || job.status === 'processing');

            if (activeJobs.length === 0) return;

            for (const job of activeJobs) {
                try {
                    // Use stored endpointId or fallback
                    const endpointId = job.endpointId || settings.runpod.endpoints[job.modelId];

                    if (!settings.apiKeys.runpod || !endpointId) continue;

                    const response = await fetch(`/api/generate/status?jobId=${job.id}`, {
                        headers: {
                            'X-RunPod-Key': settings.apiKeys.runpod,
                            'X-RunPod-Endpoint-Id': endpointId
                        }
                    });

                    const data = await response.json();

                    if (data.success) {
                        if (data.status === 'COMPLETED') {
                            console.log('Job Completed. Output:', data.output); // Debug logging

                            // RunPod often returns output as an object with 'image_url' or similar, or just a string.
                            // Adjust based on actual model output.
                            let resultUrl = '';

                            if (!data.output) {
                                console.warn('Job completed but no output found');
                            } else if (typeof data.output === 'string') {
                                resultUrl = data.output;
                            } else if (typeof data.output === 'object') {
                                // Common patterns
                                if (data.output.image) resultUrl = data.output.image;
                                else if (data.output.image_url) resultUrl = data.output.image_url;
                                else if (data.output.video) resultUrl = data.output.video;
                                else if (data.output.video_url) resultUrl = data.output.video_url;
                                else if (data.output.url) resultUrl = data.output.url;
                                else if (data.output.images && Array.isArray(data.output.images) && data.output.images.length > 0) resultUrl = data.output.images[0];
                                else if (data.output.videos && Array.isArray(data.output.videos) && data.output.videos.length > 0) resultUrl = data.output.videos[0];
                                else if (data.output.message) resultUrl = data.output.message;
                                else if (Array.isArray(data.output) && data.output.length > 0) {
                                    // If output is an array of strings
                                    if (typeof data.output[0] === 'string') resultUrl = data.output[0];
                                }
                            }

                            if (!resultUrl) {
                                console.warn('Unknown output format:', data.output);
                            }

                            // Add base64 prefix if missing and looks like base64
                            if (resultUrl && !resultUrl.startsWith('http') && !resultUrl.startsWith('data:')) {
                                // Simple check for base64 characters
                                if (/^[A-Za-z0-9+/=]+$/.test(resultUrl.substring(0, 100))) {
                                    resultUrl = `data:image/png;base64,${resultUrl}`;
                                }
                            }

                            // Download the result to local workspace
                            if (resultUrl) {
                                try {
                                    const ext = job.type === 'video' ? '.mp4' : '.png';
                                    // Sanitize modelId to remove slashes and other unsafe characters
                                    const safeModelId = job.modelId.replace(/[^a-zA-Z0-9-_]/g, '_');
                                    const filename = `${safeModelId}-${job.id}${ext}`;

                                    const downloadRes = await fetch('/api/download', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            url: resultUrl,
                                            filename: filename,
                                            folder: 'generations'
                                        })
                                    });

                                    const downloadData = await downloadRes.json();
                                    if (downloadData.success) {
                                        resultUrl = downloadData.path;
                                    } else {
                                        console.error('Failed to download result:', downloadData.error);
                                    }
                                } catch (err) {
                                    console.error('Error calling download API:', err);
                                }
                            }

                            updateJobStatus(job.id, 'completed', resultUrl);
                        } else if (data.status === 'FAILED') {
                            updateJobStatus(job.id, 'failed', undefined, data.error || 'RunPod job failed');
                        }
                        // If IN_QUEUE or IN_PROGRESS, do nothing (keep polling)
                    }
                } catch (error) {
                    console.error('Polling error for job', job.id, error);
                }
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [jobs, settings]);

    return (
        <StudioContext.Provider value={{
            activeTool,
            setActiveTool,
            selectedModel,
            setSelectedModel,
            activeArtifactId,
            setActiveArtifactId,
            settings,
            updateSettings,

            // Jobs
            jobs,
            addJob,
            updateJobStatus,
            deleteJob,

            // Workspaces
            workspaces,
            activeWorkspaceId,
            createWorkspace,
            selectWorkspace,
            deleteWorkspace
        }}>
            {children}
        </StudioContext.Provider>
    );
}

export function useStudio() {
    const context = useContext(StudioContext);
    if (context === undefined) {
        throw new Error('useStudio must be used within a StudioProvider');
    }
    return context;
}
