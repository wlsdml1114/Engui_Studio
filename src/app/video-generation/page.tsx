'use client';

import { useState, useRef } from 'react';
import { PhotoIcon, SparklesIcon, Cog6ToothIcon, PlayIcon } from '@heroicons/react/24/outline';

interface Wan22Settings {
  width: number;
  height: number;
  seed: number;
  cfg: number;
}

export default function Wan22Page() {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [settings, setSettings] = useState<Wan22Settings>({
    width: 512,
    height: 512,
    seed: -1,
    cfg: 7.5
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultVideo, setResultVideo] = useState<string>('');
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
          setResultVideo(job.resultUrl || '');
          setMessage({ type: 'success', text: '비디오 생성이 완료되었습니다!' });
          setIsGenerating(false);
          return true;
        } else if (job.status === 'failed') {
          setMessage({ type: 'error', text: '비디오 생성에 실패했습니다.' });
          setIsGenerating(false);
          return true;
        } else if (job.status === 'processing') {
          // 진행 중인 상태 표시 (사용자에게 진행 상황 알림)
          setMessage({ type: 'success', text: '비디오 생성 중입니다. 잠시만 기다려주세요...' });
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
    setResultVideo('');

    try {
      const formData = new FormData();
      formData.append('userId', 'user-with-settings');
      formData.append('image', imageFile);
      formData.append('prompt', prompt);
      formData.append('width', settings.width.toString());
      formData.append('height', settings.height.toString());
      formData.append('seed', settings.seed === -1 ? '42' : settings.seed.toString());
      formData.append('cfg', settings.cfg.toString());

      const response = await fetch('/api/wan22', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success && data.jobId) {
        setCurrentJobId(data.jobId);
        setMessage({ type: 'success', text: '비디오 생성을 시작했습니다. 잠시만 기다려주세요...' });
        
        // 작업 상태 주기적 확인
        const checkInterval = setInterval(async () => {
          const isCompleted = await checkJobStatus(data.jobId);
          if (isCompleted) {
            clearInterval(checkInterval);
          }
        }, 5000); // 5초마다 확인
        
        // 10분 후 자동으로 인터벌 정리
        setTimeout(() => {
          clearInterval(checkInterval);
          if (isGenerating) {
            setMessage({ type: 'success', text: '비디오 생성이 진행 중입니다. 라이브러리에서 진행 상황을 확인하세요.' });
            setIsGenerating(false);
          }
        }, 600000); // 10분
        
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
    setResultVideo('');
    setMessage(null);
    setCurrentJobId('');
    setIsGenerating(false);
    
    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <PlayIcon className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-foreground">WAN 2.2</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Input */}
          <div className="lg:col-span-2 space-y-6">
            {/* 이미지 업로드 */}
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
                    <div className="text-center text-muted-foreground">
                      <PhotoIcon className="w-12 h-12 mx-auto mb-2" />
                      <p className="font-medium">이미지 선택하기</p>
                      <p className="text-sm">PNG, JPG, JPEG 파일 지원</p>
                    </div>
                  )}
                </button>

                {/* 이미지 제거 버튼 */}
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors"
                  >
                    이미지 제거
                  </button>
                )}
              </div>
            </div>

            {/* 프롬프트 입력 */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5" />
                프롬프트
              </h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="생성하고 싶은 비디오에 대한 상세한 설명을 입력하세요..."
                className="w-full h-32 px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring resize-none"
                disabled={isGenerating}
              />
            </div>

            {/* 설정 */}
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5" />
                생성 설정
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">너비 (px)</label>
                  <input
                    type="number"
                    value={settings.width}
                    onChange={(e) => setSettings(prev => ({ ...prev, width: parseInt(e.target.value) || 512 }))}
                    min="256"
                    max="2048"
                    step="64"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                    placeholder="512"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">높이 (px)</label>
                  <input
                    type="number"
                    value={settings.height}
                    onChange={(e) => setSettings(prev => ({ ...prev, height: parseInt(e.target.value) || 512 }))}
                    min="256"
                    max="2048"
                    step="64"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                    placeholder="512"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Seed</label>
                  <input
                    type="number"
                    value={settings.seed === -1 ? '' : settings.seed}
                    onChange={(e) => setSettings(prev => ({ ...prev, seed: e.target.value === '' ? -1 : parseInt(e.target.value) }))}
                    placeholder="랜덤"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">CFG Scale</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={settings.cfg}
                    onChange={(e) => setSettings(prev => ({ ...prev, cfg: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>

            {/* 생성 버튼 */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !imageFile || !prompt.trim()}
              className="w-full py-4 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-foreground"></div>
                  <span>비디오 생성 중...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <PlayIcon className="w-6 h-6" />
                  <span>비디오 생성하기</span>
                </div>
              )}
            </button>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* 메시지 */}
            {message && (
              <div className={`p-4 rounded-lg border ${
                message.type === 'success' 
                  ? 'bg-green-900/50 border-green-500 text-green-200' 
                  : 'bg-red-900/50 border-red-500 text-red-200'
              }`}>
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            {/* 결과 비디오 */}
            {resultVideo && (
              <div className="bg-secondary p-6 rounded-lg border border-border">
                <h3 className="text-xl font-semibold mb-4">생성된 비디오</h3>
                <video
                  src={resultVideo}
                  controls
                  className="w-full rounded-lg bg-background"
                  onError={(e) => console.error('Video error:', e)}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {/* 작업 정보 */}
            {currentJobId && (
              <div className="bg-secondary p-6 rounded-lg border border-border">
                <h3 className="text-xl font-semibold mb-4">작업 정보</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="font-medium">Job ID:</span> {currentJobId}</p>
                  <p><span className="font-medium">상태:</span> {isGenerating ? '처리 중' : '완료'}</p>
                  {!isGenerating && (
                    <p className="text-green-400">
                      ✅ 비디오 생성이 완료되었습니다! 라이브러리에서 확인하세요.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 사용 팁 */}
            <div className="bg-muted p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold mb-3">💡 사용 팁</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 구체적이고 상세한 프롬프트를 입력하면 더 좋은 결과를 얻을 수 있습니다</li>
                <li>• 입력 이미지의 품질이 높을수록 결과물도 좋아집니다</li>
                <li>• Seed 값을 고정하면 동일한 설정으로 일관된 결과를 얻을 수 있습니다</li>
                <li>• CFG Scale은 프롬프트 준수도를 조절합니다 (높을수록 프롬프트를 더 엄격히 따릅니다)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}