'use client';

import React, { useState, useEffect } from 'react';
import { useStudio } from '@/lib/context/StudioContext';
import { getModelsByType, getModelById } from '@/lib/models/modelConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhotoIcon } from '@heroicons/react/24/outline';

export default function VideoGenerationForm() {
    const { selectedModel, setSelectedModel, settings, addJob } = useStudio();
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const videoModels = getModelsByType('video');

    // Initialize selected model if not set
    useEffect(() => {
        const isVideoModel = videoModels.some(m => m.id === selectedModel);
        if (!selectedModel || !isVideoModel) {
            if (videoModels.length > 0) {
                setSelectedModel(videoModels[0].id);
            }
        }
    }, [selectedModel, setSelectedModel, videoModels]);

    const currentModel = getModelById(selectedModel || '') || videoModels[0];

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setPreviewUrl('');
    };

    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!prompt && !imageFile) return;

        setIsGenerating(true);

        try {
            const formData = new FormData();
            formData.append('userId', 'user-with-settings'); // TODO: Get actual user ID
            formData.append('modelId', currentModel.id);
            if (prompt) formData.append('prompt', prompt);

            if (imageFile) {
                formData.append('image', imageFile);
            }

            // Collect dynamic parameters (Basic, Advanced, and Hidden)
            const form = e.target as HTMLFormElement;
            currentModel.parameters.forEach(param => {
                if (param.group === 'hidden') {
                    // Append hidden parameters directly from default values
                    if (param.default !== undefined) {
                        formData.append(param.name, param.default.toString());
                    }
                } else {
                    const input = form.elements.namedItem(param.name) as HTMLInputElement | HTMLSelectElement;
                    if (input) {
                        if (input.type === 'checkbox') {
                            formData.append(param.name, (input as HTMLInputElement).checked.toString());
                        } else {
                            formData.append(param.name, input.value);
                        }
                    }
                }
            });

            // Handle Dimensions and Duration if supported
            if (currentModel.capabilities.dimensions?.length) {
                const dimInput = form.elements.namedItem('dimensions') as HTMLSelectElement;
                if (dimInput) formData.append('dimensions', dimInput.value);
            }
            // Duration logic can be added here

            console.log('Submitting to:', currentModel.api.type, currentModel.api.endpoint);

            // Construct Headers from Settings
            const headers: Record<string, string> = {};
            if (settings.apiKeys.openai) headers['X-OpenAI-Key'] = settings.apiKeys.openai;
            if (settings.apiKeys.google) headers['X-Google-Key'] = settings.apiKeys.google;
            if (settings.apiKeys.kling) headers['X-Kling-Key'] = settings.apiKeys.kling;
            if (settings.apiKeys.runpod) headers['X-RunPod-Key'] = settings.apiKeys.runpod;

            // Add RunPod Endpoint ID if applicable
            if (currentModel.api.type === 'runpod') {
                const endpointId = settings.runpod.endpoints[currentModel.id] || currentModel.api.endpoint;
                headers['X-RunPod-Endpoint-Id'] = endpointId;
            }

            let response;
            if (currentModel.id === 'wan22') {
                response = await fetch('/api/wan22', {
                    method: 'POST',
                    headers: headers,
                    body: formData,
                });
            } else if (currentModel.api.type === 'runpod') {
                response = await fetch('/api/generate/runpod', {
                    method: 'POST',
                    headers: headers,
                    body: formData,
                });
            } else {
                response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: headers,
                    body: formData,
                });
            }

            const data = await response.json();

            if (response && response.ok && data.success) {
                console.log('Generation started successfully', data);
                setMessage({ type: 'success', text: `Generation started! Job ID: ${data.jobId}` });

                // Add job to context
                addJob({
                    id: data.jobId,
                    modelId: currentModel.id,
                    type: 'video',
                    status: 'queued',
                    prompt: prompt,
                    createdAt: Date.now(),
                    endpointId: headers['X-RunPod-Endpoint-Id']
                });
            } else {
                console.error('Generation failed', data);
                setMessage({ type: 'error', text: data.error || 'Generation failed' });
            }

        } catch (error) {
            console.error('Error submitting form:', error);
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        } finally {
            setIsGenerating(false);
        }
    };

    if (!currentModel) return <div>Loading...</div>;

    return (
        <div className="space-y-4 pb-20">
            {/* Model Selector Card */}
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Using</Label>
                <div className="bg-muted/30 border border-border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <select
                            className="w-full bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 cursor-pointer text-foreground"
                            value={selectedModel || ''}
                            onChange={(e) => setSelectedModel(e.target.value)}
                        >
                            {videoModels.map(model => (
                                <option key={model.id} value={model.id} className="bg-zinc-950 text-zinc-100">
                                    {model.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="ml-2 px-2 py-0.5 bg-muted rounded text-[10px] font-mono text-muted-foreground uppercase">
                        {currentModel.provider}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image Input (Conditional) */}
                {currentModel.inputs.includes('image') && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Image Reference</Label>
                        {previewUrl ? (
                            <div className="relative group rounded-lg overflow-hidden border border-border">
                                <img src={previewUrl} alt="Reference" className="w-full h-40 object-cover" />
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 001.5.06l.3-7.5z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div className="border border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/20 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <PhotoIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Click or drop image</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Prompt */}
                {currentModel.inputs.includes('text') && (
                    <div className="relative">
                        <textarea
                            className="w-full min-h-[120px] p-3 rounded-lg border border-border bg-secondary/50 text-sm resize-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/50"
                            placeholder="Describe your video..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>
                )}

                {/* Basic Parameters */}
                {currentModel.parameters.filter(p => p.group === 'basic').map(param => (
                    <div key={`${param.name}-${param.default}`} className="space-y-2">
                        <Label className="text-xs">{param.label}</Label>
                        {param.type === 'boolean' ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name={param.name}
                                    id={param.name}
                                    className="rounded border-border"
                                    defaultChecked={param.default}
                                />
                                <label htmlFor={param.name} className="text-xs text-muted-foreground">Enable</label>
                            </div>
                        ) : param.type === 'select' ? (
                            <select
                                name={param.name}
                                className="w-full p-2 rounded-md border border-border bg-background text-sm"
                                defaultValue={param.default}
                            >
                                {param.options?.map(opt => (
                                    <option key={opt} value={opt} className="bg-zinc-950 text-zinc-100">{opt}</option>
                                ))}
                            </select>
                        ) : param.type === 'string' ? (
                            <Input
                                type="text"
                                name={param.name}
                                defaultValue={param.default}
                                className="h-8 text-sm"
                            />
                        ) : (
                            <Input
                                type="number"
                                name={param.name}
                                defaultValue={param.default}
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                className="h-8 text-sm"
                            />
                        )}
                    </div>
                ))}

                {/* Dimensions - Always Visible */}
                {currentModel.capabilities.dimensions && currentModel.capabilities.dimensions.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-xs">Size</Label>
                        <select
                            name="dimensions"
                            className="w-full p-2 rounded-md border border-border bg-background text-sm"
                        >
                            {currentModel.capabilities.dimensions.map(dim => (
                                <option key={dim} value={dim} className="bg-zinc-950 text-zinc-100">{dim}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Advanced Settings */}
                <div className="border-t border-border pt-4">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <span>Advanced Settings</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                        >
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <div className={`space-y-4 animate-in slide-in-from-top-2 duration-200 ${showAdvanced ? '' : 'hidden'}`}>
                        {/* Duration */}
                        {currentModel.capabilities.durations && currentModel.capabilities.durations.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-xs">Duration</Label>
                                <div className="flex gap-2">
                                    {currentModel.capabilities.durations.map(dur => (
                                        <button
                                            key={dur}
                                            type="button"
                                            className="flex-1 py-1.5 px-3 rounded-md border border-border bg-background hover:bg-muted text-xs transition-colors"
                                        >
                                            {dur}s
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Advanced Parameters */}
                        {currentModel.parameters.filter(p => !p.group || p.group === 'advanced').map(param => (
                            <div key={`${param.name}-${param.default}`} className="space-y-2">
                                <Label className="text-xs">{param.label}</Label>
                                {param.type === 'boolean' ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            name={param.name}
                                            id={param.name}
                                            className="rounded border-border"
                                            defaultChecked={param.default}
                                        />
                                        <label htmlFor={param.name} className="text-xs text-muted-foreground">Enable</label>
                                    </div>
                                ) : param.type === 'select' ? (
                                    <select
                                        name={param.name}
                                        className="w-full p-2 rounded-md border border-border bg-background text-sm"
                                        defaultValue={param.default}
                                    >
                                        {param.options?.map(opt => (
                                            <option key={opt} value={opt} className="bg-zinc-950 text-zinc-100">{opt}</option>
                                        ))}
                                    </select>
                                ) : param.type === 'string' ? (
                                    <Input
                                        type="text"
                                        name={param.name}
                                        defaultValue={param.default}
                                        className="h-8 text-sm"
                                    />
                                ) : (
                                    <Input
                                        type="number"
                                        name={param.name}
                                        defaultValue={param.default}
                                        min={param.min}
                                        max={param.max}
                                        step={param.step}
                                        className="h-8 text-sm"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-2">
                    {message && (
                        <div className={`p-3 rounded-md text-sm mb-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {message.text}
                        </div>
                    )}
                    <p className="text-[10px] text-center text-muted-foreground mb-2">
                        {currentModel.provider} pricing will be shown after generation
                    </p>
                    <Button
                        type="submit"
                        disabled={isGenerating}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-2.5"
                    >
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </Button>
                </div>
            </form >
        </div >
    );
}
