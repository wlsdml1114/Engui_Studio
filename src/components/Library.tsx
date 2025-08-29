
'use client';

import { useState } from "react";
import useSWR from 'swr';
import { XMarkIcon, PlayIcon, PhotoIcon, TrashIcon, StarIcon } from '@heroicons/react/24/outline';

interface JobItem {
  id: string;
  userId: string;
  status: 'processing' | 'completed' | 'failed';
  type: 'video' | 'multitalk' | 'flux-kontext' | 'wan22';
  prompt?: string;
  options?: string;
  resultUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  completedAt?: string;
  isFavorite?: boolean; // 즐겨찾기 상태
}

interface LibraryItemProps {
  item: JobItem;
  onItemClick: (item: JobItem) => void;
  onDeleteClick: (item: JobItem, e: React.MouseEvent) => void;
  onFavoriteToggle: (item: JobItem, e: React.MouseEvent) => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const LibraryItem: React.FC<LibraryItemProps> = ({ item, onItemClick, onDeleteClick, onFavoriteToggle }) => {
  // MultiTalk의 경우 options에서 입력 이미지 경로 추출
  const getThumbnailUrl = () => {
    // MultiTalk의 경우 입력 이미지를 썸네일로 사용
    if (item.type === 'multitalk' && item.options) {
      try {
        const options = JSON.parse(item.options);
        
        // 로컬 웹 경로가 있으면 우선 사용 (가장 안정적)
        if (options.imageWebPath) {
          console.log('🖼️ Using local web path for MultiTalk thumbnail');
          return options.imageWebPath;
        }
        
        // S3 URL이 있으면 사용 (폴백)
        if (options.imageS3Url) {
          console.log('🔗 Using S3 URL for MultiTalk thumbnail');
          return options.imageS3Url;
        }
      } catch (e) {
        console.warn('Failed to parse MultiTalk options:', e);
      }
    }
    
    // FLUX KONTEXT의 경우 결과 이미지나 입력 이미지 사용
    if (item.type === 'flux-kontext' && item.options) {
      try {
        const options = JSON.parse(item.options);
        
        // 결과 이미지가 있으면 우선 사용
        if (item.resultUrl) {
          console.log('🎨 Using result image for FLUX KONTEXT thumbnail');
          return item.resultUrl;
        }
        
        // 입력 이미지 경로가 있으면 사용
        if (options.inputImagePath) {
          console.log('🖼️ Using input image path for FLUX KONTEXT thumbnail');
          return options.inputImagePath;
        }
        
        // 입력 이미지 S3 URL이 있으면 사용
        if (options.inputImageS3Url) {
          console.log('🖼️ Using input image S3 URL for FLUX KONTEXT thumbnail');
          return options.inputImageS3Url;
        }
      } catch (e) {
        console.warn('Failed to parse FLUX KONTEXT options:', e);
      }
    }
    
    // WAN 2.2의 경우 입력 이미지를 썸네일로 사용
    if (item.type === 'wan22' && item.options) {
      try {
        const options = JSON.parse(item.options);
        
        // base64 이미지가 있으면 사용 (FLUX KONTEXT와 동일)
        if (options.imageBase64) {
          console.log('🖼️ Using base64 image for WAN 2.2 thumbnail');
          return `data:image/jpeg;base64,${options.imageBase64}`;
        }
        
        // 입력 이미지 경로가 있으면 사용 (폴백)
        if (options.inputImagePath) {
          console.log('🖼️ Using input image path for WAN 2.2 thumbnail');
          return `/results/${options.inputImageName}`;
        }
      } catch (e) {
        console.warn('Failed to parse WAN 2.2 options:', e);
      }
    }
    
    // 다른 타입의 경우 결과 URL 사용
    if (item.status === 'completed' && item.resultUrl) {
      return item.resultUrl;
    }
    
    return item.thumbnailUrl;
  };

  const thumbnailUrl = getThumbnailUrl();
  const createdTime = new Date(item.createdAt).toLocaleTimeString();
  const completedTime = item.completedAt ? new Date(item.completedAt).toLocaleTimeString() : null;

  // 로컬 파일 정보 가져오기
  const getLocalFileInfo = () => {
    if (item.type === 'multitalk' && item.options) {
      try {
        const options = JSON.parse(item.options);
        return options.localFileInfo;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const localFileInfo = getLocalFileInfo();

  const handleClick = () => {
    if (item.status === 'completed' && item.resultUrl) {
      onItemClick(item);
    }
  };

  return (
    <div 
      className={`
        relative bg-background/50 rounded-lg border border-border overflow-hidden cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-background/70 group
        ${item.status === 'completed' ? 'hover:shadow-lg hover:shadow-primary/20' : ''}
      `}
      onClick={handleClick}
    >
      {/* 썸네일 */}
      <div className="relative aspect-video bg-background overflow-hidden">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt="Thumbnail" 
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              console.error('❌ Thumbnail error:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/30">
            <PhotoIcon className="w-12 h-12" />
          </div>
        )}
        
        {/* 상태 표시 */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white backdrop-blur-sm">
          ID: {item.id.substring(0, 6)}
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={(e) => onDeleteClick(item, e)}
          className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 backdrop-blur-sm"
          title="삭제"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>

        {/* 즐겨찾기 버튼 */}
        <button
          onClick={(e) => onFavoriteToggle(item, e)}
          className={`absolute bottom-2 left-2 p-1.5 rounded-full transition-all duration-200 hover:scale-110 backdrop-blur-sm ${
            item.isFavorite 
              ? 'bg-yellow-500/90 hover:bg-yellow-400 text-white opacity-100' 
              : 'bg-gray-600/80 hover:bg-gray-500 text-white opacity-0 group-hover:opacity-100'
          }`}
          title={item.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          <StarIcon className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>
      
      <div className="p-3 space-y-2">
        <p className="text-sm text-foreground/80 truncate">
          {item.type === 'multitalk' ? 'MultiTalk Content' : 
           item.type === 'wan22' ? 'WAN 2.2 Video' : 
           (item.prompt || 'No prompt')}
        </p>
        
        <div className="flex justify-between items-center">
          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full capitalize">
            {item.type}
          </span>
          <span className={`text-xs font-medium ${
            item.status === 'completed' ? 'text-green-400' : 
            item.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {item.status}
          </span>
        </div>
        
        <div className="text-xs text-foreground/50 space-y-1">
          <div>Created: {createdTime}</div>
          {completedTime && <div>Completed: {completedTime}</div>}
        </div>
      </div>
    </div>
  );
};

// 결과 모달 컴포넌트
const ResultModal: React.FC<{ item: JobItem | null; onClose: () => void }> = ({ item, onClose }) => {
  if (!item) return null;

  const getOptions = () => {
    try {
      return item.options ? JSON.parse(item.options) : {};
    } catch (e) {
      return {};
    }
  };

  const options = getOptions();

  // 실제 결과 URL 가져오기
  const getResultUrl = () => {
    if (item.resultUrl) {
      // RunPod에서 직접 제공하는 URL인 경우
      if (item.resultUrl.startsWith('http')) {
        return item.resultUrl;
      }
      
      // 로컬 경로인 경우 (개발 환경)
      if (item.resultUrl.startsWith('/')) {
        return item.resultUrl;
      }
    }
    
    // options에서 RunPod 결과 URL 찾기
    if (options.runpodResultUrl) {
      return options.runpodResultUrl;
    }
    
    return null;
  };

  const resultUrl = getResultUrl();

  // 로컬 파일 정보 가져오기
  const getLocalFileInfo = () => {
    if (item.type === 'multitalk' && item.options) {
      try {
        const options = JSON.parse(item.options);
        return options.localFileInfo;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const localFileInfo = getLocalFileInfo();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-secondary rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-semibold">
            {item.type === 'multitalk' ? 'MultiTalk Result' : `${item.type} Result`}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 프롬프트 */}
          {item.prompt && (
            <div>
              <h4 className="font-medium mb-2">Prompt</h4>
              <p className="text-foreground/80 bg-background p-3 rounded-lg">{item.prompt}</p>
            </div>
          )}
          
          {/* 결과물 */}
          {resultUrl ? (
            <div>
              <h4 className="font-medium mb-2">Result</h4>
              {item.type === 'multitalk' ? (
                <div className="space-y-4">
                  <video 
                    controls 
                    className="w-full max-h-96 rounded-lg bg-black"
                    src={resultUrl}
                    onError={(e) => console.error('Video error:', e)}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div className="text-sm text-foreground/60">
                    💡 비디오가 재생되지 않는 경우, 직접 다운로드하여 확인해보세요.
                  </div>
                </div>
              ) : item.type === 'flux-kontext' ? (
                // FLUX KONTEXT는 이미지 결과만 표시
                <div className="space-y-4">
                  <img 
                    src={resultUrl} 
                    alt="Generated FLUX KONTEXT image" 
                    className="w-full max-h-96 object-contain rounded-lg bg-background"
                    onError={(e) => console.error('FLUX KONTEXT image error:', e)}
                    onLoad={() => console.log('✅ FLUX KONTEXT image loaded successfully:', resultUrl)}
                  />
                  <div className="text-sm text-foreground/60">
                    🎨 FLUX KONTEXT로 생성된 이미지입니다.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <video 
                    controls 
                    className="w-full max-h-96 rounded-lg bg-black"
                    src={resultUrl}
                    onError={(e) => console.error('Video error:', e)}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div className="text-sm text-foreground/60">
                    💡 비디오가 재생되지 않는 경우, 직접 다운로드하여 확인해보세요.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-foreground/50 mb-4">
                <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                <p>결과물을 찾을 수 없습니다.</p>
              </div>
              <div className="text-sm text-foreground/40 space-y-1">
                <p>• 작업이 아직 완료되지 않았을 수 있습니다.</p>
                <p>• 결과 URL이 설정되지 않았을 수 있습니다.</p>
                <p>• 잠시 후 다시 시도해보세요.</p>
              </div>
            </div>
          )}
          
          {/* 입력 이미지 (MultiTalk의 경우) */}
          {item.type === 'multitalk' && (
            <div>
              <h4 className="font-medium mb-2">Input Image</h4>
              
              {/* 로컬 이미지 웹 경로가 있으면 표시 */}
              {options.imageWebPath ? (
                <div className="relative">
                  <img 
                    src={options.imageWebPath} 
                    alt="Input image" 
                    className="w-full max-h-64 object-contain rounded-lg bg-background"
                    onError={(e) => {
                      console.error('❌ Local image error:', e);
                      console.error('❌ Local path:', options.imageWebPath);
                      
                      // 에러 발생 시 이미지 요소를 숨기고 에러 메시지 표시
                      const imgElement = e.currentTarget;
                      imgElement.style.display = 'none';
                      
                      // 에러 메시지 표시
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'p-4 text-center text-red-400 bg-red-900/20 rounded-lg';
                      errorDiv.innerHTML = `
                        <div class="mb-2">⚠️ 입력 이미지를 불러올 수 없습니다</div>
                        <div class="text-xs text-red-300">
                          <p>웹 경로: ${options.imageWebPath}</p>
                          <p>💡 파일이 public/results 폴더에 있는지 확인하세요</p>
                        </div>
                      `;
                      imgElement.parentNode?.appendChild(errorDiv);
                    }}
                    onLoad={() => {
                      console.log('✅ Local input image loaded successfully:', options.imageWebPath);
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-foreground/50">
                  <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                  <p>입력 이미지 정보를 찾을 수 없습니다.</p>
                </div>
              )}
            </div>
          )}
          
          {/* FLUX KONTEXT 입력 이미지 */}
          {item.type === 'flux-kontext' && (
            <div>
              <h4 className="font-medium mb-2">Input Image</h4>
              {(() => {
                try {
                  const options = JSON.parse(item.options || '{}');
                  
                  // 입력 이미지 경로가 있으면 표시
                  if (options.inputImagePath) {
                    return (
                      <div className="space-y-4">
                        <div className="bg-background/50 p-4 rounded-lg">
                          <h5 className="font-medium mb-2">Local File Info</h5>
                          <div className="text-sm text-foreground/80 space-y-1">
                            <p><strong>Path:</strong> {options.inputImagePath}</p>
                            <p><strong>Name:</strong> {options.inputImageName || 'Unknown'}</p>
                          </div>
                        </div>
                        
                        {/* 입력 이미지 표시 시도 */}
                        <div className="relative">
                          <img 
                            src={`/results/${options.inputImageName}`} 
                            alt="Input image" 
                            className="w-full max-h-64 object-contain rounded-lg bg-background"
                            onError={(e) => {
                              console.error('❌ Input image error:', e);
                              console.error('❌ Image path:', options.inputImagePath);
                              console.error('❌ Image name:', options.inputImageName);
                              console.error('❌ Web path:', `/results/${options.inputImageName}`);
                              
                              // 에러 발생 시 이미지 요소를 숨기고 에러 메시지 표시
                              const imgElement = e.currentTarget;
                              imgElement.style.display = 'none';
                              
                              // 에러 메시지 표시
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'p-4 text-center text-red-400 bg-red-900/20 rounded-lg';
                              errorDiv.innerHTML = `
                                <div class="mb-2">⚠️ 입력 이미지를 불러올 수 없습니다</div>
                                <div class="text-xs text-red-300">
                                  <p>웹 경로: /results/${options.inputImageName}</p>
                                  <p>실제 경로: ${options.inputImagePath}</p>
                                  <p>파일명: ${options.inputImageName}</p>
                                  <p>💡 파일은 존재하지만 웹 접근 경로 문제일 수 있습니다</p>
                                </div>
                              `;
                              imgElement.parentNode?.appendChild(errorDiv);
                            }}
                            onLoad={() => {
                              console.log('✅ Input image loaded successfully:', options.inputImageName);
                              console.log('✅ Web path used:', `/results/${options.inputImageName}`);
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="text-center py-8 text-foreground/50">
                      <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>입력 이미지 정보를 찾을 수 없습니다.</p>
                    </div>
                  );
                } catch (e) {
                  return (
                    <div className="text-center py-8 text-foreground/50">
                      <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>입력 이미지 정보를 파싱할 수 없습니다.</p>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {/* WAN 2.2 입력 이미지 */}
          {item.type === 'wan22' && (
            <div>
              <h4 className="font-medium mb-2">Input Image</h4>
              {(() => {
                try {
                  const options = JSON.parse(item.options || '{}');
                  
                  // base64 이미지가 있으면 우선 표시 (FLUX KONTEXT와 동일)
                  if (options.imageBase64) {
                    return (
                      <div className="space-y-4">
                        <div className="bg-background/50 p-4 rounded-lg">
                          <h5 className="font-medium mb-2">Base64 Image Data</h5>
                          <div className="text-sm text-foreground/80 space-y-1">
                            <p><strong>Format:</strong> Base64 encoded</p>
                            <p><strong>Size:</strong> {(options.imageBase64.length * 0.75 / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        
                        {/* base64 이미지 표시 */}
                        <div className="relative">
                          <img 
                            src={`data:image/jpeg;base64,${options.imageBase64}`}
                            alt="Input image" 
                            className="w-full max-h-64 object-contain rounded-lg bg-background"
                            onLoad={() => {
                              console.log('✅ Base64 input image loaded successfully');
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                  
                  // 입력 이미지 경로가 있으면 표시 (폴백)
                  if (options.inputImagePath) {
                    return (
                      <div className="space-y-4">
                        <div className="bg-background/50 p-4 rounded-lg">
                          <h5 className="font-medium mb-2">Local File Info</h5>
                          <div className="text-sm text-foreground/80 space-y-1">
                            <p><strong>Path:</strong> {options.inputImagePath}</p>
                            <p><strong>Name:</strong> {options.inputImageName || 'Unknown'}</p>
                          </div>
                        </div>
                        
                        {/* 입력 이미지 표시 시도 */}
                        <div className="relative">
                          <img 
                            src={`/results/${options.inputImageName}`} 
                            alt="Input image" 
                            className="w-full max-h-64 object-contain rounded-lg bg-background"
                            onError={(e) => {
                              console.error('❌ Input image error:', e);
                              console.error('❌ Image path:', options.inputImagePath);
                              console.error('❌ Image name:', options.inputImageName);
                              console.error('❌ Web path:', `/results/${options.inputImageName}`);
                              
                              // 에러 발생 시 이미지 요소를 숨기고 에러 메시지 표시
                              const imgElement = e.currentTarget;
                              imgElement.style.display = 'none';
                              
                              // 에러 메시지 표시
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'p-4 text-center text-red-400 bg-red-900/20 rounded-lg';
                              errorDiv.innerHTML = `
                                <div class="mb-2">⚠️ 입력 이미지를 불러올 수 없습니다</div>
                                <div class="text-xs text-red-300">
                                  <p>웹 경로: /results/${options.inputImageName}</p>
                                  <p>실제 경로: ${options.inputImagePath}</p>
                                  <p>파일명: ${options.inputImageName}</p>
                                  <p>💡 파일은 존재하지만 웹 접근 경로 문제일 수 있습니다</p>
                                </div>
                              `;
                              imgElement.parentNode?.appendChild(errorDiv);
                            }}
                            onLoad={() => {
                              console.log('✅ Input image loaded successfully:', options.inputImageName);
                              console.log('✅ Web path used:', `/results/${options.inputImageName}`);
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="text-center py-8 text-foreground/50">
                      <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>입력 이미지 정보를 찾을 수 없습니다.</p>
                    </div>
                  );
                } catch (e) {
                  return (
                    <div className="text-center py-8 text-foreground/50">
                      <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>입력 이미지 정보를 파싱할 수 없습니다.</p>
                    </div>
                  );
                }
              })()}
            </div>
          )}


        </div>
      </div>
    </div>
  );
};

export default function Library() {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedItem, setSelectedItem] = useState<JobItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<JobItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const { data, error, isValidating, mutate } = useSWR('/api/jobs', fetcher, { 
    refreshInterval: 5000,
    onSuccess: () => setLastUpdate(new Date())
  });

  const jobs: JobItem[] = data?.jobs || [];
  const processingJobs = jobs.filter(job => job.status === 'processing').length;
  
  // 즐겨찾기 필터링
  const filteredJobs = showFavoritesOnly ? jobs.filter(job => job.isFavorite) : jobs;

  const handleItemClick = (item: JobItem) => {
    setSelectedItem(item);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  const handleDeleteClick = (item: JobItem, e: React.MouseEvent) => {
    e.stopPropagation(); // 부모 클릭 이벤트 방지
    setDeleteConfirm(item);
  };

  const handleFavoriteToggle = async (item: JobItem, e: React.MouseEvent) => {
    e.stopPropagation(); // 부모 클릭 이벤트 방지
    
    try {
      const response = await fetch('/api/jobs/favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId: item.id }),
      });

      if (response.ok) {
        // 데이터 새로고침
        await mutate();
      } else {
        const errorData = await response.json();
        console.error('Favorite toggle failed:', errorData);
        alert('즐겨찾기 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Favorite toggle error:', error);
      alert('즐겨찾기 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/jobs/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId: deleteConfirm.id }),
      });

      if (response.ok) {
        // 데이터 새로고침
        await mutate();
        setDeleteConfirm(null);
      } else {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        alert('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  return (
    <>
      <aside className="w-[450px] bg-secondary p-6 flex flex-col flex-shrink-0 border-l border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Library</h2>
          <div className="flex items-center gap-2">
            {processingJobs > 0 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-400"></div>
                <span className="text-xs">{processingJobs} processing</span>
              </div>
            )}
            {isValidating && (
              <div className="text-xs text-foreground/50">Updating...</div>
            )}
          </div>
        </div>
        <div className="bg-background/50 rounded-lg p-1 flex gap-1 mb-6">
          <button
            className={`flex-1 capitalize py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 ${showFavoritesOnly ? 'bg-primary text-white' : 'hover:bg-white/5'}`}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            {showFavoritesOnly ? '전체 보기' : '즐겨찾기만 보기'}
          </button>
        </div>
        {error && <div className="text-red-500 text-center">Failed to load jobs</div>}
        {!data && <div className="text-center">Loading...</div>}
        <div className="flex-1 grid grid-cols-2 gap-3 overflow-y-auto pr-2 auto-rows-min library-scrollbar">
          {filteredJobs.length === 0 && !error && data ? (
            <p className="text-foreground/50 col-span-2 text-center">
              {showFavoritesOnly ? '즐겨찾기된 항목이 없습니다.' : '작업 결과가 없습니다.'}
            </p>
          ) : (
            filteredJobs.map((job) => (
              <LibraryItem 
                key={job.id} 
                item={job} 
                onItemClick={handleItemClick}
                onDeleteClick={handleDeleteClick}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))
          )}
        </div>
      </aside>
      
      {/* 결과 모달 */}
      <ResultModal item={selectedItem} onClose={handleCloseModal} />
      
      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-secondary rounded-lg max-w-md w-full p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <TrashIcon className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold">결과물 삭제</h3>
            </div>
            
            <p className="text-foreground/80 mb-6">
              <strong>{deleteConfirm.type}</strong> 결과물을 삭제하시겠습니까?
              <br />
              <span className="text-sm text-foreground/60">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 text-foreground/70 hover:text-foreground transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    삭제 중...
                  </>
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
