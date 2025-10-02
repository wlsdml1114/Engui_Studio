'use client';

import { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, PhotoIcon, MusicalNoteIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

export default function InfiniteTalkPage() {
  const [prompt, setPrompt] = useState('');
  const [inputType, setInputType] = useState<'image' | 'video'>('image');
  const [personCount, setPersonCount] = useState<'single' | 'multi'>('single');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFile2, setAudioFile2] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>('');
  const [audioPreviewUrl2, setAudioPreviewUrl2] = useState<string>('');
  const [width, setWidth] = useState(640);
  const [height, setHeight] = useState(640);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>('');
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef2 = useRef<HTMLInputElement>(null);

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
        if (data.type === 'infinitetalk') {
          // 프롬프트 로드
          if (data.prompt) {
            setPrompt(data.prompt);
          }
          
          // 입력 타입 로드
          if (data.inputType) {
            setInputType(data.inputType);
          }
          
          // 이미지 로드 및 File 객체 생성
          if (data.imagePath) {
            setPreviewUrl(data.imagePath);
            console.log('🔄 Infinite Talk 이미지 재사용:', data.imagePath);
            
            // URL에서 File 객체 생성
            createFileFromUrl(data.imagePath, 'reused_image.jpg', 'image/jpeg')
              .then(file => {
                setImageFile(file);
                console.log('✅ Infinite Talk 이미지 File 객체 생성 완료:', file.name);
              })
              .catch(error => {
                console.error('❌ Infinite Talk 이미지 File 객체 생성 실패:', error);
              });
          }
          
          // 비디오 로드 및 File 객체 생성
          if (data.videoPath) {
            setPreviewUrl(data.videoPath);
            console.log('🔄 Infinite Talk 비디오 재사용:', data.videoPath);
            
            // URL에서 File 객체 생성
            createFileFromUrl(data.videoPath, 'reused_video.mp4', 'video/mp4')
              .then(file => {
                setVideoFile(file);
                console.log('✅ Infinite Talk 비디오 File 객체 생성 완료:', file.name);
              })
              .catch(error => {
                console.error('❌ Infinite Talk 비디오 File 객체 생성 실패:', error);
              });
          }
          
          // 오디오 1 로드 및 File 객체 생성
          if (data.audioPath) {
            setAudioPreviewUrl(data.audioPath);
            console.log('🔄 Infinite Talk 오디오 1 재사용:', data.audioPath);
            
            // URL에서 File 객체 생성
            createFileFromUrl(data.audioPath, 'reused_audio.mp3', 'audio/mpeg')
              .then(file => {
                setAudioFile(file);
                console.log('✅ Infinite Talk 오디오 1 File 객체 생성 완료:', file.name);
              })
              .catch(error => {
                console.error('❌ Infinite Talk 오디오 1 File 객체 생성 실패:', error);
              });
          }
          
          // 오디오 2 로드 및 File 객체 생성
          if (data.audioPath2) {
            setAudioPreviewUrl2(data.audioPath2);
            console.log('🔄 Infinite Talk 오디오 2 재사용:', data.audioPath2);
            
            // URL에서 File 객체 생성
            createFileFromUrl(data.audioPath2, 'reused_audio2.mp3', 'audio/mpeg')
              .then(file => {
                setAudioFile2(file);
                console.log('✅ Infinite Talk 오디오 2 File 객체 생성 완료:', file.name);
              })
              .catch(error => {
                console.error('❌ Infinite Talk 오디오 2 File 객체 생성 실패:', error);
              });
          }
          
          // 설정값 로드
          if (data.options) {
            const options = data.options;
            if (options.personCount) setPersonCount(options.personCount);
            if (options.width) setWidth(options.width);
            if (options.height) setHeight(options.height);
          }
          
          // 성공 메시지 표시
          setMessage({ type: 'success', text: '이전 작업의 입력값이 자동으로 로드되었습니다!' });
          
          // 로컬 스토리지에서 데이터 제거 (한 번만 사용)
          localStorage.removeItem('reuseInputs');
        }
      } catch (error) {
        console.error('입력값 로드 중 오류:', error);
      }
    }
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioPreviewUrl(url);
    }
  };

  const handleAudioUpload2 = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile2(file);
      const url = URL.createObjectURL(file);
      setAudioPreviewUrl2(url);
    }
  };

  const handleGenerate = async () => {
    // 입력 검증
    if (inputType === 'image' && !imageFile) {
      setMessage({ type: 'error', text: '이미지 파일을 선택해주세요.' });
      return;
    }
    if (inputType === 'video' && !videoFile) {
      setMessage({ type: 'error', text: '비디오 파일을 선택해주세요.' });
      return;
    }
    if (!audioFile || !prompt.trim()) {
      setMessage({ type: 'error', text: '오디오 파일과 프롬프트를 입력해주세요.' });
      return;
    }
    if (personCount === 'multi' && !audioFile2) {
      setMessage({ type: 'error', text: '다중 인물 모드에서는 두 번째 오디오 파일이 필요합니다.' });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('userId', 'user-with-settings');
      formData.append('input_type', inputType);
      formData.append('person_count', personCount);
      
      if (inputType === 'image' && imageFile) {
        formData.append('image', imageFile);
      } else if (inputType === 'video' && videoFile) {
        formData.append('video', videoFile);
      }
      
      formData.append('audio', audioFile);
      
      if (personCount === 'multi' && audioFile2) {
        formData.append('audio2', audioFile2);
      }
      
      formData.append('prompt', prompt);
      formData.append('width', width.toString());
      formData.append('height', height.toString());

      const response = await fetch('/api/infinite-talk', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success && data.jobId) {
        setCurrentJobId(data.jobId);
        setMessage({ 
          type: 'success', 
          text: data.message || 'Infinite Talk 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.' 
        });
        
        // 백그라운드 처리이므로 즉시 완료 상태로 변경
        setIsGenerating(false);
        
        // Library로 이동하여 새로운 작업 확인
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        
        // 입력 초기화
        setPrompt('');
        setImageFile(null);
        setVideoFile(null);
        setAudioFile(null);
        setAudioFile2(null);
        setPreviewUrl('');
        setAudioPreviewUrl('');
        setAudioPreviewUrl2('');
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (videoInputRef.current) videoInputRef.current.value = '';
        if (audioInputRef.current) audioInputRef.current.value = '';
        if (audioInputRef2.current) audioInputRef2.current.value = '';
      } else {
        const errorMessage = data.error || 'Infinite Talk 생성에 실패했습니다.';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Generation error:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const clearInputs = () => {
    setPrompt('');
    setImageFile(null);
    setVideoFile(null);
    setAudioFile(null);
    setAudioFile2(null);
    setPreviewUrl('');
    setAudioPreviewUrl('');
    setAudioPreviewUrl2('');
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (audioInputRef2.current) audioInputRef2.current.value = '';
    setMessage(null);
    setCurrentJobId('');
  };

  return (
    <div className="min-h-screen bg-background p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <MicrophoneIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Infinite Talk</h1>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-900/50 border border-green-500 text-green-200' 
              : 'bg-red-900/50 border border-red-500 text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Prompt Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                프롬프트 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="예: A person is talking about technology..."
                className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                disabled={isGenerating}
              />
            </div>

            {/* Media Upload (Image or Video) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {inputType === 'image' ? '이미지 파일' : '비디오 파일'} <span className="text-red-400">*</span>
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                {inputType === 'image' ? (
                  <>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isGenerating}
                    />
                    {previewUrl ? (
                      <div className="space-y-4">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="max-w-full max-h-48 mx-auto rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setPreviewUrl('');
                            if (imageInputRef.current) imageInputRef.current.value = '';
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                        >
                          이미지 제거
                        </button>
                      </div>
                    ) : (
                      <>
                        <PhotoIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          이미지 파일을 선택하거나 드래그하세요
                        </p>
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={isGenerating}
                          className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                        >
                          이미지 선택
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                      disabled={isGenerating}
                    />
                    {previewUrl ? (
                      <div className="space-y-4">
                        <video 
                          src={previewUrl} 
                          controls
                          className="max-w-full max-h-48 mx-auto rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setVideoFile(null);
                            setPreviewUrl('');
                            if (videoInputRef.current) videoInputRef.current.value = '';
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                        >
                          비디오 제거
                        </button>
                      </div>
                    ) : (
                      <>
                        <VideoCameraIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          비디오 파일을 선택하거나 드래그하세요
                        </p>
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={isGenerating}
                          className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                        >
                          비디오 선택
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Audio Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                첫 번째 오디오 파일 <span className="text-red-400">*</span>
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                  disabled={isGenerating}
                />
                {audioPreviewUrl ? (
                  <div className="space-y-4">
                    <audio controls className="w-full">
                      <source src={audioPreviewUrl} type="audio/wav" />
                      <source src={audioPreviewUrl} type="audio/mpeg" />
                      <source src={audioPreviewUrl} type="audio/ogg" />
                      브라우저가 오디오를 지원하지 않습니다.
                    </audio>
                    <button
                      type="button"
                      onClick={() => {
                        setAudioFile(null);
                        setAudioPreviewUrl('');
                        if (audioInputRef.current) audioInputRef.current.value = '';
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                    >
                      오디오 제거
                    </button>
                  </div>
                ) : (
                  <>
                    <MusicalNoteIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      오디오 파일을 선택하거나 드래그하세요 (WAV 권장)
                    </p>
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      disabled={isGenerating}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                    >
                      오디오 선택
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Second Audio Upload (Multi-person only) */}
            {personCount === 'multi' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  두 번째 오디오 파일 <span className="text-red-400">*</span>
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <input
                    ref={audioInputRef2}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload2}
                    className="hidden"
                    disabled={isGenerating}
                  />
                  {audioPreviewUrl2 ? (
                    <div className="space-y-4">
                      <audio controls className="w-full">
                        <source src={audioPreviewUrl2} type="audio/wav" />
                        <source src={audioPreviewUrl2} type="audio/mpeg" />
                        <source src={audioPreviewUrl2} type="audio/ogg" />
                        브라우저가 오디오를 지원하지 않습니다.
                      </audio>
                      <button
                        type="button"
                        onClick={() => {
                          setAudioFile2(null);
                          setAudioPreviewUrl2('');
                          if (audioInputRef2.current) audioInputRef2.current.value = '';
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                      >
                        오디오 제거
                      </button>
                    </div>
                  ) : (
                    <>
                      <MusicalNoteIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        두 번째 오디오 파일을 선택하거나 드래그하세요 (WAV 권장)
                      </p>
                      <button
                        type="button"
                        onClick={() => audioInputRef2.current?.click()}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                      >
                        두 번째 오디오 선택
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Settings & Preview */}
          <div className="space-y-6">
            {/* Settings */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold mb-4">설정</h3>
              
              {/* Input Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">
                  입력 타입 <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInputType('image')}
                    disabled={isGenerating}
                    className={`p-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      inputType === 'image'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background border-border hover:border-primary text-foreground'
                    }`}
                  >
                    <PhotoIcon className="w-5 h-5" />
                    이미지
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputType('video')}
                    disabled={isGenerating}
                    className={`p-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      inputType === 'video'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background border-border hover:border-primary text-foreground'
                    }`}
                  >
                    <VideoCameraIcon className="w-5 h-5" />
                    비디오
                  </button>
                </div>
              </div>

              {/* Person Count Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">
                  인물 수 <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPersonCount('single')}
                    disabled={isGenerating}
                    className={`p-3 rounded-lg border transition-colors ${
                      personCount === 'single'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background border-border hover:border-primary text-foreground'
                    }`}
                  >
                    단일 인물
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersonCount('multi')}
                    disabled={isGenerating}
                    className={`p-3 rounded-lg border transition-colors ${
                      personCount === 'multi'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background border-border hover:border-primary text-foreground'
                    }`}
                  >
                    다중 인물
                  </button>
                </div>
              </div>
              
              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    가로 크기
                  </label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value) || 640)}
                    min="256"
                    max="2048"
                    step="64"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                    placeholder="640"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    세로 크기
                  </label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value) || 640)}
                    min="256"
                    max="2048"
                    step="64"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                    placeholder="640"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={clearInputs}
                disabled={isGenerating}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                초기화
              </button>
              <button
                onClick={handleGenerate}
                disabled={
                  isGenerating || 
                  !prompt.trim() || 
                  !audioFile || 
                  (inputType === 'image' && !imageFile) ||
                  (inputType === 'video' && !videoFile) ||
                  (personCount === 'multi' && !audioFile2)
                }
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    생성 중...
                  </>
                ) : (
                  <>
                    <MicrophoneIcon className="w-5 h-5" />
                    Infinite Talk 생성
                  </>
                )}
              </button>
            </div>

            {/* Job Info */}
            {currentJobId && (
              <div className="bg-secondary p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold mb-4">작업 정보</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="font-medium">Job ID:</span> {currentJobId}</p>
                  <p><span className="font-medium">상태:</span> 백그라운드 처리 중</p>
                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      ✅ Infinite Talk 작업이 백그라운드에서 처리되고 있습니다.
                    </p>
                    <p className="text-blue-200 text-xs mt-2">
                      • 다른 작업을 자유롭게 수행할 수 있습니다
                    </p>
                    <p className="text-blue-200 text-xs">
                      • Library에서 진행 상황을 확인하세요
                    </p>
                    <p className="text-blue-200 text-xs">
                      • 작업 완료 시 자동으로 상태가 업데이트됩니다
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
