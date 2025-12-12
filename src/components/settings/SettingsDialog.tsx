'use client';

import React, { useState } from 'react';
import { useStudio, StudioSettings, VideoProject } from '@/lib/context/StudioContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Download, Upload } from 'lucide-react';
import { MODELS } from '@/lib/models/modelConfig';
import { LoRAManagementDialog } from '@/components/lora/LoRAManagementDialog';
import { downloadProjectAsJSON, parseProjectFile } from '@/lib/videoProjectIO';
import { AspectRatio, QualityPreset, getResolutionConfig } from '@/lib/resolutionConfig';
import { useToast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n/context';
import { LanguageIcon } from '@heroicons/react/24/outline';

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

type SettingsTab = 'video-project' | 'general' | 'runpod' | 'storage' | 'lora';

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
    const { 
        settings, 
        updateSettings, 
        activeWorkspaceId,
        currentProject,
        tracks,
        keyframes,
        updateProject,
        createProject,
        addTrack,
        addKeyframe,
    } = useStudio();
    const { showToast } = useToast();
    const { t, language, setLanguage } = useI18n();
    const [activeTab, setActiveTab] = useState<SettingsTab>('video-project');
    const [formData, setFormData] = useState<StudioSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [showLoRADialog, setShowLoRADialog] = useState(false);
    
    // Video project settings state
    const [projectTitle, setProjectTitle] = useState(currentProject?.title || '');
    const [projectDescription, setProjectDescription] = useState(currentProject?.description || '');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>((currentProject?.aspectRatio as AspectRatio) || '16:9');
    const [qualityPreset, setQualityPreset] = useState<QualityPreset>('720p');
    
    // modelConfig에서 RunPod 모델들을 가져오기
    const runpodModels = MODELS.filter(model => model.api.type === 'runpod');

    // Sync form data when settings change or dialog opens
    React.useEffect(() => {
        if (isOpen) {
            setFormData(settings);
            if (currentProject) {
                setProjectTitle(currentProject.title);
                setProjectDescription(currentProject.description || '');
                setAspectRatio((currentProject.aspectRatio as AspectRatio) || '16:9');
                // Infer quality preset from dimensions
                const shortSide = currentProject.aspectRatio === '16:9' 
                    ? (currentProject as any).height || 720
                    : (currentProject as any).width || 720;
                if (shortSide <= 480) setQualityPreset('480p');
                else if (shortSide <= 720) setQualityPreset('720p');
                else setQualityPreset('1080p');
            }
        }
    }, [isOpen, settings, currentProject]);
    
    const resolutionConfig = getResolutionConfig(aspectRatio, qualityPreset);
    
    // Handle export project as JSON
    const handleExportJSON = () => {
        if (currentProject) {
            downloadProjectAsJSON(currentProject, tracks, keyframes);
            showToast(t('settingsDialog.videoProject.projectSaved'), 'success');
        }
    };

    // Handle import project from JSON
    const handleImportJSON = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            
            try {
                const data = await parseProjectFile(file);
                
                // Create new project with imported data
                const projectId = await createProject({
                    title: data.project.title,
                    description: data.project.description,
                    aspectRatio: data.project.aspectRatio,
                    qualityPreset: data.project.qualityPreset,
                    width: data.project.width,
                    height: data.project.height,
                    duration: data.project.duration,
                }, { skipDefaultTracks: true });
                
                // Add imported tracks and keyframes
                for (const track of data.tracks) {
                    const newTrackId = await addTrack({
                        projectId,
                        type: track.type,
                        label: track.label,
                        locked: track.locked,
                        order: track.order,
                        volume: track.volume,
                        muted: track.muted,
                    });
                    
                    const trackKeyframes = data.keyframes[track.id] || [];
                    for (const kf of trackKeyframes) {
                        await addKeyframe({
                            trackId: newTrackId,
                            timestamp: kf.timestamp,
                            duration: kf.duration,
                            data: kf.data,
                        });
                    }
                }
                
                showToast(t('settingsDialog.videoProject.projectImported'), 'success');
                onClose();
            } catch (error) {
                showToast(t('settingsDialog.videoProject.importFailed', { error: error instanceof Error ? error.message : 'Unknown error' }), 'error');
            }
        };
        
        input.click();
    };
    
    // Save project settings
    const handleSaveProjectSettings = async () => {
        if (!currentProject) return;
        
        const updates: Partial<VideoProject> = {
            title: projectTitle.trim() || `Project ${new Date().toLocaleDateString()}`,
            description: projectDescription.trim(),
            aspectRatio,
            width: resolutionConfig.width,
            height: resolutionConfig.height,
            qualityPreset,
        };
        
        try {
            await updateProject(currentProject.id, updates);
            showToast(t('settingsDialog.videoProject.settingsApplied'), 'success');
        } catch (error) {
            showToast(t('settingsDialog.videoProject.settingsFailed'), 'error');
        }
    };

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



    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-zinc-900 w-full max-w-2xl h-[600px] rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-semibold">{t('settingsDialog.title')}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-48 bg-muted/10 border-r border-border p-2 space-y-1">
                        <button
                            onClick={() => setActiveTab('video-project')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'video-project' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            {t('settingsDialog.tabs.videoProject')}
                        </button>
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            {t('settingsDialog.tabs.general')}
                        </button>
                        <button
                            onClick={() => setActiveTab('runpod')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'runpod' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            {t('settingsDialog.tabs.runpod')}
                        </button>
                        <button
                            onClick={() => setActiveTab('storage')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'storage' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            {t('settingsDialog.tabs.storage')}
                        </button>
                        <button
                            onClick={() => setActiveTab('lora')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'lora' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            {t('settingsDialog.tabs.lora')}
                        </button>
                    </div>

                    {/* Form Area */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeTab === 'video-project' && (
                            <div className="space-y-6">
                                {/* Save/Load Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('settingsDialog.videoProject.saveLoadSection')}</h3>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={handleExportJSON}
                                            disabled={!currentProject}
                                            className="flex-1 gap-2"
                                        >
                                            <Download className="h-4 w-4" />
                                            {t('settingsDialog.videoProject.saveProject')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={handleImportJSON}
                                            className="flex-1 gap-2"
                                        >
                                            <Upload className="h-4 w-4" />
                                            {t('settingsDialog.videoProject.loadProject')}
                                        </Button>
                                    </div>
                                </div>

                                {currentProject && (
                                    <>
                                        {/* Project Info */}
                                        <div className="space-y-4 border-t pt-4">
                                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('settingsDialog.videoProject.projectInfo')}</h3>
                                            <div className="space-y-2">
                                                <Label>{t('settingsDialog.videoProject.projectName')}</Label>
                                                <Input
                                                    value={projectTitle}
                                                    onChange={(e) => setProjectTitle(e.target.value)}
                                                    placeholder={t('settingsDialog.videoProject.projectNamePlaceholder')}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('settingsDialog.videoProject.description')}</Label>
                                                <Input
                                                    value={projectDescription}
                                                    onChange={(e) => setProjectDescription(e.target.value)}
                                                    placeholder={t('settingsDialog.videoProject.descriptionPlaceholder')}
                                                />
                                            </div>
                                        </div>

                                        {/* Resolution Settings */}
                                        <div className="space-y-4 border-t pt-4">
                                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('settingsDialog.videoProject.resolutionSettings')}</h3>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>{t('settingsDialog.videoProject.aspectRatio')}</Label>
                                                    <div className="flex gap-2 mt-2">
                                                        <Button
                                                            type="button"
                                                            variant={aspectRatio === '16:9' ? 'default' : 'outline'}
                                                            onClick={() => setAspectRatio('16:9')}
                                                            className="flex-1"
                                                            size="sm"
                                                        >
                                                            16:9
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant={aspectRatio === '9:16' ? 'default' : 'outline'}
                                                            onClick={() => setAspectRatio('9:16')}
                                                            className="flex-1"
                                                            size="sm"
                                                        >
                                                            9:16
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <Label>{t('settingsDialog.videoProject.quality')}</Label>
                                                    <div className="flex gap-2 mt-2">
                                                        <Button
                                                            type="button"
                                                            variant={qualityPreset === '480p' ? 'default' : 'outline'}
                                                            onClick={() => setQualityPreset('480p')}
                                                            className="flex-1"
                                                            size="sm"
                                                        >
                                                            480p
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant={qualityPreset === '720p' ? 'default' : 'outline'}
                                                            onClick={() => setQualityPreset('720p')}
                                                            className="flex-1"
                                                            size="sm"
                                                        >
                                                            720p
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant={qualityPreset === '1080p' ? 'default' : 'outline'}
                                                            onClick={() => setQualityPreset('1080p')}
                                                            className="flex-1"
                                                            size="sm"
                                                        >
                                                            1080p
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-muted rounded-md">
                                                <div className="text-sm font-medium">{t('settingsDialog.videoProject.outputResolution')}</div>
                                                <div className="text-xl font-bold">
                                                    {resolutionConfig.width} × {resolutionConfig.height}
                                                </div>
                                            </div>
                                            
                                            <Button onClick={handleSaveProjectSettings} className="w-full">
                                                {t('settingsDialog.videoProject.applySettings')}
                                            </Button>
                                        </div>
                                    </>
                                )}

                                {!currentProject && (
                                    <div className="text-center text-muted-foreground py-8">
                                        {t('settingsDialog.videoProject.noProject')}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                {/* Language Selection */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <LanguageIcon className="w-5 h-5 text-primary" />
                                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('language.selectLanguage')}</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={language === 'ko' ? 'default' : 'outline'}
                                            onClick={() => setLanguage('ko')}
                                            className="flex-1"
                                        >
                                            {t('language.korean')}
                                        </Button>
                                        <Button
                                            variant={language === 'en' ? 'default' : 'outline'}
                                            onClick={() => setLanguage('en')}
                                            className="flex-1"
                                        >
                                            {t('language.english')}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4 border-t pt-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('settingsDialog.general.externalProviders')}</h3>
                                        <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-500 rounded">{t('settingsDialog.general.comingSoon')}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {t('settingsDialog.general.comingSoonDesc')}
                                    </p>
                                    <div className="space-y-2 opacity-50 pointer-events-none">
                                        <Label>{t('settingsDialog.general.openaiApiKey')}</Label>
                                        <Input
                                            type="password"
                                            value={formData.apiKeys.openai || ''}
                                            onChange={(e) => updateApiKey('openai', e.target.value)}
                                            placeholder="sk-..."
                                            disabled
                                        />
                                    </div>
                                    <div className="space-y-2 opacity-50 pointer-events-none">
                                        <Label>{t('settingsDialog.general.googleApiKey')}</Label>
                                        <Input
                                            type="password"
                                            value={formData.apiKeys.google || ''}
                                            onChange={(e) => updateApiKey('google', e.target.value)}
                                            placeholder="AIza..."
                                            disabled
                                        />
                                    </div>
                                    <div className="space-y-2 opacity-50 pointer-events-none">
                                        <Label>{t('settingsDialog.general.klingApiKey')}</Label>
                                        <Input
                                            type="password"
                                            value={formData.apiKeys.kling || ''}
                                            onChange={(e) => updateApiKey('kling', e.target.value)}
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'runpod' && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('settingsDialog.runpod.title')}</h3>
                                    <div className="space-y-2">
                                        <Label>{t('settingsDialog.runpod.apiKey')}</Label>
                                        <Input
                                            type="password"
                                            value={formData.apiKeys.runpod || ''}
                                            onChange={(e) => updateApiKey('runpod', e.target.value)}
                                            placeholder={t('settingsDialog.runpod.apiKeyPlaceholder')}
                                        />
                                    </div>

                                    <div className="pt-4 space-y-4 border-t border-border">
                                        <h4 className="text-sm font-medium">{t('settingsDialog.runpod.endpointMappings')}</h4>
                                        <p className="text-xs text-muted-foreground">{t('settingsDialog.runpod.endpointMappingsDesc')}</p>

                                        <div className="grid grid-cols-2 gap-4">
                                            {runpodModels.map((model) => (
                                                <div key={model.id} className="space-y-2">
                                                    <Label className="text-xs">{model.name} Endpoint ID</Label>
                                                    <Input
                                                        value={formData.runpod.endpoints[model.id] || ''}
                                                        onChange={(e) => updateRunPodEndpoint(model.id, e.target.value)}
                                                        placeholder={t('settingsDialog.runpod.endpointPlaceholder', { name: model.name })}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}



                        {activeTab === 'storage' && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('settingsDialog.storage.title')}</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label>{t('settingsDialog.storage.endpointUrl')}</Label>
                                            <Input
                                                value={formData.storage.endpointUrl || ''}
                                                onChange={(e) => updateStorage('endpointUrl', e.target.value)}
                                                placeholder={t('settingsDialog.storage.endpointUrlPlaceholder')}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('settingsDialog.storage.bucketName')}</Label>
                                            <Input
                                                value={formData.storage.bucket || ''}
                                                onChange={(e) => updateStorage('bucket', e.target.value)}
                                                placeholder={t('settingsDialog.storage.bucketNamePlaceholder')}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('settingsDialog.storage.region')}</Label>
                                            <Input
                                                value={formData.storage.region || ''}
                                                onChange={(e) => updateStorage('region', e.target.value)}
                                                placeholder={t('settingsDialog.storage.regionPlaceholder')}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('settingsDialog.storage.accessKeyId')}</Label>
                                        <Input
                                            type="password"
                                            value={formData.storage.accessKey || ''}
                                            onChange={(e) => updateStorage('accessKey', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('settingsDialog.storage.secretAccessKey')}</Label>
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
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('settingsDialog.lora.title')}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t('settingsDialog.lora.description')}
                                    </p>
                                    
                                    <div className="pt-4">
                                        <Button 
                                            onClick={() => setShowLoRADialog(true)}
                                            className="w-full"
                                        >
                                            {t('settingsDialog.lora.openManager')}
                                        </Button>
                                    </div>

                                    <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
                                        <h4 className="text-sm font-medium mb-2">{t('settingsDialog.lora.aboutTitle')}</h4>
                                        <ul className="text-xs text-muted-foreground space-y-1">
                                            <li>• {t('settingsDialog.lora.aboutItems.upload')}</li>
                                            <li>• {t('settingsDialog.lora.aboutItems.sync')}</li>
                                            <li>• {t('settingsDialog.lora.aboutItems.organize')}</li>
                                            <li>• {t('settingsDialog.lora.aboutItems.use')}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>{t('settingsDialog.footer.cancel')}</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? t('settingsDialog.footer.saving') : t('settingsDialog.footer.save')}
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
