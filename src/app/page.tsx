'use client';
import { useState } from 'react';
import { SparklesIcon, PaperClipIcon, Cog6ToothIcon, LightBulbIcon, BeakerIcon } from "@heroicons/react/24/outline";

const promptSuggestions = [
  { text: "A futuristic cityscape at dusk", icon: LightBulbIcon },
  { text: "Serene forest with a flowing river", icon: LightBulbIcon },
  { text: "A cute, fluffy cat wearing a tiny hat", icon: LightBulbIcon },
];

export default function HomePage() {
  const [testLoading, setTestLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const runMultipleTests = async () => {
    setTestLoading(true);
    setTestResults([]);
    
    const testJobs = [
      { type: 'image', prompt: 'A beautiful sunset over mountains', options: { style: 'realistic', resolution: '1024x1024' } },
      { type: 'video', prompt: 'A cat playing with a ball of yarn', options: {} },
      { type: 'multitalk', options: { audioMode: 'single', hasImage: true, hasAudio1: true, hasAudio2: false } },
      { type: 'image', prompt: 'A futuristic robot in a cyberpunk city', options: { style: 'cartoon', resolution: '512x512' } },
      { type: 'multitalk', options: { audioMode: 'dual', hasImage: true, hasAudio1: true, hasAudio2: true } },
    ];

    const results = [];
    
    for (const job of testJobs) {
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'user123',
            ...job,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          results.push(`✅ ${job.type.toUpperCase()} job created: ${data.jobId}`);
        } else {
          results.push(`❌ ${job.type.toUpperCase()} job failed`);
        }
      } catch (error) {
        results.push(`❌ ${job.type.toUpperCase()} job error`);
      }
    }
    
    setTestResults(results);
    setTestLoading(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 text-balance">
            EnguiStudio
          </h1>
          <p className="text-foreground/70 text-xl">
            Your creative co-pilot, powered by AI.
          </p>
        </div>

        <div className="bg-secondary rounded-2xl shadow-xl border border-border overflow-hidden">
          <textarea
            className="w-full p-6 bg-transparent focus:outline-none text-lg resize-none placeholder:text-foreground/50"
            placeholder="Describe your vision... for example, 'A majestic lion in a snowy forest, photorealistic'"
            rows={7}
          />
          <div className="flex items-center justify-between p-3 border-t border-border bg-background/20">
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg text-foreground/60 hover:bg-white/10 hover:text-foreground transition-colors">
                <PaperClipIcon className="w-6 h-6" />
              </button>
              <button className="p-2 rounded-lg text-foreground/60 hover:bg-white/10 hover:text-foreground transition-colors">
                <Cog6ToothIcon className="w-6 h-6" />
              </button>
            </div>
            <button className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5" />
              <span>Generate</span>
            </button>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-foreground/60 mb-4">Need some inspiration?</p>
          <div className="flex flex-wrap justify-center gap-4">
            {promptSuggestions.map((prompt, i) => (
              <button 
                key={i} 
                className="px-5 py-3 bg-secondary hover:bg-white/10 border border-border rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <prompt.icon className="w-5 h-5 text-yellow-400/80" />
                <span>{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Test Section */}
        <div className="mt-12 p-6 bg-secondary/50 rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BeakerIcon className="w-5 h-5 text-blue-400" />
            테스트 기능
          </h3>
          <p className="text-foreground/70 mb-4 text-sm">
            여러 작업을 동시에 시작하여 라이브러리에서 실시간 상태 업데이트를 테스트해보세요.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={runMultipleTests}
              disabled={testLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              {testLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  테스트 실행 중...
                </>
              ) : (
                <>
                  <BeakerIcon className="w-4 h-4" />
                  5개 작업 동시 실행 테스트
                </>
              )}
            </button>
            
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/test-runpod');
                  const data = await response.json();
                  console.log('RunPod Test Results:', data);
                  alert('RunPod 테스트 결과가 콘솔에 출력되었습니다. F12를 눌러 확인하세요.');
                } catch (error) {
                  console.error('RunPod test failed:', error);
                  alert('RunPod 테스트 실패. 콘솔을 확인하세요.');
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <BeakerIcon className="w-4 h-4" />
              RunPod 연결 테스트
            </button>
            
            <button
              onClick={async () => {
                try {
                  console.log('🧪 Starting simple RunPod test...');
                  const response = await fetch('/api/test-runpod-simple', {
                    method: 'POST'
                  });
                  const data = await response.json();
                  console.log('Simple RunPod Test Results:', data);
                  
                  if (data.success) {
                    alert(`✅ RunPod API 호출 성공! Job ID: ${data.jobId}`);
                  } else {
                    alert(`❌ RunPod API 호출 실패: ${data.error}`);
                  }
                } catch (error) {
                  console.error('Simple RunPod test failed:', error);
                  alert('RunPod 간단 테스트 실패. 콘솔을 확인하세요.');
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <BeakerIcon className="w-4 h-4" />
              RunPod API 직접 테스트
            </button>
            
            <button
              onClick={async () => {
                try {
                  console.log('🧪 Starting database test...');
                  const response = await fetch('/api/test-db');
                  const data = await response.json();
                  console.log('Database Test Results:', data);
                  
                  if (data.success) {
                    alert(`✅ 데이터베이스 연결 성공! Settings: ${data.stats.settings}, Jobs: ${data.stats.jobs}`);
                  } else {
                    alert(`❌ 데이터베이스 연결 실패: ${data.error}`);
                  }
                } catch (error) {
                  console.error('Database test failed:', error);
                  alert('데이터베이스 테스트 실패. 콘솔을 확인하세요.');
                }
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <BeakerIcon className="w-4 h-4" />
              데이터베이스 테스트
            </button>
          </div>

          {testResults.length > 0 && (
            <div className="mt-4 p-4 bg-background/50 rounded-lg">
              <h4 className="font-medium mb-2">테스트 결과:</h4>
              <div className="space-y-1 text-sm">
                {testResults.map((result, i) => (
                  <div key={i} className="font-mono">{result}</div>
                ))}
              </div>
              <p className="text-xs text-foreground/60 mt-2">
                라이브러리에서 작업 진행 상황을 확인하세요!
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}