'use client';

import { useState, useRef } from 'react';
import { PhotoIcon, SparklesIcon, Cog6ToothIcon, PlayIcon } from '@heroicons/react/24/outline';

export default function Wan22Page() {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [width, setWidth] = useState(720);
  const [height, setHeight] = useState(480);
  const [seed, setSeed] = useState(-1);
  const [cfg, setCfg] = useState(2.5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      const formData = new FormData();
      formData.append('userId', 'user-with-settings');
      formData.append('image', imageFile);
      formData.append('prompt', prompt);
      formData.append('width', width.toString());
      formData.append('height', height.toString());
      formData.append('seed', seed === -1 ? '42' : seed.toString());
      formData.append('cfg', cfg.toString());

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
    setMessage(null);
    setCurrentJobId('');
    setIsGenerating(false);
    
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
                  <label className="block text-sm font-medium text-foreground mb-2">높이 (px)</label>
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
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Seed</label>
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
                  <label className="block text-sm font-medium text-foreground mb-2">CFG Scale</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={cfg}
                    onChange={(e) => setCfg(parseFloat(e.target.value) )}
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

            {/* 작업 정보 */}
            {currentJobId && (
              <div className="bg-secondary p-6 rounded-lg border border-border">
                <h3 className="text-xl font-semibold mb-4">작업 정보</h3>
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