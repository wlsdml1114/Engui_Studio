'use client';

import { useState, useRef, useEffect } from 'react';
import { PhotoIcon, SparklesIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useI18n } from '@/lib/i18n/context';

interface FluxKontextSettings {
  width: number;
  height: number;
  seed: number;
  cfg: number;
}

export default function FluxKontextPage() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [settings, setSettings] = useState<FluxKontextSettings>({
    width: 512,
    height: 512,
    seed: -1,
    cfg: 2.5
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  
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
        if (data.type === 'flux-kontext') {
          // 프롬프트 로드
          if (data.prompt) {
            setPrompt(data.prompt);
          }
          
          // 이미지 로드 및 File 객체 생성
          if (data.inputImagePath || data.inputImageName) {
            let imagePath = data.inputImagePath || `/results/${data.inputImageName}`;
            
            // 로컬 파일 경로인 경우 웹 경로로 변환
            if (imagePath.startsWith('file://') || imagePath.includes('C:/Users/') || imagePath.includes('C:\\Users\\')) {
              // 파일명만 추출하여 웹 경로로 변환
              const pathParts = imagePath.split(/[/\\]/);
              const fileName = pathParts[pathParts.length - 1];
              imagePath = `/results/${fileName}`;
              console.log('🔄 로컬 경로를 웹 경로로 변환:', imagePath);
            }
            
            setPreviewUrl(imagePath);
            console.log('🔄 FLUX KONTEXT 이미지 재사용:', imagePath);
            
            // URL에서 File 객체 생성
            createFileFromUrl(imagePath, 'reused_image.jpg', 'image/jpeg')
              .then(file => {
                setImageFile(file);
                console.log('✅ FLUX KONTEXT 이미지 File 객체 생성 완료:', file.name);
              })
              .catch(error => {
                console.error('❌ FLUX KONTEXT 이미지 File 객체 생성 실패:', error);
              });
          }
          
          // 설정값 로드
          if (data.options) {
            const options = data.options;
            if (options.width) setSettings(prev => ({ ...prev, width: options.width }));
            if (options.height) setSettings(prev => ({ ...prev, height: options.height }));
            if (options.seed !== undefined) setSettings(prev => ({ ...prev, seed: options.seed }));
            if (options.cfg !== undefined) setSettings(prev => ({ ...prev, cfg: options.cfg }));
          }
          
          // 성공 메시지 표시
          setMessage({ type: 'success', text: t('messages.inputsLoaded') });
          
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

  const handleGenerate = async () => {
    if (!imageFile || !prompt.trim()) {
      setMessage({ type: 'error', text: t('fluxKontext.inputRequired') });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('userId', 'user-with-settings');
      formData.append('image', imageFile);
      formData.append('prompt', prompt);
      formData.append('width', settings.width.toString());
      formData.append('height', settings.height.toString());
      formData.append('seed', settings.seed === -1 ? '42' : settings.seed.toString());
      formData.append('cfg', settings.cfg.toString());

      const response = await fetch('/api/flux-kontext', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success && data.jobId) {
        setCurrentJobId(data.jobId);
        setMessage({ type: 'success', text: t('fluxKontext.jobStarted') });
        
        // 백그라운드 처리이므로 즉시 완료 상태로 변경
        setIsGenerating(false);
        
        // 작업 정보는 유지하되 생성 중 상태는 해제
        // 사용자는 다른 작업을 할 수 있음
      } else {
        const errorMessage = data.error || t('common.error.generationFailed');
        console.error('FLUX KONTEXT API error:', { response: response.status, data });
        setMessage({ type: 'error', text: errorMessage });
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('FLUX KONTEXT generation error:', error);
      let errorMessage = t('common.error.generationError');

      if (error instanceof Error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = t('messages.error', { error: 'Network connection failed' });
        } else {
          errorMessage = t('messages.error', { error: error.message });
        }
      }

      setMessage({ type: 'error', text: errorMessage });
      setIsGenerating(false);
    }
  };

  const updateSetting = (key: keyof FluxKontextSettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [key]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }));
  };

  const resetSeed = () => {
    setSettings(prev => ({ ...prev, seed: -1 }));
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

      console.log('🎯 FLUX KONTEXT에 드롭된 데이터:', dragData);

      // 이미지 데이터 처리 (FLUX KONTEXT는 이미지 입력이 필요)
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
              text: t('fluxKontext.dragAndDrop.reusedAsInput', { jobType: dragData.jobType })
            });
          } catch (error) {
            console.error('❌ 드롭된 이미지 File 객체 생성 실패:', error);
            setMessage({
              type: 'error',
              text: t('common.error.processingDroppedData')
            });
          }
        }
      } else {
        setMessage({
          type: 'error',
          text: t('common.error.noMediaData')
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
        text: t('common.error.processingDroppedData')
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <SparklesIcon className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-foreground">FLUX KONTEXT</h1>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Upload */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <PhotoIcon className="w-5 h-5" />
                {t('fluxKontext.inputImage')}
              </h2>
              
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <div 
                  className={`w-full p-8 border-2 border-dashed rounded-lg relative transition-all duration-200 ${
                    isDragOver 
                      ? 'border-primary bg-primary/10 border-solid' 
                      : 'border-border hover:border-primary'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-w-full max-h-64 mx-auto rounded-lg"
                    />
                  ) : (
                    <div className="text-center text-foreground/60">
                      <PhotoIcon className="w-12 h-12 mx-auto mb-2" />
                      <p>{isDragOver ? t('fluxKontext.dragAndDrop.dropHere') : t('fluxKontext.dragAndDrop.clickToUpload')}</p>
                      <p className="text-sm">{isDragOver ? t('fluxKontext.dragAndDrop.dragFromLibrary') : t('fluxKontext.dragAndDrop.supportedFormats')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold mb-4">{t('fluxKontext.prompt')}</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('common.placeholder.prompt')}
                className="w-full h-32 p-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <p className="text-sm text-foreground/60 mt-2">
                {t('fluxKontext.promptTip')}
              </p>
            </div>
          </div>

          {/* Right Column - Settings & Generate */}
          <div className="space-y-6">
            {/* Detail Settings */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5" />
                {t('fluxKontext.detailSettings')}
              </h2>
              
              <div className="space-y-4">
                {/* Image Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                      {t('common.width')}
                    </label>
                    <input
                      type="number"
                      min="256"
                      max="1024"
                      step="64"
                      value={settings.width}
                      onChange={(e) => updateSetting('width', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                      {t('common.height')}
                    </label>
                    <input
                      type="number"
                      min="256"
                      max="1024"
                      step="64"
                      value={settings.height}
                      onChange={(e) => updateSetting('height', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Seed */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-foreground/80">
                      {t('fluxKontext.seedValue')}
                    </label>
                    <button
                      onClick={resetSeed}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      {t('common.random')}
                    </button>
                  </div>
                  <input
                    type="number"
                    value={settings.seed}
                    onChange={(e) => updateSetting('seed', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={t('common.placeholder.seed')}
                  />
                  <p className="text-xs text-foreground/60 mt-1">
                    {t('fluxKontext.seedTip')}
                  </p>
                </div>

                {/* Guidance */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    {t('fluxKontext.guidanceValue')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="0.5"
                    value={settings.cfg}
                    onChange={(e) => updateSetting('cfg', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-foreground/60 mt-1">
                    {t('fluxKontext.guidanceTip')}
                  </p>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <button
                onClick={handleGenerate}
                disabled={!imageFile || !prompt.trim() || isGenerating}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {t('common.creating')}
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    {t('fluxKontext.generateBtn')}
                  </>
                )}
              </button>

              <p className="text-xs text-foreground/60 mt-3 text-center">
                {t('fluxKontext.generationTime')}
              </p>
            </div>
          </div>
        </div>

        {/* Result Display */}
        {currentJobId && (
          <div className="mt-8 bg-secondary p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-4">{t('common.jobInfo')}</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><span className="font-medium">Job ID:</span> {currentJobId}</p>
              <p><span className="font-medium">{t('common.status')}:</span> {t('videoUpscale.statusProcessing')}</p>
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 text-sm">
                  ✅ {t('fluxKontext.jobStarted')}
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
  );
}
