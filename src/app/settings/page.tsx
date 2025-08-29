'use client';

import { useState, useEffect } from 'react';
import { 
  CogIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface ServiceConfig {
  runpod: {
    apiKey: string;
    endpoints: {
      image: string;
      video: string;
      multitalk: string;
      'flux-kontext': string; // FLUX KONTEXT endpoint 추가
      wan22: string; // WAN 2.2 endpoint 추가
    };
    generateTimeout?: number; // RunPod AI 생성 작업 타임아웃 (초 단위)
  };
  s3: {
    endpointUrl: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    region: string;
    timeout: number;
  };
}

interface ServiceStatus {
  runpod: 'configured' | 'partial' | 'missing';
  s3: 'configured' | 'partial' | 'missing';
}

interface TestResult {
  success: boolean;
  message: string;
  responseTime?: number; // 응답 시간 추가
  statusCode?: number; // 상태 코드 추가
  details?: {
    responseTime: number;
    statusCode?: number;
    endpoint: string;
  };
  error?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<ServiceConfig>>({
    runpod: {
      apiKey: '',
      endpoints: {
        image: '',
        video: '',
        multitalk: '',
        'flux-kontext': '', // FLUX KONTEXT endpoint 추가
        wan22: '' // WAN 2.2 endpoint 추가
      },
      generateTimeout: 3600 // 기본값 3600초 (1시간)
    },
    s3: {
      endpointUrl: '',
      accessKeyId: '',
      secretAccessKey: '',
      bucketName: '',
      region: '',
      timeout: 3600
    }
  });
  
  const [status, setStatus] = useState<ServiceStatus>({
    runpod: 'missing',
    s3: 'missing'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const clearDatabase = async () => {
    if (!confirm('⚠️  모든 설정 데이터가 삭제됩니다. 계속하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      
      const response = await fetch('/api/settings/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `데이터베이스가 초기화되었습니다. ${data.clearedCount}개 설정이 삭제되었습니다.` });
        // Reload settings after clearing
        await loadSettings();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `데이터베이스 초기화 실패: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);



  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
        setStatus(data.status);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to load settings: ${error}` });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
        setStatus(data.status);
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to save settings: ${error}` });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (service: 'runpod' | 's3', endpoint?: string) => {
    const testKey = endpoint ? `${service}-${endpoint}` : service;
    
    try {
      setTesting(prev => ({ ...prev, [testKey]: true }));
      setTestResults(prev => ({ ...prev, [testKey]: { success: false, message: 'Testing...' } }));
      
      const config = service === 'runpod' 
        ? { apiKey: settings.runpod?.apiKey }
        : settings.s3;
      
      const response = await fetch('/api/settings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          service, 
          config,
          endpoint 
        }),
      });
      
      const result = await response.json();
      setTestResults(prev => ({ ...prev, [testKey]: result }));
      
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [testKey]: { 
          success: false, 
          message: 'Test failed', 
          error: `${error}` 
        } 
      }));
    } finally {
      setTesting(prev => ({ ...prev, [testKey]: false }));
    }
  };

  // Endpoint 테스트 함수
  const testEndpoint = async (endpointType: 'multitalk' | 'flux-kontext' | 'wan22') => {
    if (!settings.runpod?.apiKey || !settings.runpod?.endpoints?.[endpointType]) {
      return;
    }

    setTesting(prev => ({ ...prev, [endpointType]: true }));
    
    try {
      const startTime = Date.now();
      const response = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'runpod',
          endpointType,
          apiKey: settings.runpod.apiKey,
          endpointId: settings.runpod.endpoints[endpointType]
        })
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.ok) {
        setTestResults(prev => ({
          ...prev,
          [endpointType]: {
            success: true,
            message: '연결 성공!',
            responseTime,
            statusCode: response.status
          }
        }));
      } else {
        const errorData = await response.json();
        setTestResults(prev => ({
          ...prev,
          [endpointType]: {
            success: false,
            message: `연결 실패: ${errorData.error || 'Unknown error'}`,
            responseTime,
            statusCode: response.status
          }
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [endpointType]: {
          success: false,
          message: `연결 오류: ${error instanceof Error ? error.message : 'Unknown error'}`,
          responseTime: 0,
          statusCode: 0
        }
      }));
    } finally {
      setTesting(prev => ({ ...prev, [endpointType]: false }));
    }
  };

  const updateSetting = (service: 'runpod' | 's3', key: string, value: string | number, subKey?: string) => {
    setSettings(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        ...(subKey 
          ? { [key]: { ...(prev[service] as any)?.[key], [subKey]: value } }
          : { [key]: value }
        )
      }
    } as any));
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusIcon = (serviceStatus: 'configured' | 'partial' | 'missing') => {
    switch (serviceStatus) {
      case 'configured':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'missing':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = (serviceStatus: 'configured' | 'partial' | 'missing') => {
    switch (serviceStatus) {
      case 'configured':
        return 'Fully Configured';
      case 'partial':
        return 'Partially Configured';
      case 'missing':
        return 'Not Configured';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <CogIcon className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-900/50 border border-green-500 text-green-200' 
            : 'bg-red-900/50 border border-red-500 text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* 간단한 사용 안내 */}
      <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-300 font-medium">✅ 간단한 설정</span>
        </div>
        <div className="text-sm text-green-200">
          <p className="mb-2">개인 사용을 위해 암호화가 비활성화되었습니다.</p>
          <div className="text-xs text-green-300">
            💡 <strong>사용법</strong>: 아래 설정을 입력하고 저장하세요
          </div>
        </div>
      </div>

      {/* RunPod Configuration */}
      <div className="mb-8 bg-secondary p-6 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            RunPod Configuration
            {getStatusIcon(status.runpod)}
            <span className="text-sm font-normal text-foreground/70">
              {getStatusText(status.runpod)}
            </span>
          </h2>
        </div>

        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium mb-2">RunPod API Key</label>
            <input
              type="password"
              value={settings.runpod?.apiKey || ''}
              onChange={(e) => updateSetting('runpod', 'apiKey', e.target.value)}
              placeholder="Enter your RunPod API key"
              className="w-full p-2 border rounded-md bg-background"
            />
          </div>

          {/* Generate Timeout */}
          <div>
            <label className="block text-sm font-medium mb-2">Generate Timeout (초)</label>
            <input
              type="number"
              value={settings.runpod?.generateTimeout || 3600}
              onChange={(e) => updateSetting('runpod', 'generateTimeout', parseInt(e.target.value))}
              placeholder="3600"
              className="w-full p-2 border rounded-md bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              AI 작업 완료 대기 시간 (초 단위)
            </p>
          </div>

          {/* MultiTalk Endpoint ID */}
          <div>
            <label className="block text-sm font-medium mb-2">MultiTalk Endpoint ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.runpod?.endpoints?.multitalk || ''}
                onChange={(e) => updateSetting('runpod', 'endpoints', e.target.value, 'multitalk')}
                placeholder="Enter MultiTalk endpoint ID"
                className="flex-1 p-2 border rounded-md bg-background"
              />
              <button
                onClick={() => testConnection('runpod', settings.runpod?.endpoints?.multitalk)}
                disabled={!settings.runpod?.apiKey || !settings.runpod?.endpoints?.multitalk || testing[`runpod-multitalk`]}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {testing[`runpod-multitalk`] ? 'Testing...' : 'Test'}
              </button>
            </div>
            {testResults[`runpod-${settings.runpod?.endpoints?.multitalk || 'multitalk'}`] && (
              <div className={`mt-2 p-2 rounded-md text-sm ${
                testResults[`runpod-${settings.runpod?.endpoints?.multitalk || 'multitalk'}`]?.success 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {testResults[`runpod-${settings.runpod?.endpoints?.multitalk || 'multitalk'}`]?.message}
                {testResults[`runpod-${settings.runpod?.endpoints?.multitalk || 'multitalk'}`]?.responseTime && (
                  <span className="ml-2">({testResults[`runpod-${settings.runpod?.endpoints?.multitalk || 'multitalk'}`]?.responseTime}ms)</span>
                )}
                {testResults[`runpod-${settings.runpod?.endpoints?.multitalk || 'multitalk'}`]?.statusCode && (
                  <span className="ml-2">Status: {testResults[`runpod-${settings.runpod?.endpoints?.multitalk || 'multitalk'}`]?.statusCode}</span>
                )}
              </div>
            )}
          </div>

          {/* FLUX KONTEXT Endpoint ID */}
          <div>
            <label className="block text-sm font-medium mb-2">FLUX KONTEXT Endpoint ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.runpod?.endpoints?.['flux-kontext'] || ''}
                onChange={(e) => updateSetting('runpod', 'endpoints', e.target.value, 'flux-kontext')}
                placeholder="Enter FLUX KONTEXT endpoint ID"
                className="flex-1 p-2 border rounded-md bg-background"
              />
              <button
                onClick={() => testEndpoint('flux-kontext')}
                disabled={!settings.runpod?.apiKey || !settings.runpod?.endpoints?.['flux-kontext'] || testing['flux-kontext']}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {testing['flux-kontext'] ? 'Testing...' : 'Test'}
              </button>
            </div>
            {testResults['flux-kontext'] && (
              <div className={`mt-2 p-2 rounded-md text-sm ${
                testResults['flux-kontext'].success 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {testResults['flux-kontext'].message}
                {testResults['flux-kontext'].responseTime && (
                  <span className="ml-2">({testResults['flux-kontext'].responseTime}ms)</span>
                )}
                {testResults['flux-kontext'].statusCode && (
                  <span className="ml-2">Status: {testResults['flux-kontext'].statusCode}</span>
                )}
              </div>
            )}
          </div>

          {/* WAN 2.2 Endpoint ID */}
          <div>
            <label className="block text-sm font-medium mb-2">WAN 2.2 Endpoint ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.runpod?.endpoints?.wan22 || ''}
                onChange={(e) => updateSetting('runpod', 'endpoints', e.target.value, 'wan22')}
                placeholder="Enter WAN 2.2 endpoint ID"
                className="flex-1 p-2 border rounded-md bg-background"
              />
              <button
                onClick={() => testEndpoint('wan22')}
                disabled={!settings.runpod?.apiKey || !settings.runpod?.endpoints?.wan22 || testing['wan22']}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {testing['wan22'] ? 'Testing...' : 'Test'}
              </button>
            </div>
            {testResults['wan22'] && (
              <div className={`mt-2 p-2 rounded-md text-sm ${
                testResults['wan22'].success 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {testResults['wan22'].message}
                {testResults['wan22'].responseTime && (
                  <span className="ml-2">({testResults['wan22'].responseTime}ms)</span>
                )}
                {testResults['wan22'].statusCode && (
                  <span className="ml-2">Status: {testResults['wan22'].statusCode}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* S3 Configuration */}
      <div className="mb-8 bg-secondary p-6 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            S3 Storage Configuration
            {getStatusIcon(status.s3)}
            <span className="text-sm font-normal text-foreground/70">
              {getStatusText(status.s3)}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Endpoint URL
            </label>
            <input
              type="text"
              value={settings.s3?.endpointUrl || ''}
              onChange={(e) => updateSetting('s3', 'endpointUrl', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="https://s3api-region.runpod.io/"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Region
            </label>
            <input
              type="text"
              value={settings.s3?.region || ''}
              onChange={(e) => updateSetting('s3', 'region', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="eu-ro-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Access Key ID
            </label>
            <input
              type="text"
              value={settings.s3?.accessKeyId || ''}
              onChange={(e) => updateSetting('s3', 'accessKeyId', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Access key ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Bucket Name
            </label>
            <input
              type="text"
              value={settings.s3?.bucketName || ''}
              onChange={(e) => updateSetting('s3', 'bucketName', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="bucket-name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              S3 Upload Timeout (초)
            </label>
            <input
              type="number"
              min="60"
              max="7200"
              step="60"
              value={settings.s3?.timeout || 3600}
              onChange={(e) => updateSetting('s3', 'timeout', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="3600"
            />
            <p className="text-xs text-foreground/60 mt-1">
              💡 기본값: 3600초 (1시간). 큰 파일 업로드 시 늘릴 수 있습니다.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Secret Access Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showSecrets['s3-secret'] ? 'text' : 'password'}
                  value={settings.s3?.secretAccessKey || ''}
                  onChange={(e) => updateSetting('s3', 'secretAccessKey', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Secret access key"
                />
                <button
                  type="button"
                  onClick={() => toggleSecretVisibility('s3-secret')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-foreground/60 hover:text-foreground"
                >
                  {showSecrets['s3-secret'] ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
              <button
                onClick={() => testConnection('s3')}
                disabled={!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || testing['s3']}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {testing['s3'] ? 'Testing...' : 'Test S3'}
              </button>
            </div>
            {testResults['s3'] && (
              <div className={`mt-2 p-2 rounded-md text-sm ${
                testResults['s3'].success 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {testResults['s3'].message}
                {testResults['s3'].responseTime && (
                  <span className="ml-2">({testResults['s3'].responseTime}ms)</span>
                )}
                {testResults['s3'].statusCode && (
                  <span className="ml-2">Status: {testResults['s3'].statusCode}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-between items-center">
        <button
          onClick={clearDatabase}
          disabled={loading}
          className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          🗑️ 데이터베이스 초기화
        </button>
        
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
}