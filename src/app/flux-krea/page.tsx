'use client';

import { useState, useEffect } from 'react';
import { PhotoIcon, SparklesIcon, CpuChipIcon } from '@heroicons/react/24/outline';

interface LoRAFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
}

export default function FluxKreaPage() {
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

  // 입력값 자동 로드 기능
  useEffect(() => {
    const reuseData = localStorage.getItem('reuseInputs');
    if (reuseData) {
      try {
        const data = JSON.parse(reuseData);
        if (data.type === 'flux-krea') {
          // 프롬프트 로드
          if (data.prompt) {
            setPrompt(data.prompt);
          }
          
          // 설정값 로드
          if (data.options) {
            const options = data.options;
            if (options.width) setWidth(options.width);
            if (options.height) setHeight(options.height);
            if (options.seed !== undefined) setSeed(options.seed);
            if (options.guidance !== undefined) setGuidance(options.guidance);
            if (options.model) setModel(options.model);
            if (options.selectedLora) setSelectedLora(options.selectedLora);
            if (options.loraWeight !== undefined) setLoraWeight(options.loraWeight);
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
        console.log('📁 LoRA files loaded for FLUX KREA:', data.files);
        
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

  // 컴포넌트 마운트 시 LoRA 파일 목록 가져오기
  useEffect(() => {
    fetchLoraFiles();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setMessage({ type: 'error', text: '프롬프트를 입력해주세요.' });
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
        setMessage({ type: 'success', text: data.message || 'Flux Krea 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.' });
        
        // 백그라운드 처리이므로 즉시 완료 상태로 변경
        setIsGenerating(false);
        
        // 작업 정보는 유지하되 생성 중 상태는 해제
        // 사용자는 다른 작업을 할 수 있음
      } else {
        throw new Error(data.error || '이미지 생성 요청에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Image generation error:', error);
      setMessage({ type: 'error', text: error.message || '이미지 생성 중 오류가 발생했습니다.' });
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
          <h1 className="text-3xl font-bold text-foreground">FLUX KREA</h1>
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
                placeholder="예: A beautiful landscape with mountains and a lake..."
                className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                disabled={isGenerating}
              />
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
                    onChange={(e) => setWidth(parseInt(e.target.value) || 1024)}
                    min="512"
                    max="2048"
                    step="64"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating}
                    placeholder="1024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    세로 크기
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
                    placeholder="1024"
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
                    Guidance
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
                    Model (선택사항)
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="모델명을 입력하세요"
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
                <h3 className="text-lg font-semibold">LoRA 모델 설정</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LoRA 파일 선택 */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">
                    LoRA 파일 (선택사항)
                  </label>
                  <select
                    value={selectedLora}
                    onChange={(e) => setSelectedLora(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isGenerating || loraLoading}
                  >
                    <option value="">LoRA 사용 안함</option>
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
                    LoRA 가중치 (0.1 - 2.0)
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
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    생성 중...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    FLUX KREA 생성
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
                      ✅ Flux Krea 작업이 백그라운드에서 처리되고 있습니다.
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
