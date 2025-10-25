'use client';

import { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, PhotoIcon, MusicalNoteIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { useI18n } from '@/lib/i18n/context';

export default function InfiniteTalkPage() {
  const { t, language } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [inputType, setInputType] = useState<'image' | 'video'>('image');
  const [personCount, setPersonCount] = useState<'single' | 'multi'>('single');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFile2, setAudioFile2] = useState<File | null>(null);
  const [audioStart, setAudioStart] = useState<string>('');
  const [audioEnd, setAudioEnd] = useState<string>('');
  const [audio2Start, setAudio2Start] = useState<string>('');
  const [audio2End, setAudio2End] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>('');
  const [audioPreviewUrl2, setAudioPreviewUrl2] = useState<string>('');
  const [width, setWidth] = useState(640);
  const [height, setHeight] = useState(640);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>('');

  // 메시지 타입을 저장하여 언어 변경 시 재번역 가능하게 함
  const [messageType, setMessageType] = useState<'inputsLoaded' | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef2 = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // URL에서 File 객체를 생성하는 헬퍼 함수
  const createFileFromUrl = async (url: string, filename?: string, mimeType?: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    // 파일명/확장자 추론
    const urlPath = url.split('?')[0];
    const inferredName = filename || urlPath.split('/').pop() || 'file';
    const ext = (inferredName.split('.').pop() || '').toLowerCase();
    // MIME 추론
    const headerType = response.headers.get('content-type') || '';
    const inferredType = mimeType || blob.type || headerType || (ext === 'wav' ? 'audio/wav' : ext === 'mp3' ? 'audio/mpeg' : ext === 'ogg' ? 'audio/ogg' : ext === 'mp4' ? 'video/mp4' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'application/octet-stream');
    return new File([blob], inferredName, { type: inferredType });
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
          
          // 오디오 1 로드 및 File 객체 생성 (원본 오디오 우선)
          if (data.audioPath) {
            setAudioPreviewUrl(data.audioPath);
            console.log('🔄 Infinite Talk 오디오 1 재사용:', data.audioPath);
            
            // URL에서 File 객체 생성
            createFileFromUrl(data.audioPath)
              .then(file => {
                setAudioFile(file);
                console.log('✅ Infinite Talk 오디오 1 File 객체 생성 완료:', file.name);
              })
              .catch(error => {
                console.error('❌ Infinite Talk 오디오 1 File 객체 생성 실패:', error);
              });
            // 트림 값 복원
            if (data.audioTrimStartStr) setAudioStart(data.audioTrimStartStr);
            if (data.audioTrimEndStr) setAudioEnd(data.audioTrimEndStr);
          }
          
          // 오디오 2 로드 및 File 객체 생성 (원본 오디오 우선)
          if (data.audioPath2) {
            setAudioPreviewUrl2(data.audioPath2);
            console.log('🔄 Infinite Talk 오디오 2 재사용:', data.audioPath2);
            
            // URL에서 File 객체 생성
            createFileFromUrl(data.audioPath2)
              .then(file => {
                setAudioFile2(file);
                console.log('✅ Infinite Talk 오디오 2 File 객체 생성 완료:', file.name);
              })
              .catch(error => {
                console.error('❌ Infinite Talk 오디오 2 File 객체 생성 실패:', error);
              });
            // 트림 값 복원
            if (data.audio2TrimStartStr) setAudio2Start(data.audio2TrimStartStr);
            if (data.audio2TrimEndStr) setAudio2End(data.audio2TrimEndStr);
          }
          
          // 설정값 로드
          if (data.options) {
            const options = data.options;
            if (options.personCount) setPersonCount(options.personCount);
            if (options.width) setWidth(options.width);
            if (options.height) setHeight(options.height);
          }
          
          // 성공 메시지 표시
          setMessage({ type: 'success', text: t('messages.inputsLoaded') });
          setMessageType('inputsLoaded');

          // 로컬 스토리지에서 데이터 제거 (한 번만 사용)
          localStorage.removeItem('reuseInputs');
        }
      } catch (error) {
        console.error('입력값 로드 중 오류:', error);
      }
    }
  }, [language]);

  // 언어 변경 시 메시지 재번역
  useEffect(() => {
    if (messageType === 'inputsLoaded') {
      setMessage({ type: 'success', text: t('messages.inputsLoaded') });
    }
  }, [language, messageType]);

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

      console.log('🎯 Infinite Talk에 드롭된 데이터:', dragData);

      // 미디어 타입 감지
      const isVideo = dragData.mediaType === 'video' || dragData.jobType === 'multitalk' || 
                     dragData.jobType === 'wan22' || dragData.jobType === 'wan-animate' || 
                     dragData.jobType === 'infinitetalk' || dragData.jobType === 'video-upscale';
      
      // 미디어 타입에 따라 적절한 URL 선택
      let mediaUrl;
      if (isVideo) {
        // 비디오인 경우 비디오 URL 우선
        mediaUrl = dragData.videoUrl || dragData.resultUrl || dragData.mediaUrl || dragData.thumbnailUrl;
      } else {
        // 이미지인 경우 이미지 URL 우선
        mediaUrl = dragData.inputImagePath || dragData.imageUrl || dragData.resultUrl || dragData.thumbnailUrl;
      }
      
      if (mediaUrl) {
        console.log('🎬 미디어 드롭 처리:', mediaUrl);
        console.log('🔍 미디어 타입:', isVideo ? '비디오' : '이미지');
        
        try {
          if (isVideo) {
            // 비디오 처리
            setInputType('video');
            setPreviewUrl(mediaUrl);
            const file = await createFileFromUrl(mediaUrl, 'dropped_video.mp4', 'video/mp4');
            setVideoFile(file);
            console.log('✅ 드롭된 비디오 File 객체 생성 완료');
          } else {
            // 이미지 처리
            setInputType('image');
            setPreviewUrl(mediaUrl);
            const file = await createFileFromUrl(mediaUrl, 'dropped_image.jpg', 'image/jpeg');
            setImageFile(file);
            console.log('✅ 드롭된 이미지 File 객체 생성 완료');
          }
          
          setMessage({
            type: 'success',
            text: t('infiniteTalk.dragAndDrop.reusedAsMedia', {
              jobType: dragData.jobType,
              isVideo: isVideo ? t('common.video') : t('common.image')
            })
          });
          setMessageType(null);
        } catch (error) {
          console.error('❌ 드롭된 미디어 File 객체 생성 실패:', error);
          setMessage({
            type: 'error',
            text: t('infiniteTalk.dragAndDrop.processError')
          });
          setMessageType(null);
        }
      } else {
        setMessage({
          type: 'error',
          text: t('common.error.noMediaData')
        });
        setMessageType(null);
        return;
      }

      // 프롬프트가 있으면 적용
      if (dragData.prompt && dragData.prompt.trim()) {
        setPrompt(dragData.prompt);
        console.log('📝 프롬프트 자동 설정:', dragData.prompt);
      }

    } catch (error) {
      console.error('❌ 드롭 처리 중 오류:', error);
      setMessage({
        type: 'error',
        text: t('common.error.processingDroppedData')
      });
      setMessageType(null);
    }
  };

  const handleGenerate = async () => {
    // 입력 검증
    if (inputType === 'image' && !imageFile) {
      setMessage({ type: 'error', text: t('multitalk.imageRequired') });
      setMessageType(null);
      return;
    }
    if (inputType === 'video' && !videoFile) {
      setMessage({ type: 'error', text: t('videoUpscale.videoRequired') });
      setMessageType(null);
      return;
    }
    if (!audioFile || !prompt.trim()) {
      setMessage({ type: 'error', text: t('multitalk.audioRequired') });
      setMessageType(null);
      return;
    }
    if (personCount === 'multi' && !audioFile2) {
      setMessage({ type: 'error', text: t('multitalk.dualAudioRequired') });
      setMessageType(null);
      return;
    }

    setIsGenerating(true);
    setMessage(null);
    setMessageType(null);

    try {
      const formData = new FormData();
      formData.append('userId', 'user-with-settings');
      formData.append('input_type', inputType);
      formData.append('person_count', personCount);
      formData.append('language', language);

      if (inputType === 'image' && imageFile) {
        formData.append('image', imageFile);
      } else if (inputType === 'video' && videoFile) {
        formData.append('video', videoFile);
      }

      formData.append('audio', audioFile);
      if (audioStart.trim()) formData.append('audio_start', audioStart.trim());
      if (audioEnd.trim()) formData.append('audio_end', audioEnd.trim());

      if (personCount === 'multi' && audioFile2) {
        formData.append('audio2', audioFile2);
        if (audio2Start.trim()) formData.append('audio2_start', audio2Start.trim());
        if (audio2End.trim()) formData.append('audio2_end', audio2End.trim());
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
          text: data.message || t('infiniteTalk.jobStarted')
        });
        setMessageType(null);

        // 백그라운드 처리이므로 즉시 완료 상태로 변경
        setIsGenerating(false);
        // 라이브러리 목록 즉시 갱신 요청 (썸네일/상태 반영)
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('jobs:refresh'));
          }
        } catch {}

        // 리다이렉트 제거: 현재 페이지에 유지하며 작업 정보/메시지만 표시

        // 입력 초기화
        setPrompt('');
        setImageFile(null);
        setVideoFile(null);
        setAudioFile(null);
        setAudioFile2(null);
        setPreviewUrl('');
        setAudioPreviewUrl('');
        setAudioPreviewUrl2('');
        setAudioStart('');
        setAudioEnd('');
        setAudio2Start('');
        setAudio2End('');
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (videoInputRef.current) videoInputRef.current.value = '';
        if (audioInputRef.current) audioInputRef.current.value = '';
        if (audioInputRef2.current) audioInputRef2.current.value = '';
      } else {
        const errorMessage = data.error || t('messages.error', { error: 'Infinite Talk generation failed' });
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Generation error:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : t('messages.error', { error: 'Unknown error occurred' }) });
      setMessageType(null);
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
    setMessageType(null);
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
                {t('common.prompt')} <span className="text-red-400">*</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('infiniteTalk.placeholder.prompt')}
                className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                disabled={isGenerating}
              />
            </div>

            {/* Media Upload (Image or Video) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {inputType === 'image' ? t('infiniteTalk.imageFile') : t('infiniteTalk.videoFile')} <span className="text-red-400">*</span>
              </label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                  isDragOver 
                    ? 'border-primary bg-primary/10 border-solid' 
                    : 'border-border hover:border-primary'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
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
                          {t('infiniteTalk.removeImage')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <PhotoIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          {isDragOver ? t('infiniteTalk.dragAndDrop.dropHere') : t('infiniteTalk.dragAndDrop.selectOrDragImage')}
                        </p>
                        {isDragOver && (
                          <p className="text-xs text-primary mb-2">
                            {t('infiniteTalk.dragAndDrop.dragImageFromLibrary')}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={isGenerating}
                          className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                        >
                          {t('infiniteTalk.selectImage')}
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
                          {t('infiniteTalk.removeVideo')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <VideoCameraIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          {isDragOver ? t('infiniteTalk.dragAndDrop.dropHere') : t('infiniteTalk.dragAndDrop.selectOrDragVideo')}
                        </p>
                        {isDragOver && (
                          <p className="text-xs text-primary mb-2">
                            {t('infiniteTalk.dragAndDrop.dragVideoFromLibrary')}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={isGenerating}
                          className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                        >
                          {t('infiniteTalk.selectVideo')}
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
                {t('infiniteTalk.firstAudioFile')} <span className="text-red-400">*</span>
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
                      {t('infiniteTalk.removeAudio')}
                    </button>
                  </div>
                ) : (
                  <>
                    <MusicalNoteIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('infiniteTalk.dragAndDrop.selectOrDragAudio')}
                    </p>
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      disabled={isGenerating}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                    >
                      {t('infiniteTalk.selectAudio')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Second Audio Upload (Multi-person only) */}
            {personCount === 'multi' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('infiniteTalk.secondAudioFile')} <span className="text-red-400">*</span>
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
                        {t('infiniteTalk.removeAudio')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <MusicalNoteIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('infiniteTalk.dragAndDrop.selectOrDragAudio2')}
                      </p>
                      <button
                        type="button"
                        onClick={() => audioInputRef2.current?.click()}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                      >
                        {t('infiniteTalk.selectSecondAudio')}
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
              <h3 className="text-lg font-semibold mb-4">{t('common.settings')}</h3>

              {/* Input Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">
                  {t('infiniteTalk.inputType')} <span className="text-red-400">*</span>
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
                    {t('infiniteTalk.image')}
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
                    {t('infiniteTalk.video')}
                  </button>
                </div>
              </div>

              {/* Person Count Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">
                  {t('infiniteTalk.personCount')} <span className="text-red-400">*</span>
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
                    {t('infiniteTalk.singlePerson')}
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
                    {t('infiniteTalk.multiPerson')}
                  </button>
                </div>
              </div>
              
              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('common.width')}
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
                    {t('common.height')}
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

            {/* Audio Trim Panel */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold mb-4">{t('infiniteTalk.audioTrim')}</h3>
              <p className="text-xs text-muted-foreground mb-3">{t('infiniteTalk.audioTrimDesc')}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('infiniteTalk.audioStartTime')}</label>
                  <input
                    type="text"
                    value={audioStart}
                    onChange={(e) => setAudioStart(e.target.value)}
                    placeholder={t('infiniteTalk.placeholder.time')}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('infiniteTalk.audioEndTime')}</label>
                  <input
                    type="text"
                    value={audioEnd}
                    onChange={(e) => setAudioEnd(e.target.value)}
                    placeholder={t('infiniteTalk.placeholder.endTime')}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {personCount === 'multi' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{t('infiniteTalk.audio2StartTime')}</label>
                    <input
                      type="text"
                      value={audio2Start}
                      onChange={(e) => setAudio2Start(e.target.value)}
                      placeholder={t('infiniteTalk.placeholder.startTime')}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={isGenerating}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{t('infiniteTalk.audio2EndTime')}</label>
                    <input
                      type="text"
                      value={audio2End}
                      onChange={(e) => setAudio2End(e.target.value)}
                      placeholder={t('infiniteTalk.placeholder.endTime2')}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={isGenerating}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={clearInputs}
                disabled={isGenerating}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {t('common.reset')}
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
                    {t('common.creating')}
                  </>
                ) : (
                  <>
                    <MicrophoneIcon className="w-5 h-5" />
                    {t('infiniteTalk.generateBtn')}
                  </>
                )}
              </button>
            </div>

            {/* Job Info */}
            {currentJobId && (
              <div className="bg-secondary p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold mb-4">{t('common.jobInfo')}</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="font-medium">Job ID:</span> {currentJobId}</p>
                  <p><span className="font-medium">{t('common.status')}:</span> {t('common.processing')}</p>
                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      ✅ {t('infiniteTalk.jobStarted')}
                    </p>
                    <p className="text-blue-200 text-xs mt-2">
                      {t('messages.jobInProgress')}
                    </p>
                    <p className="text-blue-200 text-xs">
                      {t('messages.checkLibrary')}
                    </p>
                    <p className="text-blue-200 text-xs">
                      {t('messages.autoUpdate')}
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
