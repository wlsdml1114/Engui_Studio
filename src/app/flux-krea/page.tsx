'use client';

import { useState, useEffect, useRef } from 'react';
import { PhotoIcon, SparklesIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { useI18n } from '@/lib/i18n/context';

interface LoRAFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
}

export default function FluxKreaPage() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [seed, setSeed] = useState(-1);
  const [guidance, setGuidance] = useState(1);
  const [model, setModel] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>('');
  
  // LoRA 관련 상태
  const [loraFiles, setLoraFiles] = useState<LoRAFile[]>([]);
  const [selectedLora, setSelectedLora] = useState('');
  const [loraWeight, setLoraWeight] = useState(1.0);
  const [loraLoading, setLoraLoading] = useState(false);

  // 재사용 데이터를 저장할 ref
  const pendingReuseData = useRef<any>(null);

  // 입력값 자동 로드 기능
  useEffect(() => {
    console.log('🔄 FLUX KREA 페이지 로드됨');
    const reuseData = localStorage.getItem('reuseInputs');
    console.log('📋 FLUX KREA 재사용 데이터:', reuseData);
    
    if (reuseData) {
      try {
        const data = JSON.parse(reuseData);
        console.log('📊 FLUX KREA 파싱된 데이터:', data);
        console.log('🎯 FLUX KREA 데이터 타입:', data.type);
        
        if (data.type === 'flux-krea') {
          console.log('✅ FLUX KREA 타입 매칭됨');
          // 프롬프트 로드
          if (data.prompt) {
            setPrompt(data.prompt);
          }
          
          // 설정값 로드
          if (data.options) {
            const options = data.options;
            console.log('⚙️ FLUX KREA 설정값 로드:', options);
            if (options.width) setWidth(options.width);
            if (options.height) setHeight(options.height);
            if (options.seed !== undefined) setSeed(options.seed);
            if (options.guidance !== undefined) setGuidance(options.guidance);
            if (options.model) setModel(options.model);
            
            // LoRA 설정을 나중에 적용하기 위해 저장
            console.log('🔍 LoRA 필드 확인:', {
              selectedLora: options.selectedLora,
              lora: options.lora,
              loraWeight: options.loraWeight
            });
            
            if (options.selectedLora || options.lora || options.loraWeight !== undefined) {
              const loraName = options.selectedLora || options.lora;
              console.log('🎨 FLUX KREA LoRA 설정 저장됨 (나중에 적용):', {
                selectedLora: loraName,
                loraWeight: options.loraWeight
              });
              pendingReuseData.current = {
                selectedLora: loraName,
                loraWeight: options.loraWeight
              };
            } else {
              console.log('⚠️ FLUX KREA LoRA 설정이 없음');
            }
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

  // LoRA 파일 목록 가져오기
  const fetchLoraFiles = async () => {
    try {
      setLoraLoading(true);
      
      // 먼저 볼륨 목록을 가져와서 첫 번째 볼륨을 사용
      const volumesResponse = await fetch('/api/s3-storage/volumes');
      if (!volumesResponse.ok) {
        throw new Error(t('s3Storage.errors.fileListFailed'));
      }
      const volumes = await volumesResponse.json();
      
      if (volumes.length === 0) {
        throw new Error(t('s3Storage.errors.volumeInitFailed'));
      }
      
      const volume = volumes[0].name;
      const response = await fetch(`/api/s3-storage/loras?volume=${encodeURIComponent(volume)}`);
      const data = await response.json();
      
      if (data.success) {
        setLoraFiles(data.files);
        console.log('📁 LoRA files loaded for FLUX KREA:', data.files);
        
        // 재사용 데이터가 있으면 LoRA 설정 적용
        if (pendingReuseData.current) {
          console.log('🎯 FLUX KREA LoRA 파일 목록 로드 완료, 재사용 설정 적용:', pendingReuseData.current);
          if (pendingReuseData.current.selectedLora) {
            setSelectedLora(pendingReuseData.current.selectedLora);
          }
          if (pendingReuseData.current.loraWeight !== undefined) {
            setLoraWeight(pendingReuseData.current.loraWeight);
          }
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
      setMessage({ type: 'error', text: t('s3Storage.errors.fileListFailed') });
    } finally {
      setLoraLoading(false);
    }
  };

  // 컴포넌트 마운트 시 LoRA 파일 목록 가져오기
  useEffect(() => {
    fetchLoraFiles();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setMessage({ type: 'error', text: t('fluxKrea.inputRequired') });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('userId', 'user-with-settings');
      formData.append('prompt', prompt);
      formData.append('width', width.toString());
      formData.append('height', height.toString());
      formData.append('seed', seed === -1 ? '42' : seed.toString());
      formData.append('guidance', guidance.toString());
      if (model.trim()) {
        formData.append('model', model);
      }
      
      // LoRA 파라미터 추가
      if (selectedLora) {
        console.log('🔍 Sending LoRA data for FLUX KREA:', { selectedLora, loraWeight });
        formData.append('lora', selectedLora);
        formData.append('loraWeight', loraWeight.toString());
      }

      const response = await fetch('/api/flux-krea', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success && data.jobId) {
        setCurrentJobId(data.jobId);
        setMessage({ type: 'success', text: data.message || t('fluxKrea.jobStarted') });
        
        // 백그라운드 처리이므로 즉시 완료 상태로 변경
        setIsGenerating(false);
        
        // 작업 정보는 유지하되 생성 중 상태는 해제
        // 사용자는 다른 작업을 할 수 있음
      } else {
        throw new Error(data.error || t('common.error.processingDroppedData'));
      }
    } catch (error: any) {
      console.error('Image generation error:', error);
      setMessage({ type: 'error', text: error.message || t('common.error.generationError') });
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setPrompt('');
    setWidth(1024);
    setHeight(1024);
    setSeed(-1);
    setGuidance(3.5);
    setModel('');
    setMessage(null);
    setCurrentJobId('');
    setIsGenerating(false);
    
    // LoRA 상태 초기화
    setSelectedLora('');
    setLoraWeight(1.0);
  };

  return (
    <div className="min-h-screen bg-background p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <PhotoIcon className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-foreground">{t('fluxKrea.title')}</h1>
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
                placeholder={t('common.placeholder.prompt')}
                className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                disabled={isGenerating}
              />
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
                    onChange={(e) => setWidth(parseInt(e.target.value) || 1024)}
                    min="512"
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
                    onChange={(e) => setHeight(parseInt(e.target.value) || 1024)}
                    min="512"
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
                    {t('common.guidance')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="0.1"
                    value={guidance}
                    onChange={(e) => setGuidance(parseFloat(e.target.value) )}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('fluxKrea.model')}
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={t('fluxKrea.modelPlaceholder')}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LoRA 파일 선택 */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">
                    {t('fluxKrea.loraOptional')}
                  </label>
                  <select
                    value={selectedLora}
                    onChange={(e) => setSelectedLora(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating || loraLoading}
                  >
                    <option value="">{t('fluxKrea.noLora')}</option>
                    {loraFiles.map((file) => (
                      <option key={file.key} value={file.name}>
                        {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* LoRA 가중치 설정 */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">
                    {t('fluxKrea.loraWeight')}
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={loraWeight}
                    onChange={(e) => setLoraWeight(parseFloat(e.target.value) || 1.0)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating || !selectedLora}
                  />
                </div>
              </div>
              
              {/* LoRA 파일 목록 새로고침 버튼 */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={fetchLoraFiles}
                  disabled={loraLoading || isGenerating}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white rounded-md transition-colors text-sm"
                >
                  {loraLoading ? t('common.loading') : t('videoGeneration.loraRefresh')}
                </button>
              </div>

              {/* LoRA 파일 목록 표시 (축소된 버전) */}
              {loraFiles.length === 0 && !loraLoading && (
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    {t('fluxKrea.loraNotAvailable')}
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
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {t('common.creating')}
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    {t('fluxKrea.generateBtn')}
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
                  <p><span className="font-medium">{t('common.status')}:</span> {t('videoUpscale.statusProcessing')}</p>
                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm">
                      ✅ {t('fluxKrea.jobStarted')}
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
