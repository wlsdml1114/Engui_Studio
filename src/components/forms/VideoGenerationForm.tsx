'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStudio } from '@/lib/context/StudioContext';
import { getModelsByType, getModelById, isInputVisible } from '@/lib/models/modelConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { loadFileFromPath } from '@/lib/fileUtils';

export default function VideoGenerationForm() {
    const { selectedModel, setSelectedModel, settings, addJob, activeWorkspaceId } = useStudio();
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioFile2, setAudioFile2] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isDragOverImage, setIsDragOverImage] = useState(false);
    const [isDragOverVideo, setIsDragOverVideo] = useState(false);
    const [parameterValues, setParameterValues] = useState<Record<string, any>>({});
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);
    const [showReuseSuccess, setShowReuseSuccess] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

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

    // Initialize parameter values with defaults
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
    }, [currentModel]);

    // Handle reuse job input event
    useEffect(() => {
        console.log('📝 VideoGenerationForm: Registering reuseJobInput event listener');
        
        const handleReuseInput = async (event: CustomEvent) => {
            console.log('📨 VideoGenerationForm: Received reuseJobInput event', event.detail);
            
            const { modelId, prompt: jobPrompt, options, type, imageInputPath, videoInputPath, audioInputPath } = event.detail;
            
            // Only handle if it's a video job
            if (type !== 'video') {
                console.log('⏭️ Skipping: Not a video job, type is', type);
                return;
            }

            console.log('🔄 Reusing video input:', { modelId, prompt: jobPrompt, options, imageInputPath, videoInputPath, audioInputPath });

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
                
                // Apply parameter values in parent-first order
                // First, collect all parameter values from options
                const allParamValues: Record<string, any> = {};
                Object.keys(parsedOptions).forEach(key => {
                    // Skip file paths and internal fields
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

                // Load image file from path if exists
                const imagePath = imageInputPath || parsedOptions.image_path;
                if (imagePath) {
                    console.log('📥 Loading image from path:', imagePath);
                    const file = await loadFileFromPath(imagePath);
                    if (file) {
                        setImageFile(file);
                        setImagePreviewUrl(imagePath);
                        console.log('✅ Image file loaded successfully');
                    } else {
                        console.warn('⚠️ Failed to load image file');
                    }
                }

                // Load video file from path if exists
                const videoPath = videoInputPath || parsedOptions.video_path;
                if (videoPath) {
                    console.log('📥 Loading video from path:', videoPath);
                    const file = await loadFileFromPath(videoPath);
                    if (file) {
                        setVideoFile(file);
                        setVideoPreviewUrl(videoPath);
                        console.log('✅ Video file loaded successfully');
                    } else {
                        console.warn('⚠️ Failed to load video file');
                    }
                }

                // Load audio file from path if exists
                const audioPath = audioInputPath || parsedOptions.wav_path || parsedOptions.audio;
                if (audioPath) {
                    console.log('📥 Loading audio from path:', audioPath);
                    const file = await loadFileFromPath(audioPath);
                    if (file) {
                        setAudioFile(file);
                        console.log('✅ Audio file loaded successfully');
                    } else {
                        console.warn('⚠️ Failed to load audio file');
                    }
                }

                // Load second audio file if exists
                if (parsedOptions.wav_path_2) {
                    console.log('📥 Loading second audio from path:', parsedOptions.wav_path_2);
                    const file = await loadFileFromPath(parsedOptions.wav_path_2);
                    if (file) {
                        setAudioFile2(file);
                        console.log('✅ Second audio file loaded successfully');
                    } else {
                        console.warn('⚠️ Failed to load second audio file');
                    }
                }

                // Apply all input values from options to form inputs
                // Wait a tick to ensure model has switched and form has re-rendered
                setTimeout(() => {
                    const form = document.querySelector('form');
                    if (!form) return;

                    // Apply all parameter values
                    Object.keys(parsedOptions).forEach(key => {
                        // Skip internal fields and file paths
                        if (key.includes('_path') || key === 'runpodJobId' || key === 'error') {
                            return;
                        }

                        const input = form.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement;
                        if (input) {
                            if (input.type === 'checkbox') {
                                (input as HTMLInputElement).checked = parsedOptions[key] === true || parsedOptions[key] === 'true';
                            } else if (input.type === 'number') {
                                input.value = String(parsedOptions[key]);
                            } else {
                                input.value = String(parsedOptions[key]);
                            }
                        }
                    });

                    console.log('✅ Applied all input values from job');
                }, 100);

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
        return () => {
            console.log('🧹 VideoGenerationForm: Cleaning up reuseJobInput event listener');
            window.removeEventListener('reuseJobInput', handleReuseInput as any);
        };
    }, [setSelectedModel, selectedModel]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setVideoPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreviewUrl('');
    };

    const handleRemoveVideo = () => {
        setVideoFile(null);
        setVideoPreviewUrl('');
    };

    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, isSecondAudio = false) => {
        const file = e.target.files?.[0];
        if (file) {
            if (isSecondAudio) {
                setAudioFile2(file);
            } else {
                setAudioFile(file);
            }
        }
    };

    const handleRemoveAudio = (isSecondAudio = false) => {
        if (isSecondAudio) {
            setAudioFile2(null);
        } else {
            setAudioFile(null);
        }
    };

    // Update parameter values for conditional rendering
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

    const handleImageDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOverImage(false);

        try {
            const mediaDataStr = e.dataTransfer.getData('application/json');
            if (mediaDataStr) {
                const mediaData = JSON.parse(mediaDataStr);
                if (mediaData.type === 'image' && mediaData.url) {
                    const response = await fetch(mediaData.url);
                    const blob = await response.blob();
                    const file = new File([blob], `workspace-${mediaData.id}.png`, { type: 'image/png' });
                    
                    setImageFile(file);
                    setImagePreviewUrl(mediaData.url);
                }
                return;
            }

            const files = Array.from(e.dataTransfer.files);
            const imageFile = files.find(f => f.type.startsWith('image/'));
            if (imageFile) {
                setImageFile(imageFile);
                setImagePreviewUrl(URL.createObjectURL(imageFile));
            }
        } catch (error) {
            console.error('Failed to handle image drop:', error);
        }
    };

    const handleVideoDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOverVideo(false);

        try {
            const mediaDataStr = e.dataTransfer.getData('application/json');
            if (mediaDataStr) {
                const mediaData = JSON.parse(mediaDataStr);
                if (mediaData.type === 'video' && mediaData.url) {
                    const response = await fetch(mediaData.url);
                    const blob = await response.blob();
                    const file = new File([blob], `workspace-${mediaData.id}.mp4`, { type: 'video/mp4' });
                    
                    setVideoFile(file);
                    setVideoPreviewUrl(mediaData.url);
                }
                return;
            }

            const files = Array.from(e.dataTransfer.files);
            const videoFile = files.find(f => f.type.startsWith('video/'));
            if (videoFile) {
                setVideoFile(videoFile);
                setVideoPreviewUrl(URL.createObjectURL(videoFile));
            }
        } catch (error) {
            console.error('Failed to handle video drop:', error);
        }
    };

    const handleImageDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOverImage(true);
    };

    const handleImageDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOverImage(false);
    };

    const handleVideoDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOverVideo(true);
    };

    const handleVideoDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOverVideo(false);
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
            
            // Add workspace ID from context
            if (activeWorkspaceId) {
                formData.append('workspaceId', activeWorkspaceId);
            }

            if (imageFile) {
                formData.append('image', imageFile);
            }

            if (videoFile) {
                formData.append('video', videoFile);
            }

            if (audioFile) {
                formData.append('audio', audioFile);
            }

            if (audioFile2) {
                formData.append('audio2', audioFile2);
            }

            // Collect dynamic parameters (Basic, Advanced, and Hidden)
            // Use parameterValues state to ensure ALL parameters are included,
            // including conditional ones that may not be currently visible
            currentModel.parameters.forEach(param => {
                const value = parameterValues[param.name] ?? param.default;
                if (value !== undefined && value !== null) {
                    formData.append(param.name, value.toString());
                }
            });

            // Handle Dimensions and Duration if supported
            if (currentModel.capabilities.dimensions?.length) {
                const form = e.target as HTMLFormElement;
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
                console.log('🔍 RunPod Endpoint Debug:', {
                    modelId: currentModel.id,
                    endpointFromSettings: settings.runpod.endpoints[currentModel.id],
                    endpointFromModel: currentModel.api.endpoint,
                    finalEndpoint: endpointId,
                    allEndpoints: settings.runpod.endpoints
                });
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
        <div ref={formRef} className="space-y-4 pb-20">
            {/* Success Toast */}
            {showReuseSuccess && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Input reused successfully</span>
                    </div>
                </div>
            )}
            
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
                {isInputVisible(currentModel, 'image', parameterValues) && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Image Reference</Label>
                        {isLoadingMedia ? (
                            <div className="border border-dashed rounded-lg p-8 text-center">
                                <div className="w-8 h-8 mx-auto mb-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                <span className="text-xs text-muted-foreground">Loading media files...</span>
                            </div>
                        ) : imagePreviewUrl ? (
                            <div className="relative group rounded-lg overflow-hidden border border-border">
                                <img src={imagePreviewUrl} alt="Reference" className="w-full h-40 object-cover" />
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
                            <div 
                                className={`border border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer relative ${
                                    isDragOverImage ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/20'
                                }`}
                                onDrop={handleImageDrop}
                                onDragOver={handleImageDragOver}
                                onDragLeave={handleImageDragLeave}
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={isLoadingMedia}
                                />
                                <PhotoIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                    {isDragOverImage ? 'Drop image here' : 'Click or drop image'}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Video Input (Conditional) */}
                {isInputVisible(currentModel, 'video', parameterValues) && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Video Reference</Label>
                        {videoPreviewUrl ? (
                            <div className="relative group rounded-lg overflow-hidden border border-border">
                                <video src={videoPreviewUrl} className="w-full h-40 object-cover" controls />
                                <button
                                    type="button"
                                    onClick={handleRemoveVideo}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 001.5.06l.3-7.5z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div 
                                className={`border border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer relative ${
                                    isDragOverVideo ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/20'
                                }`}
                                onDrop={handleVideoDrop}
                                onDragOver={handleVideoDragOver}
                                onDragLeave={handleVideoDragLeave}
                            >
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleVideoUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mx-auto mb-2 text-muted-foreground">
                                    <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                                <span className="text-xs text-muted-foreground">
                                    {isDragOverVideo ? 'Drop video here' : 'Click or drop video'}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Audio Input (Conditional) */}
                {isInputVisible(currentModel, 'audio', parameterValues) && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Audio {parameterValues['person_count'] === 'multi' ? '1' : ''}</Label>
                        {audioFile ? (
                            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-muted-foreground">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                </svg>
                                <span className="flex-1 text-sm truncate">{audioFile.name}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveAudio(false)}
                                    className="p-1 hover:bg-muted rounded transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div className="border border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer relative border-border hover:bg-muted/20">
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => handleAudioUpload(e, false)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto mb-2 text-muted-foreground">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                </svg>
                                <span className="text-xs text-muted-foreground">Click or drop audio</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Second Audio Input (Conditional - for multi-person) */}
                {isInputVisible(currentModel, 'audio', parameterValues) && parameterValues['person_count'] === 'multi' && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Audio 2</Label>
                        {audioFile2 ? (
                            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-muted-foreground">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                </svg>
                                <span className="flex-1 text-sm truncate">{audioFile2.name}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveAudio(true)}
                                    className="p-1 hover:bg-muted rounded transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div className="border border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer relative border-border hover:bg-muted/20">
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => handleAudioUpload(e, true)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto mb-2 text-muted-foreground">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                                </svg>
                                <span className="text-xs text-muted-foreground">Click or drop audio</span>
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
                {currentModel.parameters.filter(p => p.group === 'basic' && isParameterVisible(p)).map(param => (
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
                                    onChange={(e) => handleParameterChange(param.name, e.target.checked)}
                                />
                                <label htmlFor={param.name} className="text-xs text-muted-foreground">Enable</label>
                            </div>
                        ) : param.type === 'select' ? (
                            <select
                                name={param.name}
                                className="w-full p-2 rounded-md border border-border bg-background text-sm"
                                defaultValue={param.default}
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
                                defaultValue={param.default}
                                className="h-8 text-sm"
                                onChange={(e) => handleParameterChange(param.name, e.target.value)}
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
                                onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
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
                        {currentModel.parameters.filter(p => (!p.group || p.group === 'advanced') && isParameterVisible(p)).map(param => (
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
                                            onChange={(e) => handleParameterChange(param.name, e.target.checked)}
                                        />
                                        <label htmlFor={param.name} className="text-xs text-muted-foreground">Enable</label>
                                    </div>
                                ) : param.type === 'select' ? (
                                    <select
                                        name={param.name}
                                        className="w-full p-2 rounded-md border border-border bg-background text-sm"
                                        defaultValue={param.default}
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
                                        defaultValue={param.default}
                                        className="h-8 text-sm"
                                        onChange={(e) => handleParameterChange(param.name, e.target.value)}
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
                                        onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
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
                        {isLoadingMedia ? 'Loading media...' : isGenerating ? 'Generating...' : 'Generate'}
                    </Button>
                </div>
            </form >
        </div >
    );
}
