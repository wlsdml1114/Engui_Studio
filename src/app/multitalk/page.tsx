'use client';

import { useState, useRef } from 'react';
import { PhotoIcon, MicrophoneIcon, SpeakerWaveIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function MultiTalkPage() {
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [audio1, setAudio1] = useState<File | null>(null);
    const [audio2, setAudio2] = useState<File | null>(null);
    const [audioMode, setAudioMode] = useState<'single' | 'dual'>('single');
    const [prompt, setPrompt] = useState<string>('a person talking naturally');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const audio1InputRef = useRef<HTMLInputElement>(null);
    const audio2InputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
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
            setError('이미지를 선택해주세요.');
            setLoading(false);
            return;
        }

        if (!audio1) {
            setError('최소 하나의 오디오 파일을 선택해주세요.');
            setLoading(false);
            return;
        }

        if (audioMode === 'dual' && !audio2) {
            setError('듀얼 모드에서는 두 개의 오디오 파일이 필요합니다.');
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
            setSuccess(`MultiTalk 생성 요청이 성공적으로 접수되었습니다! Job ID: ${data.jobId} (RunPod: ${data.runpodJobId}). 라이브러리에서 진행 상황을 확인하세요.`);

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

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-500" />
                    <h1 className="text-3xl font-bold text-foreground">MultiTalk</h1>
                </div>

                {/* Message Display */}
                {success && (
                    <div className="mb-6 p-4 rounded-lg bg-green-900/50 border border-green-500 text-green-200">
                        <p className="text-sm">{success}</p>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-900/50 border border-red-500 text-red-200">
                        <p className="text-sm">오류: {error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Input */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Image Upload */}
                        <div className="bg-secondary p-6 rounded-lg border border-border">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <PhotoIcon className="w-5 h-5" />
                                입력 이미지
                            </h2>
                            
                            <div className="space-y-4">
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                
                                <button
                                    onClick={() => imageInputRef.current?.click()}
                                    className="w-full p-8 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors"
                                >
                                    {imagePreview ? (
                                        <img 
                                            src={imagePreview} 
                                            alt="Preview" 
                                            className="max-w-full max-h-64 mx-auto rounded-lg"
                                        />
                                    ) : (
                                        <div className="text-center text-foreground/60">
                                            <PhotoIcon className="w-12 h-12 mx-auto mb-2" />
                                            <p>이미지를 클릭하여 업로드하세요</p>
                                            <p className="text-sm">PNG, JPG, WEBP 지원</p>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Prompt Input */}
                        <div className="bg-secondary p-6 rounded-lg border border-border">
                            <h2 className="text-xl font-semibold mb-4">프롬프트</h2>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="예: a person talking naturally, professional speaker, casual conversation..."
                                className="w-full h-32 p-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                required
                            />
                            <p className="text-sm text-foreground/60 mt-2">
                                💡 프롬프트는 AI가 이미지와 오디오를 결합할 때 참고하는 가이드라인입니다.
                            </p>
                        </div>

                        {/* Audio Upload */}
                        <div className="bg-secondary p-6 rounded-lg border border-border">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <MicrophoneIcon className="w-5 h-5" />
                                오디오 업로드
                            </h2>
                            
                            <div className="space-y-4">
                                {/* Audio 1 */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                                        {audioMode === 'single' ? '오디오 파일' : '첫 번째 화자 오디오'}
                                    </label>
                                    <input
                                        ref={audio1InputRef}
                                        type="file"
                                        accept="audio/*"
                                        onChange={handleAudio1Change}
                                        className="hidden"
                                        required
                                    />
                                    <button
                                        onClick={() => audio1InputRef.current?.click()}
                                        className="w-full p-4 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors text-center"
                                    >
                                        {audio1 ? (
                                            <div className="flex items-center justify-center gap-2 text-green-400">
                                                <SpeakerWaveIcon className="w-5 h-5" />
                                                <span>{audio1.name}</span>
                                            </div>
                                        ) : (
                                            <div className="text-foreground/60">
                                                <MicrophoneIcon className="w-8 h-8 mx-auto mb-2" />
                                                <p>오디오 파일을 클릭하여 업로드하세요</p>
                                                <p className="text-sm">MP3, WAV, M4A 지원</p>
                                            </div>
                                        )}
                                    </button>
                                </div>

                                {/* Audio 2 - Only show in dual mode */}
                                {audioMode === 'dual' && (
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-2">
                                            두 번째 화자 오디오
                                        </label>
                                        <input
                                            ref={audio2InputRef}
                                            type="file"
                                            accept="audio/*"
                                            onChange={handleAudio2Change}
                                            className="hidden"
                                            required={audioMode === 'dual'}
                                        />
                                        <button
                                            onClick={() => audio2InputRef.current?.click()}
                                            className="w-full p-4 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors text-center"
                                        >
                                            {audio2 ? (
                                                <div className="flex items-center justify-center gap-2 text-purple-400">
                                                    <SpeakerWaveIcon className="w-5 h-5" />
                                                    <span>{audio2.name}</span>
                                                </div>
                                            ) : (
                                                <div className="text-foreground/60">
                                                    <MicrophoneIcon className="w-8 h-8 mx-auto mb-2" />
                                                    <p>두 번째 오디오 파일을 클릭하여 업로드하세요</p>
                                                    <p className="text-sm">MP3, WAV, M4A 지원</p>
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Settings & Generate */}
                    <div className="space-y-6">
                        {/* Audio Mode Selection */}
                        <div className="bg-secondary p-6 rounded-lg border border-border">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Cog6ToothIcon className="w-5 h-5" />
                                오디오 모드
                            </h2>
                            
                            <div className="space-y-3">
                                <label className="flex items-center p-3 border border-border rounded-lg hover:bg-background/50 transition-colors cursor-pointer">
                                    <input
                                        type="radio"
                                        name="audioMode"
                                        value="single"
                                        checked={audioMode === 'single'}
                                        onChange={(e) => setAudioMode(e.target.value as 'single' | 'dual')}
                                        className="mr-3 text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <span className="font-medium">단일 오디오</span>
                                        <p className="text-sm text-foreground/60">하나의 오디오로 자연스러운 발화</p>
                                    </div>
                                </label>
                                
                                <label className="flex items-center p-3 border border-border rounded-lg hover:bg-background/50 transition-colors cursor-pointer">
                                    <input
                                        type="radio"
                                        name="audioMode"
                                        value="dual"
                                        checked={audioMode === 'dual'}
                                        onChange={(e) => setAudioMode(e.target.value as 'single' | 'dual')}
                                        className="mr-3 text-primary focus:ring-primary"
                                    />
                                    <div>
                                        <span className="font-medium">듀얼 오디오</span>
                                        <p className="text-sm text-foreground/60">두 화자의 대화형 콘텐츠</p>
                                        <p className="text-xs text-foreground/40 mt-1">💡 듀얼 모드에서는 audio_type이 'para'로 자동 설정됩니다</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="bg-secondary p-6 rounded-lg border border-border">
                            <button
                                onClick={handleSubmit}
                                disabled={!image || !audio1 || (audioMode === 'dual' && !audio2) || loading}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        생성 중...
                                    </>
                                ) : (
                                    <>
                                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                        MultiTalk 생성하기
                                    </>
                                )}
                            </button>
                            
                            <p className="text-xs text-foreground/60 mt-3 text-center">
                                MultiTalk 생성에는 몇 분 정도 소요될 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}