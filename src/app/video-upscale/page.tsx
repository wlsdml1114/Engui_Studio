'use client';

import { useState, useRef, useEffect } from 'react';
import { VideoCameraIcon, ArrowUpIcon } from '@heroicons/react/24/outline';

export default function VideoUpscalePage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [taskType, setTaskType] = useState<'upscale' | 'upscale_and_interpolation'>('upscale');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setMessage({ type: 'success', text: '이전 작업의 입력값이 자동으로 로드되었습니다!' });
          
          // 로컬 스토리지에서 데이터 제거 (한 번만 사용)
          localStorage.removeItem('reuseInputs');
        }
      } catch (error) {
        console.error('입력값 로드 중 오류:', error);
      }
    }
  }, []);

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpscale = async () => {
    if (!videoFile) {
      setMessage({ type: 'error', text: '비디오 파일을 선택해주세요.' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('userId', 'user-with-settings');
      formData.append('video', videoFile);
      formData.append('task_type', taskType);

      const response = await fetch('/api/video-upscale', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success && data.jobId) {
        setCurrentJobId(data.jobId);
        setMessage({ type: 'success', text: data.message || '비디오 업스케일 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.' });
        
        // 백그라운드 처리이므로 즉시 완료 상태로 변경
        setIsProcessing(false);
      } else {
        throw new Error(data.error || '비디오 업스케일 요청에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Video upscale error:', error);
      setMessage({ type: 'error', text: error.message || '비디오 업스케일 중 오류가 발생했습니다.' });
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setVideoFile(null);
    setPreviewUrl('');
    setTaskType('upscale');
    setMessage(null);
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
          <h1 className="text-3xl font-bold text-foreground">Video Upscale</h1>
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
                비디오 파일 <span className="text-red-400">*</span>
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
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
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                    >
                      비디오 선택
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Task Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">
                작업 타입 <span className="text-red-400">*</span>
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
                  Upscale
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
                  Upscale & Interpolation
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Settings & Preview */}
          <div className="space-y-6">
            {/* Settings */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold mb-4">설정</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    작업 타입 설명
                  </label>
                  <div className="text-sm text-muted-foreground bg-background p-3 rounded-lg">
                    <p><strong>Upscale:</strong> 비디오 해상도를 높입니다</p>
                    <p><strong>Upscale & Interpolation:</strong> 비디오 해상도를 높이고 프레임 보간을 수행합니다</p>
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
                초기화
              </button>
              <button
                onClick={handleUpscale}
                disabled={isProcessing || !videoFile}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    처리 중...
                  </>
                ) : (
                  <>
                    <ArrowUpIcon className="w-5 h-5" />
                    비디오 업스케일
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
                      ✅ 비디오 업스케일 작업이 백그라운드에서 처리되고 있습니다.
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
