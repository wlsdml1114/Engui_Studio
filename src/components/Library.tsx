
'use client';

import { useState, useEffect, useRef } from "react";
import useSWR from 'swr';
import { XMarkIcon, PlayIcon, PhotoIcon, TrashIcon, StarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface JobItem {
  id: string;
  userId: string;
  status: 'processing' | 'completed' | 'failed';
  type: 'video' | 'multitalk' | 'flux-kontext' | 'flux-krea' | 'wan22' | 'wan-animate' | 'infinitetalk'|'video-upscale';
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
  onReuseInputs: (item: JobItem) => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const LibraryItem: React.FC<LibraryItemProps> = ({ item, onItemClick, onDeleteClick, onFavoriteToggle, onReuseInputs }) => {
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

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
        
        // 입력 이미지 경로가 있으면 웹 경로로 변환하여 사용
        if (options.inputImagePath) {
          console.log('🖼️ Using input image path for FLUX KONTEXT thumbnail:', options.inputImagePath);
          // 로컬 파일 경로를 웹 경로로 변환
          const fileName = options.inputImageName || options.inputImagePath.split('/').pop();
          if (fileName) {
            const webPath = `/results/${fileName}`;
            console.log('🔄 Converted to web path:', webPath);
            return webPath;
          }
          return options.inputImagePath;
        }
        
        // inputImageName이 직접 있는 경우 웹 경로로 사용
        if (options.inputImageName) {
          const webPath = `/results/${options.inputImageName}`;
          console.log('🖼️ Using input image name for FLUX KONTEXT thumbnail:', webPath);
          return webPath;
        }
      } catch (e) {
        console.warn('Failed to parse FLUX KONTEXT options:', e);
      }
    }
    
    // FLUX KREA의 경우 결과 이미지 사용
    if (item.type === 'flux-krea' && item.resultUrl) {
      console.log('🎨 Using result image for FLUX KREA thumbnail');
      return item.resultUrl;
    }
    
    // WAN 2.2의 경우 입력 이미지를 썸네일로 사용
    if (item.type === 'wan22' && item.options) {
      try {
        const options = JSON.parse(item.options);
        console.log('🔍 WAN 2.2 options for thumbnail:', options);
        
        // 로컬 웹 경로가 있으면 직접 사용 (개발 환경)
        if (options.imageWebPath) {
          console.log('🖼️ Using local web path for WAN 2.2 thumbnail:', options.imageWebPath);
          // 개발 환경에서는 직접 경로 사용
          return options.imageWebPath;
        }
        
        // 입력 이미지 경로가 있으면 다양한 패턴으로 시도
        if (options.inputImagePath) {
          console.log('🖼️ Using input image path for WAN 2.2 thumbnail');
          
          // 기존 파일명이 있으면 사용
          if (options.inputImageName) {
            const webPath = `/results/${options.inputImageName}`;
            console.log('🔄 Using existing file name:', webPath);
            return webPath;
          }
          
          // 폴백: 기본 패턴
          return `/results/input_${item.id}.jpg`;
        }
        
        console.log('⚠️ No suitable thumbnail found for WAN 2.2');
      } catch (e) {
        console.warn('Failed to parse WAN 2.2 options:', e);
      }
    }
    
    // Infinite Talk의 경우 입력 이미지/비디오나 생성된 썸네일 사용
    if (item.type === 'infinitetalk' && item.options) {
      try {
        const options = JSON.parse(item.options);
        console.log('🔍 Infinite Talk options for thumbnail:', options);
        console.log('🔍 Item thumbnailUrl:', item.thumbnailUrl);
        console.log('🔍 Item ID:', item.id);
        
        // 생성된 썸네일이 있으면 우선 사용 (최고 우선순위)
        if (item.thumbnailUrl) {
          console.log('🖼️ Using generated thumbnail for Infinite Talk:', item.thumbnailUrl);
          return item.thumbnailUrl;
        }
        
        // 로컬 웹 경로가 있으면 사용 (이미지)
        if (options.imageWebPath) {
          console.log('🖼️ Using external web path for Infinite Talk thumbnail:', options.imageWebPath);
          return options.imageWebPath;
        }
        
        // 로컬 웹 경로가 있으면 사용 (비디오)
        if (options.videoWebPath) {
          console.log('🎬 Using external web path for Infinite Talk thumbnail (video):', options.videoWebPath);
          return options.videoWebPath;
        }
        
        // 입력 이미지 파일명이 있으면 웹 경로로 변환
        if (options.imageFileName) {
          // 실제 저장된 파일명으로 변환 (input/infinitetalk/input_${jobId}_${originalName})
          const actualFileName = `input/infinitetalk/input_${item.id}_${options.imageFileName}`;
          const webPath = `/results/${encodeURIComponent(actualFileName)}`;
          console.log('🖼️ Using actual image file name for Infinite Talk thumbnail:', webPath);
          return webPath;
        }
        
        // 입력 비디오 파일명이 있으면 웹 경로로 변환
        if (options.videoFileName) {
          // 실제 저장된 파일명으로 변환 (input/infinitetalk/input_${jobId}_${originalName})
          const actualFileName = `input/infinitetalk/input_${item.id}_${options.videoFileName}`;
          const webPath = `/results/${encodeURIComponent(actualFileName)}`;
          console.log('🎬 Using actual video file name for Infinite Talk thumbnail:', webPath);
          return webPath;
        }
        
        console.log('⚠️ No suitable thumbnail found for Infinite Talk');
      } catch (e) {
        console.warn('Failed to parse Infinite Talk options:', e);
      }
    }
    
    // WAN Animate의 경우 입력 이미지/비디오를 썸네일로 사용
    if (item.type === 'wan-animate' && item.options) {
      try {
        const options = JSON.parse(item.options);
        console.log('🔍 WAN Animate options for thumbnail:', options);
        
        // 로컬 웹 경로가 있으면 우선 사용 (가장 안정적)
        if (options.imageWebPath) {
          console.log('🖼️ Using local web path for WAN Animate thumbnail:', options.imageWebPath);
          return options.imageWebPath;
        }
        
        // 입력 이미지가 있으면 사용 (폴백)
        if (options.hasImage && options.s3ImagePath) {
          // S3 경로를 로컬 웹 경로로 변환
          const fileName = options.s3ImagePath.split('/').pop();
          if (fileName) {
            const webPath = `/results/${fileName}`;
            console.log('🖼️ Using input image for WAN Animate thumbnail:', webPath);
            return webPath;
          }
        }
        
        // 로컬 비디오 웹 경로가 있으면 사용
        if (options.videoWebPath) {
          console.log('🎬 Using local video web path for WAN Animate thumbnail:', options.videoWebPath);
          return options.videoWebPath;
        }
        
        // 입력 비디오가 있으면 사용 (폴백)
        if (options.hasVideo && options.s3VideoPath) {
          // S3 경로를 로컬 웹 경로로 변환
          const fileName = options.s3VideoPath.split('/').pop();
          if (fileName) {
            const webPath = `/results/${fileName}`;
            console.log('🎬 Using input video for WAN Animate thumbnail:', webPath);
            return webPath;
          }
        }
        
        // 결과 비디오가 있으면 사용
        if (item.resultUrl) {
          console.log('🎬 Using result video for WAN Animate thumbnail:', item.resultUrl);
          return item.resultUrl;
        }
        
        console.log('⚠️ No suitable thumbnail found for WAN Animate');
      } catch (e) {
        console.warn('Failed to parse WAN Animate options:', e);
      }
    }
    
    // Video Upscale의 경우 썸네일 URL 우선 사용
    if (item.type === 'video-upscale' && item.thumbnailUrl) {
      console.log('🎬 Using thumbnail URL for video-upscale:', item.thumbnailUrl);
      return item.thumbnailUrl;
    }
    
    // 다른 타입의 경우 결과 URL 사용
    if (item.status === 'completed' && item.resultUrl) {
      return item.resultUrl;
    }
    
    return item.thumbnailUrl;
  };

  const thumbnailUrl = getThumbnailUrl();
  console.log(`🎬 Thumbnail URL for ${item.type} (${item.id}):`, thumbnailUrl);
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
    console.log('🖱️ 드래그 시작:', item.type, item.id);
    setIsDragging(true);
    
    // 드래그할 데이터 구성
    const dragData = {
      type: 'library-result',
      jobType: item.type,
      jobId: item.id,
      prompt: item.prompt || '',
      // 미디어 타입과 URL 정보
      mediaType: item.type === 'flux-kontext' || item.type === 'flux-krea' ? 'image' : 'video',
      mediaUrl: item.resultUrl || thumbnailUrl,
      thumbnailUrl: thumbnailUrl,
      // 각 타입별 추가 정보
      ...(item.type === 'multitalk' && { inputImagePath: getThumbnailUrl() }),
      ...(item.type === 'flux-kontext' && { inputImagePath: getThumbnailUrl() }),
      ...(item.type === 'flux-krea' && { imageUrl: getThumbnailUrl() }),
      ...(item.type === 'wan22' && { inputImagePath: getThumbnailUrl() }),
      ...(item.type === 'wan-animate' && { imageUrl: getThumbnailUrl() }),
      ...(item.type === 'infinitetalk' && { 
        inputType: 'video',
        videoUrl: getThumbnailUrl()
      }),
      ...(item.type === 'video-upscale' && { videoUrl: getThumbnailUrl() })
    };

    // 드래그 데이터를 텍스트로 저장 (다른 페이지에서 접근 가능)
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData)); // 폴백용
    
    // 썸네일을 드래그 이미지로 설정
    const img = itemRef.current?.querySelector('img');
    if (img) {
      e.dataTransfer.setDragImage(img, 50, 30); // 드래그 시 보여질 썸네일 위치
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
        draggable={item.status === 'completed' && (thumbnailUrl || item.resultUrl)}
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
        
        {/* 상태 표시 */}
        <div className="absolute top-2 left-2 px-2 flex gap-1">
          <div className="px-2 py-1 bg-black/70 rounded text-xs text-white backdrop-blur-sm">
            ID: {item.id.substring(0, 6)}</div>
          {(item.status === 'completed' && (thumbnailUrl || item.resultUrl)) && (
            <div className="px-2 py-1 bg-blue-500/70 rounded text-xs text-white backdrop-blur-sm">
              🖱️ 드래그 가능
            </div>
          )}
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
           item.type === 'wan-animate' ? 'WAN Animate Video' :
           item.type === 'flux-kontext' ? 'FLUX KONTEXT Image' :
           item.type === 'flux-krea' ? 'FLUX KREA Image' :
           item.type === 'infinitetalk' ? 'Infinite Talk Video' :
           item.type === 'video-upscale' ? 'Video Upscale' :
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

      {/* 컨텍스트 메뉴 */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-secondary border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            transform: 'translate(-50%, -10px)'
          }}
        >
          <button
            onClick={() => {
              console.log('🖱️ 입력값 재사용 버튼 클릭됨');
              handleReuseInputs();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-background/50 transition-colors flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            입력값 재사용
          </button>
        </div>
      )}
    </div>
    </>
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
                    🎨 FLUX KREA로 생성된 이미지입니다.
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
                                <div class="mb-2">⚠️ WAN 2.2 입력 이미지를 불러올 수 없습니다</div>
                                <div class="text-xs text-red-300">
                                  <p>웹 경로: ${options.imageWebPath}</p>
                                  <p>💡 파일이 public/results 폴더에 있는지 확인하세요</p>
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
                      <div className="text-xs text-foreground/40 mt-2">
                        <p>Options: {JSON.stringify(options, null, 2)}</p>
                      </div>
                    </div>
                  );
                } catch (e) {
                  return (
                    <div className="text-center py-8 text-foreground/50">
                      <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>입력 이미지 정보를 파싱할 수 없습니다.</p>
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
                                  <div class="mb-2">⚠️ WAN Animate 입력 이미지를 불러올 수 없습니다</div>
                                  <div class="text-xs text-red-300">
                                    <p>웹 경로: ${options.imageWebPath || `/results/${options.s3ImagePath.split('/').pop()}`}</p>
                                    <p>S3 경로: ${options.s3ImagePath}</p>
                                    <p>💡 파일이 public/results 폴더에 있는지 확인하세요</p>
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
                                  <div class="mb-2">⚠️ WAN Animate 입력 비디오를 불러올 수 없습니다</div>
                                  <div class="text-xs text-red-300">
                                    <p>S3 경로: ${options.s3VideoPath}</p>
                                    <p>💡 파일이 public/results 폴더에 있는지 확인하세요</p>
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
                          <p>입력 파일 정보를 찾을 수 없습니다.</p>
                        </div>
                      )}
                    </div>
                  );
                } catch (e) {
                  console.error('❌ Failed to parse WAN Animate options:', e);
                  return (
                    <div className="text-center py-8 text-foreground/50">
                      <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>WAN Animate 옵션을 파싱할 수 없습니다.</p>
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
                              <div class="mb-2">⚠️ Infinite Talk 입력 비디오를 불러올 수 없습니다</div>
                              <div class="text-xs text-red-300">
                                <p>웹 경로: ${options.videoWebPath}</p>
                                <p>💡 파일이 public/results 폴더에 있는지 확인하세요</p>
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
                              <div class="mb-2">⚠️ Infinite Talk 입력 이미지를 불러올 수 없습니다</div>
                              <div class="text-xs text-red-300">
                                <p>웹 경로: ${options.imageWebPath}</p>
                                <p>💡 파일이 public/results 폴더에 있는지 확인하세요</p>
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
                              <div class="mb-2">⚠️ Infinite Talk 입력 비디오를 불러올 수 없습니다</div>
                              <div class="text-xs text-red-300">
                                <p>Fallback 경로: ${fallbackPath}</p>
                                <p>💡 파일이 public/results 폴더에 있는지 확인하세요</p>
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
                              <div class="mb-2">⚠️ Infinite Talk 입력 이미지를 불러올 수 없습니다</div>
                              <div class="text-xs text-red-300">
                                <p>Fallback 경로: ${fallbackPath}</p>
                                <p>💡 파일이 public/results 폴더에 있는지 확인하세요</p>
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
                      <p>Infinite Talk 입력 이미지 정보를 찾을 수 없습니다.</p>
                    </div>
                  );
                } catch (e) {
                  console.error('❌ Failed to parse Infinite Talk options:', e);
                  return (
                    <div className="text-center py-8 text-foreground/50">
                      <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>Infinite Talk 옵션을 파싱할 수 없습니다.</p>
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

  // 스마트 폴링을 위한 상태
  const [hasProcessingJobs, setHasProcessingJobs] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 20; // 한 번에 로드할 아이템 수

  // 처리 중인 작업이 있을 때만 빠른 폴링, 없으면 느린 폴링
  const refreshInterval = hasProcessingJobs ? 2000 : 10000; // 2초 또는 10초

  const { data, error, isValidating, mutate } = useSWR(
    `/api/jobs?page=${currentPage}&limit=${ITEMS_PER_PAGE}`, 
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

  // 페이지 가시성 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

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

  const handleReuseInputs = (item: JobItem) => {
    try {
      console.log('🔄 입력값 재사용 시작:', item);
      
      const options = item.options ? JSON.parse(item.options) : {};
      console.log('📋 파싱된 옵션:', options);
      console.log('🔍 LoRA 필드 확인 (Library):', {
        selectedLora: options.selectedLora,
        lora: options.lora,
        loraWeight: options.loraWeight
      });
      console.log('🔍 전체 options 객체:', options);
      
      // 필요한 설정값만 추출 (용량 절약)
      const essentialOptions = {
        // 공통 설정값들
        width: options.width,
        height: options.height,
        seed: options.seed,
        cfg: options.cfg,
        steps: options.steps,
        guidance: options.guidance,
        model: options.model,
        length: options.length,
        step: options.step,
        audioMode: options.audioMode,
        taskType: options.taskType,
        personCount: options.personCount,
        inputType: options.inputType,
        hasImage: options.hasImage,
        hasVideo: options.hasVideo,
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
          imageName: options.inputImageName
        }),
        ...(item.type === 'wan-animate' && {
          imagePath: options.imageWebPath || options.s3ImagePath,
          videoPath: options.videoWebPath || options.s3VideoPath,
          hasImage: options.hasImage,
          hasVideo: options.hasVideo
        }),
        ...(item.type === 'infinitetalk' && {
          inputType: options.inputType,
          imagePath: options.imageWebPath,
          videoPath: options.videoWebPath,
          imageFileName: options.imageFileName,
          videoFileName: options.videoFileName,
          audioPath: options.audioWebPath,
          audioPath2: options.audioWebPath2,
          audioFileName: options.audioFileName,
          audioFileName2: options.audioFileName2
        }),
        ...(item.type === 'video-upscale' && {
          videoPath: options.videoWebPath || options.s3VideoPath,
          videoFileName: options.videoFileName
        })
      };

      console.log('💾 재사용 데이터 (압축됨):', reuseData);
      console.log('📏 데이터 크기:', JSON.stringify(reuseData).length, 'bytes');

      // 로컬 스토리지에 저장하여 다른 페이지에서 사용할 수 있도록 함
      localStorage.setItem('reuseInputs', JSON.stringify(reuseData));
      
      // 해당 타입의 페이지로 이동
      const pageMap: { [key: string]: string } = {
        'multitalk': '/multitalk',
        'flux-kontext': '/flux-kontext',
        'flux-krea': '/flux-krea',
        'wan22': '/video-generation',
        'wan-animate': '/wan-animate',
        'infinitetalk': '/infinite-talk',
        'video-upscale': '/video-upscale'
      };

      const targetPage = pageMap[item.type];
      console.log('🎯 이동할 페이지:', targetPage, '타입:', item.type);
      
      if (targetPage) {
        console.log('✅ 페이지 이동 시작:', targetPage);
        window.location.href = targetPage;
      } else {
        console.error('❌ 페이지를 찾을 수 없음:', item.type);
        alert('해당 타입의 페이지를 찾을 수 없습니다.');
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
        alert('저장 공간이 부족합니다. 브라우저의 저장된 데이터를 정리한 후 다시 시도해주세요.');
      } else {
        alert('입력값 재사용 중 오류가 발생했습니다.');
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
              <div className="flex items-center gap-1 text-xs text-foreground/50">
                <div className="animate-spin rounded-full h-2 w-2 border-b border-foreground/50"></div>
                <span>Updating...</span>
              </div>
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
        
        {/* 마지막 업데이트 시간 표시 */}
        <div className="text-xs text-foreground/30 mb-2 text-center">
          Last updated: {lastUpdate.toLocaleTimeString()}
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
                onReuseInputs={handleReuseInputs}
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
              이전
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
              다음
            </button>
          </div>
        )}
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
