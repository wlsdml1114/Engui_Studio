'use client';

import { useState } from 'react';

export default function ImageGenerationPage() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('realistic');
  const [resolution, setResolution] = useState('1024x1024');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'user123', // Replace with actual user ID
          type: 'image',
          prompt,
          options: { style, resolution },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      console.log('Image generation request sent:', data);
      
      // Show success message with job ID
      setSuccess(`이미지 생성 요청이 성공적으로 접수되었습니다! Job ID: ${data.jobId}. 라이브러리에서 진행 상황을 확인하세요.`);
      
      // Reset form
      setPrompt('');
      setStyle('realistic');
      setResolution('1024x1024');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Image Generation</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300">Prompt</label>
          <textarea
            id="prompt"
            rows={4}
            className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="style" className="block text-sm font-medium text-gray-300">Style</label>
          <select
            id="style"
            className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            <option value="realistic">Realistic</option>
            <option value="cartoon">Cartoon</option>
            <option value="abstract">Abstract</option>
          </select>
        </div>

        <div>
          <label htmlFor="resolution" className="block text-sm font-medium text-gray-300">Resolution</label>
          <select
            id="resolution"
            className="mt-1 block w-full rounded-md bg-gray-600 border-gray-500 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          >
            <option value="1024x1024">1024x1024</option>
            <option value="512x512">512x512</option>
            <option value="256x256">256x256</option>
          </select>
        </div>

        {success && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
            <p className="text-sm">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
            <p className="text-sm">오류: {error}</p>
          </div>
        )}

        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Image'}
        </button>
      </form>
    </div>
  );
}