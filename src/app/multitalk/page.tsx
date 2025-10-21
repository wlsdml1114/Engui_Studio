'use client';

import { useState, useRef, useEffect } from 'react';
import { PhotoIcon, MicrophoneIcon, SpeakerWaveIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useI18n } from '@/lib/i18n/context';

export default function MultiTalkPage() {
    const { t } = useI18n();
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [audio1, setAudio1] = useState<File | null>(null);
    const [audio2, setAudio2] = useState<File | null>(null);
    const [audioMode, setAudioMode] = useState<'single' | 'dual'>('single');
    const [prompt, setPrompt] = useState<string>('a person talking naturally');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const audio1InputRef = useRef<HTMLInputElement>(null);
    const audio2InputRef = useRef<HTMLInputElement>(null);

    // URL에서 File 객체를 생성하는 헬퍼 함수
    const createFileFromUrl = async (url: string, filename: string, mimeType: string): Promise<File> => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new File([blob], filename, { type: mimeType });
    };

    // 입력값 자동 로드 기능
    useEffect(() => {
        const reuseData = localStorage.getItem('reuseInputs');
        if (reuseData) {
            try {
                const data = JSON.parse(reuseData);
                if (data.type === 'multitalk') {
                    // 프롬프트 로드
                    if (data.prompt) {
                        setPrompt(data.prompt);
                    }
                    
                    // 이미지 로드 및 File 객체 생성
                    if (data.imagePath) {
                        setImagePreview(data.imagePath);
                        console.log('🔄 MultiTalk 이미지 재사용:', data.imagePath);
                        
                        // URL에서 File 객체 생성
                        createFileFromUrl(data.imagePath, 'reused_image.jpg', 'image/jpeg')
                            .then(file => {
                                setImage(file);
                                console.log('✅ MultiTalk 이미지 File 객체 생성 완료:', file.name);
                            })
                            .catch(error => {
                                console.error('❌ MultiTalk 이미지 File 객체 생성 실패:', error);
                            });
                    }
                    
                    // 오디오 모드 로드
                    if (data.options?.audioMode) {
                        setAudioMode(data.options.audioMode);
                    }
                    
                    // 성공 메시지 표시
                    setSuccess(t('messages.inputsLoaded'));
                    
                    // 로컬 스토리지에서 데이터 제거 (한 번만 사용)
                    localStorage.removeItem('reuseInputs');
                }
            } catch (error) {
                console.error('입력값 로드 중 오류:', error);
            }
        }
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const url = URL.createObjectURL(file);
            setImagePreview(url);
        }
    };

    const handleAudio1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudio1(file);
        }
    };

    const handleAudio2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudio2(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (!image) {
            setError(t('multitalk.imageRequired'));
            setLoading(false);
            return;
        }

        if (!audio1) {
            setError(t('multitalk.audioRequired'));
            setLoading(false);
            return;
        }

        if (audioMode === 'dual' && !audio2) {
            setError(t('multitalk.dualAudioRequired'));
            setLoading(false);
            return;
        }

        try {
            // Create FormData for file uploads
            const formData = new FormData();
            formData.append('userId', 'user-with-settings');
            formData.append('audioMode', audioMode);
            formData.append('prompt', prompt);
            formData.append('image', image);
            formData.append('audio1', audio1);
            if (audio2 && audioMode === 'dual') {
                formData.append('audio2', audio2);
            }

            console.log('🚀 Submitting MultiTalk request with files...');

            const response = await fetch('/api/multitalk', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate MultiTalk');
            }

            const data = await response.json();
            console.log('MultiTalk generation request sent:', data);

            // Show success message with job ID
            setSuccess(t('multitalk.jobSubmitted', { jobId: data.jobId, runpodJobId: data.runpodJobId }));

            // Reset form
            setImage(null);
            setImagePreview(null);
            setAudio1(null);
            setAudio2(null);
            setPrompt('a person talking naturally');
            if (imageInputRef.current) imageInputRef.current.value = '';
            if (audio1InputRef.current) audio1InputRef.current.value = '';
            if (audio2InputRef.current) audio2InputRef.current.value = '';

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setImage(null);
        setImagePreview(null);
        setAudio1(null);
        setAudio2(null);
        setPrompt('a person talking naturally');
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (audio1InputRef.current) audio1InputRef.current.value = '';
        if (audio2InputRef.current) audio2InputRef.current.value = '';
        setError(null);
        setSuccess(null);
    };

    // 드래그 앤 드롭 핸들러들
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        try {
            // 드래그된 데이터를 찾기
            let dragData = null;
            
            try {
                const jsonData = e.dataTransfer.getData('application/json');
                dragData = jsonData ? JSON.parse(jsonData) : null;
            } catch {
                try {
                    const textData = e.dataTransfer.getData('text/plain');
                    dragData = textData ? JSON.parse(textData) : null;
                } catch {
                    console.log('❌ 드래그 데이터를 파싱할 수 없음');
                    return;
                }
            }

            if (!dragData || dragData.type !== 'library-result') {
                console.log('❌ 라이브러리 결과 데이터가 아님');
                return;
            }

            console.log('🎯 MultiTalk에 드롭된 데이터:', dragData);

            // 이미지 데이터 처리
            if (dragData.inputImagePath || dragData.imageUrl || dragData.resultUrl || dragData.thumbnailUrl) {
                const imageUrl = dragData.inputImagePath || dragData.imageUrl || dragData.resultUrl || dragData.thumbnailUrl;
                
                if (imageUrl) {
                    console.log('🖼️ 이미지 드롭 처리:', imageUrl);
                    setImagePreview(imageUrl);
                    
                    // URL에서 File 객체 생성
                    try {
                        const file = await createFileFromUrl(imageUrl, 'dropped_image.jpg', 'image/jpeg');
                        setImage(file);
                        console.log('✅ 드롭된 이미지 File 객체 생성 완료');
                        
                        setSuccess(t('multitalk.dragAndDrop.reusedAsImage', { jobType: dragData.jobType }));
                    } catch (error) {
                        console.error('❌ 드롭된 이미지 File 객체 생성 실패:', error);
                        setError(t('common.error.processingDroppedData'));
                    }
                }
            }

            // 프롬프트가 있으면 적용
            if (dragData.prompt && dragData.prompt.trim()) {
                setPrompt(dragData.prompt);
                console.log('📝 프롬프트 자동 설정:', dragData.prompt);
            }

        } catch (error) {
            console.error('❌ 드롭 처리 중 오류:', error);
            setError(t('common.error.processingDroppedData'));
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold">{t('multitalk.title')}</h1>
                </div>

                {/* Message Display */}
                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-900/50 border border-red-500 text-red-200">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 rounded-lg bg-green-900/50 border border-green-500 text-green-200">
                        {success}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Input */}
                    <div className="space-y-6">
                        {/* Prompt Input */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                {t('common.prompt')} <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={t('common.placeholder.prompt')}
                                className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                disabled={loading}
                            />
                            {audioMode === 'dual' && (
                                <p className="text-xs text-blue-300 mt-1">
                                    {t('multitalk.dualAudioTip')}
                                </p>
                            )}
                        </div>

                        {/* 이미지 업로드 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                {t('videoGeneration.imageFile')} <span className="text-red-400">*</span>
                            </label>
                            <div 
                                className={`border-2 border-dashed rounded-lg p-6 text-center relative transition-all duration-200 ${
                                    isDragOver 
                                        ? 'border-primary bg-primary/10 border-solid' 
                                        : 'border-border hover:border-primary'
                                }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    disabled={loading}
                                />
                                {imagePreview ? (
                                    <div className="space-y-4">
                                        <img 
                                            src={imagePreview} 
                                            alt="Preview" 
                                            className="max-w-full max-h-48 mx-auto rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setImage(null);
                                                setImagePreview(null);
                                                if (imageInputRef.current) imageInputRef.current.value = '';
                                            }}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                                        >
                                            {t('multitalk.removeImage')}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <PhotoIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {isDragOver ? t('multitalk.dragAndDrop.dropHere') : t('multitalk.dragAndDrop.selectOrDrag')}
                                        </p>
                                        {isDragOver && (
                                            <p className="text-xs text-primary mb-2">
                                                {t('multitalk.dragAndDrop.dragFromLibrary')}
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => imageInputRef.current?.click()}
                                            disabled={loading}
                                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                                        >
                                            {t('multitalk.selectImage')}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 오디오 업로드 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                {t('multitalk.audioFile')} <span className="text-red-400">*</span>
                            </label>
                            <div className="space-y-4">
                                {/* 오디오 1 */}
                                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                                    <input
                                        ref={audio1InputRef}
                                        type="file"
                                        accept="audio/*"
                                        onChange={handleAudio1Change}
                                        className="hidden"
                                        disabled={loading}
                                    />
                                    {audio1 ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-center gap-2 text-green-400">
                                                <MicrophoneIcon className="w-5 h-5" />
                                                <span>{audio1.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAudio1(null);
                                                    if (audio1InputRef.current) audio1InputRef.current.value = '';
                                                }}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                                            >
                                                {t('multitalk.removeAudio1')}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <MicrophoneIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground mb-2">
                                                {t('multitalk.selectAudio1')}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => audio1InputRef.current?.click()}
                                                disabled={loading}
                                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                                            >
                                                {t('multitalk.selectAudio1')}
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* 오디오 2 (듀얼 모드) */}
                                {audioMode === 'dual' && (
                                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                                        <input
                                            ref={audio2InputRef}
                                            type="file"
                                            accept="audio/*"
                                            onChange={handleAudio2Change}
                                            className="hidden"
                                            disabled={loading}
                                        />
                                        {audio2 ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-center gap-2 text-purple-400">
                                                    <SpeakerWaveIcon className="w-5 h-5" />
                                                    <span>{audio2.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAudio2(null);
                                                        if (audio2InputRef.current) audio2InputRef.current.value = '';
                                                    }}
                                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                                                >
                                                    {t('multitalk.removeAudio2')}
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <SpeakerWaveIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    {t('multitalk.selectAudio2')}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => audio2InputRef.current?.click()}
                                                    disabled={loading}
                                                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    {t('multitalk.selectAudio2')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Settings & Preview */}
                    <div className="space-y-6">
                        {/* Settings */}
                        <div className="bg-secondary p-6 rounded-lg border border-border">
                            <h3 className="text-lg font-semibold mb-4">{t('common.settings')}</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">{t('multitalk.audioMode')}</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAudioMode('single')}
                                            className={`px-4 py-2 rounded text-sm ${
                                                audioMode === 'single' 
                                                    ? 'bg-primary text-white' 
                                                    : 'bg-background border border-border text-foreground hover:bg-background/80'
                                            }`}
                                            disabled={loading}
                                        >
                                            {t('multitalk.singleMode')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAudioMode('dual')}
                                            className={`px-4 py-2 rounded text-sm ${
                                                audioMode === 'dual'
                                                    ? 'bg-primary text-white'
                                                    : 'bg-background border border-border text-foreground hover:bg-background/80'
                                            }`}
                                            disabled={loading}
                                        >
                                            {t('multitalk.dualMode')}
                                        </button>
                                    </div>
                                    <p className="text-xs text-foreground/60 mt-1">
                                        {audioMode === 'single'
                                            ? t('multitalk.singleAudioTip')
                                            : t('multitalk.dualAudioTip2')
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleReset}
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                            >
                                {t('common.reset')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !image || !audio1 || (audioMode === 'dual' && !audio2)}
                                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        {t('common.creating')}
                                    </>
                                ) : (
                                    <>
                                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                        {t('multitalk.generateBtn')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}