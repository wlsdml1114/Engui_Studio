'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStudio } from '@/lib/context/StudioContext';
import { getModelsByType, getModelById } from '@/lib/models/modelConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhotoIcon } from '@heroicons/react/24/outline';

export default function ImageGenerationForm() {
    const { selectedModel, setSelectedModel, settings, addJob, activeWorkspaceId } = useStudio();
    const [prompt, setPrompt] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const imageModels = getModelsByType('image');

    // Initialize selected model if not set or if it's not an image model
    useEffect(() => {
        const isImageModel = imageModels.some(m => m.id === selectedModel);
        if (!selectedModel || !isImageModel) {
            if (imageModels.length > 0) {
                setSelectedModel(imageModels[0].id);
            }
        }
    }, [selectedModel, setSelectedModel, imageModels]);

    // 모델이 변경될 때 이미지 파일 초기화
    useEffect(() => {
        setImageFile(null);
        setPreviewUrl('');
    }, [selectedModel]);

    const currentModel = getModelById(selectedModel || '') || imageModels[0];

    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            
            // 이미지 로드 후 width와 height 자동 설정
            const img = new Image();
            img.onload = () => {
                // width와 height 입력 필드를 찾아서 값 설정
                const form = document.querySelector('form');
                if (form) {
                    const widthInput = form.elements.namedItem('width') as HTMLInputElement;
                    const heightInput = form.elements.namedItem('height') as HTMLInputElement;
                    if (widthInput) widthInput.value = img.width.toString();
                    if (heightInput) heightInput.value = img.height.toString();
                }
                console.log('✅ 이미지 크기 자동 설정:', img.width, 'x', img.height);
            };
            img.src = url;
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            const data = e.dataTransfer.getData('application/json');
            if (data) {
                const mediaData = JSON.parse(data);
                if (mediaData.type === 'image' && mediaData.url) {
                    // Fetch the image from workspace and convert to File
                    const response = await fetch(mediaData.url);
                    const blob = await response.blob();
                    const file = new File([blob], `workspace-${mediaData.id}.png`, { type: 'image/png' });
                    
                    setImageFile(file);
                    setPreviewUrl(mediaData.url);
                    
                    // Auto-set dimensions
                    const img = new Image();
                    img.onload = () => {
                        const form = document.querySelector('form');
                        if (form) {
                            const widthInput = form.elements.namedItem('width') as HTMLInputElement;
                            const heightInput = form.elements.namedItem('height') as HTMLInputElement;
                            if (widthInput) widthInput.value = img.width.toString();
                            if (heightInput) heightInput.value = img.height.toString();
                        }
                    };
                    img.src = mediaData.url;
                }
            }
        } catch (error) {
            console.error('Error handling drop:', error);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!prompt) return;

        // 모델이 이미지 입력을 요구하는 경우 이미지 필수 체크
        if (currentModel.inputs.includes('image') && !imageFile) {
            setMessage({ type: 'error', text: 'Please upload an image for this model' });
            return;
        }

        setIsGenerating(true);

        try {
            const formData = new FormData();
            formData.append('userId', 'user-with-settings');
            formData.append('modelId', currentModel.id);
            formData.append('prompt', prompt);

            // 모델이 이미지 입력을 받는 경우 이미지를 base64로 인코딩하여 추가
            if (currentModel.inputs.includes('image') && imageFile) {
                const imageBase64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const result = reader.result as string;
                        const base64String = result.split(',')[1];
                        resolve(base64String);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(imageFile);
                });
                // Use model-specific image input key (default: 'image')
                const imageKey = currentModel.imageInputKey || 'image';
                formData.append(imageKey, imageBase64);
                formData.append('imageName', imageFile.name);
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

            // Handle Dimensions
            if (currentModel.capabilities.dimensions?.length) {
                const dimInput = form.elements.namedItem('dimensions') as HTMLSelectElement;
                if (dimInput) formData.append('dimensions', dimInput.value);
            }

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
            if (currentModel.api.type === 'runpod') {
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
                // Success - job added to queue, no need to show message

                // Add job to context
                addJob({
                    id: data.jobId,
                    modelId: currentModel.id,
                    type: 'image',
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
                            {imageModels.map(model => (
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
                {/* Image Upload - 모델이 이미지 입력을 받는 경우 표시 */}
                {currentModel.inputs.includes('image') && (
                    <div className="space-y-2">
                        <Label className="text-xs">Input Image</Label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                        <div
                            className="w-full p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            {previewUrl ? (
                                <div className="space-y-2">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="max-w-full max-h-48 mx-auto rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewUrl('');
                                            setImageFile(null);
                                        }}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <PhotoIcon className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-xs">Click to upload image</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Prompt */}
                <div className="relative">
                    <textarea
                        className="w-full min-h-[120px] p-3 rounded-lg border border-border bg-secondary/50 text-sm resize-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/50"
                        placeholder="Describe your image..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                </div>

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
                        <Label className="text-xs">Resolution</Label>
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
