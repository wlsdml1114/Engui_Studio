'use client';

import { useState, useRef } from 'react';
import { PhotoIcon, SparklesIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface FluxKontextSettings {
  width: number;
  height: number;
  seed: number;
  cfg: number;
}

export default function FluxKontextPage() {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [settings, setSettings] = useState<FluxKontextSettings>({
    width: 512,
    height: 512,
    seed: -1,
    cfg: 7.5
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 작업 상태 확인 함수
  const checkJobStatus = async (jobId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/jobs?jobId=${jobId}`);
      const data = await response.json();
      
      if (data.success && data.job) {
        const job = data.job;
        
        if (job.status === 'completed') {
          setResultImage(job.resultUrl || '');
          setMessage({ type: 'success', text: '이미지 생성이 완료되었습니다!' });
          setIsGenerating(false);
          return true;
        } else if (job.status === 'failed') {
          setMessage({ type: 'error', text: '이미지 생성에 실패했습니다.' });
          setIsGenerating(false);
          return true;
        } else if (job.status === 'processing') {
          // 진행 중인 상태 표시 (사용자에게 진행 상황 알림)
          setMessage({ type: 'success', text: '이미지 생성 중입니다. 잠시만 기다려주세요...' });
          return false; // 아직 완료되지 않음
        }
      }
      
      return false;
    } catch (error) {
      console.error('Job status check failed:', error);
      return false;
    }
  };

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
      setMessage({ type: 'error', text: '이미지와 프롬프트를 모두 입력해주세요.' });
      return;
    }

    setIsGenerating(true);
    setMessage(null);
    setResultImage('');

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
        setMessage({ type: 'success', text: '이미지 생성을 시작했습니다. 잠시만 기다려주세요...' });
        
        // 백그라운드에서 작업 상태 확인 (더 자주 체크)
        const checkStatus = async () => {
          const isCompleted = await checkJobStatus(data.jobId);
          if (!isCompleted) {
            // 3초 후 다시 확인 (더 빠른 응답)
            setTimeout(checkStatus, 3000);
          }
        };
        
        // 첫 번째 상태 확인 시작 (즉시 시작)
        checkStatus();
        
      } else {
        const errorMessage = data.error || '이미지 생성에 실패했습니다.';
        console.error('FLUX KONTEXT API error:', { response: response.status, data });
        setMessage({ type: 'error', text: errorMessage });
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('FLUX KONTEXT generation error:', error);
      let errorMessage = '이미지 생성 중 오류가 발생했습니다.';
      
      if (error instanceof Error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = '네트워크 연결을 확인해주세요.';
        } else {
          errorMessage = `오류: ${error.message}`;
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

  return (
    <div className="min-h-screen bg-background p-6">
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
                입력 이미지
              </h2>
              
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors"
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
                placeholder="생성하고 싶은 이미지에 대한 상세한 설명을 입력하세요..."
                className="w-full h-32 p-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <p className="text-sm text-foreground/60 mt-2">
                💡 구체적이고 자세한 설명일수록 더 좋은 결과를 얻을 수 있습니다.
              </p>
            </div>
          </div>

          {/* Right Column - Settings & Generate */}
          <div className="space-y-6">
            {/* Detail Settings */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5" />
                디테일 설정
              </h2>
              
              <div className="space-y-4">
                {/* Image Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">
                      가로 크기
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
                      세로 크기
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
                      SEED 값
                    </label>
                    <button
                      onClick={resetSeed}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      랜덤
                    </button>
                  </div>
                  <input
                    type="number"
                    value={settings.seed}
                    onChange={(e) => updateSetting('seed', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="-1"
                  />
                  <p className="text-xs text-foreground/60 mt-1">
                    💡 -1은 랜덤, 고정값은 동일한 결과 생성
                  </p>
                </div>

                {/* Guidance */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Guidance 값
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
                    💡 높을수록 프롬프트를 더 엄격하게 따름 (7.5 권장)
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
                    생성 중...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    이미지 생성하기
                  </>
                )}
              </button>
              
              <p className="text-xs text-foreground/60 mt-3 text-center">
                이미지 생성에는 몇 분 정도 소요될 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Result Display */}
        {resultImage && (
          <div className="mt-8 bg-secondary p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-4">생성된 이미지</h2>
            <div className="flex justify-center">
              <img 
                src={resultImage} 
                alt="Generated" 
                className="max-w-full max-h-96 rounded-lg shadow-lg"
              />
            </div>
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={() => window.open(resultImage, '_blank')}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors"
              >
                새 탭에서 보기
              </button>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = resultImage;
                  link.download = `flux-kontext-${Date.now()}.png`;
                  link.click();
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                다운로드
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
