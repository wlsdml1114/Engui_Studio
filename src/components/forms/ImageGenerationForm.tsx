'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStudio } from '@/lib/context/StudioContext';
import { getModelsByType, getModelById, isInputVisible } from '@/lib/models/modelConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { loadFileFromPath } from '@/lib/fileUtils';
import { useI18n } from '@/lib/i18n/context';

export default function ImageGenerationForm() {
    const { t } = useI18n();
    const { selectedModel, setSelectedModel, settings, addJob, activeWorkspaceId } = useStudio();
    const [prompt, setPrompt] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [parameterValues, setParameterValues] = useState<Record<string, any>>({});
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);
    const [showReuseSuccess, setShowReuseSuccess] = useState(false);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

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

    const currentModel = getModelById(selectedModel || '') || imageModels[0];

    // Initialize parameter values with defaults when model changes
    useEffect(() => {
        if (currentModel) {
            const initialValues: Record<string, any> = {};
            currentModel.parameters.forEach(param => {
                if (param.default !== undefined) {
                    initialValues[param.name] = param.default;
                }
            });
            setParameterValues(initialValues);
        }
    }, [selectedModel]);

    // 모델이 변경될 때 이미지 파일 초기화
    useEffect(() => {
        setImageFile(null);
        setPreviewUrl('');
    }, [selectedModel]);

    // Handle reuse job input event
    useEffect(() => {
        const handleReuseInput = async (event: CustomEvent) => {
            const { modelId, prompt: jobPrompt, options, type, imageInputPath } = event.detail;
            
            // Only handle if it's an image job
            if (type !== 'image') return;

            console.log('🔄 Reusing image input:', { modelId, prompt: jobPrompt, options, imageInputPath });

            try {
                setIsLoadingMedia(true);

                // Switch to correct model if different from current
                if (modelId && modelId !== selectedModel) {
                    setSelectedModel(modelId);
                }

                // Set prompt
                if (jobPrompt) {
                    setPrompt(jobPrompt);
                }

                // Parse options safely
                const parsedOptions = typeof options === 'string' ? JSON.parse(options) : (options || {});

                // Load image file from path if exists
                const imagePath = imageInputPath || parsedOptions.image_path;
                if (imagePath) {
                    console.log('📥 Loading image from path:', imagePath);
                    const file = await loadFileFromPath(imagePath);
                    if (file) {
                        setImageFile(file);
                        setPreviewUrl(imagePath);
                        console.log('✅ Image file loaded successfully');
                    } else {
                        console.warn('⚠️ Failed to load image file');
                    }
                }

                // Apply parameter values in parent-first order
                // First, collect all parameter values from options
                const allParamValues: Record<string, any> = {};
                Object.keys(parsedOptions).forEach(key => {
                    // Skip internal fields and file paths
                    if (!key.includes('_path') && key !== 'runpodJobId' && key !== 'error') {
                        allParamValues[key] = parsedOptions[key];
                    }
                });

                // Get model configuration to identify dependencies
                const model = getModelById(modelId);
                if (model) {
                    // Separate parameters into parent and dependent
                    const parentParams: string[] = [];
                    const dependentParams: Array<{ name: string; dependsOn: string }> = [];
                    
                    model.parameters.forEach(param => {
                        if (param.dependsOn) {
                            dependentParams.push({ 
                                name: param.name, 
                                dependsOn: param.dependsOn.parameter 
                            });
                        } else if (allParamValues[param.name] !== undefined) {
                            parentParams.push(param.name);
                        }
                    });

                    // Apply parent parameters first
                    const parentValues: Record<string, any> = {};
                    parentParams.forEach(paramName => {
                        parentValues[paramName] = allParamValues[paramName];
                    });
                    setParameterValues(prev => ({ ...prev, ...parentValues }));

                    // Wait for parent parameters to be applied (next render cycle)
                    await new Promise(resolve => setTimeout(resolve, 0));

                    // Then apply dependent parameters (only if their conditions are met)
                    const dependentValues: Record<string, any> = {};
                    dependentParams.forEach(({ name, dependsOn }) => {
                        if (allParamValues[name] !== undefined) {
                            // Find the parameter configuration
                            const paramConfig = model.parameters.find(p => p.name === name);
                            if (paramConfig && paramConfig.dependsOn) {
                                // Check if the dependency condition is met
                                const parentValue = parentValues[dependsOn] ?? allParamValues[dependsOn];
                                if (parentValue === paramConfig.dependsOn.value) {
                                    // Condition met, populate the value
                                    dependentValues[name] = allParamValues[name];
                                }
                                // If condition not met, skip this parameter (Requirement 5.5)
                            }
                        }
                    });
                    setParameterValues(prev => ({ ...prev, ...dependentValues }));
                } else {
                    // Fallback: apply all at once if model not found
                    setParameterValues(prev => ({ ...prev, ...allParamValues }));
                }

                console.log('✅ Applied all input values from job in parent-first order');

                // Show success feedback
                setShowReuseSuccess(true);
                setTimeout(() => setShowReuseSuccess(false), 3000);

                // Focus the form for user review
                setTimeout(() => {
                    if (formRef.current && typeof formRef.current.scrollIntoView === 'function') {
                        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);

            } catch (error) {
                console.error('Error handling reuse input:', error);
            } finally {
                setIsLoadingMedia(false);
            }
        };

        window.addEventListener('reuseJobInput', handleReuseInput as any);
        return () => window.removeEventListener('reuseJobInput', handleReuseInput as any);
    }, [setSelectedModel, selectedModel]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Handler for parameter changes
    const handleParameterChange = (paramName: string, value: any) => {
        setParameterValues(prev => ({
            ...prev,
            [paramName]: value
        }));
    };

    // Check if a parameter should be visible based on dependsOn
    const isParameterVisible = (param: any) => {
        if (!param.dependsOn) return true;
        const dependentValue = parameterValues[param.dependsOn.parameter];
        return dependentValue === param.dependsOn.value;
    };

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
        // Only require prompt if model accepts text input
        if (currentModel.inputs.includes('text') && !prompt) return;

        // 모델이 이미지 입력을 요구하는 경우 이미지 필수 체크 (conditionalInputs 기반)
        const imageRequired = isInputVisible(currentModel, 'image', parameterValues);
        if (imageRequired && !imageFile) {
            setMessage({ type: 'error', text: 'Please upload an image for this model' });
            return;
        }

        setIsGenerating(true);

        try {
            const formData = new FormData();
            formData.append('userId', 'user-with-settings');
            formData.append('modelId', currentModel.id);
            formData.append('prompt', prompt);
            
            // Add workspace ID
            if (activeWorkspaceId) {
                formData.append('workspaceId', activeWorkspaceId);
            }

            // 모델이 이미지 입력을 받는 경우 File 객체를 직접 추가 (conditionalInputs 기반)
            if (imageRequired && imageFile) {
                // Always append as 'image' field - server will handle the key mapping
                formData.append('image', imageFile);
                console.log('📤 Appending image file:', imageFile.name, imageFile.size, 'bytes');
            }

            // Collect dynamic parameters from state
            // Use parameterValues state to ensure ALL parameters are included,
            // including conditional ones that may not be currently visible
            currentModel.parameters.forEach(param => {
                const value = parameterValues[param.name] ?? param.default;
                if (value !== undefined && value !== null) {
                    formData.append(param.name, value.toString());
                }
            });

            // Handle Dimensions
            if (currentModel.capabilities.dimensions?.length) {
                const form = e.target as HTMLFormElement;
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

            // Use unified API route for all models
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: headers,
                body: formData,
            });

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

    if (!currentModel) return <div>{t('generationForm.loading')}</div>;

    return (
        <div ref={formRef} className="space-y-4 pb-20">
            {/* Success Toast */}
            {showReuseSuccess && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">{t('generationForm.inputReusedSuccess')}</span>
                    </div>
                </div>
            )}
            
            {/* Model Selector Card */}
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('generationForm.using')}</Label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="w-full bg-muted/30 border border-border hover:border-primary/50 rounded-lg px-3 py-2.5 flex items-center justify-between transition-all duration-200"
                    >
                        <span className="text-sm font-semibold text-foreground">{currentModel.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono text-muted-foreground uppercase">{currentModel.provider}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`}>
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </button>
                    
                    {isModelDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsModelDropdownOpen(false)} />
                            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-zinc-900 border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="py-1 max-h-64 overflow-y-auto">
                                    {imageModels.map(model => (
                                        <button
                                            key={model.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedModel(model.id);
                                                setIsModelDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2 transition-colors ${
                                                selectedModel === model.id 
                                                    ? 'bg-primary/15 text-foreground' 
                                                    : 'hover:bg-muted/50 text-foreground/80'
                                            }`}
                                        >
                                            <span className="text-sm font-medium">{model.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px] font-mono text-muted-foreground uppercase">{model.provider}</span>
                                                {selectedModel === model.id && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-primary">
                                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image Upload - conditionalInputs 기반으로 표시 */}
                {isInputVisible(currentModel, 'image', parameterValues) && (
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
                            onClick={() => !isLoadingMedia && fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            {isLoadingMedia ? (
                                <div className="text-center text-muted-foreground">
                                    <div className="w-8 h-8 mx-auto mb-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    <p className="text-xs">Loading media file...</p>
                                </div>
                            ) : previewUrl ? (
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

                {/* Prompt - only show if model accepts text input */}
                {currentModel.inputs.includes('text') && (
                    <div className="relative">
                        <textarea
                            className="w-full min-h-[120px] p-3 rounded-lg border border-border bg-secondary/50 text-sm resize-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/50"
                            placeholder={t('generationForm.describeYourImage')}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>
                )}

                {/* Basic Parameters */}
                {currentModel.parameters.filter(p => p.group === 'basic' && isParameterVisible(p)).map(param => (
                    <div key={`${param.name}-${param.default}`} className="space-y-2">
                        {param.type !== 'boolean' && <Label className="text-xs">{param.label}</Label>}
                        {param.type === 'boolean' ? (
                            <div 
                                className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                                onClick={() => handleParameterChange(param.name, !(parameterValues[param.name] ?? param.default))}
                            >
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-medium text-foreground">{param.label}</span>
                                    {param.description && (
                                        <span className="text-xs text-muted-foreground">{param.description}</span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={parameterValues[param.name] ?? param.default}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                                        (parameterValues[param.name] ?? param.default) ? 'bg-primary' : 'bg-muted'
                                    }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleParameterChange(param.name, !(parameterValues[param.name] ?? param.default));
                                    }}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                            (parameterValues[param.name] ?? param.default) ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        ) : param.type === 'select' ? (
                            <select
                                name={param.name}
                                className="w-full p-2 rounded-md border border-border bg-background text-sm"
                                value={parameterValues[param.name] ?? param.default}
                                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                            >
                                {param.options?.map(opt => (
                                    <option key={opt} value={opt} className="bg-zinc-950 text-zinc-100">{opt}</option>
                                ))}
                            </select>
                        ) : param.type === 'string' ? (
                            <Input
                                type="text"
                                name={param.name}
                                value={parameterValues[param.name] ?? param.default}
                                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                                className="h-8 text-sm"
                            />
                        ) : (
                            <Input
                                type="number"
                                name={param.name}
                                value={parameterValues[param.name] ?? param.default}
                                onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
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
                        <span>{t('generationForm.advancedSettings')}</span>
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
                        {currentModel.parameters.filter(p => (!p.group || p.group === 'advanced') && isParameterVisible(p)).map(param => (
                            <div key={`${param.name}-${param.default}`} className="space-y-2">
                                {param.type !== 'boolean' && <Label className="text-xs">{param.label}</Label>}
                                {param.type === 'boolean' ? (
                                    <div 
                                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                                        onClick={() => handleParameterChange(param.name, !(parameterValues[param.name] ?? param.default))}
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium text-foreground">{param.label}</span>
                                            {param.description && (
                                                <span className="text-xs text-muted-foreground">{param.description}</span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={parameterValues[param.name] ?? param.default}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                                                (parameterValues[param.name] ?? param.default) ? 'bg-primary' : 'bg-muted'
                                            }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleParameterChange(param.name, !(parameterValues[param.name] ?? param.default));
                                            }}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                                    (parameterValues[param.name] ?? param.default) ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                ) : param.type === 'select' ? (
                                    <select
                                        name={param.name}
                                        className="w-full p-2 rounded-md border border-border bg-background text-sm"
                                        value={parameterValues[param.name] ?? param.default}
                                        onChange={(e) => handleParameterChange(param.name, e.target.value)}
                                    >
                                        {param.options?.map(opt => (
                                            <option key={opt} value={opt} className="bg-zinc-950 text-zinc-100">{opt}</option>
                                        ))}
                                    </select>
                                ) : param.type === 'string' ? (
                                    <Input
                                        type="text"
                                        name={param.name}
                                        value={parameterValues[param.name] ?? param.default}
                                        onChange={(e) => handleParameterChange(param.name, e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                ) : (
                                    <Input
                                        type="number"
                                        name={param.name}
                                        value={parameterValues[param.name] ?? param.default}
                                        onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
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
                    <Button
                        type="submit"
                        disabled={isGenerating || isLoadingMedia}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-2.5"
                    >
                        {isLoadingMedia ? t('generationForm.loadingMedia') : isGenerating ? t('generationForm.generating') : t('generationForm.generate')}
                    </Button>
                </div>
            </form >
        </div >
    );
}
