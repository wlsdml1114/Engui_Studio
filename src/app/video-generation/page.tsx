'use client';

import { useState, useRef, useEffect } from 'react';
import { PhotoIcon, SparklesIcon, Cog6ToothIcon, PlayIcon, CpuChipIcon, FilmIcon } from '@heroicons/react/24/outline';
import { thumbnailService, ThumbnailOptions } from '@/lib/thumbnailService';

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
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [width, setWidth] = useState(720);
  const [height, setHeight] = useState(480);
  const [seed, setSeed] = useState(-1);
  const [cfg, setCfg] = useState(2.5);
  const [length, setLength] = useState(81);
  const [step, setStep] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>('');
  
  // 썸네일 관련 상태
  const [thumbnailStatus, setThumbnailStatus] = useState<{ ffmpegAvailable: boolean; supportedFormats: string[] } | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // LoRA 관련 상태
  const [loraFiles, setLoraFiles] = useState<LoRAFile[]>([]);
  const [highFiles, setHighFiles] = useState<LoRAFile[]>([]);
  const [lowFiles, setLowFiles] = useState<LoRAFile[]>([]);
  const [loraCount, setLoraCount] = useState(0);
  const [loraPairs, setLoraPairs] = useState<LoRAPair[]>([]);
  const [loraLoading, setLoraLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL에서 File 객체를 생성하는 헬퍼 함수
  const createFileFromUrl = async (url: string, filename: string, mimeType: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: mimeType });
  };

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
          
          // 이미지 로드 및 File 객체 생성
          if (data.imagePath) {
            setPreviewUrl(data.imagePath);
            console.log('🔄 WAN 2.2 이미지 재사용:', data.imagePath);
            
            // URL에서 File 객체 생성
            createFileFromUrl(data.imagePath, 'reused_image.jpg', 'image/jpeg')
              .then(file => {
                setImageFile(file);
                console.log('✅ WAN 2.2 이미지 File 객체 생성 완료:', file.name);
              })
              .catch(error => {
                console.error('❌ WAN 2.2 이미지 File 객체 생성 실패:', error);
              });
          } else {
            console.log('⚠️ 이미지 경로가 없음');
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
          }
          
          // LoRA 설정을 나중에 적용하기 위해 저장
          if (data.options && data.options.loraPairs) {
            console.log('🎨 LoRA 설정 저장됨 (나중에 적용):', data.options.loraPairs);
            pendingReuseData.current = data.options.loraPairs;
          }
          
          // 성공 메시지 표시
          setMessage({ type: 'success', text: '이전 작업의 입력값이 자동으로 로드되었습니다!' });
          
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
  }, []);

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
      } else {
        console.error('Failed to load LoRA files:', data.error);
        if (data.message) {
          setMessage({ type: 'error', text: data.message });
        }
      }
    } catch (err) {
      console.error('❌ Error fetching LoRA files:', err);
      setMessage({ type: 'error', text: 'LoRA 파일을 불러오는 중 오류가 발생했습니다.' });
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
  }, []);

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

  // 썸네일 생성 함수
  const generateThumbnail = async (file: File) => {
    if (!thumbnailStatus?.ffmpegAvailable) {
      setMessage({ type: 'error', text: 'FFmpeg가 설치되지 않았습니다. 썸네일 생성 기능을 사용하려면 FFmpeg를 설치해주세요.' });
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
        setMessage({ type: 'success', text: '비디오 썸네일이 성공적으로 생성되었습니다.' });
      } else {
        setMessage({ type: 'error', text: result.error || '썸네일 생성에 실패했습니다.' });
      }
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      setMessage({ type: 'error', text: '썸네일 생성 중 오류가 발생했습니다.' });
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleGenerate = async () => {
    if (!imageFile || !prompt.trim()) {
      setMessage({ type: 'error', text: '이미지와 프롬프트를 모두 입력해주세요.' });
      return;
    }

    // LoRA pair 설정 검증
    const validPairs = loraPairs.filter(pair => 
      pair.high && pair.low && pair.high_weight > 0 && pair.low_weight > 0
    );
    if (loraCount > 0 && validPairs.length !== loraCount) {
      setMessage({ type: 'error', text: '모든 LoRA pair의 high/low 파일을 선택하고 가중치를 설정해주세요.' });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('userId', 'user-with-settings');
      formData.append('image', imageFile);
      formData.append('prompt', prompt);
      formData.append('width', width.toString());
      formData.append('height', height.toString());
      formData.append('seed', seed === -1 ? '42' : seed.toString());
      formData.append('cfg', cfg.toString());
      formData.append('length', length.toString());
      formData.append('step', step.toString());
      
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
        setMessage({ type: 'success', text: data.message || 'WAN 2.2 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.' });
        
        // 백그라운드 처리이므로 즉시 완료 상태로 변경
        setIsGenerating(false);
        
        // 작업 정보는 유지하되 생성 중 상태는 해제
        // 사용자는 다른 작업을 할 수 있음
      } else {
        throw new Error(data.error || '비디오 생성 요청에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Video generation error:', error);
      setMessage({ type: 'error', text: error.message || '비디오 생성 중 오류가 발생했습니다.' });
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setPrompt('');
    setImageFile(null);
    setPreviewUrl('');
    setThumbnailUrl('');
    setMessage(null);
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

      // 이미지 데이터 처리 (WAN 2.2는 이미지 입력이 필요)
      if (dragData.inputImagePath || dragData.imageUrl || dragData.thumbnailUrl) {
        const imageUrl = dragData.inputImagePath || dragData.imageUrl || dragData.thumbnailUrl;
        
        if (imageUrl) {
          console.log('🖼️ 이미지 드롭 처리:', imageUrl);
          
          // 이미지 미리보기 설정
          setPreviewUrl(imageUrl);
          
          // URL에서 File 객체 생성
          try {
            const file = await createFileFromUrl(imageUrl, 'dropped_image.jpg', 'image/jpeg');
            setImageFile(file);
            console.log('✅ 드롭된 이미지 File 객체 생성 완료');
            
            setMessage({ 
              type: 'success', 
              text: `라이브러리에서 ${dragData.jobType} 결과물을 입력 이미지로 사용했습니다!` 
            });
          } catch (error) {
            console.error('❌ 드롭된 이미지 File 객체 생성 실패:', error);
            setMessage({ 
              type: 'error', 
              text: '드롭된 이미지를 처리하는 중 오류가 발생했습니다.' 
            });
          }
        }
      } else {
        setMessage({ 
          type: 'error', 
          text: '이 드래그된 항목에는 이미지 데이터가 없습니다.' 
        });
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
        text: '드롭된 데이터를 처리하는 중 오류가 발생했습니다.' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <PlayIcon className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-foreground">WAN 2.2</h1>
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
                placeholder="예: A person walking in a beautiful garden..."
                className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                disabled={isGenerating}
              />
            </div>

            {/* 이미지/비디오 업로드 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                이미지/비디오 파일 <span className="text-red-400">*</span>
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
                  accept="image/*,video/*"
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
                            <p className="text-sm">썸네일 생성 중...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* 생성된 썸네일 표시 */}
                    {thumbnailUrl && (
                      <div className="space-y-2">
                        <p className="text-sm text-green-400 font-medium">생성된 썸네일:</p>
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
                            썸네일 다운로드
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
                      파일 제거
                    </button>
                  </div>
                ) : (
                  <>
                    <PhotoIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {isDragOver ? '🎯 여기에 놓으세요!' : '이미지 또는 비디오 파일을 선택하거나 드래그하세요'}
                    </p>
                    {isDragOver && (
                      <p className="text-xs text-primary mb-2">
                        라이브러리의 결과물을 여기에 드래그하세요
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isGenerating}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors disabled:opacity-50"
                    >
                      파일 선택
                    </button>
                    
                    {/* FFmpeg 상태 표시 */}
                    {thumbnailStatus && (
                      <div className="mt-4 p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <FilmIcon className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">비디오 썸네일 기능</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>FFmpeg 상태: {thumbnailStatus.ffmpegAvailable ? 
                            <span className="text-green-400">사용 가능</span> : 
                            <span className="text-red-400">설치 필요</span>
                          }</p>
                          <p>지원 형식: {thumbnailStatus.supportedFormats.join(', ')}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Settings & Preview */}
          <div className="space-y-6">
            {/* Settings */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold mb-4">설정</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    가로 크기
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
                    placeholder="720"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    세로 크기
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
                    placeholder="480"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Seed</label>
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
                      랜덤
                    </button>
                  </div>
                  <input
                    type="number"
                    value={seed === -1 ? '' : seed}
                    onChange={(e) => setSeed(e.target.value === '' ? -1 : parseInt(e.target.value) )}
                    placeholder="랜덤"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Guidance (cfg)
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
                      Length (16fps)
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
                      Step
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={step}
                      onChange={(e) => setStep(parseInt(e.target.value) || 10)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={isGenerating}
                      placeholder="10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* LoRA 설정 */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-4">
                <CpuChipIcon className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold">LoRA 모델 설정</h3>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  사용할 LoRA 개수 (0-3개)
                </label>
                <select
                  value={loraCount}
                  onChange={(e) => setLoraCount(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={isGenerating}
                >
                  <option value={0}>0개 (LoRA 사용 안함)</option>
                  <option value={1}>1개</option>
                  <option value={2}>2개</option>
                  <option value={3}>3개</option>
                </select>
              </div>

              {/* LoRA pair 설정 */}
              {loraCount > 0 && (
                <div className="space-y-4">
                  {Array.from({ length: loraCount }, (_, index) => (
                    <div key={index} className="border border-border rounded-lg p-4 bg-background/50">
                      <h4 className="font-medium mb-3 text-foreground">LoRA Pair {index + 1}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* High 파일 선택 */}
                        <div>
                          <label className="block text-sm font-medium mb-1 text-foreground">
                            High 파일 🔺
                          </label>
                          <select
                            value={loraPairs[index]?.high || ''}
                            onChange={(e) => updateLoraPair(index, 'high', e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            disabled={isGenerating || loraLoading}
                          >
                            <option value="">High 파일을 선택하세요</option>
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
                            Low 파일 🔻
                          </label>
                          <select
                            value={loraPairs[index]?.low || ''}
                            onChange={(e) => updateLoraPair(index, 'low', e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            disabled={isGenerating || loraLoading}
                          >
                            <option value="">Low 파일을 선택하세요</option>
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
                            High 가중치 (0.1 - 2.0)
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
                            Low 가중치 (0.1 - 2.0)
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
                  {loraLoading ? '로딩 중...' : 'LoRA 목록 새로고침'}
                </button>
              </div>

              {/* LoRA 파일 목록 표시 (축소된 버전) */}
              {loraFiles.length === 0 && !loraLoading && (
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    사용 가능한 LoRA 파일이 없습니다. 
                    <a href="/settings" className="text-blue-200 hover:underline ml-1">
                      설정 페이지
                    </a>에서 S3 스토리지를 먼저 설정하거나, 
                    <a href="/s3-storage" className="text-blue-200 hover:underline ml-1">
                      S3 스토리지
                    </a>에서 .safetensors 파일을 업로드하세요.
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
                초기화
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !imageFile || !prompt.trim()}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    생성 중...
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    WAN 2.2 생성
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
                      ✅ WAN 2.2 작업이 백그라운드에서 처리되고 있습니다.
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