'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Download, 
  Trash2, 
  Folder, 
  File, 
  RefreshCw,
  HardDrive,
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface S3File {
  key: string;
  size: number;
  lastModified: Date;
  type: 'file' | 'directory';
  extension?: string;
}


export default function S3StoragePage() {
  const [files, setFiles] = useState<S3File[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedVolume, setSelectedVolume] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showCreateFolder, setShowCreateFolder] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadXHR, setUploadXHR] = useState<XMLHttpRequest | null>(null);

  // 설정에서 볼륨 정보 가져오기
  const initializeVolume = async () => {
    try {
      const response = await fetch('/api/s3-storage/volumes');
      if (response.ok) {
        const volumes = await response.json();
        if (volumes.length > 0) {
          setSelectedVolume(volumes[0].name);
        }
      }
    } catch (error) {
      console.error('Failed to initialize volume:', error);
      setError('볼륨을 초기화할 수 없습니다.');
    }
  };

  // 파일 목록 가져오기
  const fetchFiles = async (path: string = '') => {
    if (!selectedVolume) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/s3-storage/files?volume=${selectedVolume}&path=${encodeURIComponent(path)}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        setCurrentPath(path);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '파일 목록을 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setError('파일 목록을 가져올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 파일 업로드
  const handleUpload = () => {
    if (!uploadFile || !selectedVolume) return;

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);
    setUploadStatus('업로드 준비 중...');

    console.log('🔍 Frontend - currentPath:', currentPath);
    console.log('🔍 Frontend - uploadFile:', uploadFile.name);
    
    setUploadStatus('파일 업로드 중...');
    
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('volume', selectedVolume);
    formData.append('path', currentPath || '');

    // XMLHttpRequest를 사용하여 실제 업로드 진행률 추적
    const xhr = new XMLHttpRequest();
    
    // 업로드 진행률 추적 (브라우저 → 서버 전송만 추적)
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        // 브라우저 → 서버 전송은 전체의 20%로 가정
        const browserProgress = Math.round((event.loaded / event.total) * 20);
        setUploadProgress(browserProgress);
        console.log(`📤 Browser upload progress: ${browserProgress}%`);
      }
    });

    // 업로드 완료
    xhr.addEventListener('load', () => {
      setUploadXHR(null);
      
      if (xhr.status === 200) {
        // 서버 처리 중 시뮬레이션 (20% → 100%)
        setUploadStatus('서버에서 처리 중...');
        setUploadProgress(20);
        
        // 서버 처리 시뮬레이션
        const simulateServerProcessing = () => {
          setUploadProgress(40);
          setTimeout(() => {
            setUploadProgress(60);
            setTimeout(() => {
              setUploadProgress(80);
              setTimeout(() => {
                setUploadProgress(100);
                setUploadStatus('업로드 완료!');
                
                // 성공 알림 표시
                setTimeout(() => {
                  setUploadFile(null);
                  setUploadProgress(0);
                  setUploadStatus('');
                  fetchFiles(currentPath); // 목록 새로고침
                }, 1500);
              }, 500);
            }, 500);
          }, 500);
        };
        
        simulateServerProcessing();
      } else {
        setUploadStatus('업로드 실패');
        setUploadProgress(0);
        
        try {
          const errorData = JSON.parse(xhr.responseText);
          console.error('Upload error:', errorData);
          
          // 경로 충돌 에러인 경우 특별한 메시지 표시
          if (errorData.error && errorData.error.includes('경로 충돌')) {
            setError(errorData.error);
          } else {
            setError(errorData.error || '파일 업로드에 실패했습니다.');
          }
        } catch {
          setError('파일 업로드에 실패했습니다.');
        }
      }
      setIsLoading(false);
    });

    // 업로드 에러
    xhr.addEventListener('error', () => {
      setUploadXHR(null);
      console.error('Upload failed');
      setUploadStatus('업로드 실패');
      setUploadProgress(0);
      setError('파일 업로드에 실패했습니다.');
      setIsLoading(false);
    });

    // 업로드 중단
    xhr.addEventListener('abort', () => {
      setUploadXHR(null);
      console.log('Upload aborted');
      setUploadStatus('업로드 중단됨');
      setUploadProgress(0);
      setIsLoading(false);
    });

    // 업로드 시작
    xhr.open('POST', '/api/s3-storage/upload');
    setUploadXHR(xhr);
    xhr.send(formData);
  };

  // 업로드 취소
  const handleCancelUpload = () => {
    if (uploadXHR) {
      uploadXHR.abort();
      setUploadXHR(null);
      setUploadProgress(0);
      setUploadStatus('');
      setIsLoading(false);
    }
  };

  // 파일 다운로드
  const handleDownload = async (fileKey: string) => {
    if (!selectedVolume) return;

    try {
      const response = await fetch(`/api/s3-storage/download?volume=${selectedVolume}&key=${encodeURIComponent(fileKey)}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileKey.split('/').pop() || 'download';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '파일 다운로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      setError('파일 다운로드에 실패했습니다.');
    }
  };

  // 파일 삭제
  const handleDelete = async (fileKey: string) => {
    if (!selectedVolume || !confirm('정말로 이 파일을 삭제하시겠습니까?')) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/s3-storage/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          volume: selectedVolume,
          key: fileKey,
        }),
      });

      if (response.ok) {
        fetchFiles(currentPath); // 목록 새로고침
      } else {
        const errorData = await response.json();
        setError(errorData.error || '파일 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      setError('파일 삭제에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 폴더 생성
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedVolume) return;

    setIsLoading(true);
    setError(null);
    setUploadStatus('폴더 생성 중...');

    try {
      // 현재 경로가 있으면 끝에 슬래시 추가, 없으면 빈 문자열
      const basePath = currentPath ? (currentPath.endsWith('/') ? currentPath : `${currentPath}/`) : '';
      const folderKey = `${basePath}${newFolderName}/`;
      
      console.log('🔍 Creating folder:', { currentPath, newFolderName, folderKey });
      
      const response = await fetch('/api/s3-storage/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          volume: selectedVolume,
          key: folderKey,
        }),
      });

      if (response.ok) {
        setUploadStatus('폴더 생성 완료!');
        setTimeout(() => {
          setNewFolderName('');
          setShowCreateFolder(false);
          setUploadStatus('');
          fetchFiles(currentPath); // 목록 새로고침
        }, 1000);
      } else {
        const errorData = await response.json();
        console.error('Folder creation error:', errorData);
        setUploadStatus('폴더 생성 실패');
        setError(errorData.error || '폴더 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      setUploadStatus('폴더 생성 실패');
      setError('폴더 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 파일 확장자에 따른 아이콘 반환
  const getFileIcon = (file: S3File) => {
    if (file.type === 'directory') {
      return <Folder className="w-5 h-5 text-yellow-500" />; // 폴더는 노란색으로 강조
    }
    
    const ext = file.extension?.toLowerCase();
    if (['.pt', '.pth', '.ckpt', '.safetensors'].includes(ext || '')) {
      return <HardDrive className="w-4 h-4 text-blue-500" />; // 모델 파일
    }
    if (['.lora', '.safetensors'].includes(ext || '')) {
      return <Settings className="w-4 h-4 text-purple-500" />; // LoRA 파일
    }
    return <File className="w-4 h-4 text-gray-400" />; // 일반 파일은 회색
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 파일 타입 확인
  const getFileType = (file: S3File) => {
    if (file.type === 'directory') return 'directory';
    
    const ext = file.extension?.toLowerCase();
    if (['.pt', '.pth', '.ckpt', '.safetensors'].includes(ext || '')) {
      return 'model';
    }
    if (['.lora', '.safetensors'].includes(ext || '')) {
      return 'lora';
    }
    return 'other';
  };

  useEffect(() => {
    initializeVolume();
  }, []);

  useEffect(() => {
    if (selectedVolume) {
      fetchFiles();
    }
  }, [selectedVolume]);

  return (
    <div className="container mx-auto p-6 space-y-6 h-screen overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">S3 Storage Management</h1>
          <p className="text-muted-foreground">
            RunPod Network Volume의 모델과 LoRA 파일을 관리하세요
          </p>
        </div>
        <Button 
          onClick={() => fetchFiles(currentPath)} 
          disabled={isLoading}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-300 flex-1">{error}</span>
          </div>
          {error.includes('경로 충돌') && (
            <div className="mt-3 flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const conflictPath = error.match(/'([^']+)'/)?.[1];
                  if (conflictPath) {
                    handleDelete(conflictPath);
                  }
                }}
                className="text-red-400 hover:text-red-300 border-red-500/50 hover:border-red-400"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                충돌 파일 삭제
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
              >
                닫기
              </Button>
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">파일 탐색</TabsTrigger>
          <TabsTrigger value="upload">업로드</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* 파일 목록 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">파일 목록</CardTitle>
                  <CardDescription>
                    {files.length}개의 항목
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <code className="bg-gray-800 px-3 py-1 rounded text-sm text-gray-300 border border-gray-600">
                    {currentPath || '/'}
                  </code>
                  {currentPath && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const pathParts = currentPath.split('/').filter(part => part.length > 0);
                        const parentPath = pathParts.slice(0, -1).join('/');
                        fetchFiles(parentPath);
                      }}
                    >
                      상위 폴더
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateFolder(!showCreateFolder)}
                  >
                    <Folder className="w-4 h-4 mr-1" />
                    폴더 생성
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showCreateFolder && (
              <div className="px-6 pb-4">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="폴더 이름을 입력하세요"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim() || isLoading}
                    size="sm"
                  >
                    생성
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateFolder(false);
                      setNewFolderName('');
                    }}
                    size="sm"
                  >
                    취소
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  S3에서는 폴더가 자동으로 생성됩니다. 파일을 업로드하면 해당 경로의 폴더가 자동으로 만들어집니다.
                </p>
                {uploadStatus && uploadStatus.includes('폴더') && (
                  <div className="mt-2 flex items-center text-sm">
                    {uploadStatus.includes('완료') ? (
                      <div className="flex items-center text-green-400">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {uploadStatus}
                      </div>
                    ) : (
                      <div className="flex items-center text-blue-400">
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        {uploadStatus}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>로딩 중...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  파일이 없습니다
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {files.map((file) => (
                    <div
                      key={file.key}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        file.type === 'directory' 
                          ? 'cursor-pointer border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20' 
                          : 'border-gray-600 bg-gray-800/30 hover:bg-gray-700/50'
                      }`}
                      onClick={() => {
                        if (file.type === 'directory') {
                          // S3 CommonPrefixes는 이미 전체 경로를 포함하므로 그대로 사용
                          // 단, 끝의 슬래시는 제거
                          const newPath = file.key.endsWith('/') ? file.key.slice(0, -1) : file.key;
                          
                          console.log('🔍 Folder click:', {
                            fileKey: file.key,
                            currentPath,
                            newPath
                          });
                          
                          fetchFiles(newPath);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span 
                              className={`font-medium truncate max-w-[300px] ${
                                file.type === 'directory' ? 'text-yellow-400' : 'text-white'
                              }`}
                              title={file.key.split('/').pop() || file.key}
                            >
                              {file.key.split('/').pop() || file.key || 'Unknown'}
                            </span>
                            <Badge 
                              variant={file.type === 'directory' ? 'default' : 'secondary'}
                              className={file.type === 'directory' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : ''}
                            >
                              {getFileType(file)}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {file.type === 'file' ? formatFileSize(file.size) : '폴더'} • {' '}
                            {file.lastModified.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {file.type === 'file' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(file.key)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(file.key)}
                          className="text-red-400 hover:text-red-300 border-red-500/50 hover:border-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">파일 업로드</CardTitle>
              <CardDescription>
                모델이나 LoRA 파일을 네트워크 볼륨에 업로드하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">파일 선택</Label>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  accept=".pt,.pth,.ckpt,.safetensors,.lora"
                />
              </div>
              <div>
                <Label>업로드 위치</Label>
                <div className="mt-1">
                  <code className="bg-gray-800 px-2 py-1 rounded text-sm text-gray-300 border border-gray-600">
                    {currentPath ? `/${currentPath}/` : '/'}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  파일이 이 위치에 업로드됩니다
                </p>
              </div>
              {/* 업로드 진행 상황 표시 */}
              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{uploadStatus}</span>
                    <span className="text-muted-foreground">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        uploadProgress === 100 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  {uploadProgress === 100 && (
                    <div className="flex items-center text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      업로드가 완료되었습니다!
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex space-x-2">
                <Button 
                  onClick={handleUpload} 
                  disabled={!uploadFile || !selectedVolume || isLoading}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isLoading ? '업로드 중...' : '업로드'}
                </Button>
                {isLoading && uploadXHR && (
                  <Button 
                    onClick={handleCancelUpload}
                    variant="outline"
                    className="px-4"
                  >
                    취소
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
