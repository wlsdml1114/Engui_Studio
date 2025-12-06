'use client';

import React, { useState } from 'react';
import { useStudio, StudioSettings } from '@/lib/context/StudioContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { MODELS } from '@/lib/models/modelConfig';
import { LoRAManagementDialog } from '@/components/lora/LoRAManagementDialog';

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

type SettingsTab = 'general' | 'runpod' | 'upscale' | 'storage' | 'lora';

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
    const { settings, updateSettings, activeWorkspaceId } = useStudio();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [formData, setFormData] = useState<StudioSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [showLoRADialog, setShowLoRADialog] = useState(false);
    
    // modelConfig에서 RunPod 모델들을 가져오기
    const runpodModels = MODELS.filter(model => model.api.type === 'runpod');


    // Sync form data when settings change or dialog opens
    React.useEffect(() => {
        if (isOpen) {
            setFormData(settings);
        }
    }, [isOpen, settings]);

    if (!isOpen) return null;



    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Prepare settings for API (map storage to s3)
            const apiSettings: any = { ...formData };
            if (formData.storage) {
                apiSettings.s3 = formData.storage;
                delete apiSettings.storage;
            }

            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: apiSettings })
            });

            const data = await response.json();

            if (data.success) {
                updateSettings(formData);
                onClose();
            } else {
                alert(`Failed to save settings: ${data.error}`);
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('An error occurred while saving settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const updateApiKey = (provider: keyof StudioSettings['apiKeys'], value: string) => {
        setFormData(prev => ({
            ...prev,
            apiKeys: { ...prev.apiKeys, [provider]: value }
        }));
    };

    const updateStorage = (key: keyof StudioSettings['storage'], value: string) => {
        setFormData(prev => ({
            ...prev,
            storage: { ...prev.storage, [key]: value }
        }));
    };

    const updateRunPodEndpoint = (modelId: string, endpointId: string) => {
        setFormData(prev => ({
            ...prev,
            runpod: {
                ...prev.runpod,
                endpoints: { ...prev.runpod.endpoints, [modelId]: endpointId }
            }
        }));
    };

    const updateUpscaleEndpoint = (key: keyof StudioSettings['upscale'], value: string) => {
        setFormData(prev => ({
            ...prev,
            upscale: { ...prev.upscale, [key]: value }
        }));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card w-full max-w-2xl h-[600px] rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-semibold">Settings</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-48 bg-muted/10 border-r border-border p-2 space-y-1">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            General & API Keys
                        </button>
                        <button
                            onClick={() => setActiveTab('runpod')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'runpod' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            RunPod Config
                        </button>
                        <button
                            onClick={() => setActiveTab('upscale')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'upscale' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            Upscale Endpoints
                        </button>
                        <button
                            onClick={() => setActiveTab('storage')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'storage' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            Storage (S3)
                        </button>
                        <button
                            onClick={() => setActiveTab('lora')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'lora' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            LoRA Management
                        </button>
                    </div>

                    {/* Form Area */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">External Providers</h3>
                                    <div className="space-y-2">
                                        <Label>OpenAI API Key</Label>
                                        <Input
                                            type="password"
                                            value={formData.apiKeys.openai || ''}
                                            onChange={(e) => updateApiKey('openai', e.target.value)}
                                            placeholder="sk-..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Google API Key (Gemini/Veo)</Label>
                                        <Input
                                            type="password"
                                            value={formData.apiKeys.google || ''}
                                            onChange={(e) => updateApiKey('google', e.target.value)}
                                            placeholder="AIza..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kling AI API Key</Label>
                                        <Input
                                            type="password"
                                            value={formData.apiKeys.kling || ''}
                                            onChange={(e) => updateApiKey('kling', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'runpod' && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">RunPod Configuration</h3>
                                    <div className="space-y-2">
                                        <Label>RunPod API Key</Label>
                                        <Input
                                            type="password"
                                            value={formData.apiKeys.runpod || ''}
                                            onChange={(e) => updateApiKey('runpod', e.target.value)}
                                            placeholder="rpa_..."
                                        />
                                    </div>

                                    <div className="pt-4 space-y-4 border-t border-border">
                                        <h4 className="text-sm font-medium">Endpoint Mappings</h4>
                                        <p className="text-xs text-muted-foreground">Map internal model IDs to your specific RunPod Endpoint IDs.</p>

                                        <div className="grid grid-cols-2 gap-4">
                                            {runpodModels.map((model) => (
                                                <div key={model.id} className="space-y-2">
                                                    <Label className="text-xs">{model.name} Endpoint ID</Label>
                                                    <Input
                                                        value={formData.runpod.endpoints[model.id] || ''}
                                                        onChange={(e) => updateRunPodEndpoint(model.id, e.target.value)}
                                                        placeholder={`Enter ${model.name} endpoint ID`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'upscale' && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Upscale Endpoint</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Configure RunPod endpoint for image and video upscaling. This endpoint handles all upscale types (image, video, and frame interpolation).
                                    </p>
                                    
                                    <div className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label>Upscale Endpoint ID</Label>
                                            <Input
                                                value={formData.upscale?.endpoint || ''}
                                                onChange={(e) => updateUpscaleEndpoint('endpoint', e.target.value)}
                                                placeholder="Enter upscale endpoint ID"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                RunPod endpoint that handles image upscaling, video upscaling, and frame interpolation
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'storage' && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">S3 Compatible Storage</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label>Endpoint URL</Label>
                                            <Input
                                                value={formData.storage.endpointUrl || ''}
                                                onChange={(e) => updateStorage('endpointUrl', e.target.value)}
                                                placeholder="e.g., https://s3.us-east-1.amazonaws.com"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Bucket Name</Label>
                                            <Input
                                                value={formData.storage.bucket || ''}
                                                onChange={(e) => updateStorage('bucket', e.target.value)}
                                                placeholder="e.g., my-studio-assets"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Region</Label>
                                            <Input
                                                value={formData.storage.region || ''}
                                                onChange={(e) => updateStorage('region', e.target.value)}
                                                placeholder="e.g., us-east-1"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Access Key ID</Label>
                                        <Input
                                            type="password"
                                            value={formData.storage.accessKey || ''}
                                            onChange={(e) => updateStorage('accessKey', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Secret Access Key</Label>
                                        <Input
                                            type="password"
                                            value={formData.storage.secretKey || ''}
                                            onChange={(e) => updateStorage('secretKey', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'lora' && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">LoRA Management</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Manage your LoRA models for custom styling and fine-tuning. Upload, sync, and organize LoRA files for use in image and video generation.
                                    </p>
                                    
                                    <div className="pt-4">
                                        <Button 
                                            onClick={() => setShowLoRADialog(true)}
                                            className="w-full"
                                        >
                                            Open LoRA Manager
                                        </Button>
                                    </div>

                                    <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
                                        <h4 className="text-sm font-medium mb-2">About LoRA Models</h4>
                                        <ul className="text-xs text-muted-foreground space-y-1">
                                            <li>• Upload custom LoRA models (.safetensors format)</li>
                                            <li>• Sync LoRAs from your S3 bucket</li>
                                            <li>• Organize LoRAs by high/low noise pairs</li>
                                            <li>• Use LoRAs in generation forms for custom styling</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </div>

            {/* LoRA Management Dialog */}
            <LoRAManagementDialog
                open={showLoRADialog}
                onOpenChange={setShowLoRADialog}
                onLoRAUploaded={() => {}}
                workspaceId={activeWorkspaceId || undefined}
            />
        </div>
    );
}
