'use client';

import { useState, useRef, useEffect } from 'react';
import { PhotoIcon, SparklesIcon, Cog6ToothIcon, PlayIcon, CpuChipIcon, FilmIcon } from '@heroicons/react/24/outline';
import { thumbnailService, ThumbnailOptions } from '@/lib/thumbnailService';
import { useI18n } from '@/lib/i18n/context';
import { createFileFromUrl, createFileFromReuseData } from '@/lib/fileUtils';

interface LoRAFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
}

interface LoRAPair {
  high: string;
  low: string;
  high_weight: number;
  low_weight: number;
}

export default function Wan22Page() {
  const { t, language } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [endImageFile, setEndImageFile] = useState<File | null>(null);
  const [endPreviewUrl, setEndPreviewUrl] = useState<string>('');
  const [width, setWidth] = useState(720);
  const [height, setHeight] = useState(480);
  const [seed, setSeed] = useState(-1);
  const [cfg, setCfg] = useState(1);
  const [length, setLength] = useState(81);
  const [step, setStep] = useState(10);
  const [contextOverlap, setContextOverlap] = useState(48);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>('');

  // 메시지 타입을 저장하여 언어 변경 시 재번역 가능하게 함
  const [messageType, setMessageType] = useState<'inputsLoaded' | null>(null);

  // 썸네일 관련 상태
  const [thumbnailStatus, setThumbnailStatus] = useState<{ ffmpegAvailable: boolean; supportedFormats: string[] } | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEndFrameDragOver, setIsEndFrameDragOver] = useState(false);

  // LoRA 관련 상태
  const [loraFiles, setLoraFiles] = useState<LoRAFile[]>([]);
  const [highFiles, setHighFiles] = useState<LoRAFile[]>([]);
  const [lowFiles, setLowFiles] = useState<LoRAFile[]>([]);
  const [loraCount, setLoraCount] = useState(0);
  const [loraPairs, setLoraPairs] = useState<LoRAPair[]>([]);
  const [loraLoading, setLoraLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);

  // LoRA 자동 선택 함수
  const applyLoraSettings = (loraPairs: LoRAPair[]) => {
    console.log('🎯 LoRA 설정 적용:', loraPairs);
    setLoraPairs(loraPairs);
    setLoraCount(loraPairs.length);
  };

  // 재사용 데이터를 저장할 ref
  const pendingReuseData = useRef<any>(null);

  // 입력값 자동 로드 기능
  useEffect(() => {
    const loadReuseData = async () => {
      console.log('🔄 Video Generation 페이지 로드됨');
      const reuseData = localStorage.getItem('reuseInputs');
      console.log('📋 재사용 데이터:', reuseData);

      if (reuseData) {
        try {
          const data = JSON.parse(reuseData);
          console.log('📊 파싱된 데이터:', data);
          console.log('🎯 데이터 타입:', data.type);

          if (data.type === 'wan22') {
            console.log('✅ WAN 2.2 타입 매칭됨');

            // 프롬프트 로드
            if (data.prompt) {
              setPrompt(data.prompt);
              console.log('📝 프롬프트 로드됨:', data.prompt);
            }

            // 이미지 로드 및 File 객체 생성 (헬퍼 함수 사용)
            const imageData = await createFileFromReuseData(data, 'imagePath', 'reused_image.jpg');
            if (imageData) {
              setPreviewUrl(imageData.previewUrl);
              setImageFile(imageData.file);
              console.log('✅ WAN 2.2 이미지 재사용 완료:', imageData.file.name);
            }

            // End frame 로드 및 File 객체 생성 (헬퍼 함수 사용)
            const endImageData = await createFileFromReuseData(data, 'endImagePath', 'reused_end_image.jpg');
            if (endImageData) {
              setEndPreviewUrl(endImageData.previewUrl);
              setEndImageFile(endImageData.file);
              console.log('✅ WAN 2.2 End frame 재사용 완료:', endImageData.file.name);
            }

            // 설정값 로드
            if (data.options) {
              const options = data.options;
              console.log('⚙️ 설정값 로드:', options);
              if (options.width) setWidth(options.width);
              if (options.height) setHeight(options.height);
              if (options.seed !== undefined) setSeed(options.seed);
              if (options.cfg !== undefined) setCfg(options.cfg);
              if (options.length) setLength(options.length);
              if (options.step) setStep(options.step);
              if (options.contextOverlap !== undefined) setContextOverlap(options.contextOverlap);
            }

            // LoRA 설정을 나중에 적용하기 위해 저장
            if (data.options && data.options.loraPairs) {
              console.log('🎨 LoRA 설정 저장됨 (나중에 적용):', data.options.loraPairs);
              pendingReuseData.current = data.options.loraPairs;
            }

            // 성공 메시지 표시
            setMessage({ type: 'success', text: t('messages.inputsLoaded') });
            setMessageType('inputsLoaded');

            // 로컬 스토리지에서 데이터 제거 (한 번만 사용)
            localStorage.removeItem('reuseInputs');
            console.log('🗑️ 재사용 데이터 제거됨');
          } else {
            console.log('❌ 타입이 일치하지 않음. 예상: wan22, 실제:', data.type);
          }
        } catch (error) {
          console.error('❌ 입력값 로드 중 오류:', error);
          console.error('❌ 오류 상세:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            reuseData: reuseData
          });
        }
      } else {
        console.log('ℹ️ 재사용할 데이터가 없음');
      }
    };

    loadReuseData();
  }, [language]);

  // 언어 변경 시 메시지 재번역
  useEffect(() => {
    if (messageType === 'inputsLoaded') {
      setMessage({ type: 'success', text: t('messages.inputsLoaded') });
    }
  }, [language, messageType]);

  // LoRA 파일 목록 가져오기
  const fetchLoraFiles = async () => {
    try {
      setLoraLoading(true);
      
      // 먼저 볼륨 목록을 가져와서 첫 번째 볼륨을 사용
      const volumesResponse = await fetch('/api/s3-storage/volumes');
      if (!volumesResponse.ok) {
        throw new Error('볼륨 목록을 가져올 수 없습니다.');
      }
      const volumes = await volumesResponse.json();
      
      if (volumes.length === 0) {
        throw new Error('사용 가능한 볼륨이 없습니다.');
      }
      
      const volume = volumes[0].name;
      const response = await fetch(`/api/s3-storage/loras?volume=${encodeURIComponent(volume)}`);
      const data = await response.json();
      
      if (data.success) {
        setLoraFiles(data.files);
        setHighFiles(data.highFiles || []);
        setLowFiles(data.lowFiles || []);
        console.log('📁 LoRA files loaded:', data.files);
        console.log('🔺 High files:', data.highFiles);
        console.log('🔻 Low files:', data.lowFiles);
        
        // 재사용 데이터가 있으면 LoRA 설정 적용
        if (pendingReuseData.current) {
          console.log('🎯 LoRA 파일 목록 로드 완료, 재사용 설정 적용:', pendingReuseData.current);
          applyLoraSettings(pendingReuseData.current);
          pendingReuseData.current = null; // 적용 후 초기화
        }
        
        // 성공적으로 목록을 가져왔으면 메시지 초기화
        setMessage(null);
        setMessageType(null);
      } else {
        console.error('Failed to load LoRA files:', data.error);
        if (data.message) {
          setMessage({ type: 'error', text: data.message });
          setMessageType(null);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching LoRA files:', err);
      setMessage({ type: 'error', text: t('s3Storage.errors.fileListFailed') });
      setMessageType(null);
    } finally {
      setLoraLoading(false);
    }
  };

  // LoRA 개수 변경 시 설정 초기화
  useEffect(() => {
    const newPairs = Array(loraCount).fill(null).map((_, index) => ({
      high: loraPairs[index]?.high || '',
      low: loraPairs[index]?.low || '',
      high_weight: loraPairs[index]?.high_weight || 1.0,
      low_weight: loraPairs[index]?.low_weight || 1.0
    }));
    setLoraPairs(newPairs);
  }, [loraCount]);

  // 컴포넌트 마운트 시 LoRA 파일 목록 가져오기 및 썸네일 상태 확인
  useEffect(() => {
    fetchLoraFiles();
    checkThumbnailStatus();
  }, [language]);

  // 썸네일 서비스 상태 확인
  const checkThumbnailStatus = async () => {
    try {
      const status = await thumbnailService.getStatus();
      setThumbnailStatus(status);
    } catch (error) {
      console.error('Failed to check thumbnail status:', error);
    }
  };

  // LoRA pair 설정 업데이트
  const updateLoraPair = (index: number, field: 'high' | 'low' | 'high_weight' | 'low_weight', value: string | number) => {
    const newPairs = [...loraPairs];
    newPairs[index] = {
      ...newPairs[index],
      [field]: field.includes('weight') ? parseFloat(value as string) || 0 : value
    };
    setLoraPairs(newPairs);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // 비디오 파일인 경우 썸네일 생성
      if (thumbnailService.isSupportedVideoFormat(file)) {
        generateThumbnail(file);
      } else {
        setThumbnailUrl('');
      }
    }
  };

  const handleEndImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setEndImageFile(file);
      const url = URL.createObjectURL(file);
      setEndPreviewUrl(url);
    }
  };

  // 썸네일 생성 함수
  const generateThumbnail = async (file: File) => {
    if (!thumbnailStatus?.ffmpegAvailable) {
      setMessage({ type: 'error', text: t('videoGeneration.ffmpegNotInstalled') });
      setMessageType(null);
      return;
    }

    setIsGeneratingThumbnail(true);
    setThumbnailUrl('');

    try {
      const options: ThumbnailOptions = {
        width: 320,
        height: 240,
        quality: 80
      };

      const result = await thumbnailService.generateThumbnail(file, options);

      if (result.success && result.thumbnail) {
        setThumbnailUrl(result.thumbnail);
        setMessage({ type: 'success', text: t('videoGeneration.thumbnailGenerated') });
        setMessageType(null);
      } else {
        setMessage({ type: 'error', text: result.error || t('videoGeneration.thumbnailGenerateFailed') });
        setMessageType(null);
      }
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      setMessage({ type: 'error', text: t('videoGeneration.thumbnailError') });
      setMessageType(null);
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleGenerate = async () => {
    if (!imageFile || !prompt.trim()) {
      setMessage({ type: 'error', text: t('videoGeneration.inputRequired') });
      setMessageType(null);
      return;
    }

    // LoRA pair 설정 검증
    const validPairs = loraPairs.filter(pair =>
      pair.high && pair.low && pair.high_weight > 0 && pair.low_weight > 0
    );
    if (loraCount > 0 && validPairs.length !== loraCount) {
      setMessage({ type: 'error', text: t('videoGeneration.loraPairsRequired') });
      setMessageType(null);
      return;
    }

    setIsGenerating(true);
    setMessage(null);
    setMessageType(null);

    try {
      const formData = new FormData();
      formData.append('userId', 'user-with-settings');
      formData.append('language', language);
      formData.append('image', imageFile);
      formData.append('prompt', prompt);
      formData.append('width', width.toString());
      formData.append('height', height.toString());
      formData.append('seed', seed === -1 ? '42' : seed.toString());
      formData.append('cfg', cfg.toString());
      formData.append('length', length.toString());
      formData.append('step', step.toString());
      formData.append('contextOverlap', contextOverlap.toString());

      // End frame이 있는 경우 추가
      if (endImageFile) {
        console.log('🔍 Frontend: Adding end frame to FormData:', {
          name: endImageFile.name,
          size: endImageFile.size,
          type: endImageFile.type
        });
        formData.append('endImage', endImageFile);
      } else {
        console.log('ℹ️ Frontend: No end frame file to add');
      }
      
      // LoRA pair 파라미터 추가
      console.log('🔍 Sending LoRA data:', { loraCount, validPairs });
      formData.append('loraCount', loraCount.toString());
      validPairs.forEach((pair, index) => {
        console.log(`🔍 Adding LoRA pair ${index}:`, pair);
        formData.append(`loraHigh_${index}`, pair.high);
        formData.append(`loraLow_${index}`, pair.low);
        formData.append(`loraHighWeight_${index}`, pair.high_weight.toString());
        formData.append(`loraLowWeight_${index}`, pair.low_weight.toString());
      });

      const response = await fetch('/api/wan22', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success && data.jobId) {
        setCurrentJobId(data.jobId);
        setMessage({ type: 'success', text: data.message || t('videoGeneration.jobStarted') });
        setMessageType(null);

        // 백그라운드 처리이므로 즉시 완료 상태로 변경
        setIsGenerating(false);

        // 작업 정보는 유지하되 생성 중 상태는 해제
        // 사용자는 다른 작업을 할 수 있음
      } else {
        throw new Error(data.error || t('messages.error', { error: 'Video generation request failed' }));
      }
    } catch (error: any) {
      console.error('Video generation error:', error);
      setMessage({ type: 'error', text: error.message || t('messages.error', { error: 'Video generation error occurred' }) });
      setMessageType(null);
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setPrompt('');
    setImageFile(null);
    setPreviewUrl('');
    setEndImageFile(null);
    setEndPreviewUrl('');
    setThumbnailUrl('');
    setMessage(null);
    setMessageType(null);
    setCurrentJobId('');
    setIsGenerating(false);
    setIsGeneratingThumbnail(false);

    // LoRA 상태 초기화
    setLoraCount(0);
    setLoraPairs([]);

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (endFileInputRef.current) {
      endFileInputRef.current.value = '';
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

      console.log('🎯 WAN 2.2에 드롭된 데이터:', dragData);

      // WAN 2.2는 이미지만 지원하므로 이미지 결과물만 처리
      const isImageResult = dragData.jobType === 'flux-kontext' || dragData.jobType === 'flux-krea';
      
      if (isImageResult && (dragData.inputImagePath || dragData.imageUrl || dragData.thumbnailUrl)) {
        const imageUrl = dragData.inputImagePath || dragData.imageUrl || dragData.thumbnailUrl;
        
        if (imageUrl) {
          console.log('🖼️ 이미지 드롭 처리:', imageUrl);
          
          // 이미지 미리보기 설정
          setPreviewUrl(imageUrl);
          
          // URL에서 File 객체 생성 (헬퍼 함수 사용)
          try {
            const file = await createFileFromUrl(imageUrl, 'dropped_image.jpg', 'image/jpeg');
            setImageFile(file);
            console.log('✅ 드롭된 이미지 File 객체 생성 완료');
            
            setMessage({
              type: 'success',
              text: t('videoGeneration.dragAndDrop.reusedAsInput', { jobType: dragData.jobType })
            });
            setMessageType(null);
          } catch (error) {
            console.error('❌ 드롭된 이미지 File 객체 생성 실패:', error);
            setMessage({
              type: 'error',
              text: t('infiniteTalk.dragAndDrop.processError')
            });
            setMessageType(null);
          }
        }
      } else {
        setMessage({
          type: 'error',
          text: t('videoGeneration.dragAndDrop.imageOnly', { jobType: dragData.jobType })
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
        text: t('infiniteTalk.dragAndDrop.processError')
      });
      setMessageType(null);
    }
  };

  // End Frame 전용 드래그 앤 드롭 핸들러들
  const handleEndFrameDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEndFrameDragOver(true);
  };

  const handleEndFrameDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEndFrameDragOver(false);
  };

  const handleEndFrameDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEndFrameDragOver(false);

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

      console.log('🎯 End Frame에 드롭된 데이터:', dragData);

      // WAN 2.2는 이미지만 지원하므로 이미지 결과물만 처리
      const isImageResult = dragData.jobType === 'flux-kontext' || dragData.jobType === 'flux-krea';

      if (isImageResult && (dragData.inputImagePath || dragData.imageUrl || dragData.thumbnailUrl)) {
        const imageUrl = dragData.inputImagePath || dragData.imageUrl || dragData.thumbnailUrl;

        if (imageUrl) {
          console.log('🖼️ End Frame 이미지 드롭 처리:', imageUrl);

          // End Frame 미리보기 설정
          setEndPreviewUrl(imageUrl);

          // URL에서 File 객체 생성 (헬퍼 함수 사용)
          try {
            const file = await createFileFromUrl(imageUrl, 'dropped_end_image.jpg', 'image/jpeg');
            setEndImageFile(file);
            console.log('✅ 드롭된 End Frame File 객체 생성 완료');

            setMessage({
              type: 'success',
              text: t('videoGeneration.dragAndDrop.reusedAsEndFrame', { jobType: dragData.jobType })
            });
            setMessageType(null);
          } catch (error) {
            console.error('❌ 드롭된 End Frame File 객체 생성 실패:', error);
            setMessage({
              type: 'error',
              text: t('infiniteTalk.dragAndDrop.processError')
            });
            setMessageType(null);
          }
        }
      } else {
        setMessage({
          type: 'error',
          text: t('videoGeneration.dragAndDrop.imageOnly', { jobType: dragData.jobType })
        });
        setMessageType(null);
        return;
      }

    } catch (error) {
      console.error('❌ End Frame 드롭 처리 중 오류:', error);
      setMessage({
        type: 'error',
        text: t('infiniteTalk.dragAndDrop.processError')
      });
      setMessageType(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <PlayIcon className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-foreground">{t('videoGeneration.title')}</h1>
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
                {t('videoGeneration.prompt')}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('common.placeholder.prompt')}
                className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                disabled={isGenerating}
              />
            </div>

            {/* 이미지 업로드 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('videoGeneration.imageFile')}
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
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isGenerating}
                />
                {previewUrl ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="max-w-full max-h-48 mx-auto rounded-lg"
                      />
                      {/* 썸네일 생성 중 표시 */}
                      {isGeneratingThumbnail && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <div className="text-white text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                            <p className="text-sm">{t('s3Storage.status.processing')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* 생성된 썸네일 표시 */}
                    {thumbnailUrl && (
                      <div className="space-y-2">
                        <p className="text-sm text-green-400 font-medium">Generated Thumbnail:</p>
                        <img 
                          src={thumbnailUrl} 
                          alt="Thumbnail" 
                          className="max-w-full max-h-32 mx-auto rounded-lg border border-green-500"
                        />
                        <div className="flex gap-2 justify-center">
                          <button
                            type="button"
                            onClick={() => thumbnailService.downloadThumbnail(thumbnailUrl, `thumbnail_${Date.now()}.jpg`)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                          >
                            {t('videoGeneration.thumbnailDownload')}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setPreviewUrl('');
                        setThumbnailUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                    >
                      {t('videoGeneration.removeFile')}
                    </button>
                  </div>
                ) : (
                  <>
                    <PhotoIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {isDragOver ? t('videoGeneration.dragAndDrop.dropHere') : t('videoGeneration.dragAndDrop.selectOrDrag')}
                    </p>
                    {isDragOver && (
                      <p className="text-xs text-primary mb-2">
                        {t('videoGeneration.dragAndDrop.dragFromLibrary')}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isGenerating}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                    >
                      {t('videoGeneration.selectFile')}
                    </button>
                    
                    {/* FFmpeg 상태 표시 블록 제거 */}
                  </>
                )}
              </div>
            </div>

            {/* End Frame Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('videoGeneration.endFrame')} {t('videoGeneration.endFrameOptional')}
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center relative transition-all duration-200 ${
                  isEndFrameDragOver
                    ? 'border-primary bg-primary/10 border-solid'
                    : 'border-border hover:border-primary'
                }`}
                onDragOver={handleEndFrameDragOver}
                onDragLeave={handleEndFrameDragLeave}
                onDrop={handleEndFrameDrop}
              >
                <input
                  ref={endFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEndImageUpload}
                  className="hidden"
                  disabled={isGenerating}
                />
                {endPreviewUrl ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={endPreviewUrl}
                        alt="End Frame Preview"
                        className="max-w-full max-h-32 mx-auto rounded-lg border border-green-500"
                      />
                      <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                        End Frame
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEndImageFile(null);
                        setEndPreviewUrl('');
                        if (endFileInputRef.current) endFileInputRef.current.value = '';
                      }}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                    >
                      {t('videoGeneration.removeEndFrame')}
                    </button>
                  </div>
                ) : (
                  <>
                    <PhotoIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mb-2">
                      {isEndFrameDragOver ? t('videoGeneration.dragAndDrop.dropHere') : t('videoGeneration.endFrameDesc')}
                    </p>
                    {isEndFrameDragOver && (
                      <p className="text-xs text-primary mb-2">
                        {t('videoGeneration.dragAndDrop.dragFromLibrary')}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => endFileInputRef.current?.click()}
                      disabled={isGenerating}
                      className="px-3 py-1 bg-secondary hover:bg-secondary/80 text-foreground rounded text-sm transition-colors disabled:opacity-50"
                    >
                      {t('videoGeneration.selectEndFrame')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Settings & Preview */}
          <div className="space-y-6">
            {/* Settings */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold mb-4">{t('common.settings')}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('common.width')}
                  </label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value) || 720)}
                    min="256"
                    max="2048"
                    step="64"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                    placeholder={t('common.placeholder.width')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('common.height')}
                  </label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value) || 480)}
                    min="256"
                    max="2048"
                    step="64"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                    placeholder={t('common.placeholder.height')}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('common.seed')}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSeed(-1)}
                      className={`px-3 py-1 rounded text-sm ${
                        seed === -1
                          ? 'bg-primary text-white'
                          : 'bg-background border border-border text-foreground hover:bg-background/80'
                      }`}
                      disabled={isGenerating}
                    >
                      {t('videoGeneration.random')}
                    </button>
                  </div>
                  <input
                    type="number"
                    value={seed === -1 ? '' : seed}
                    onChange={(e) => setSeed(e.target.value === '' ? -1 : parseInt(e.target.value) )}
                    placeholder={t('videoGeneration.random')}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('common.guidance')} (cfg)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={cfg}
                    onChange={(e) => setCfg(parseFloat(e.target.value) )}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('videoGeneration.length')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={length}
                      onChange={(e) => setLength(parseInt(e.target.value) || 81)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={isGenerating}
                      placeholder="81"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('common.steps')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={step}
                      onChange={(e) => setStep(parseInt(e.target.value) || 10)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={isGenerating}
                      placeholder={t('common.placeholder.steps')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('videoGeneration.contextOverlap')}
                    <span className="text-xs text-muted-foreground block mt-1">
                      {t('videoGeneration.contextOverlapDesc')}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={contextOverlap}
                    onChange={(e) => setContextOverlap(parseInt(e.target.value) || 48)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                    placeholder="48"
                  />
                </div>
              </div>
            </div>

            {/* LoRA 설정 */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-4">
                <CpuChipIcon className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold">{t('videoGeneration.loraSettings')}</h3>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  {t('videoGeneration.lora.pairNumber', { index: '0-4' })}
                </label>
                <select
                  value={loraCount}
                  onChange={(e) => setLoraCount(Math.min(parseInt(e.target.value), 4))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={isGenerating}
                >
                  <option value={0}>0 (No LoRA)</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>

              {/* LoRA pair 설정 */}
              {loraCount > 0 && (
                <div className="space-y-4">
                  {Array.from({ length: loraCount }, (_, index) => (
                    <div key={index} className="border border-border rounded-lg p-4 bg-background/50">
                      <h4 className="font-medium mb-3 text-foreground">{t('videoGeneration.lora.pairNumber', { index: index + 1 })}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* High 파일 선택 */}
                        <div>
                          <label className="block text-sm font-medium mb-1 text-foreground">
                            {t('videoGeneration.lora.highFile')}
                          </label>
                          <select
                            value={loraPairs[index]?.high || ''}
                            onChange={(e) => updateLoraPair(index, 'high', e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            disabled={isGenerating || loraLoading}
                          >
                            <option value="">{t('videoGeneration.lora.selectHigh')}</option>
                            {highFiles.map((file) => (
                              <option key={file.key} value={file.name}>
                                {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Low 파일 선택 */}
                        <div>
                          <label className="block text-sm font-medium mb-1 text-foreground">
                            {t('videoGeneration.lora.lowFile')}
                          </label>
                          <select
                            value={loraPairs[index]?.low || ''}
                            onChange={(e) => updateLoraPair(index, 'low', e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            disabled={isGenerating || loraLoading}
                          >
                            <option value="">{t('videoGeneration.lora.selectLow')}</option>
                            {lowFiles.map((file) => (
                              <option key={file.key} value={file.name}>
                                {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* High 가중치 설정 */}
                        <div>
                          <label className="block text-sm font-medium mb-1 text-foreground">
                            {t('videoGeneration.lora.highWeight')}
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            max="2.0"
                            step="0.1"
                            value={loraPairs[index]?.high_weight || 1.0}
                            onChange={(e) => updateLoraPair(index, 'high_weight', e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            disabled={isGenerating}
                          />
                        </div>
                        
                        {/* Low 가중치 설정 */}
                        <div>
                          <label className="block text-sm font-medium mb-1 text-foreground">
                            {t('videoGeneration.lora.lowWeight')}
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            max="2.0"
                            step="0.1"
                            value={loraPairs[index]?.low_weight || 1.0}
                            onChange={(e) => updateLoraPair(index, 'low_weight', e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            disabled={isGenerating}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LoRA 목록 새로고침 버튼 */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={fetchLoraFiles}
                  disabled={loraLoading || isGenerating}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white rounded-md transition-colors text-sm"
                >
                  {loraLoading ? t('videoGeneration.lora.loading') : t('videoGeneration.loraRefresh')}
                </button>
              </div>

              {/* LoRA 파일 목록 표시 (축소된 버전) */}
              {loraFiles.length === 0 && !loraLoading && (
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    {t('videoGeneration.loraNotAvailable')}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleReset}
                disabled={isGenerating}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {t('common.reset')}
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !imageFile || !prompt.trim()}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {t('common.creating')}
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    {t('videoGeneration.generateBtn')}
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
                  <p><span className="font-medium">{t('s3Storage.status')}:</span> {t('s3Storage.status.processing')}</p>
                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      ✅ {t('videoGeneration.jobStarted')}
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