'use client';

import { useState, useRef, useEffect } from 'react';
import { FilmIcon, PhotoIcon, MusicalNoteIcon, PlayIcon, PauseIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

// 시퀀스 타입 정의
export interface MediaItem {
  id: string;
  type: 'video' | 'image' | 'audio';
  name: string;
  url: string;
  file?: File;
  duration?: number; // 비디오/오디오 길이 (초)
  startTime: number; // 타임라인 시작 시간 (초)
  endTime?: number; // 타임라인 종료 시간 (초)
  thumbnail?: string; // 썸네일 URL
}

export interface SequenceTrack {
  id: string;
  type: 'video' | 'audio1' | 'audio2';
  name: string;
  items: MediaItem[];
  isMuted?: boolean;
  volume?: number;
}

export interface TimelineState {
  currentTime: number;
  duration: number;
  zoom: number; // 타임라인 줌 레벨
  isPlaying: boolean;
}

export default function StudioPage() {
  // 시퀀스 트랙 상태
  const [tracks, setTracks] = useState<SequenceTrack[]>([
    { id: 'video', type: 'video', name: '비디오 트랙', items: [] },
    { id: 'audio1', type: 'audio1', name: '오디오 트랙 1', items: [], volume: 1.0 },
    { id: 'audio2', type: 'audio2', name: '오디오 트랙 2', items: [], volume: 1.0, isMuted: true }
  ]);

  // 타임라인 상태
  const [timeline, setTimeline] = useState<TimelineState>({
    currentTime: 0,
    duration: 30, // 기본 30초
    zoom: 1,
    isPlaying: false
  });

  // 드래그 상태
  const [draggedItem, setDraggedItem] = useState<MediaItem | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTrack, setActiveTrack] = useState<string | null>(null);

  // 재생 헤드 드래그 상태
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  // 미디어 프리뷰 상태
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);

  // 파일 입력 참조
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);

  // 재생 제어
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  // 미디어 길이 감지 함수
  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const element = file.type.startsWith('video/')
        ? document.createElement('video')
        : document.createElement('audio');

      element.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(element.duration || 5);
      });

      element.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(5); // 기본값 5초
      });

      element.src = url;
    });
  };

  // 썸네일 생성 함수
  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('video/')) {
        resolve('');
        return;
      }

      const url = URL.createObjectURL(file);
      const video = document.createElement('video');

      video.addEventListener('loadeddata', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (ctx) {
          canvas.width = 320;
          canvas.height = 180;

          video.currentTime = 1; // 1초 지점에서 썸네일 생성

          video.addEventListener('seeked', () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
            URL.revokeObjectURL(url);
            resolve(thumbnail);
          });
        }
      });

      video.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve('');
      });

      video.src = url;
    });
  };

  // 미디어 추가 함수
  const addMediaToTrack = async (files: FileList, trackType: 'video' | 'audio1' | 'audio2') => {
    const newItems: MediaItem[] = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const id = `${trackType}_${Date.now()}_${index}`;
      const url = URL.createObjectURL(file);

      // 미디어 타입 결정
      let mediaType: 'video' | 'image' | 'audio';
      if (file.type.startsWith('video/')) {
        mediaType = 'video';
      } else if (file.type.startsWith('image/')) {
        mediaType = 'image';
      } else {
        mediaType = 'audio';
      }

      // 비디오/오디오 길이 감지
      let duration = 5; // 기본값
      if (mediaType === 'video' || mediaType === 'audio') {
        try {
          duration = await getMediaDuration(file);
        } catch (error) {
          console.error('Failed to get media duration:', error);
        }
      }

      // 썸네일 생성 (비디오만)
      let thumbnail = '';
      if (mediaType === 'video') {
        try {
          thumbnail = await generateThumbnail(file);
        } catch (error) {
          console.error('Failed to generate thumbnail:', error);
        }
      }

      newItems.push({
        id,
        type: mediaType,
        name: file.name,
        url,
        file,
        duration,
        startTime: timeline.currentTime + index * 2, // 2초 간격으로 배치
        thumbnail
      });
    }

    setTracks(prev => prev.map(track =>
      track.id === trackType
        ? { ...track, items: [...track.items, ...newItems] }
        : track
    ));

    // 타임라인 길이 자동 조정
    const maxEndTime = Math.max(...newItems.map(item => item.startTime + (item.duration || 5)));
    if (maxEndTime > timeline.duration) {
      setTimeline(prev => ({ ...prev, duration: maxEndTime + 5 }));
    }
  };

  // 미디어 아이템 제거
  const removeMediaItem = (trackId: string, itemId: string) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, items: track.items.filter(item => item.id !== itemId) }
        : track
    ));
  };

  // 현재 재생할 미디어 찾기
  const getCurrentMedia = (): MediaItem | null => {
    for (const track of tracks) {
      const item = track.items.find(item =>
        timeline.currentTime >= item.startTime &&
        timeline.currentTime < (item.endTime || item.startTime + (item.duration || 5))
      );
      if (item) return item;
    }
    return null;
  };

  // 재생/정지 함수
  const togglePlayback = () => {
    if (timeline.isPlaying) {
      // 정지
      setTimeline(prev => ({ ...prev, isPlaying: false }));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoPreviewRef.current) videoPreviewRef.current.pause();
      if (audioPreviewRef.current) audioPreviewRef.current.pause();
    } else {
      // 재생 시작
      startTimeRef.current = performance.now() - (timeline.currentTime * 1000);
      setTimeline(prev => ({ ...prev, isPlaying: true }));
      animate();
    }
  };

  // 애니메이션 루프
  const animate = () => {
    const now = performance.now();
    const elapsed = (now - startTimeRef.current) / 1000;

    if (elapsed >= timeline.duration) {
      // 재생 종료
      setTimeline(prev => ({ ...prev, currentTime: 0, isPlaying: false }));
      if (videoPreviewRef.current) {
        videoPreviewRef.current.currentTime = 0;
        videoPreviewRef.current.pause();
      }
      if (audioPreviewRef.current) {
        audioPreviewRef.current.currentTime = 0;
        audioPreviewRef.current.pause();
      }
      return;
    }

    setTimeline(prev => ({ ...prev, currentTime: elapsed }));
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // 미디어 프리뷰 업데이트
  useEffect(() => {
    const currentMedia = getCurrentMedia();
    if (currentMedia !== previewMedia) {
      setPreviewMedia(currentMedia);

      // 이전 미디어 정지
      if (videoPreviewRef.current) {
        videoPreviewRef.current.pause();
        videoPreviewRef.current.src = '';
      }
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.src = '';
      }

      // 새 미디어 로드
      if (currentMedia) {
        const mediaTime = timeline.currentTime - currentMedia.startTime;

        if (currentMedia.type === 'video' && videoPreviewRef.current) {
          videoPreviewRef.current.src = currentMedia.url;
          videoPreviewRef.current.currentTime = mediaTime;
          videoPreviewRef.current.volume = 1.0;

          if (timeline.isPlaying) {
            videoPreviewRef.current.play().catch(console.error);
          }
        } else if (currentMedia.type === 'audio' && audioPreviewRef.current) {
          audioPreviewRef.current.src = currentMedia.url;
          audioPreviewRef.current.currentTime = mediaTime;

          // 오디오 트랙 볼륨 설정
          const track = tracks.find(t => t.items.includes(currentMedia));
          if (track && !track.isMuted) {
            audioPreviewRef.current.volume = track.volume || 1.0;
            if (timeline.isPlaying) {
              audioPreviewRef.current.play().catch(console.error);
            }
          }
        }
      }
    } else if (currentMedia && timeline.isPlaying) {
      // 현재 미디어의 시간 동기화
      const mediaTime = timeline.currentTime - currentMedia.startTime;

      if (currentMedia.type === 'video' && videoPreviewRef.current) {
        if (Math.abs(videoPreviewRef.current.currentTime - mediaTime) > 0.1) {
          videoPreviewRef.current.currentTime = mediaTime;
        }
      } else if (currentMedia.type === 'audio' && audioPreviewRef.current) {
        if (Math.abs(audioPreviewRef.current.currentTime - mediaTime) > 0.1) {
          audioPreviewRef.current.currentTime = mediaTime;
        }
      }
    }
  }, [timeline.currentTime, previewMedia, tracks, timeline.isPlaying]);

  // 타임라인 포맷팅 함수
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setActiveTrack(trackId);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addMediaToTrack(files, trackId as 'video' | 'audio1' | 'audio2');
    }
  };

  // 재생 헤드 드래그 핸들러
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPlayhead(true);

    // 재생 중이면 정지
    if (timeline.isPlaying) {
      togglePlayback();
    }
  };

  const handlePlayheadMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPlayhead) return;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left);
    const newTime = Math.max(0, Math.min(timeline.duration, x / (80 * timeline.zoom)));

    setTimeline(prev => ({ ...prev, currentTime: newTime }));
  };

  const handlePlayheadMouseUp = () => {
    setIsDraggingPlayhead(false);
  };

  // 전역 마우스 이벤트 핸들러
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingPlayhead) return;

      // 타임라인 영역 찾기
      const timelineArea = document.querySelector('[data-timeline-area]');
      if (!timelineArea) return;

      const rect = timelineArea.getBoundingClientRect();
      const x = Math.max(0, e.clientX - rect.left);
      const newTime = Math.max(0, Math.min(timeline.duration, x / (80 * timeline.zoom)));

      setTimeline(prev => ({ ...prev, currentTime: newTime }));
    };

    const handleGlobalMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    if (isDraggingPlayhead) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDraggingPlayhead, timeline.duration, timeline.zoom]);

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* 툴바 */}
      <div className="h-12 bg-secondary border-b border-border flex items-center px-4 gap-4">
        <div className="flex items-center gap-3">
          <FilmIcon className="w-6 h-6 text-indigo-500" />
          <h1 className="text-lg font-semibold">Studio</h1>
        </div>

        <div className="flex-1 flex items-center gap-2">
          <button
            onClick={togglePlayback}
            className="px-3 py-1 bg-primary hover:bg-primary/90 text-white rounded transition-colors flex items-center gap-1"
          >
            {timeline.isPlaying ? (
              <PauseIcon className="w-4 h-4" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
            {timeline.isPlaying ? '일시정지' : '재생'}
          </button>

          <span className="text-sm text-muted-foreground px-2">
            {formatTime(timeline.currentTime)} / {formatTime(timeline.duration)}
          </span>

          <div className="flex items-center gap-1 border-l border-border pl-2">
            <button
              onClick={() => setTimeline(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom - 0.25) }))}
              className="px-2 py-1 text-xs bg-background border border-border rounded hover:bg-background/80"
            >
              -
            </button>
            <span className="text-xs text-muted-foreground w-10 text-center">
              {Math.round(timeline.zoom * 100)}%
            </span>
            <button
              onClick={() => setTimeline(prev => ({ ...prev, zoom: Math.min(3, prev.zoom + 0.25) }))}
              className="px-2 py-1 text-xs bg-background border border-border rounded hover:bg-background/80"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 메인 패널 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽: 미디어 브라우저 */}
        <div className="w-64 bg-secondary border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold mb-2">미디어</h2>
            <div className="space-y-2">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*,image/*"
                multiple
                onChange={(e) => e.target.files && addMediaToTrack(e.target.files, 'video')}
                className="hidden"
              />
              <button
                onClick={() => videoInputRef.current?.click()}
                className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs flex items-center justify-center gap-1"
              >
                <PhotoIcon className="w-4 h-4" />
                비디오/이미지
              </button>

              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={(e) => e.target.files && addMediaToTrack(e.target.files, 'audio1')}
                className="hidden"
              />
              <button
                onClick={() => audioInputRef.current?.click()}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center justify-center gap-1"
              >
                <MusicalNoteIcon className="w-4 h-4" />
                오디오 트랙 1
              </button>

              <input
                ref={imageInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={(e) => e.target.files && addMediaToTrack(e.target.files, 'audio2')}
                className="hidden"
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center justify-center gap-1"
              >
                <MusicalNoteIcon className="w-4 h-4" />
                오디오 트랙 2
              </button>
            </div>
          </div>

          {/* 미디어 목록 */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {tracks.flatMap(track =>
                track.items.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2 bg-background border border-border rounded cursor-move hover:bg-accent transition-colors"
                    draggable
                    onDragStart={() => setDraggedItem(item)}
                  >
                    <div className="flex-shrink-0">
                      {item.type === 'video' && <FilmIcon className="w-3 h-3 text-purple-500" />}
                      {item.type === 'image' && <PhotoIcon className="w-3 h-3 text-blue-500" />}
                      {item.type === 'audio' && <MusicalNoteIcon className="w-3 h-3 text-green-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(item.duration || 5)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 중앙: 프로그램 모니터 */}
        <div className="flex-1 bg-black flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            {previewMedia ? (
              <div className="w-full h-full max-w-4xl">
                {previewMedia.type === 'video' && (
                  <video
                    ref={videoPreviewRef}
                    className="w-full h-full object-contain"
                    controls={false}
                    muted
                    playsInline
                  />
                )}
                {previewMedia.type === 'image' && (
                  <img
                    src={previewMedia.url}
                    alt={previewMedia.name}
                    className="w-full h-full object-contain"
                  />
                )}
                {previewMedia.type === 'audio' && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-white">
                      <MusicalNoteIcon className="w-20 h-20 mx-auto mb-4 text-purple-400 animate-pulse" />
                      <p className="text-lg font-medium">{previewMedia.name}</p>
                      <p className="text-sm opacity-75 mt-2">오디오 재생 중...</p>
                    </div>
                  </div>
                )}

                {/* 현재 재생 정보 오버레이 */}
                <div className="absolute bottom-8 left-8 bg-black/80 text-white px-4 py-2 rounded-lg">
                  <p className="text-sm font-medium">{previewMedia.name}</p>
                  <p className="text-xs opacity-90">
                    {formatTime(timeline.currentTime)} / {formatTime(previewMedia.duration || 5)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <FilmIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">프로그램 모니터</p>
                <p className="text-sm mt-2">미디어를 타임라인에 드래그하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 타임라인 패널 */}
      <div className="h-64 bg-secondary border-t border-border flex flex-col">
        {/* 타임라인 헤더 */}
        <div className="h-12 bg-background border-b border-border flex items-center px-4">
          <h2 className="text-sm font-semibold">타임라인</h2>
        </div>

        {/* 타임라인 콘텐츠 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 트랙 헤더 - 고정 */}
          <div className="w-32 bg-background border-r border-border flex-shrink-0">
            {/* 트랙 헤더용 빈 공간 (시간 눈금과 높이 맞춤) */}
            <div className="h-8 border-b border-border"></div>
            {tracks.map((track) => (
              <div key={track.id} className="h-16 border-b border-border flex items-center px-3">
                <div className="flex-1">
                  <p className="text-xs font-medium truncate">{track.name}</p>
                  {track.type.startsWith('audio') && (
                    <button
                      onClick={() => setTracks(prev => prev.map(t =>
                        t.id === track.id ? { ...t, isMuted: !t.isMuted } : t
                      ))}
                      className={`px-1 py-0.5 text-xs rounded mt-1 ${
                        track.isMuted ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                      }`}
                    >
                      {track.isMuted ? '음소거' : '재생'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 타임라인 영역 - 스크롤 가능 */}
          <div className="flex-1 overflow-auto">
            <div className="relative">
              {/* 시간 눈금 */}
              <div className="sticky top-0 h-8 bg-background border-b border-border z-10">
                <div className="relative overflow-hidden" style={{ minWidth: `${timeline.duration * 80 * timeline.zoom}px` }}>
                  {Array.from({ length: Math.ceil(timeline.duration) + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 border-r border-border/30 absolute"
                      style={{
                        left: `${i * 80 * timeline.zoom}px`,
                        width: `${80 * timeline.zoom}px`
                      }}
                    >
                      <span className="text-xs text-muted-foreground px-1">
                        {formatTime(i)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 트랙 타임라인들 */}
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={`h-16 border-b border-border relative ${
                    isDragOver && activeTrack === track.id
                      ? 'bg-primary/20'
                      : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, track.id)}
                  data-timeline-area
                >
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ minWidth: `${timeline.duration * 80 * timeline.zoom}px` }}
                    onMouseMove={handlePlayheadMouseMove}
                    onMouseUp={handlePlayheadMouseUp}
                  >
                    {/* 미디어 아이템 */}
                    {track.items.map((item) => (
                      <div
                        key={item.id}
                        className="absolute top-2 bottom-2 rounded cursor-move flex items-center px-2 text-xs font-medium transition-all hover:brightness-110"
                        style={{
                          left: `${item.startTime * 80 * timeline.zoom}px`,
                          width: `${(item.duration || 5) * 80 * timeline.zoom}px`,
                          backgroundColor: item.type === 'video' ? '#9333ea' :
                                         item.type === 'image' ? '#3b82f6' : '#10b981',
                          color: 'white'
                        }}
                        draggable
                        onDragStart={() => setDraggedItem(item)}
                        title={`${item.name} (${formatTime(item.startTime)} - ${formatTime(item.startTime + (item.duration || 5))})`}
                      >
                        <span className="truncate">
                          {item.type === 'video' && '🎬'}
                          {item.type === 'image' && '🖼️'}
                          {item.type === 'audio' && '🎵'}
                          {' '}{item.name.length > 10 ? item.name.substring(0, 10) + '...' : item.name}
                        </span>
                      </div>
                    ))}

                    {/* 재생 헤드 */}
                    <div
                      className={`absolute top-0 bottom-0 w-1 bg-red-500 z-20 transition-colors ${
                        isDraggingPlayhead ? 'bg-red-400 cursor-grabbing' : 'cursor-grab hover:bg-red-400'
                      }`}
                      style={{
                        transform: `translateX(${timeline.currentTime * 80 * timeline.zoom}px)`,
                        left: '0px'
                      }}
                      onMouseDown={handlePlayheadMouseDown}
                    >
                      <div
                        className="absolute -top-2 -left-1.5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 숨겨진 오디오 요소 */}
      <audio ref={audioPreviewRef} className="hidden" />
    </div>
  );
}