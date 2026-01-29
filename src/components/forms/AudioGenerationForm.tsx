'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/context';
import { getModelsByType } from '@/lib/models/modelConfig';
import { useStudio } from '@/lib/context/StudioContext';
import { useElevenLabsVoices } from '@/hooks/useElevenLabsVoices';
import { PlayIcon, SpeakerWaveIcon, TrashIcon as TrashIcon2 } from '@heroicons/react/24/outline';
import VoiceDialog from '@/components/voice/VoiceDialog';

export default function AudioGenerationForm() {
    const { t } = useI18n();
    const { settings, addJob, addCompletedJob, activeWorkspaceId, updateSettings } = useStudio();
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('elevenlabs-tts');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);

    const ttsModels = getModelsByType('tts');
    // Initialize with saved voice ID from settings
    const [selectedVoice, setSelectedVoice] = useState(settings.elevenlabs?.voiceId || '');
    const { voices, isLoading, fetchVoiceSamples, playSample } = useElevenLabsVoices();

    // Update local state if settings change externally (e.g. initial load)
    React.useEffect(() => {
        if (settings.elevenlabs?.voiceId) {
            setSelectedVoice(settings.elevenlabs.voiceId);
        }
    }, [settings.elevenlabs?.voiceId]);

    // Listen for reuseJobInput event
    React.useEffect(() => {
        const handleReuseJobInput = (event: CustomEvent) => {
            const { modelId, prompt, type, options } = event.detail;

            // Only handle tts/audio types
            if (type !== 'tts' && type !== 'audio') return;

            // Check if it's a TTS model (some audio jobs might be music or others)
            const isTtsModel = ttsModels.some(m => m.id === modelId);
            if (!isTtsModel && modelId !== 'elevenlabs-tts') return; // Specific check for ElevenLabs TTS

            console.log('🔄 Reusing TTS job input:', { modelId, prompt, options });

            // Set model
            if (modelId) {
                const modelExists = ttsModels.find(m => m.id === modelId);
                if (modelExists) {
                    setSelectedModel(modelId);
                }
            }

            // Set prompt
            if (prompt) {
                setPrompt(prompt);
            }

            // Set specific options
            if (options) {
                // Restore Voice ID for ElevenLabs TTS
                if (options.voiceId) {
                    setSelectedVoice(options.voiceId);
                }
            }
        };

        window.addEventListener('reuseJobInput' as any, handleReuseJobInput as any);
        return () => {
            window.removeEventListener('reuseJobInput' as any, handleReuseJobInput as any);
        };
    }, [ttsModels]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            alert(t('audioGeneration.errors.promptRequired'));
            return;
        }

        const model = ttsModels.find(m => m.id === selectedModel);
        if (!model) {
            alert(t('audioGeneration.errors.invalidModel'));
            return;
        }

        if (model.provider === 'Eleven Labs' && !settings.apiKeys?.elevenlabs) {
            alert(t('audioGeneration.errors.apiKeyRequired'));
            return;
        }

        if (model.provider === 'Eleven Labs' && !selectedVoice) {
            alert(t('audioGeneration.errors.voiceRequired'));
            return;
        }

        setIsGenerating(true);
        try {
            const formData = new FormData();
            formData.append('userId', 'user-with-settings');
            formData.append('modelId', model.id);
            formData.append('prompt', prompt.trim());

            if (activeWorkspaceId) {
                formData.append('workspaceId', activeWorkspaceId);
            }

            if (model.provider === 'Eleven Labs') {
                formData.append('voiceId', selectedVoice);
                formData.append('modelId', 'eleven_multilingual_v2');
                formData.append('stability', '0.8');
                formData.append('similarity', '0.8');
                formData.append('style', '0.0');
            }

            const headers: Record<string, string> = {};
            if (settings.apiKeys.elevenlabs) headers['X-ElevenLabs-Key'] = settings.apiKeys.elevenlabs;
            if (settings.apiKeys.openai) headers['X-OpenAI-Key'] = settings.apiKeys.openai;
            if (settings.apiKeys.google) headers['X-Google-Key'] = settings.apiKeys.google;
            if (settings.apiKeys.kling) headers['X-Kling-Key'] = settings.apiKeys.kling;
            if (settings.apiKeys.runpod) headers['X-RunPod-Key'] = settings.apiKeys.runpod;

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: headers,
                body: formData,
            });

            const data = await response.json();

            if (response && response.ok && data.success) {
                console.log('Generation started successfully', data);

                // Handle based on API type
                if (model.api.type === 'runpod') {
                    // RunPod is async, so always queue
                    addJob({
                        id: data.jobId,
                        modelId: model.id,
                        type: 'audio',
                        status: 'queued',
                        prompt: prompt,
                        createdAt: Date.now(),
                        endpointId: headers['X-RunPod-Endpoint-Id']
                    });
                } else {
                    // External APIs (ElevenLabs, etc) are usually synchronous
                    if (data.audioUrl) {
                        addCompletedJob({
                            id: data.jobId,
                            modelId: model.id,
                            type: 'audio',
                            status: 'completed',
                            prompt: prompt,
                            createdAt: Date.now(),
                            endpointId: headers['X-RunPod-Endpoint-Id'],
                            resultUrl: data.audioUrl
                        });
                    } else {
                        console.error('External API succeeded but returned no audioUrl:', data);
                        alert(t('audioGeneration.errors.generationFailed') + ' (No output URL)');
                        // Do NOT fallback to addJob('queued') here, as that overwrites the DB status
                        // and causes infinite polling for a job that the server thinks is done.
                    }
                }
            } else {
                console.error('Generation failed', data);
                alert(data.error || t('audioGeneration.errors.generationFailed'));
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert(t('audioGeneration.errors.unexpected'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleVoiceDialogClose = () => {
        setIsVoiceDialogOpen(false);
    };

    const handleVoiceSelect = (voiceId: string) => {
        console.log('🎤 Voice selected:', voiceId);
        setSelectedVoice(voiceId);

        // Save selected voice to settings
        updateSettings({
            elevenlabs: {
                ...settings.elevenlabs,
                voiceId: voiceId
            }
        });

        setIsVoiceDialogOpen(false);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">{t('audioGeneration.voiceModel')}</label>
                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    {ttsModels.map((model) => (
                        <option key={model.id} value={model.id}>
                            {model.name} ({model.provider})
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">{t('audioGeneration.textToSpeech')}</label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('audioGeneration.textPlaceholder')}
                    rows={4}
                    className="w-full p-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            {selectedModel === 'elevenlabs-tts' && (
                <div className="space-y-2">
                    <label className="text-sm font-medium">{t('audioGeneration.voice')}</label>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsVoiceDialogOpen(true)}
                            className="w-full justify-start text-left font-normal"
                        >
                            <SpeakerWaveIcon className="w-4 h-4 mr-2" />
                            {selectedVoice
                                ? (voices.find(v => v.voice_id === selectedVoice)?.name || t('audioGeneration.unknownVoice'))
                                : t('audioGeneration.selectVoice')}
                        </Button>
                    </div>
                </div>
            )}

            <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || (selectedModel === 'elevenlabs-tts' && (!settings.apiKeys?.elevenlabs || !selectedVoice))}
                className="w-full"
            >
                <PlayIcon className="w-4 h-4 mr-2" />
                {isGenerating ? t('audioGeneration.generating') : t('audioGeneration.generateBtn')}
            </Button>

            <VoiceDialog
                isOpen={isVoiceDialogOpen}
                onClose={handleVoiceDialogClose}
                onVoiceSelect={handleVoiceSelect}
                initialVoiceId={selectedVoice}
            />

            {!settings.apiKeys?.elevenlabs && (
                <div className="p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg text-sm text-yellow-200">
                    {t('audioGeneration.configureApiKey')}
                </div>
            )}
        </div>
    );
}
