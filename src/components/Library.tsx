
'use client';

import { useState, useEffect, useRef } from "react";
import useSWR from 'swr';
import { XMarkIcon, PlayIcon, PhotoIcon, TrashIcon, StarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useI18n } from '@/lib/i18n/context';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface JobItem {
  id: string;
  userId: string;
  workspaceId?: string;
  status: 'processing' | 'completed' | 'failed';
  type: 'video' | 'multitalk' | 'flux-kontext' | 'flux-krea' | 'wan22' | 'wan-animate' | 'infinitetalk'|'video-upscale'|'qwen-image-edit'|'audio';
  prompt?: string;
  options?: string;
  resultUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  completedAt?: string;
  isFavorite?: boolean; // 즐겨찾기 상태
  workspace?: Workspace; // 워크스페이스 정보
}

interface LibraryItemProps {
  item: JobItem;
  onItemClick: (item: JobItem) => void;
  onDeleteClick: (item: JobItem, e: React.MouseEvent) => void;
  onFavoriteToggle: (item: JobItem, e: React.MouseEvent) => void;
  onReuseInputs: (item: JobItem) => void;
  onMoveToWorkspace: (jobId: string, workspaceId: string) => void;
  availableWorkspaces: Workspace[];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

// 워크스페이스 데이터 fetcher
const workspaceFetcher = (url: string) => fetch(url).then(res => res.json());

const LibraryItem: React.FC<LibraryItemProps> = ({ item, onItemClick, onDeleteClick, onFavoriteToggle, onReuseInputs, onMoveToWorkspace, availableWorkspaces }) => {
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const { t } = useI18n();

  // Fallback function to handle cases where translation might not be available
  const safeT = (key: string, params?: Record<string, string | number>) => {
    try {
      return t(key, params);
    } catch (error) {
      console.warn(`Translation error for key: ${key}`, error);
      return key; // Return the key as fallback
    }
  };

  // MultiTalk의 경우 options에서 입력 이미지 경로 추출
  const getThumbnailUrl = () => {
    // Audio의 경우 생성된 썸네일 사용
    if (item.type === 'audio' && item.thumbnailUrl) {
      return item.thumbnailUrl;
    }

    // MultiTalk의 경우 입력 이미지를 썸네일로 사용
    if (item.type === 'multitalk' && item.options) {
      try {
        const options = JSON.parse(item.options);

        // 로컬 웹 경로가 있으면 우선 사용 (가장 안정적)
        if (options.imageWebPath) {
          return options.imageWebPath;
        }

        // S3 URL이 있으면 사용 (폴백)
        if (options.imageS3Url) {
          return options.imageS3Url;
        }
      } catch (e) {
        // Silent fail
      }
    }

    // FLUX KONTEXT의 경우 결과 이미지나 입력 이미지 사용
    if (item.type === 'flux-kontext' && item.options) {
      try {
        const options = JSON.parse(item.options);

        // 결과 이미지가 있으면 우선 사용
        if (item.resultUrl) {
          return item.resultUrl;
        }

        // 입력 이미지 경로가 있으면 웹 경로로 변환하여 사용
        if (options.inputImagePath) {
          // 로컬 파일 경로를 웹 경로로 변환
          const fileName = options.inputImageName || options.inputImagePath.split('/').pop();
          if (fileName) {
            const webPath = `/results/${fileName}`;
            return webPath;
          }
          return options.inputImagePath;
        }

        // inputImageName이 직접 있는 경우 웹 경로로 사용
        if (options.inputImageName) {
          const webPath = `/results/${options.inputImageName}`;
          return webPath;
        }
      } catch (e) {
        // Silent fail
      }
    }

    // FLUX KREA의 경우 결과 이미지 사용
    if (item.type === 'flux-krea' && item.resultUrl) {
      return item.resultUrl;
    }

    // WAN 2.2의 경우 입력 이미지를 썸네일로 사용
    if (item.type === 'wan22' && item.options) {
      try {
        const options = JSON.parse(item.options);

        // 로컬 웹 경로가 있으면 직접 사용 (개발 환경)
        if (options.imageWebPath) {
          // 개발 환경에서는 직접 경로 사용
          return options.imageWebPath;
        }

        // 입력 이미지 경로가 있으면 다양한 패턴으로 시도
        if (options.inputImagePath) {
          // 기존 파일명이 있으면 사용
          if (options.inputImageName) {
            const webPath = `/results/${options.inputImageName}`;
            return webPath;
          }

          // 폴백: 기본 패턴
          return `/results/input_${item.id}.jpg`;
        }
      } catch (e) {
        // Silent fail
      }
    }

    // Infinite Talk의 경우 입력 이미지/비디오나 생성된 썸네일 사용
    if (item.type === 'infinitetalk' && item.options) {
      try {
        const options = JSON.parse(item.options);

        // 생성된 썸네일이 있으면 우선 사용 (최고 우선순위)
        if (item.thumbnailUrl) {
          return item.thumbnailUrl;
        }

        // 로컬 웹 경로가 있으면 사용 (이미지)
        if (options.imageWebPath) {
          return options.imageWebPath;
        }

        // 로컬 웹 경로가 있으면 사용 (비디오)
        if (options.videoWebPath) {
          return options.videoWebPath;
        }

        // 입력 이미지 파일명이 있으면 웹 경로로 변환
        if (options.imageFileName) {
          // 실제 저장된 파일명으로 변환 (input/infinitetalk/input_${jobId}_${originalName})
          const actualFileName = `input/infinitetalk/input_${item.id}_${options.imageFileName}`;
          const webPath = `/results/${actualFileName}`; // 슬래시는 인코딩하지 않음
          return webPath;
        }

        // 입력 비디오 파일명이 있으면 웹 경로로 변환
        if (options.videoFileName) {
          // 실제 저장된 파일명으로 변환 (input/infinitetalk/input_${jobId}_${originalName})
          const actualFileName = `input/infinitetalk/input_${item.id}_${options.videoFileName}`;
          const webPath = `/results/${actualFileName}`; // 슬래시는 인코딩하지 않음
          return webPath;
        }
      } catch (e) {
        // Silent fail
      }
    }

    // WAN Animate의 경우 입력 이미지/비디오를 썸네일로 사용
    if (item.type === 'wan-animate' && item.options) {
      try {
        const options = JSON.parse(item.options);

        // 로컬 웹 경로가 있으면 우선 사용 (가장 안정적)
        if (options.imageWebPath) {
          return options.imageWebPath;
        }

        // 입력 이미지가 있으면 사용 (폴백)
        if (options.hasImage && options.s3ImagePath) {
          // S3 경로를 로컬 웹 경로로 변환
          const fileName = options.s3ImagePath.split('/').pop();
          if (fileName) {
            const webPath = `/results/${fileName}`;
            return webPath;
          }
        }

        // 로컬 비디오 웹 경로가 있으면 사용
        if (options.videoWebPath) {
          return options.videoWebPath;
        }

        // 입력 비디오가 있으면 사용 (폴백)
        if (options.hasVideo && options.s3VideoPath) {
          // S3 경로를 로컬 웹 경로로 변환
          const fileName = options.s3VideoPath.split('/').pop();
          if (fileName) {
            const webPath = `/results/${fileName}`;
            return webPath;
          }
        }

        // 결과 비디오가 있으면 사용
        if (item.resultUrl) {
          return item.resultUrl;
        }
      } catch (e) {
        // Silent fail
      }
    }

    // Video Upscale의 경우 썸네일 URL 우선 사용
    if (item.type === 'video-upscale' && item.thumbnailUrl) {
      return item.thumbnailUrl;
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = itemRef.current?.getBoundingClientRect();
    if (rect) {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handleContextMenuAction = (action: () => void) => {
    setContextMenu({ visible: false, x: 0, y: 0 });
    action();
  };

  const handleReuseInputs = () => {
    handleContextMenuAction(() => onReuseInputs(item));
  };

  // 드래그 시작 핸들러
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    
    // 드래그할 데이터 구성
    const dragData = {
      type: 'library-result',
      jobType: item.type,
      jobId: item.id,
      prompt: item.prompt || '',
      // 미디어 타입과 URL 정보
      mediaType: item.type === 'flux-kontext' || item.type === 'flux-krea' || item.type === 'qwen-image-edit' ? 'image' : item.type === 'audio' ? 'audio' : 'video',
      mediaUrl: item.resultUrl || thumbnailUrl,
      thumbnailUrl: thumbnailUrl,
      // 실제 결과 URL (비디오의 경우 실제 비디오 파일)
      resultUrl: item.resultUrl,
      // 각 타입별 추가 정보
      ...(item.type === 'multitalk' && {
        inputImagePath: getThumbnailUrl(),
        videoUrl: item.resultUrl // 실제 비디오 URL 추가
      }),
      ...(item.type === 'flux-kontext' && { inputImagePath: getThumbnailUrl() }),
      ...(item.type === 'flux-krea' && { imageUrl: getThumbnailUrl() }),
      ...(item.type === 'qwen-image-edit' && { imageUrl: getThumbnailUrl() }),
      ...(item.type === 'wan22' && {
        inputImagePath: getThumbnailUrl(),
        videoUrl: item.resultUrl // 실제 비디오 URL 추가
      }),
      ...(item.type === 'wan-animate' && {
        imageUrl: getThumbnailUrl(),
        videoUrl: item.resultUrl // 실제 비디오 URL 추가
      }),
      ...(item.type === 'infinitetalk' && {
        inputType: 'video',
        videoUrl: item.resultUrl // 실제 비디오 URL 사용
      }),
      ...(item.type === 'video-upscale' && {
        videoUrl: item.resultUrl // 실제 비디오 URL 사용
      }),
      ...(item.type === 'audio' && {
        audioUrl: item.resultUrl, // 실제 오디오 URL 사용
        audioName: item.prompt || 'Audio' // 오디오 이름
      })
    };

    // 드래그 데이터를 텍스트로 저장 (다른 페이지에서 접근 가능)
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData)); // 폴백용
    
    // 썸네일을 드래그 이미지로 설정 (또는 오디오의 경우 아이콘)
    const img = itemRef.current?.querySelector('img');
    if (img) {
      e.dataTransfer.setDragImage(img, 50, 30); // 드래그 시 보여질 썸네일 위치
    } else if (item.type === 'audio') {
      // 오디오는 아이콘을 드래그 이미지로 사용
      const svg = itemRef.current?.querySelector('svg');
      if (svg) {
        e.dataTransfer.setDragImage(svg, 24, 24);
      }
    }

    console.log('📦 드래그 데이터:', dragData);
  };

  // 드래그 종료 핸들러
  const handleDragEnd = () => {
    console.log('🖱️ 드래그 종료');
    setIsDragging(false);
  };

  // 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu.visible && !itemRef.current?.contains(e.target as Node)) {
        setContextMenu({ visible: false, x: 0, y: 0 });
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.visible]);

  return (
    <>
      <div 
        ref={itemRef}
        className={`
          relative bg-background/50 rounded-lg border border-border overflow-hidden cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-background/70 group
          ${item.status === 'completed' ? 'hover:shadow-lg hover:shadow-primary/20' : ''}
          ${isDragging ? 'opacity-50 scale-95 transform origin-center' : ''}
        `}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable={item.status === 'completed' && (thumbnailUrl || item.resultUrl || item.type === 'audio')}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
      {/* 썸네일 */}
      <div className="relative aspect-video bg-background overflow-hidden">
        {thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt="Thumbnail" 
            className={`w-full h-full object-cover transition-transform duration-200 ${isDragging ? 'brightness-50' : 'group-hover:scale-105'}`}
            onError={(e) => {
              console.error('❌ Thumbnail error for', item.type, item.id, ':', e);
              console.error('❌ Failed URL:', thumbnailUrl);
              console.error('❌ Item details:', {
                type: item.type,
                id: item.id,
                status: item.status,
                resultUrl: item.resultUrl,
                options: item.options
              });
              e.currentTarget.style.display = 'none';
            }}
            onLoad={() => {
              console.log('✅ Thumbnail loaded successfully for', item.type, item.id, ':', thumbnailUrl);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/30">
            <PhotoIcon className="w-12 h-12" />
            <span className="ml-2 text-xs">No thumbnail</span>
          </div>
        )}
        

        {/* 삭제 버튼 */}
        <button
          onClick={(e) => onDeleteClick(item, e)}
          className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 backdrop-blur-sm"
          title={safeT('common.delete')}
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
          title={item.isFavorite ? safeT('library.removeFavorite') : safeT('library.addFavorite')}
        >
          <StarIcon className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>
      
      <div className="p-3 space-y-2">
        
        <div className="flex justify-between items-center">
          <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${
            item.type === 'flux-kontext' || item.type === 'flux-krea' || item.type === 'qwen-image-edit'
              ? 'bg-purple-500/20 text-purple-300' // 이미지 타입 - 보라색
              : item.type === 'audio'
              ? 'bg-amber-500/20 text-amber-300'   // 오디오 타입 - 황금색
              : 'bg-blue-500/20 text-blue-300'     // 비디오 타입 - 파란색
          }`}>
            {item.type}
          </span>
          <span className={`text-xs font-medium ${
            item.status === 'completed' ? 'text-green-400' : 
            item.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {item.status}
          </span>
        </div>
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-gradient-to-br from-secondary/95 to-secondary/90 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl py-2 min-w-[200px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            transform: 'translate(-50%, -10px)'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation(); // 이벤트 버블링 방지
              console.log('🖱️ 입력값 재사용 버튼 클릭됨');
              handleReuseInputs();
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-background/30 transition-all duration-200 flex items-center gap-3 rounded-lg mx-2 group"
          >
            <ArrowPathIcon className="w-4 h-4 text-primary group-hover:rotate-180 transition-transform duration-300" />
            <span className="text-foreground/90">🔄 {safeT('library.reuseInputs')}</span>
          </button>
          
          {/* 워크스페이스로 이동 */}
          {availableWorkspaces.length > 0 && (
            <>
              <div className="border-t border-border/30 my-2 mx-2"></div>
              <div className="px-4 py-2 text-xs text-foreground/60 font-medium bg-background/20 mx-2 rounded-lg">
                📂 {safeT('library.moveToWorkspace')}
              </div>
              <div className="max-h-40 overflow-y-auto custom-scrollbar">
                {availableWorkspaces
                  .filter((ws: any) => ws.id !== item.workspaceId)
                  .map((workspace: any) => (
                    <button
                      key={workspace.id}
                      onClick={(e) => {
                        e.stopPropagation(); // 이벤트 버블링 방지
                        onMoveToWorkspace(item.id, workspace.id);
                        setContextMenu({ visible: false, x: 0, y: 0 });
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-background/30 transition-all duration-200 flex items-center gap-3 rounded-lg mx-2 group"
                    >
                      {workspace.color ? (
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm ring-1 ring-white/20"
                          style={{ backgroundColor: workspace.color }}
                        />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary/60 to-primary/40 flex-shrink-0 shadow-sm ring-1 ring-white/20" />
                      )}
                      <span className="text-foreground/90 group-hover:text-foreground transition-colors">
                        {workspace.name}
                      </span>
                    </button>
                  ))}
              </div>
              {/* 워크스페이스에서 제거 */}
              {item.workspaceId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // 이벤트 버블링 방지
                    fetch(`/api/workspaces/${item.workspaceId}/jobs/${item.id}`, {
                      method: 'DELETE'
                    }).then(() => {
                      // 간단한 새로고침 (실제로는 부모에서 mutate 호출해야 함)
                      window.location.reload();
                    });
                    setContextMenu({ visible: false, x: 0, y: 0 });
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-red-500/10 transition-all duration-200 flex items-center gap-3 rounded-lg mx-2 group"
                >
                  <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-red-400 text-xs">✕</span>
                  </div>
                  <span className="text-red-400 group-hover:text-red-300 transition-colors">
                    {safeT('library.removeFromWorkspace')}
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
    </>
  );
};

// 결과 모달 컴포넌트
const ResultModal: React.FC<{ item: JobItem | null; onClose: () => void; t: (key: string, params?: Record<string, string | number>) => string }> = ({ item, onClose, t }) => {
  if (!item) return null;

  const safeT = (key: string, params?: Record<string, string | number>) => {
    try {
      return t(key, params);
    } catch (error) {
      console.warn(`Translation error for key: ${key}`, error);
      return key;
    }
  };

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
          
          {/* 작업 정보 */}
          <div>
            <h4 className="font-medium mb-2">{safeT('library.jobInfo')}</h4>
            <div className="bg-background/50 p-4 rounded-lg space-y-2">
              <div className="text-sm text-foreground/80">
                <span className="font-medium">Job ID:</span> {item.id.substring(0, 8)}
              </div>
              <div className="text-sm text-foreground/80">
                <span className="font-medium">{safeT('library.createdAt')}:</span> {new Date(item.createdAt).toLocaleString()}
              </div>
              {item.completedAt && (
                <span className="text-sm text-foreground/80">
                  <span className="font-medium">{safeT('library.completedAt')}:</span> {new Date(item.completedAt).toLocaleString()}
                </span>
              )}
              <div className="text-sm text-foreground/80">
                <span className="font-medium">{safeT('library.status')}:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                  item.status === 'completed' ? 'bg-green-500/20 text-green-300' : 
                  item.status === 'failed' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>
          </div>
          
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
                    💡 {safeT('library.videoNotPlaying')}
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
                    🎨 {safeT('library.fluxKontextImage')}
                  </div>
                </div>
              ) : item.type === 'flux-krea' ? (
                // FLUX KREA는 이미지 결과만 표시
                <div className="space-y-4">
                  <img
                    src={resultUrl}
                    alt="Generated FLUX KREA image"
                    className="w-full max-h-96 object-contain rounded-lg bg-background"
                    onError={(e) => console.error('FLUX KREA image error:', e)}
                    onLoad={() => console.log('✅ FLUX KREA image loaded successfully:', resultUrl)}
                  />
                  <div className="text-sm text-foreground/60">
                    🎨 {safeT('library.fluxKreaImage')}
                  </div>
                </div>
              ) : item.type === 'qwen-image-edit' ? (
                // Qwen Image Edit은 결과 이미지와 입력 이미지를 비교
                <div className="space-y-6">
                  {/* 결과 이미지 */}
                  <div className="space-y-3">
                    <h4 className="font-medium">{safeT('library.resultImage')}</h4>
                    <img
                      src={resultUrl}
                      alt="Generated Qwen Image Edit result"
                      className="w-full max-h-96 object-contain rounded-lg bg-background"
                      onError={(e) => console.error('Qwen Image Edit image error:', e)}
                      onLoad={() => console.log('✅ Qwen Image Edit image loaded successfully:', resultUrl)}
                    />
                    <div className="text-sm text-foreground/60">
                      🎨 {safeT('library.qwenImageEditImage')}
                    </div>
                  </div>

                  {/* 입력 이미지 비교 */}
                  {options.imageWebPath && (
                    <div className="border-t border-border/30 pt-4">
                      <h4 className="font-medium mb-3">{safeT('library.inputImageCompare')}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {/* 첫 번째 입력 이미지 */}
                        <div className="space-y-2">
                          <img
                            src={options.imageWebPath}
                            alt="Input image 1"
                            className="w-full max-h-64 object-contain rounded-lg bg-background"
                            onError={(e) => {
                              console.error('Input image 1 error:', e);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <p className="text-xs text-foreground/50 text-center">{safeT('library.inputImage1')}</p>
                        </div>

                        {/* 두 번째 입력 이미지 (있는 경우) */}
                        {options.imageWebPath2 && (
                          <div className="space-y-2">
                            <img
                              src={options.imageWebPath2}
                              alt="Input image 2"
                              className="w-full max-h-64 object-contain rounded-lg bg-background"
                              onError={(e) => {
                                console.error('Input image 2 error:', e);
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <p className="text-xs text-foreground/50 text-center">{safeT('library.inputImage2')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                    💡 {safeT('library.videoNotPlaying')}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-foreground/50 mb-4">
                <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                <p>{safeT('library.resultNotFound')}</p>
              </div>
              <div className="text-sm text-foreground/40 space-y-1">
                <p>• {safeT('library.jobNotCompleted')}</p>
                <p>• {safeT('library.resultUrlNotSet')}</p>
                <p>• {safeT('library.tryAgainLater')}</p>
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
                        <div class="mb-2">${safeT('library.inputImageLoadError')}</div>
                        <div class="text-xs text-red-300">
                          <p>${safeT('library.webPath')}: ${options.imageWebPath}</p>
                          <p>${safeT('library.fileNotInPublicFolder')}</p>
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
                  <p>{safeT('library.inputImageInfo')}</p>
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
                                <div class="mb-2">${safeT('library.inputImageLoadError')}</div>
                                <div class="text-xs text-red-300">
                                  <p>${safeT('library.webPath')}: /results/${options.inputImageName}</p>
                                  <p>${safeT('library.actualPath')}: ${options.inputImagePath}</p>
                                  <p>${safeT('library.fileName')}: ${options.inputImageName}</p>
                                  <p>${safeT('library.webAccessIssue')}</p>
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
                      <p>{safeT('library.inputImageInfo')}</p>
                    </div>
                  );
                } catch (e) {
                  return (
                    <div className="text-center py-8 text-foreground/50">
                      <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>{safeT('library.inputImageParseError')}</p>
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
                  
                  // 로컬 웹 경로가 있으면 우선 사용 (가장 안정적)
                  if (options.imageWebPath) {
                    return (
                      <div className="space-y-4">
                        <div className="bg-background/50 p-4 rounded-lg">
                          <h5 className="font-medium mb-2">Local Web Path</h5>
                          <div className="text-sm text-foreground/80 space-y-1">
                            <p><strong>Web Path:</strong> {options.imageWebPath}</p>
                            <p><strong>Status:</strong> Available</p>
                          </div>
                        </div>
                        
                        {/* 웹 경로 이미지 표시 */}
                        <div className="relative">
                          <img 
                            src={options.imageWebPath}
                            alt="Input image" 
                            className="w-full max-h-64 object-contain rounded-lg bg-background"
                            onError={(e) => {
                              console.error('❌ WAN 2.2 input image error:', e);
                              console.error('❌ Image path:', options.imageWebPath);
                              
                              // 에러 발생 시 이미지 요소를 숨기고 에러 메시지 표시
                              const imgElement = e.currentTarget;
                              imgElement.style.display = 'none';
                              
                              // 에러 메시지 표시
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'p-4 text-center text-red-400 bg-red-900/20 rounded-lg';
                              errorDiv.innerHTML = `
                                <div class="mb-2">${safeT('library.wan22InputImageError')}</div>
                                <div class="text-xs text-red-300">
                                  <p>${safeT('library.webPath')}: ${options.imageWebPath}</p>
                                  <p>${safeT('library.fileNotInPublicFolder')}</p>
                                </div>
                              `;
                              imgElement.parentNode?.appendChild(errorDiv);
                            }}
                            onLoad={() => {
                              console.log('✅ WAN 2.2 input image loaded successfully:', options.imageWebPath);
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                  
                  // base64 이미지가 있으면 표시 (FLUX KONTEXT와 동일)
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
                                <div class="mb-2">${safeT('library.inputImageLoadError')}</div>
                                <div class="text-xs text-red-300">
                                  <p>${safeT('library.webPath')}: /results/${options.inputImageName}</p>
                                  <p>${safeT('library.actualPath')}: ${options.inputImagePath}</p>
                                  <p>${safeT('library.fileName')}: ${options.inputImageName}</p>
                                  <p>${safeT('library.webAccessIssue')}</p>
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
                      <p>{safeT('library.inputImageInfo')}</p>
                      <div className="text-xs text-foreground/40 mt-2">
                        <p>Options: {JSON.stringify(options, null, 2)}</p>
                      </div>
                    </div>
                  );
                } catch (e) {
                  return (
                    <div className="text-center py-8 text-foreground/50">
                      <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>{safeT('library.inputImageParseError')}</p>
                      <div className="text-xs text-foreground/40 mt-2">
                        <p>Error: {e instanceof Error ? e.message : String(e)}</p>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {/* WAN Animate 입력 파일 */}
          {item.type === 'wan-animate' && (
            <div>
              <h4 className="font-medium mb-2">Input Files</h4>
              {(() => {
                try {
                  const options = JSON.parse(item.options || '{}');
                  
                  return (
                    <div className="space-y-4">
                      {/* 입력 이미지 */}
                      {options.hasImage && (options.imageWebPath || options.s3ImagePath) && (
                        <div>
                          <h5 className="font-medium mb-2 text-sm">Input Image</h5>
                          <div className="relative">
                            <img 
                              src={options.imageWebPath || `/results/${options.s3ImagePath.split('/').pop()}`} 
                              alt="Input image" 
                              className="w-full max-h-64 object-contain rounded-lg bg-background"
                              onError={(e) => {
                                console.error('❌ WAN Animate input image error:', e);
                                console.error('❌ Image path:', options.imageWebPath || options.s3ImagePath);
                                
                                const imgElement = e.currentTarget;
                                imgElement.style.display = 'none';
                                
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'p-4 text-center text-red-400 bg-red-900/20 rounded-lg';
                                errorDiv.innerHTML = `
                                  <div class="mb-2">${safeT('library.wanAnimateInputImageError')}</div>
                                  <div class="text-xs text-red-300">
                                    <p>${safeT('library.webPath')}: ${options.imageWebPath || `/results/${options.s3ImagePath.split('/').pop()}`}</p>
                                    <p>${safeT('library.s3Path')}: ${options.s3ImagePath}</p>
                                    <p>${safeT('library.fileNotInPublicFolder')}</p>
                                  </div>
                                `;
                                imgElement.parentNode?.appendChild(errorDiv);
                              }}
                              onLoad={() => {
                                console.log('✅ WAN Animate input image loaded successfully');
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* 입력 비디오 */}
                      {options.hasVideo && (options.videoWebPath || options.s3VideoPath) && (
                        <div>
                          <h5 className="font-medium mb-2 text-sm">Input Video</h5>
                          <div className="relative">
                            <video 
                              src={options.videoWebPath || `/results/${options.s3VideoPath.split('/').pop()}`} 
                              controls
                              className="w-full max-h-64 object-contain rounded-lg bg-black"
                              onError={(e) => {
                                console.error('❌ WAN Animate input video error:', e);
                                console.error('❌ Video path:', options.s3VideoPath);
                                
                                const videoElement = e.currentTarget;
                                videoElement.style.display = 'none';
                                
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'p-4 text-center text-red-400 bg-red-900/20 rounded-lg';
                                errorDiv.innerHTML = `
                                  <div class="mb-2">${safeT('library.wanAnimateInputVideoError')}</div>
                                  <div class="text-xs text-red-300">
                                    <p>${safeT('library.s3Path')}: ${options.s3VideoPath}</p>
                                    <p>${safeT('library.fileNotInPublicFolder')}</p>
                                  </div>
                                `;
                                videoElement.parentNode?.appendChild(errorDiv);
                              }}
                              onLoad={() => {
                                console.log('✅ WAN Animate input video loaded successfully');
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* 입력 파일이 없는 경우 */}
                      {!options.hasImage && !options.hasVideo && (
                        <div className="text-center py-8 text-foreground/50">
                          <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                          <p>{safeT('library.inputFileNotFound')}</p>
                        </div>
                      )}
                    </div>
                  );
                } catch (e) {
                  console.error('❌ Failed to parse WAN Animate options:', e);
                  return (
                    <div className="text-center py-8 text-foreground/50">
                      <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>{safeT('library.wanAnimateOptionsParseError')}</p>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {/* Infinite Talk 입력 파일 */}
          {item.type === 'infinitetalk' && (
            <div>
              <h4 className="font-medium mb-2">
                {(() => {
                  try {
                    const options = JSON.parse(item.options || '{}');
                    return options.inputType === 'video' ? 'Input Video' : 'Input Image';
                  } catch (e) {
                    return 'Input Image'; // 기본값
                  }
                })()}
              </h4>
              {(() => {
                try {
                  const options = JSON.parse(item.options || '{}');
                  
                  // 입력 타입에 따라 다른 처리
                  if (options.inputType === 'video' && options.videoWebPath) {
                    // 비디오 입력인 경우
                    return (
                      <div className="relative">
                        <video 
                          src={options.videoWebPath} 
                          controls
                          className="w-full max-h-64 object-contain rounded-lg bg-black"
                          onError={(e) => {
                            console.error('❌ Infinite Talk input video error:', e);
                            console.error('❌ Video path:', options.videoWebPath);
                            
                            const videoElement = e.currentTarget;
                            videoElement.style.display = 'none';
                            
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'p-4 text-center text-red-400 bg-red-900/20 rounded-lg';
                            errorDiv.innerHTML = `
                              <div class="mb-2">${safeT('library.infiniteTalkInputVideoError')}</div>
                              <div class="text-xs text-red-300">
                                <p>${safeT('library.webPath')}: ${options.videoWebPath}</p>
                                <p>${safeT('library.fileNotInPublicFolder')}</p>
                              </div>
                            `;
                            videoElement.parentNode?.appendChild(errorDiv);
                          }}
                          onLoad={() => {
                            console.log('✅ Infinite Talk input video loaded successfully:', options.videoWebPath);
                          }}
                        />
                      </div>
                    );
                  } else if (options.inputType === 'image' && options.imageWebPath) {
                    // 이미지 입력인 경우
                    return (
                      <div className="relative">
                        <img 
                          src={options.imageWebPath} 
                          alt="Input image" 
                          className="w-full max-h-64 object-contain rounded-lg bg-background"
                          onError={(e) => {
                            console.error('❌ Infinite Talk input image error:', e);
                            console.error('❌ Image path:', options.imageWebPath);
                            
                            const imgElement = e.currentTarget;
                            imgElement.style.display = 'none';
                            
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'p-4 text-center text-red-400 bg-red-900/20 rounded-lg';
                            errorDiv.innerHTML = `
                              <div class="mb-2">${safeT('library.infiniteTalkInputImageError')}</div>
                              <div class="text-xs text-red-300">
                                <p>${safeT('library.webPath')}: ${options.imageWebPath}</p>
                                <p>${safeT('library.fileNotInPublicFolder')}</p>
                              </div>
                            `;
                            imgElement.parentNode?.appendChild(errorDiv);
                          }}
                          onLoad={() => {
                            console.log('✅ Infinite Talk input image loaded successfully:', options.imageWebPath);
                          }}
                        />
                      </div>
                    );
                  }
                  
                  // 기존 경로 구조 fallback
                  if (options.inputType === 'video' && options.videoFileName) {
                    const fallbackPath = `/results/input/infinitetalk/input_${item.id}_${options.videoFileName}`;
                    return (
                      <div className="relative">
                        <video 
                          src={encodeURI(fallbackPath)} 
                          controls
                          className="w-full max-h-64 object-contain rounded-lg bg-black"
                          onError={(e) => {
                            console.error('❌ Infinite Talk fallback video error:', e);
                            console.error('❌ Fallback path:', fallbackPath);
                            
                            const videoElement = e.currentTarget;
                            videoElement.style.display = 'none';
                            
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'p-4 text-center text-red-400 bg-red-900/20 rounded-lg';
                            errorDiv.innerHTML = `
                              <div class="mb-2">${safeT('library.infiniteTalkInputVideoError')}</div>
                              <div class="text-xs text-red-300">
                                <p>${safeT('library.fallbackPath')}: ${fallbackPath}</p>
                                <p>${safeT('library.fileNotInPublicFolder')}</p>
                              </div>
                            `;
                            videoElement.parentNode?.appendChild(errorDiv);
                          }}
                          onLoad={() => {
                            console.log('✅ Infinite Talk fallback video loaded successfully:', fallbackPath);
                          }}
                        />
                      </div>
                    );
                  } else if (options.imageFileName) {
                    const fallbackPath = `/results/input/infinitetalk/input_${item.id}_${options.imageFileName}`;
                    return (
                      <div className="relative">
                        <img 
                          src={encodeURI(fallbackPath)} 
                          alt="Input image" 
                          className="w-full max-h-64 object-contain rounded-lg bg-background"
                          onError={(e) => {
                            console.error('❌ Infinite Talk fallback image error:', e);
                            console.error('❌ Fallback path:', fallbackPath);
                            
                            // 에러 발생 시 이미지 요소를 숨기고 에러 메시지 표시
                            const imgElement = e.currentTarget;
                            imgElement.style.display = 'none';
                            
                            // 에러 메시지 표시
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'p-4 text-center text-red-400 bg-red-900/20 rounded-lg';
                            errorDiv.innerHTML = `
                              <div class="mb-2">${safeT('library.infiniteTalkInputImageError')}</div>
                              <div class="text-xs text-red-300">
                                <p>${safeT('library.fallbackPath')}: ${fallbackPath}</p>
                                <p>${safeT('library.fileNotInPublicFolder')}</p>
                              </div>
                            `;
                            imgElement.parentNode?.appendChild(errorDiv);
                          }}
                          onLoad={() => {
                            console.log('✅ Infinite Talk fallback image loaded successfully:', fallbackPath);
                          }}
                        />
                      </div>
                    );
                  }
                  
                  return (
                    <div className="text-center py-8 text-foreground/50">
                      <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>{safeT('library.infiniteTalkInputImageNotFound')}</p>
                    </div>
                  );
                } catch (e) {
                  console.error('❌ Failed to parse Infinite Talk options:', e);
                  return (
                    <div className="text-center py-8 text-foreground/50">
                      <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>{safeT('library.infiniteTalkOptionsParseError')}</p>
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
  const { t } = useI18n();

  // Fallback function to handle cases where translation might not be available
  const safeT = (key: string, params?: Record<string, string | number>) => {
    try {
      return t(key, params);
    } catch (error) {
      console.warn(`Translation error for key: ${key}`, error);
      return key;
    }
  };

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedItem, setSelectedItem] = useState<JobItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<JobItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // 워크스페이스 관련 상태
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null | undefined>(undefined);
  const [workspaceInitialized, setWorkspaceInitialized] = useState(false);
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [deleteWorkspaceConfirm, setDeleteWorkspaceConfirm] = useState<{id: string, name: string} | null>(null);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);

  // 스마트 폴링을 위한 상태
  const [hasProcessingJobs, setHasProcessingJobs] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 20; // 한 번에 로드할 아이템 수

  // 처리 중인 작업이 있을 때만 빠른 폴링, 없으면 느린 폴링
  const refreshInterval = hasProcessingJobs ? 2000 : 10000; // 2초 또는 10초

  // 워크스페이스 데이터 가져오기
  const { data: workspaceData, mutate: mutateWorkspaces } = useSWR(
    `/api/workspaces?userId=user-with-settings`,
    workspaceFetcher,
    { revalidateOnFocus: false }
  );

  const workspaces = workspaceData?.workspaces || [];

  // 작업 데이터 가져오기 (워크스페이스 필터 포함)
  const jobsUrl = selectedWorkspaceId
    ? `/api/jobs?page=${currentPage}&limit=${ITEMS_PER_PAGE}&workspaceId=${selectedWorkspaceId}`
    : `/api/jobs?page=${currentPage}&limit=${ITEMS_PER_PAGE}`;
    
  const { data, error, isValidating, mutate } = useSWR(
    jobsUrl, 
    fetcher, 
    { 
      refreshInterval: isVisible ? refreshInterval : 0, // 탭이 보이지 않으면 폴링 중지
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000, // 중복 요청 방지 간격 증가
      onSuccess: (data) => {
        setLastUpdate(new Date());
        if (data?.pagination) {
          setTotalPages(data.pagination.totalPages);
        }
        // 처리 중인 작업이 있는지 확인
        const processingCount = data?.jobs?.filter((job: JobItem) => job.status === 'processing').length || 0;
        setHasProcessingJobs(processingCount > 0);
      }
    }
  );

  // 다른 페이지에서 갱신 이벤트를 보내면 즉시 리페치
  useEffect(() => {
    const handler = () => {
      mutate();
    };
    window.addEventListener('jobs:refresh', handler);
    return () => window.removeEventListener('jobs:refresh', handler);
  }, [mutate]);

  // 데이터 변수들 선언
  const jobs: JobItem[] = data?.jobs || [];
  const processingJobs = jobs.filter((job: any) => job.status === 'processing').length;

  // 즐겨찾기 필터링
  const filteredJobs = showFavoritesOnly ? jobs.filter((job: any) => job.isFavorite) : jobs;

  // 페이지 가시성 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);


  // 워크스페이스 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showWorkspaceDropdown) {
        const target = e.target as Element;
        if (!target.closest('[data-workspace-dropdown]')) {
          setShowWorkspaceDropdown(false);
        }
      }
    };

    if (showWorkspaceDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showWorkspaceDropdown]);

  // 워크스페이스 초기화 및 선택된 워크스페이스 로드
  useEffect(() => {
    const initializeWorkspace = async () => {
      try {
        console.log('🔄 Initializing workspace...');

        // 기본 워크스페이스 초기화
        const response = await fetch('/api/workspaces/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'user-with-settings' })
        });

        if (response.ok) {
          const { workspace, isNew } = await response.json();
          if (isNew) {
            console.log('✅ 기본 워크스페이스 생성됨:', workspace.name);
          } else {
            console.log('✅ 기본 워크스페이스 존재:', workspace.name);
          }

          // 워크스페이스 새로고침
          await mutateWorkspaces();

          // 마지막으로 선택된 워크스페이스를 설정으로부터 로드시도
          try {
            const settingsResponse = await fetch('/api/settings?userId=user-with-settings');
            if (settingsResponse.ok) {
              const { settings } = await settingsResponse.json();
              const currentWorkspaceId = settings.workspace?.currentWorkspaceId;
              if (currentWorkspaceId !== undefined) {
                console.log('✅ 저장된 워크스페이스 선택:', currentWorkspaceId);
                setSelectedWorkspaceId(currentWorkspaceId);
              } else {
                // 기본 워크스페이스를 현재 워크스페이스로 설정
                console.log('✅ 기본 워크스페이스 선택:', workspace.id);
                setSelectedWorkspaceId(workspace.id);
              }
            }
          } catch (error) {
            console.error('설정 로드 실패:', error);
            // 폴백: 생성된 워크스페이스를 선택
            console.log('✅ 폴백: 초기화된 워크스페이스 선택:', workspace.id);
            setSelectedWorkspaceId(workspace.id);
          }
          setWorkspaceInitialized(true);
        }
      } catch (error) {
        console.error('워크스페이스 초기화 실패:', error);
      }
    };

    // 아직 초기화되지 않았을 때만 초기화 실행
    if (!workspaceInitialized && selectedWorkspaceId === undefined) {
      console.log('⚠️ 워크스페이스 초기화 시작...');
      initializeWorkspace();
    }
  }, [selectedWorkspaceId, workspaces, mutateWorkspaces]);

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
        alert(safeT('library.favoriteToggleFailed'));
      }
    } catch (error) {
      console.error('Favorite toggle error:', error);
      alert(safeT('library.favoriteToggleError'));
    }
  };

  const handleReuseInputs = (item: JobItem) => {
    try {
      const options = item.options ? JSON.parse(item.options) : {};

      // 필요한 설정값만 추출 (용량 절약)
      const essentialOptions = {
        // 공통 설정값들
        width: options.width,
        height: options.height,
        seed: options.seed,
        cfg: options.cfg,
        steps: options.steps,
        guidance: options.guidance,
        guidance_scale: options.guidance_scale,
        model: options.model,
        length: options.length,
        step: options.step,
        audioMode: options.audioMode,
        taskType: options.taskType,
        personCount: options.personCount,
        inputType: options.inputType,
        hasImage: options.hasImage,
        hasVideo: options.hasVideo,
        mode: options.mode, // WAN Animate mode
        // LoRA 관련 (필요한 경우만)
        selectedLora: options.selectedLora || options.lora, // FLUX KREA는 'lora' 필드 사용
        lora: options.lora, // FLUX KREA 원본 필드도 포함
        loraWeight: options.loraWeight,
        // WAN 2.2의 LoRA 페어 정보
        loraPairs: options.loraPairs,
        loraCount: options.loraCount
      };

      // 입력값 재사용을 위한 데이터 구성 (최소한의 데이터만)
      const reuseData = {
        type: item.type,
        prompt: item.prompt || '',
        options: essentialOptions,
        // 각 타입별로 필요한 입력값들 추출
        ...(item.type === 'multitalk' && {
          imagePath: options.imageWebPath || options.imageS3Url,
          imageName: options.imageName
        }),
        ...(item.type === 'flux-kontext' && {
          inputImagePath: options.inputImagePath,
          inputImageName: options.inputImageName
        }),
        ...(item.type === 'wan22' && {
          imagePath: options.imageWebPath || options.inputImagePath,
          imageName: options.inputImageName,
          // End frame 정보 추가
          endImagePath: options.endImageWebPath || options.endImagePath,
          endImageName: options.endImageName
        }),
        ...(item.type === 'wan-animate' && {
          imagePath: options.imageWebPath || options.s3ImagePath,
          videoPath: options.videoWebPath || options.s3VideoPath,
          hasImage: options.hasImage,
          hasVideo: options.hasVideo,
          mode: options.mode || 'replace'
        }),
        ...(item.type === 'infinitetalk' && {
          inputType: options.inputType,
          imagePath: options.imageWebPath,
          videoPath: options.videoWebPath,
          imageFileName: options.imageFileName,
          videoFileName: options.videoFileName,
          // 원본 오디오 경로와 트림 정보 함께 저장 (UI가 복원하도록)
          audioPath: options.originalAudioWebPath || options.audioWebPath,
          audioPath2: options.originalAudioWebPath2 || options.audioWebPath2,
          audioFileName: options.audioFileName,
          audioFileName2: options.audioFileName2,
          audioTrimStartStr: options.audioTrimStartStr,
          audioTrimEndStr: options.audioTrimEndStr,
          audio2TrimStartStr: options.audio2TrimStartStr,
          audio2TrimEndStr: options.audio2TrimEndStr
        }),
        ...(item.type === 'video-upscale' && {
          videoPath: options.videoWebPath || options.s3VideoPath,
          videoFileName: options.videoFileName
        }),
        ...(item.type === 'qwen-image-edit' && {
          imagePath: options.imageWebPath,
          imageName: options.imageName,
          imagePath2: options.imageWebPath2,
          imageName2: options.imageName2,
          hasSecondImage: options.hasSecondImage
        })
      };

      // 로컬 스토리지에 저장하여 다른 페이지에서 사용할 수 있도록 함
      const reuseDataString = JSON.stringify(reuseData);
      localStorage.setItem('reuseInputs', reuseDataString);

      // 해당 타입의 페이지로 이동
      const pageMap: { [key: string]: string } = {
        'multitalk': '/multitalk',
        'flux-kontext': '/flux-kontext',
        'flux-krea': '/flux-krea',
        'wan22': '/video-generation',
        'wan-animate': '/wan-animate',
        'infinitetalk': '/infinite-talk',
        'video-upscale': '/video-upscale',
        'qwen-image-edit': '/qwen-image-edit'
      };

      const targetPage = pageMap[item.type];

      if (targetPage) {
        window.location.href = targetPage;
      } else {
        console.error('Page not found:', item.type);
        alert(safeT('library.pageNotFound'));
      }
    } catch (error) {
      console.error('❌ 입력값 재사용 중 오류:', error);
      console.error('❌ 오류 상세:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        item: item
      });
      
      // localStorage 용량 초과 오류인 경우 특별 처리
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        alert(safeT('library.quotaExceeded'));
      } else {
        alert(safeT('library.reuseError'));
      }
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
        alert(safeT('library.deleteFailed'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(safeT('library.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  // 워크스페이스 관련 핸들러들
  const handleWorkspaceChange = async (workspaceId: string | null) => {
    setSelectedWorkspaceId(workspaceId);
    setCurrentPage(1); // 페이지 리셋

    // 현재 워크스페이스를 설정으로 저장 (All Jobs 포함)
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-with-settings',
          settings: {
            workspace: {
              currentWorkspaceId: workspaceId
            }
          }
        })
      });
    } catch (error) {
      console.error('워크스페이스 설정 저장 실패:', error);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-with-settings',
          name: newWorkspaceName.trim(),
          description: ''
        })
      });

      if (response.ok) {
        await mutateWorkspaces();
        setNewWorkspaceName('');
        setShowWorkspaceManager(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || safeT('library.workspaceCreateFailed'));
      }
    } catch (error) {
      console.error('Workspace creation error:', error);
      alert(safeT('library.workspaceCreateError'));
    }
  };

  const handleMoveToWorkspace = async (jobId: string, workspaceId: string) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/jobs/${jobId}`, {
        method: 'PUT'
      });

      if (response.ok) {
        await mutate(); // 작업 목록 새로고침
        await mutateWorkspaces(); // 워크스페이스 개수 업데이트
      } else {
        const errorData = await response.json();
        alert(errorData.error || safeT('library.jobMoveFailed'));
      }
    } catch (error) {
      console.error('Job move error:', error);
      alert(safeT('library.jobMoveError'));
    }
  };

  const handleDeleteWorkspace = (workspaceId: string, workspaceName: string) => {
    setDeleteWorkspaceConfirm({ id: workspaceId, name: workspaceName });
  };

  const handleDeleteWorkspaceConfirm = async () => {
    if (!deleteWorkspaceConfirm) return;

    setIsDeletingWorkspace(true);
    try {
      const response = await fetch(`/api/workspaces/${deleteWorkspaceConfirm.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // 워크스페이스 목록 새로고침
        await mutateWorkspaces();
        
        // 삭제된 워크스페이스가 현재 선택된 워크스페이스라면 전체 작업으로 변경
        if (selectedWorkspaceId === deleteWorkspaceConfirm.id) {
          await handleWorkspaceChange(null);
        }
        
        setDeleteWorkspaceConfirm(null);
        console.log('✅ 워크스페이스가 삭제되었습니다.');
      } else {
        const errorData = await response.json();
        console.error('❌ 워크스페이스 삭제 실패:', errorData);
        alert(errorData.error || safeT('library.workspaceDeleteFailed'));
      }
    } catch (error) {
      console.error('❌ 워크스페이스 삭제 오류:', error);
      alert(safeT('library.workspaceDeleteError'));
    } finally {
      setIsDeletingWorkspace(false);
    }
  };

  const handleDeleteWorkspaceCancel = () => {
    setDeleteWorkspaceConfirm(null);
  };

  return (
    <>
      <aside className="w-[450px] bg-secondary p-6 flex flex-col flex-shrink-0 border-l border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{safeT('library.title')}</h2>
          <div className="flex items-center gap-2">
            {processingJobs > 0 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-400"></div>
                <span className="text-xs">{processingJobs} processing</span>
              </div>
            )}
            {isValidating && (
              <div className="flex items-center gap-1 text-xs text-foreground/50">
                <div className="animate-spin rounded-full h-2 w-2 border-b border-foreground/50"></div>
                <span>Updating...</span>
              </div>
            )}
          </div>
        </div>
        
        {/* 워크스페이스 선택기 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-foreground/70">{safeT('library.workspace')}</h3>
            <button
              onClick={() => setShowWorkspaceManager(true)}
              className="group relative text-xs text-foreground/60 hover:text-primary transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-primary/10 hover:shadow-sm border border-transparent hover:border-primary/20"
              title={safeT('library.workspaceManagement')}
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">{safeT('library.manage')}</span>
              </div>
              {/* 호버 시 미묘한 글로우 효과 */}
              <div className="absolute inset-0 rounded-lg bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10" />
            </button>
          </div>
          <div className="relative" data-workspace-dropdown>
            {/* 커스텀 드롭다운 버튼 */}
            <button
              onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
              className="w-full bg-gradient-to-r from-secondary/80 to-secondary/60 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 hover:from-secondary/90 hover:to-secondary/70 hover:border-border/70 shadow-sm backdrop-blur-sm text-foreground flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                {selectedWorkspaceId === null ? (
                  <span className="text-foreground/90">📁 {safeT('library.allJobs')}</span>
                ) : selectedWorkspaceId ? (
                  (() => {
                    const selectedWorkspace = workspaces.find((w: any) => w.id === selectedWorkspaceId);
                    return (
                      <span className="text-foreground/90">
                        {selectedWorkspace?.name}
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-foreground/90">...</span>
                )}
              </div>
              <svg 
                className={`w-4 h-4 text-foreground/50 transition-transform duration-200 ${showWorkspaceDropdown ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 드롭다운 메뉴 */}
            {showWorkspaceDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  <div className="py-2">
                    {/* 전체 작업 옵션 */}
                    <button
                      onClick={() => {
                        handleWorkspaceChange(null);
                        setShowWorkspaceDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm transition-all duration-200 flex items-center gap-3 hover:bg-primary/10 ${
                        selectedWorkspaceId === null ? 'bg-primary/15 text-primary font-semibold' : 'text-foreground hover:text-primary'
                      }`}
                    >
                      <span>📁 {safeT('library.allJobs')}</span>
                    </button>

                    {/* 워크스페이스 옵션들 */}
                    {workspaces.map((workspace: any) => (
                      <button
                        key={workspace.id}
                        onClick={() => {
                          handleWorkspaceChange(workspace.id);
                          setShowWorkspaceDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm transition-all duration-200 flex items-center gap-3 hover:bg-primary/10 ${
                          selectedWorkspaceId === workspace.id ? 'bg-primary/15 text-primary font-semibold' : 'text-foreground hover:text-primary'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span>{workspace.name}</span>
                            {workspace.isDefault && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                selectedWorkspaceId === workspace.id 
                                  ? 'bg-primary/25 text-primary' 
                                  : 'bg-foreground/15 text-foreground/80'
                              }`}>{safeT('library.default')}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-background/50 rounded-lg p-1 flex gap-1 mb-6">
          <button
            className={`flex-1 capitalize py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 ${showFavoritesOnly ? 'bg-primary text-white' : 'hover:bg-white/5'}`}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            {showFavoritesOnly ? safeT('library.showAll') : safeT('library.favoritesOnly')}
          </button>
        </div>
        
        {/* 마지막 업데이트 시간 표시 */}
        <div className="text-xs text-foreground/30 mb-2 text-center">
          {safeT('library.lastUpdated')} {lastUpdate.toLocaleTimeString()}
        </div>
        
        {error && <div className="text-red-500 text-center">{safeT('library.failedToLoadJobs')}</div>}
        {!data && <div className="text-center">{safeT('library.loading')}</div>}
        <div className="flex-1 grid grid-cols-2 gap-3 overflow-y-auto pr-2 auto-rows-min library-scrollbar">
          {filteredJobs.length === 0 && !error && data ? (
            <p className="text-foreground/50 col-span-2 text-center">
              {showFavoritesOnly ? safeT('library.noFavorites') : safeT('library.noResults')}
            </p>
          ) : (
            filteredJobs.map((job: any) => (
              <LibraryItem 
                key={job.id} 
                item={job} 
                onItemClick={handleItemClick}
                onDeleteClick={handleDeleteClick}
                onFavoriteToggle={handleFavoriteToggle}
                onReuseInputs={handleReuseInputs}
                onMoveToWorkspace={handleMoveToWorkspace}
                availableWorkspaces={workspaces}
              />
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-border"
            >
              {safeT('library.previous')}
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm rounded border ${
                      currentPage === pageNum
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary hover:bg-secondary/80 border-border'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-border"
            >
              {safeT('library.next')}
            </button>
          </div>
        )}
      </aside>
      
      {/* 결과 모달 */}
      <ResultModal item={selectedItem} onClose={handleCloseModal} t={t} />
      
      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-secondary rounded-lg max-w-md w-full p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <TrashIcon className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold">{safeT('library.deleteConfirm')}</h3>
            </div>
            
            <p className="text-foreground/80 mb-6">
              <strong>{deleteConfirm.type}</strong> {safeT('library.deleteConfirmMessage')}
              <br />
              <span className="text-sm text-foreground/60">
                {safeT('library.deleteConfirmWarning')}
              </span>
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 text-foreground/70 hover:text-foreground transition-colors disabled:opacity-50"
              >
                {safeT('library.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {safeT('library.deleting')}
                  </>
                ) : (
                  safeT('library.delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 워크스페이스 관리 모달 */}
      {showWorkspaceManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-secondary/95 to-secondary/90 backdrop-blur-xl rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-border/50 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h3 className="text-xl font-semibold text-foreground">
                🎨 {safeT('library.workspaceManagement')}
              </h3>
              <button
                onClick={() => setShowWorkspaceManager(false)}
                className="p-2 hover:bg-background/50 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <XMarkIcon className="w-5 h-5 text-foreground/70" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 새 워크스페이스 생성 */}
              <div className="bg-gradient-to-r from-background/30 to-background/20 rounded-xl p-4 border border-border/30">
                <h4 className="font-medium mb-3 text-foreground/90">✨ {safeT('library.createWorkspace')}</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder={safeT('library.workspaceNamePlaceholder')}
                    className="flex-1 bg-background/60 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 placeholder:text-foreground/40"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                  />
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={!newWorkspaceName.trim()}
                    className="px-4 py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-primary/25 hover:scale-105 disabled:hover:scale-100"
                  >
                    {safeT('library.create')}
                  </button>
                </div>
              </div>

              {/* 기존 워크스페이스 목록 */}
              <div>
                <h4 className="font-medium mb-3 text-foreground/90">📂 {safeT('library.workspaceList')}</h4>
                <div className="bg-background/20 rounded-xl border border-border/30 overflow-hidden">
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {workspaces.map((workspace: any, index: any) => (
                      <div
                        key={workspace.id}
                        className={`group flex items-center justify-between px-4 py-3 transition-all duration-200 hover:bg-background/30 ${
                          index !== workspaces.length - 1 ? 'border-b border-border/20' : ''
                        } ${
                          selectedWorkspaceId === workspace.id ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground/90">
                              {workspace.name}
                            </span>
                            {workspace.isDefault && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                {safeT('library.default')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleWorkspaceChange(workspace.id)}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 font-medium ${
                              selectedWorkspaceId === workspace.id
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-background/50 hover:bg-background/70 text-foreground/70 hover:text-foreground'
                            }`}
                          >
                            {selectedWorkspaceId === workspace.id ? safeT('library.selected') : safeT('library.select')}
                          </button>
                          {!workspace.isDefault && (
                            <button
                              onClick={() => handleDeleteWorkspace(workspace.id, workspace.name)}
                              className="px-2 py-1.5 text-xs rounded-lg transition-all duration-200 font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                              title="워크스페이스 삭제"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 워크스페이스 삭제 확인 모달 */}
      {deleteWorkspaceConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-secondary/95 backdrop-blur-xl border border-border/50 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-xl">🗑️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{safeT('library.deleteWorkspace')}</h3>
                <p className="text-sm text-foreground/60">{safeT('library.deleteWorkspaceWarning')}</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-foreground/90 mb-2">
                {safeT('library.deleteWorkspaceConfirm', { name: deleteWorkspaceConfirm.name })}
              </p>
              <div className="bg-background/30 rounded-lg p-3 text-sm text-foreground/70">
                <p className="mb-1">⚠️ 삭제 시 다음이 적용됩니다:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>워크스페이스 내 모든 작업이 기본 워크스페이스로 이동됩니다</li>
                  <li>워크스페이스는 완전히 삭제됩니다</li>
                  <li>이 작업은 되돌릴 수 없습니다</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteWorkspaceCancel}
                disabled={isDeletingWorkspace}
                className="flex-1 px-4 py-2 text-sm font-medium text-foreground/70 bg-background/50 hover:bg-background/70 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                {safeT('library.cancel')}
              </button>
              <button
                onClick={handleDeleteWorkspaceConfirm}
                disabled={isDeletingWorkspace}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingWorkspace ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    {safeT('library.deleting')}
                  </>
                ) : (
                  safeT('library.delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
