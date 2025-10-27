'use client';

import { useState, useRef, useEffect } from 'react';
import { PhotoIcon, PlayIcon, Cog6ToothIcon, FilmIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useI18n } from '@/lib/i18n/context';

export default function WanAnimatePage() {
  const { t, language } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>('');

  // 메시지 타입을 저장하여 언어 변경 시 재번역 가능하게 함
  const [messageType, setMessageType] = useState<'inputsLoaded' | null>(null);
  
  // 추가 설정값들
  const [seed, setSeed] = useState(-1);
  const [cfg, setCfg] = useState(1.0);
  const [steps, setSteps] = useState(4);
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [mode, setMode] = useState<'animate' | 'replace'>('replace');
  
  // 인물 선택 관련 상태
  const [showPersonSelection, setShowPersonSelection] = useState(false);
  const [firstFrameImage, setFirstFrameImage] = useState<string>('');
  const [selectedPoints, setSelectedPoints] = useState<Array<{x: number, y: number}>>([]);
  
  // 비디오 크기 및 FPS 정보
  const [originalVideoSize, setOriginalVideoSize] = useState<{width: number, height: number} | null>(null);
  const [videoFps, setVideoFps] = useState<number | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // 64의 배수 검증 함수
  const isValidSize = (value: number) => value % 64 === 0;
  
  // 64의 배수로 조정하는 함수
  const adjustToMultipleOf64 = (value: number) => Math.round(value / 64) * 64;

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
        if (data.type === 'wan-animate') {
          // 프롬프트 로드
          if (data.prompt) {
            setPrompt(data.prompt);
          }

          // 이미지 로드 및 File 객체 생성
          if (data.imagePath) {
            setImagePreviewUrl(data.imagePath);

            // URL에서 File 객체 생성
            createFileFromUrl(data.imagePath, 'reused_image.jpg', 'image/jpeg')
              .then(file => {
                setImageFile(file);
              })
              .catch(error => {
                console.error('Failed to load image:', error);
              });
          }

          // 비디오 로드 및 File 객체 생성
          if (data.videoPath) {
            setVideoPreviewUrl(data.videoPath);

            // URL에서 File 객체 생성
            createFileFromUrl(data.videoPath, 'reused_video.mp4', 'video/mp4')
              .then(file => {
                setVideoFile(file);

                // 첫 번째 프레임 추출
                extractFirstFrame(data.videoPath);
              })
              .catch(error => {
                console.error('Failed to load video:', error);
              });
          }

          // 설정값 로드
          if (data.options) {
            const options = data.options;
            if (options.seed !== undefined) setSeed(options.seed);
            if (options.cfg !== undefined) setCfg(options.cfg);
            if (options.steps !== undefined) setSteps(options.steps);
            if (options.width !== undefined) setWidth(options.width);
            if (options.height !== undefined) setHeight(options.height);
          }

          // Mode 로드
          if (data.mode) {
            setMode(data.mode as 'animate' | 'replace');
          }

          // 성공 메시지 표시
          setMessage({ type: 'success', text: t('messages.inputsLoaded') });
          setMessageType('inputsLoaded');

          // 로컬 스토리지에서 데이터 제거 (한 번만 사용)
          localStorage.removeItem('reuseInputs');
        }
      } catch (error) {
        console.error('Failed to load reuse inputs:', error);
      }
    }
  }, [language]);

  // 언어 변경 시 메시지 재번역
  useEffect(() => {
    if (messageType === 'inputsLoaded') {
      setMessage({ type: 'success', text: t('messages.inputsLoaded') });
    }
  }, [language, messageType]);


  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      
      // 첫 번째 프레임 추출
      extractFirstFrame(url);
    }
  };

  const extractFirstFrame = (videoUrl: string) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.addEventListener('loadedmetadata', () => {
      // 원본 비디오 크기 저장
      setOriginalVideoSize({
        width: video.videoWidth,
        height: video.videoHeight
      });
      
      // FPS 추출 (duration과 frameCount를 이용한 근사치)
      // 정확한 FPS는 브라우저에서 직접 접근할 수 없으므로 duration 기반으로 추정
      const duration = video.duration;
      if (duration && duration > 0) {
        // 일반적인 FPS 값들 중에서 가장 가까운 값으로 추정
        const commonFps = [24, 25, 30, 50, 60];
        let estimatedFps = 30; // 기본값
        
        // duration이 짧으면 높은 FPS일 가능성이 높음
        if (duration < 1) {
          estimatedFps = 60;
        } else if (duration < 3) {
          estimatedFps = 30;
        } else {
          estimatedFps = 24;
        }
        
        setVideoFps(estimatedFps);
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      video.addEventListener('seeked', () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const imageDataUrl = canvas.toDataURL('image/png');
          setFirstFrameImage(imageDataUrl);
        }
      });
      
      video.currentTime = 0.1; // 첫 번째 프레임으로 이동
    });
    
    video.src = videoUrl;
    video.load();
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreviewUrl('');
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const clearVideo = () => {
    setVideoFile(null);
    setVideoPreviewUrl('');
    setFirstFrameImage('');
    setShowPersonSelection(false);
    setSelectedPoints([]);
    setOriginalVideoSize(null);
    setVideoFps(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handlePersonSelection = () => {
    if (firstFrameImage) {
      setShowPersonSelection(true);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!showPersonSelection) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    // 픽셀 좌표로 계산 (원본 이미지 크기 기준)
    const x = ((e.clientX - rect.left) / rect.width) * (originalVideoSize?.width || rect.width);
    const y = ((e.clientY - rect.top) / rect.height) * (originalVideoSize?.height || rect.height);
    
    setSelectedPoints(prev => [...prev, { x, y }]);
  };

  const removePoint = (index: number) => {
    setSelectedPoints(prev => prev.filter((_, i) => i !== index));
  };

  const finishPersonSelection = () => {
    setShowPersonSelection(false);
  };

  // 좌표를 출력 크기에 맞게 조정하는 함수
  const adjustCoordinatesToOutputSize = (points: Array<{x: number, y: number}>) => {
    if (!originalVideoSize) return points;
    
    const scaleX = width / originalVideoSize.width;
    const scaleY = height / originalVideoSize.height;
    
    const adjustedPoints = points.map(point => ({
      x: point.x * scaleX,
      y: point.y * scaleY
    }));

    return adjustedPoints;
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
          return;
        }
      }

      if (!dragData || dragData.type !== 'library-result') {
        return;
      }

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
        try {
          if (isVideo) {
            // 비디오 처리
            setVideoPreviewUrl(mediaUrl);
            const file = await createFileFromUrl(mediaUrl, 'dropped_video.mp4', 'video/mp4');
            setVideoFile(file);
            extractFirstFrame(mediaUrl);
          } else {
            // 이미지 처리
            setImagePreviewUrl(mediaUrl);
            const file = await createFileFromUrl(mediaUrl, 'dropped_image.jpg', 'image/jpeg');
            setImageFile(file);
          }
          
          setMessage({
            type: 'success',
            text: t('wanAnimate.dragAndDrop.reusedAsMedia', {
              jobType: dragData.jobType,
              isVideo: isVideo ? t('common.video') : t('common.image')
            })
          });
          setMessageType(null);
        } catch (error) {
          console.error('❌ 드롭된 미디어 File 객체 생성 실패:', error);
          setMessage({
            type: 'error',
            text: t('common.error.processingMedia')
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
      }

    } catch (error) {
      console.error('Error processing dropped data:', error);
      setMessage({
        type: 'error',
        text: t('common.error.processingDroppedData')
      });
      setMessageType(null);
    }
  };

  const generateVideo = async () => {
    if (!imageFile && !videoFile) {
      setMessage({ type: 'error', text: t('wanAnimate.inputRequired') });
      setMessageType(null);
      return;
    }

    if (!prompt.trim()) {
      setMessage({ type: 'error', text: t('wanAnimate.promptRequired') });
      setMessageType(null);
      return;
    }

    try {
      setIsGenerating(true);
      setMessage(null);
      setMessageType(null);

      const formData = new FormData();
      formData.append('language', language);
      formData.append('prompt', prompt);
      formData.append('seed', seed.toString());
      formData.append('cfg', cfg.toString());
      formData.append('steps', steps.toString());
      formData.append('width', width.toString());
      formData.append('height', height.toString());
      formData.append('mode', mode);
      // 비디오 FPS 추가 (기본값 30으로 설정)
      const fpsToSend = videoFps || 30;
      formData.append('fps', fpsToSend.toString());
      // 선택된 포인트들을 올바른 형식으로 변환하여 전송
      if (selectedPoints.length > 0) {
        // 좌표를 출력 크기에 맞게 조정
        const adjustedPoints = adjustCoordinatesToOutputSize(selectedPoints);

        // points_store 형식: {"positive": [...], "negative": [...]}
        const pointsStore = {
          positive: adjustedPoints,
          negative: [{ x: 0, y: 0 }] // 기본값
        };
        formData.append('points_store', JSON.stringify(pointsStore));

        // coordinates 형식: [{"x": ..., "y": ...}, ...]
        formData.append('coordinates', JSON.stringify(adjustedPoints));

        // neg_coordinates는 빈 배열
        formData.append('neg_coordinates', JSON.stringify([]));
      }
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      if (videoFile) {
        formData.append('video', videoFile);
      }

      const response = await fetch('/api/wan-animate', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setCurrentJobId(data.jobId);
        setMessage({ type: 'success', text: t('wanAnimate.generationStarted', { jobId: data.jobId }) });
        setMessageType(null);
      } else {
        setMessage({ type: 'error', text: data.error || t('common.error.generationFailed') });
        setMessageType(null);
      }
    } catch (error) {
      console.error('Failed to generate video:', error);
      setMessage({ type: 'error', text: t('common.error.generationError') });
      setMessageType(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <PlayIcon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">{t('wanAnimate.title')}</h1>
        </div>

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
          {/* 입력 섹션 */}
          <div className="space-y-6">
            {/* 프롬프트 입력 */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-primary" />
                {t('wanAnimate.prompt')}
              </h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('common.placeholder.prompt')}
                className="w-full h-32 p-3 border rounded-md bg-background resize-none"
              />
            </div>

            {/* 이미지 업로드 */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <PhotoIcon className="w-5 h-5 text-primary" />
                {t('wanAnimate.imageUpload')}
              </h2>
              
              <div className="space-y-4">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                
                <div
                  className={`w-full p-4 border-2 border-dashed rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                    isDragOver
                      ? 'border-primary bg-primary/10 border-solid'
                      : 'border-border hover:border-primary'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <PhotoIcon className="w-6 h-6" />
                  <span>{isDragOver ? t('wanAnimate.dragAndDrop.dropHere') : t('wanAnimate.dragAndDrop.selectImage')}</span>
                </div>

                {imagePreviewUrl && (
                  <div className="relative">
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      className="w-full h-48 object-contain rounded-lg bg-gray-800"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 비디오 업로드 */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FilmIcon className="w-5 h-5 text-primary" />
                {t('wanAnimate.videoUpload')}
              </h2>
              
              <div className="space-y-4">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="hidden"
                />
                
                <div
                  className={`w-full p-4 border-2 border-dashed rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                    isDragOver
                      ? 'border-primary bg-primary/10 border-solid'
                      : 'border-border hover:border-primary'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => videoInputRef.current?.click()}
                >
                  <FilmIcon className="w-6 h-6" />
                  <span>{isDragOver ? t('wanAnimate.dragAndDrop.dropHere') : t('wanAnimate.dragAndDrop.selectVideo')}</span>
                </div>

                {videoPreviewUrl && (
                  <div className="space-y-4">
                    <div className="relative">
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="w-full h-48 object-contain rounded-lg bg-black"
                      />
                      <button
                        onClick={clearVideo}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {firstFrameImage && (
                      <div className="space-y-2">
                        {/* 비디오 정보 표시 */}
                        {originalVideoSize && (
                          <div className="text-xs text-muted-foreground bg-gray-800 p-2 rounded">
                            <p>{t('common.videoSection.resolution')}: {originalVideoSize.width} × {originalVideoSize.height}</p>
                            {videoFps && <p>{t('common.videoSection.estimatedFps')}: {videoFps}</p>}
                            <p>{t('common.videoSection.outputResolution')}: {width} × {height}</p>
                          </div>
                        )}
                        
                        <button
                          onClick={handlePersonSelection}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          {t('wanAnimate.selectPerson')}
                        </button>
                        
                        {showPersonSelection && (
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground bg-blue-900/30 p-3 rounded-lg">
                              <p className="font-medium text-blue-300 mb-1">{t('wanAnimate.personSelection.title')}</p>
                              <p>{t('wanAnimate.personSelection.clickToSelect')}</p>
                              <p>{t('wanAnimate.personSelection.clickToDelete')}</p>
                              <p>{t('wanAnimate.personSelection.currentPoints', { count: selectedPoints.length })}</p>
                            </div>
                            <div className="relative">
                              <img
                                src={firstFrameImage}
                                alt="First Frame"
                                className="w-full h-48 object-contain rounded-lg cursor-crosshair bg-gray-800"
                                onClick={handleImageClick}
                              />
                              {selectedPoints.map((point, index) => {
                                // 픽셀 좌표를 화면 표시용 퍼센트로 변환
                                const displayX = (point.x / (originalVideoSize?.width || 1)) * 100;
                                const displayY = (point.y / (originalVideoSize?.height || 1)) * 100;
                                
                                return (
                                  <div
                                    key={index}
                                    className="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white transform -translate-x-3 -translate-y-3 cursor-pointer flex items-center justify-center text-white text-xs font-bold shadow-lg"
                                    style={{
                                      left: `${displayX}%`,
                                      top: `${displayY}%`
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removePoint(index);
                                    }}
                                    title={`포인트 ${index + 1}: (${Math.round(point.x)}, ${Math.round(point.y)})`}
                                  >
                                    {index + 1}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={finishPersonSelection}
                                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                              >
                                {t('wanAnimate.completeSelection', { count: selectedPoints.length })}
                              </button>
                              <button
                                onClick={() => setSelectedPoints([])}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                              >
                                {t('common.reset')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 생성 버튼 */}
            <button
              onClick={generateVideo}
              disabled={isGenerating || (!imageFile && !videoFile) || !prompt.trim() || !isValidSize(width) || !isValidSize(height)}
              className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {t('common.creating')}
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  {t('wanAnimate.generateBtn')}
                </>
              )}
            </button>
          </div>

          {/* 고급 설정 섹션 */}
          <div className="space-y-6">
            {/* 고급 설정 */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5 text-primary" />
                {t('wanAnimate.advancedSettings')}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Seed */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('common.seed')}</label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                    placeholder="-1 (랜덤)"
                    className="w-full p-2 border rounded-md bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('wanAnimate.randomSeed')}</p>
                </div>

                {/* CFG */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('wanAnimate.cfgScale')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={cfg}
                    onChange={(e) => setCfg(parseFloat(e.target.value) || 1.0)}
                    placeholder="1.0"
                    className="w-full p-2 border rounded-md bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('wanAnimate.guidanceDesc')}</p>
                </div>

                {/* Steps */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('common.steps')}</label>
                  <input
                    type="number"
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value) || 6)}
                    placeholder="6"
                    className="w-full p-2 border rounded-md bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('wanAnimate.stepsDesc')}</p>
                </div>

                {/* Width */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('common.width')}</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value) || 512)}
                    placeholder="512"
                    className={`w-full p-2 border rounded-md bg-background ${
                      !isValidSize(width) ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('wanAnimate.widthDesc')}
                    {originalVideoSize && (
                      <span className="text-blue-400 ml-2">
                        ({t('common.videoSection.original')}: {originalVideoSize.width}px)
                      </span>
                    )}
                  </p>
                  {!isValidSize(width) && (
                    <p className="text-xs text-red-400 mt-1">
                      ⚠️ {t('common.size.mustBeMultipleOf64')}. {t('common.size.recommended')}: {adjustToMultipleOf64(width)}px
                    </p>
                  )}
                </div>

                {/* Height */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('common.height')}</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value) || 512)}
                    placeholder="512"
                    className={`w-full p-2 border rounded-md bg-background ${
                      !isValidSize(height) ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('wanAnimate.heightDesc')}
                    {originalVideoSize && (
                      <span className="text-blue-400 ml-2">
                        ({t('common.videoSection.original')}: {originalVideoSize.height}px)
                      </span>
                    )}
                  </p>
                  {!isValidSize(height) && (
                    <p className="text-xs text-red-400 mt-1">
                      ⚠️ {t('common.size.mustBeMultipleOf64')}. {t('common.size.recommended')}: {adjustToMultipleOf64(height)}px
                    </p>
                  )}
                </div>

                {/* Mode Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode('replace')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        mode === 'replace'
                          ? 'bg-primary text-white'
                          : 'bg-background border border-border hover:border-primary'
                      }`}
                    >
                      Replace
                    </button>
                    <button
                      onClick={() => setMode('animate')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        mode === 'animate'
                          ? 'bg-primary text-white'
                          : 'bg-background border border-border hover:border-primary'
                      }`}
                    >
                      Animate
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(`wanAnimate.modeDescriptions.${mode}`)}
                  </p>
                </div>
              </div>
            </div>

            {/* 사용 안내 */}
            <div className="bg-blue-900/30 border border-blue-500/50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-blue-300">{t('wanAnimate.userGuide')}</h3>
              <div className="space-y-2 text-sm text-blue-200">
                <p>• {t('wanAnimate.videoUploadNote')}</p>
                <p>• {t('wanAnimate.clickToAddPoint')}</p>
                <p>• {t('wanAnimate.clickToRemovePoint')}</p>
                <p>• {t('wanAnimate.videoRatioNote')}</p>
                <p>• {t('wanAnimate.resolutionNote')}</p>
                <p className="text-yellow-300 font-medium">• {t('wanAnimate.sizeWarning')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
