'use client';

import { useState, useRef, useEffect } from 'react';
import { VideoCameraIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import { useI18n } from '@/lib/i18n/context';

export default function VideoUpscalePage() {
  const { t, language } = useI18n();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [taskType, setTaskType] = useState<'upscale' | 'upscale_and_interpolation'>('upscale');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>('');

  // 메시지 타입을 저장하여 언어 변경 시 재번역 가능하게 함
  const [messageType, setMessageType] = useState<'inputsLoaded' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
        if (data.type === 'video-upscale') {
          // 비디오 로드 및 File 객체 생성
          if (data.videoPath) {
            setPreviewUrl(data.videoPath);
            console.log('🔄 Video Upscale 비디오 재사용:', data.videoPath);
            
            // URL에서 File 객체 생성
            createFileFromUrl(data.videoPath, 'reused_video.mp4', 'video/mp4')
              .then(file => {
                setVideoFile(file);
                console.log('✅ Video Upscale 비디오 File 객체 생성 완료:', file.name);
              })
              .catch(error => {
                console.error('❌ Video Upscale 비디오 File 객체 생성 실패:', error);
              });
          }
          
          // 설정값 로드
          if (data.options) {
            const options = data.options;
            if (options.taskType) setTaskType(options.taskType);
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

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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

      console.log('🎯 Video Upscale에 드롭된 데이터:', dragData);

      // 비디오 데이터 처리 (Video Upscale은 비디오만 지원)
      const videoUrl = dragData.videoUrl || dragData.resultUrl || dragData.mediaUrl || dragData.thumbnailUrl;
      
      if (videoUrl) {
        console.log('🎬 비디오 드롭 처리:', videoUrl);
        console.log('🔍 드래그 데이터 상세:', {
          videoUrl: dragData.videoUrl,
          resultUrl: dragData.resultUrl,
          thumbnailUrl: dragData.thumbnailUrl,
          mediaUrl: dragData.mediaUrl,
          jobType: dragData.jobType
        });
        
        // 비디오 미리보기 설정
        setPreviewUrl(videoUrl);
        
        // URL에서 File 객체 생성
        try {
          console.log('📥 비디오 파일 다운로드 시작:', videoUrl);
          const file = await createFileFromUrl(videoUrl, 'dropped_video.mp4', 'video/mp4');
          setVideoFile(file);
          console.log('✅ 드롭된 비디오 File 객체 생성 완료:', file.name, file.size, 'bytes');
          
          setMessage({
            type: 'success',
            text: t('videoUpscale.dragAndDrop.reusedAsVideo', { jobType: dragData.jobType })
          });
          setMessageType(null);
        } catch (error) {
          console.error('❌ 드롭된 비디오 File 객체 생성 실패:', error);
          console.error('❌ 실패한 URL:', videoUrl);
          setMessage({
            type: 'error',
            text: t('videoUpscale.dropVideoError', { url: videoUrl })
          });
          setMessageType(null);
        }
      } else {
        setMessage({
          type: 'error',
          text: t('videoUpscale.noVideoData')
        });
        setMessageType(null);
        return;
      }

    } catch (error) {
      console.error('❌ 드롭 처리 중 오류:', error);
      setMessage({
        type: 'error',
        text: t('videoUpscale.dropError')
      });
      setMessageType(null);
    }
  };

  const handleUpscale = async () => {
    if (!videoFile) {
      setMessage({ type: 'error', text: t('videoUpscale.videoRequired') });
      setMessageType(null);
      return;
    }

    setIsProcessing(true);
    setMessage(null);
    setMessageType(null);

    try {
      const formData = new FormData();
      formData.append('userId', 'user-with-settings');
      formData.append('video', videoFile);
      formData.append('task_type', taskType);
      formData.append('language', language);

      const response = await fetch('/api/video-upscale', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success && data.jobId) {
        setCurrentJobId(data.jobId);
        setMessage({ type: 'success', text: data.message || t('videoUpscale.jobStarted') });
        setMessageType(null);

        // 백그라운드 처리이므로 즉시 완료 상태로 변경
        setIsProcessing(false);
      } else {
        throw new Error(data.error || t('videoUpscale.upscaleRequestFailed'));
      }
    } catch (error: any) {
      console.error('Video upscale error:', error);
      setMessage({ type: 'error', text: error.message || t('videoUpscale.upscaleError') });
      setMessageType(null);
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setVideoFile(null);
    setPreviewUrl('');
    setTaskType('upscale');
    setMessage(null);
    setMessageType(null);
    setCurrentJobId('');
    setIsProcessing(false);

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <ArrowUpIcon className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-foreground">{t('videoUpscale.title')}</h1>
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
            {/* 비디오 업로드 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('videoUpscale.videoFile')}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                  disabled={isProcessing}
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
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                    >
                      {t('videoUpscale.removeVideo')}
                    </button>
                  </div>
                ) : (
                  <>
                    <VideoCameraIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {isDragOver ? t('videoUpscale.dragAndDrop.dropHere') : t('videoUpscale.dragAndDrop.selectOrDrag')}
                    </p>
                    {isDragOver && (
                      <p className="text-xs text-primary mb-2">
                        {t('videoUpscale.dragAndDrop.dragFromLibrary')}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                    >
                      {t('videoUpscale.selectVideo')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Task Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">
                {t('videoUpscale.jobType')}
              </label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setTaskType('upscale')}
                  disabled={isProcessing}
                  className={`p-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                    taskType === 'upscale'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border hover:border-primary text-foreground'
                  }`}
                >
                  <ArrowUpIcon className="w-5 h-5" />
                  {t('videoUpscale.upscale')}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskType('upscale_and_interpolation')}
                  disabled={isProcessing}
                  className={`p-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                    taskType === 'upscale_and_interpolation'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border hover:border-primary text-foreground'
                  }`}
                >
                  <ArrowUpIcon className="w-5 h-5" />
                  {t('videoUpscale.upscaleInterpolation')}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Settings & Preview */}
          <div className="space-y-6">
            {/* Settings */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold mb-4">{t('videoUpscale.settings')}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('videoUpscale.jobTypeDesc')}
                  </label>
                  <div className="text-sm text-muted-foreground bg-background p-3 rounded-lg">
                    <p><strong>{t('videoUpscale.upscale')}:</strong> {t('videoUpscale.upscaleDesc')}</p>
                    <p><strong>{t('videoUpscale.upscaleInterpolation')}:</strong> {t('videoUpscale.upscaleInterpolationDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleReset}
                disabled={isProcessing}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {t('videoUpscale.resetBtn')}
              </button>
              <button
                onClick={handleUpscale}
                disabled={isProcessing || !videoFile}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {t('videoUpscale.processingBtn')}
                  </>
                ) : (
                  <>
                    <ArrowUpIcon className="w-5 h-5" />
                    {t('videoUpscale.upscaleBtn')}
                  </>
                )}
              </button>
            </div>

            {/* Job Info */}
            {currentJobId && (
              <div className="bg-secondary p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold mb-4">{t('videoUpscale.jobInfo')}</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="font-medium">Job ID:</span> {currentJobId}</p>
                  <p><span className="font-medium">{t('common.status')}</span> {t('videoUpscale.statusProcessing')}</p>
                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      {t('videoUpscale.jobInfoText')}
                    </p>
                    <p className="text-blue-200 text-xs mt-2">
                      {t('videoUpscale.canPerformOtherTasks')}
                    </p>
                    <p className="text-blue-200 text-xs">
                      {t('videoUpscale.checkLibrary')}
                    </p>
                    <p className="text-blue-200 text-xs">
                      {t('videoUpscale.autoUpdateStatus')}
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
