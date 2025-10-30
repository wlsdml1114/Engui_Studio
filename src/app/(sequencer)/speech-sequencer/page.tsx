'use client';

import { useState, useRef, useEffect } from 'react';
import { TrashIcon, PlayIcon, PauseIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';

interface AudioSegment {
  id: string;
  file: File;
  name: string;
  duration: number;
  startTime: number;
}

interface Sequence {
  id: string;
  speaker: string;
  segments: AudioSegment[];
}

interface SavedSequence {
  id: string;
  name: string;
  createdAt: string;
  sequences: Sequence[];
}

const SPEAKERS = ['Speaker 1', 'Speaker 2'];
const PIXELS_PER_SECOND = 50; // 1초 = 50px

export default function SpeechSequencerPage() {
  // 상태 관리
  const [audioFiles, setAudioFiles] = useState<Map<string, File>>(new Map());
  const [sequences, setSequences] = useState<Sequence[]>(
    SPEAKERS.map((speaker, idx) => ({
      id: `seq-${idx}`,
      speaker,
      segments: []
    }))
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [sequenceName, setSequenceName] = useState('');
  const [savedSequences, setSavedSequences] = useState<SavedSequence[]>([]);
  const [draggedSegment, setDraggedSegment] = useState<{
    segmentId: string;
    sequenceId: string;
  } | null>(null);
  const [isDraggingSegment, setIsDraggingSegment] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [previewingSegment, setPreviewingSegment] = useState<string | null>(null);

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  const timelineTracksRef = useRef<HTMLDivElement>(null);

  // 컴포넌트 마운트 시 저장된 시퀀스 로드
  useEffect(() => {
    const saved = localStorage.getItem('saved_sequences');
    if (saved) {
      try {
        setSavedSequences(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved sequences:', e);
      }
    }
  }, []);

  // 타임라인 헤더와 트랙 스크롤 동기화
  useEffect(() => {
    const headerElement = timelineHeaderRef.current;
    const tracksElement = timelineTracksRef.current;

    if (!headerElement || !tracksElement) return;

    const handleTracksScroll = () => {
      // 트랙 스크롤 시 헤더도 같은 양만큼 스크롤
      const scrollLeft = tracksElement.scrollLeft;
      headerElement.scrollLeft = scrollLeft;
    };

    tracksElement.addEventListener('scroll', handleTracksScroll);
    return () => {
      tracksElement.removeEventListener('scroll', handleTracksScroll);
    };
  }, []);

  // Segment 드래그 처리
  useEffect(() => {
    if (!isDraggingSegment || !draggedSegment) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineTracksRef.current) return;

      // Timeline Track 컨테이너의 위치 및 스크롤 정보
      const tracksRect = timelineTracksRef.current.getBoundingClientRect();
      const scrollLeft = timelineTracksRef.current.scrollLeft;

      // dragStartX = e.clientX - segment.startTime * PIXELS_PER_SECOND 로 설정됨
      // mousemove에서: newX = e.clientX - dragStartX
      // newX = e.clientX - (e.clientX - segment.startTime * PIXELS_PER_SECOND)
      // newX = segment.startTime * PIXELS_PER_SECOND
      // 이는 segment의 left position과 동일

      // Segment가 위치한 Timeline Track 내의 상대 위치
      const newXInTimeline = e.clientX - dragStartX;

      // Timeline Track 시작 위치(Speaker label 제외)부터의 거리
      // Timeline Track 내에서 segment의 left는 이미 Speaker label을 제외한 위치
      // 따라서 scrollLeft와 newXInTimeline으로 실제 시간 위치 계산
      const timeInContent = (scrollLeft + newXInTimeline) / PIXELS_PER_SECOND;
      const newStartTime = Math.max(0, timeInContent);

      updateSegmentStartTime(
        draggedSegment.sequenceId,
        draggedSegment.segmentId,
        newStartTime
      );

      // 드래그 중에 자동 스크롤 (화면 끝에 도달하면)
      const dragThreshold = 100; // 화면 끝에서 100px 안에 도달하면 스크롤
      const maxScroll = timelineTracksRef.current.scrollWidth - timelineTracksRef.current.clientWidth;

      if (e.clientX > tracksRect.right - dragThreshold) {
        // 오른쪽으로 스크롤
        const newScroll = Math.min(maxScroll, scrollLeft + 10);
        timelineTracksRef.current.scrollLeft = newScroll;
      } else if (e.clientX < tracksRect.left + dragThreshold) {
        // 왼쪽으로 스크롤
        const newScroll = Math.max(0, scrollLeft - 10);
        timelineTracksRef.current.scrollLeft = newScroll;
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSegment(false);
      setDraggedSegment(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSegment, draggedSegment]);

  // 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      const newFiles = new Map(audioFiles);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = `audio-${Date.now()}-${i}`;
        newFiles.set(id, file);
      }
      setAudioFiles(newFiles);
    }
  };

  // Drag & Drop 핸들러
  const handleDragStart = (
    e: React.DragEvent,
    sequenceId: string,
    segmentId: string
  ) => {
    setDraggedSegment({ sequenceId, segmentId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetSequenceId: string) => {
    e.preventDefault();

    if (!draggedSegment) return;

    const { sequenceId: sourceSequenceId, segmentId } = draggedSegment;

    // 원본 시퀀스에서 segment 찾기
    const sourceSeq = sequences.find(s => s.id === sourceSequenceId);
    const segment = sourceSeq?.segments.find(seg => seg.id === segmentId);

    if (segment) {
      // 원본에서 제거
      setSequences(prevs =>
        prevs.map(seq =>
          seq.id === sourceSequenceId
            ? { ...seq, segments: seq.segments.filter(s => s.id !== segmentId) }
            : seq
        )
      );

      // 목표에 추가
      setSequences(prevs =>
        prevs.map(seq =>
          seq.id === targetSequenceId
            ? {
                ...seq,
                segments: [...seq.segments, { ...segment, id: `${segment.id}-${Date.now()}` }]
              }
            : seq
        )
      );
    }

    setDraggedSegment(null);
  };

  // Segment를 시퀀스에 추가
  const addSegmentToSequence = (sequenceId: string, audioId: string) => {
    const file = audioFiles.get(audioId);
    if (!file) return;

    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => {
      const segment: AudioSegment = {
        id: `seg-${Date.now()}`,
        file,
        name: file.name,
        duration: audio.duration,
        startTime: 0
      };

      setSequences(prevs =>
        prevs.map(seq =>
          seq.id === sequenceId
            ? { ...seq, segments: [...seq.segments, segment] }
            : seq
        )
      );
    };
  };

  // Segment 제거
  const removeSegment = (sequenceId: string, segmentId: string) => {
    setSequences(prevs =>
      prevs.map(seq =>
        seq.id === sequenceId
          ? { ...seq, segments: seq.segments.filter(s => s.id !== segmentId) }
          : seq
      )
    );
  };

  // 시작 시간 조정
  const updateSegmentStartTime = (
    sequenceId: string,
    segmentId: string,
    time: number
  ) => {
    setSequences(prevs =>
      prevs.map(seq =>
        seq.id === sequenceId
          ? {
              ...seq,
              segments: seq.segments.map(seg =>
                seg.id === segmentId
                  ? { ...seg, startTime: Math.max(0, time) }
                  : seg
              )
            }
          : seq
      )
    );
  };

  // 미리듣기
  const playSegmentPreview = (segment: AudioSegment) => {
    // 이전 재생이 있으면 중지
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }

    // 새 오디오 재생
    const audio = new Audio(URL.createObjectURL(segment.file));
    previewAudioRef.current = audio;
    setPreviewingSegment(segment.id);

    audio.play().catch(e => console.error('Preview playback error:', e));

    // 재생 완료 시 상태 업데이트
    audio.onended = () => {
      setPreviewingSegment(null);
    };
  };

  // 미리듣기 중지
  const stopSegmentPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    setPreviewingSegment(null);
  };

  // 재생바 클릭으로 위치 변경
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineTracksRef.current || totalDuration === 0) return;

    // 클릭 위치를 기준으로 시간 계산
    const tracksRect = timelineTracksRef.current.getBoundingClientRect();
    const clickX = e.clientX - tracksRect.left + timelineTracksRef.current.scrollLeft;

    // Speaker 레이블 공간(96px)을 제외한 위치 계산
    const timelineStartX = 96;
    const relativeX = Math.max(0, clickX - timelineStartX);

    // 클릭한 시간 계산
    const newTime = Math.min(relativeX / PIXELS_PER_SECOND, totalDuration);

    setCurrentTime(newTime);

    // 재생 중이면 새로운 위치부터 재생하도록 중지했다가 다시 시작
    if (isPlaying) {
      stopPlayback();
      setTimeout(() => {
        startPlayback();
      }, 50);
    }
  };

  // 재생 시작
  const startPlayback = async () => {
    // 이전 재생 중지
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    const maxDuration = Math.max(
      ...sequences.flatMap(seq =>
        seq.segments.map(seg => seg.startTime + seg.duration)
      ),
      0
    );

    if (maxDuration === 0) {
      alert('No segments to play');
      return;
    }

    setIsPlaying(true);

    let currentPlaybackTime = currentTime; // 현재 시간부터 시작
    const audioElementsMap = new Map<string, HTMLAudioElement>();
    const playingAudios = new Set<string>();
    let isPlaybackActive = true;

    // 모든 segment의 오디오 요소 생성
    sequences.forEach(seq => {
      seq.segments.forEach(seg => {
        const audioKey = `${seq.id}-${seg.id}`;
        const audio = new Audio(URL.createObjectURL(seg.file));
        audio.volume = 1;
        audioElementsMap.set(audioKey, audio);
      });
    });

    // ref에 저장하여 stopPlayback에서 접근 가능하게 함
    playbackAudioElementsRef.current = audioElementsMap;

    // 타이머로 재생 제어
    const startTime = Date.now() - currentTime * 1000; // currentTime만큼 오프셋 적용
    playbackIntervalRef.current = setInterval(() => {
      if (!isPlaybackActive) return;

      // 실제 경과 시간으로 계산 (currentTime부터 시작)
      currentPlaybackTime = (Date.now() - startTime) / 1000;

      setCurrentTime(currentPlaybackTime);

      // 각 segment 재생 여부 확인
      sequences.forEach(seq => {
        seq.segments.forEach(seg => {
          const audioKey = `${seq.id}-${seg.id}`;
          const audio = audioElementsMap.get(audioKey);

          if (!audio) return;

          const segmentStart = seg.startTime;
          const segmentEnd = seg.startTime + seg.duration;

          // 현재 시간이 segment의 범위 내인지 확인
          if (
            currentPlaybackTime >= segmentStart &&
            currentPlaybackTime < segmentEnd
          ) {
            if (!playingAudios.has(audioKey)) {
              // 해당 segment 재생 시작
              const offsetTime = currentPlaybackTime - segmentStart;
              audio.currentTime = Math.max(0, offsetTime);
              audio.play().catch(e => console.error('Playback error:', e));
              playingAudios.add(audioKey);
            }
          } else {
            // 범위를 벗어나면 일시정지
            if (playingAudios.has(audioKey)) {
              audio.pause();
              audio.currentTime = 0;
              playingAudios.delete(audioKey);
              // 이전 segment URL 해제 (메모리 누수 방지)
              if (audio.src) {
                URL.revokeObjectURL(audio.src);
              }
            }
          }
        });
      });

      // 전체 재생 완료
      if (currentPlaybackTime >= maxDuration) {
        isPlaybackActive = false;
        setIsPlaying(false);
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
          playbackIntervalRef.current = null;
        }
        setCurrentTime(0);
        audioElementsMap.forEach(audio => {
          audio.pause();
          audio.currentTime = 0;
          // 오디오 URL 해제
          if (audio.src) {
            URL.revokeObjectURL(audio.src);
          }
        });
        playingAudios.clear();
        playbackAudioElementsRef.current.clear();
      }
    }, 50);
  };

  // 재생 중지
  const stopPlayback = () => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    // playbackAudioElementsRef에서 모든 오디오 요소 멈추기
    playbackAudioElementsRef.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
      // 오디오 URL 해제
      if (audio.src) {
        URL.revokeObjectURL(audio.src);
      }
    });
    playbackAudioElementsRef.current.clear();
    audioRefs.current.clear();
  };

  // 시퀀스 저장
  const saveSequence = () => {
    if (!sequenceName.trim()) {
      alert('Please enter a sequence name');
      return;
    }

    const newSaved: SavedSequence = {
      id: `saved-${Date.now()}`,
      name: sequenceName,
      createdAt: new Date().toLocaleString(),
      sequences: sequences.map(seq => ({
        ...seq,
        segments: seq.segments.map(seg => ({
          ...seg,
          file: seg.file
        }))
      }))
    };

    const updated = [...savedSequences, newSaved];
    setSavedSequences(updated);
    localStorage.setItem('saved_sequences', JSON.stringify(updated));
    setSequenceName('');
    alert('Sequence saved successfully!');
  };

  // 저장된 시퀀스 로드
  const loadSavedSequence = (saved: SavedSequence) => {
    alert('Load functionality requires file persistence - coming soon!');
  };

  // 저장된 시퀀스 삭제
  const deleteSavedSequence = (id: string) => {
    const updated = savedSequences.filter(s => s.id !== id);
    setSavedSequences(updated);
    localStorage.setItem('saved_sequences', JSON.stringify(updated));
  };

  // 전체 지속 시간 계산
  const getTotalDuration = () => {
    return Math.max(
      ...sequences.flatMap(seq =>
        seq.segments.map(seg => seg.startTime + seg.duration)
      ),
      0
    );
  };

  const totalDuration = getTotalDuration();
  const TIMELINE_PADDING = 300; // 오른쪽 여백 (px)
  const timelineWidth = Math.max(800, totalDuration * PIXELS_PER_SECOND + TIMELINE_PADDING);

  return (
    <div className="w-full h-screen bg-background flex flex-col">
      {/* 헤더 */}
      <div className="border-b border-border bg-secondary/30 px-6 py-4">
        <h1 className="text-2xl font-bold">Speech Sequencer</h1>
        <p className="text-sm text-foreground/70">
          Arrange audio segments by speaker and create perfectly timed sequences
        </p>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-hidden flex relative">
        {/* 좌측: 제어판 */}
        <div className="w-80 space-y-4 overflow-y-auto bg-secondary/20 border-r border-border p-4 flex-shrink-0">
          {/* 파일 업로드 */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Upload Audio Files</h2>
            <div className="relative">
              <input
                type="file"
                multiple
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                id="audio-input"
              />
              <label
                htmlFor="audio-input"
                className="block w-full p-3 border-2 border-dashed border-border rounded-lg text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition"
              >
                <PlusIcon className="w-6 h-6 mx-auto mb-1 text-foreground/60" />
                <p className="text-xs font-medium">Click to upload</p>
                <p className="text-xs text-foreground/50">or drag & drop</p>
              </label>
            </div>

            {/* 업로드된 파일 목록 */}
            {audioFiles.size > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-foreground/70">
                  {audioFiles.size} file(s)
                </p>
                {Array.from(audioFiles.entries()).map(([id, file]) => (
                  <div
                    key={id}
                    className="text-xs p-2 bg-secondary rounded flex justify-between items-center"
                  >
                    <span className="truncate">{file.name.substring(0, 15)}</span>
                    <button
                      onClick={() => {
                        const newFiles = new Map(audioFiles);
                        newFiles.delete(id);
                        setAudioFiles(newFiles);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 재생 제어 */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Playback</h2>
            <div className="space-y-2">
              <button
                onClick={isPlaying ? stopPlayback : startPlayback}
                disabled={audioFiles.size === 0 && sequences.every(s => s.segments.length === 0)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                {isPlaying ? (
                  <>
                    <PauseIcon className="w-4 h-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4" />
                    Play
                  </>
                )}
              </button>

              <div className="text-xs">
                <div className="flex justify-between mb-1">
                  <span>Time</span>
                  <span className="font-mono">
                    {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : '0%'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 시퀀스 저장 */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Save Sequence</h2>
            <div className="space-y-2">
              <input
                type="text"
                value={sequenceName}
                onChange={(e) => setSequenceName(e.target.value)}
                placeholder="Enter name"
                className="w-full px-2 py-2 border border-border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={saveSequence}
                disabled={sequences.every(s => s.segments.length === 0)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                <CheckIcon className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>

          {/* 라이브러리 */}
          {savedSequences.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Library</h2>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {savedSequences.map(saved => (
                  <div
                    key={saved.id}
                    className="p-2 bg-secondary rounded-lg text-xs flex justify-between items-start"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{saved.name}</p>
                      <p className="text-foreground/50 text-xs">{saved.createdAt}</p>
                    </div>
                    <button
                      onClick={() => deleteSavedSequence(saved.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 우측: 타임라인 (가로 방향) */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Available Segments (맨 위, 고정 - scroll 밖) */}
          {audioFiles.size > 0 && (
            <div className="bg-secondary/30 border-b border-border px-4 py-3 flex-shrink-0">
              <p className="text-xs font-medium mb-2 text-foreground/70">
                Available Segments (drag to tracks)
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(audioFiles.entries()).map(([id, file]) => (
                  <div
                    key={id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer?.setData('audioId', id);
                    }}
                    className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs cursor-move hover:opacity-80 transition"
                  >
                    {file.name.substring(0, 20)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 시퀀스 트랙 */}
          <div
            className="flex-1 overflow-hidden flex flex-col cursor-pointer"
            onClick={handleTimelineClick}
          >
            <div
              className="flex-1 overflow-auto"
              ref={timelineTracksRef}
            >
            {audioFiles.size === 0 ? (
              <div className="flex items-center justify-center h-full text-foreground/50">
                <p>Upload audio files to get started</p>
              </div>
            ) : (
              <>
                {/* 시간축 (sticky 고정) */}
                <div className="bg-secondary/50 border-b border-border h-8 flex-shrink-0 flex sticky top-0 z-20">
                  {/* Speaker 레이블 공간 (고정) */}
                  <div className="w-24 flex-shrink-0 border-r border-border sticky left-0 z-20 bg-secondary" />

                  {/* 타임라인 헤더 */}
                  <div
                    ref={timelineHeaderRef}
                    className="flex-1 overflow-hidden"
                  >
                    <div
                      className="h-full relative"
                      style={{ width: `${timelineWidth}px` }}
                    >
                      {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0"
                          style={{
                            left: `${i * PIXELS_PER_SECOND}px`,
                            width: '1px',
                            borderLeft: '1px solid',
                            borderColor: 'rgb(var(--border-rgb) / 0.3)'
                          }}
                        >
                          <span
                            className="text-xs text-foreground/50 absolute pointer-events-none"
                            style={{
                              left: '2px',
                              top: '4px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {i}s
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sequence Tracks */}
                {sequences.map(sequence => (
                  <div
                    key={sequence.id}
                    className="border-b border-border flex-shrink-0 relative"
                  >
                    <div className="flex h-24 relative">
                      {/* Speaker Label (고정) */}
                      <div className="w-24 bg-secondary border-r border-border p-3 flex items-center flex-shrink-0 sticky left-0 z-30">
                        <p className="font-medium text-sm">{sequence.speaker}</p>
                      </div>

                      {/* Timeline Track with Playhead */}
                      <div className="flex-1 bg-background relative overflow-hidden" style={{ minWidth: `${timelineWidth}px` }}>
                        {/* Playhead (재생바) */}
                        {totalDuration > 0 && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-10"
                            style={{
                              left: `${currentTime * PIXELS_PER_SECOND}px`,
                              backgroundColor: isPlaying ? 'rgb(239, 68, 68)' : 'rgb(107, 114, 128)',
                              transition: 'left 0.05s linear'
                            }}
                          />
                        )}

                        {/* Timeline Track Container */}
                        <div
                          onDragOver={handleDragOver}
                          onDrop={(e) => {
                            const audioId = e.dataTransfer?.getData('audioId');
                            if (audioId) {
                              e.preventDefault();
                              addSegmentToSequence(sequence.id, audioId);
                            }
                          }}
                          className="h-full relative"
                      >
                        {/* Grid Background */}
                        <div className="absolute inset-0 pointer-events-none">
                          {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
                            <div
                              key={i}
                              className="absolute top-0 bottom-0 border-r border-border/30"
                              style={{
                                left: `${i * PIXELS_PER_SECOND}px`,
                                width: '1px'
                              }}
                            />
                          ))}
                        </div>

                        {/* Segments */}
                        {sequence.segments.map(segment => (
                          <div
                            key={segment.id}
                            onMouseDown={(e) => {
                              // 우클릭이면 미리듣기, 좌클릭이면 드래그
                              if (e.button === 0 && e.detail === 1) {
                                // 싱글 클릭: 드래그 준비
                                setTimeout(() => {
                                  if (!isDraggingSegment) {
                                    // 드래그가 시작되지 않았으면 미리듣기
                                    if (previewingSegment === segment.id) {
                                      stopSegmentPreview();
                                    } else {
                                      playSegmentPreview(segment);
                                    }
                                  }
                                }, 200);
                              }

                              // 드래그 시작 위치 계산
                              // dragStartX = e.clientX 에서 segment 위치의 pixel 차이를 빼면
                              // mousemove에서 newX = e.clientX - dragStartX 하면 segment.startTime * PIXELS_PER_SECOND 값이 나옴
                              const dragStartXValue = e.clientX - segment.startTime * PIXELS_PER_SECOND;

                              setDraggedSegment({ sequenceId: sequence.id, segmentId: segment.id });
                              setDragStartX(dragStartXValue);
                              setIsDraggingSegment(true);
                              e.preventDefault();
                            }}
                            className={`absolute top-1 bottom-1 rounded px-2 py-1 text-xs cursor-grab active:cursor-grabbing hover:opacity-90 transition group overflow-hidden z-0 ${
                              previewingSegment === segment.id
                                ? 'bg-green-500 ring-2 ring-green-300'
                                : 'bg-blue-500 hover:bg-blue-600'
                            } text-white`}
                            style={{
                              left: `${segment.startTime * PIXELS_PER_SECOND}px`,
                              width: `${segment.duration * PIXELS_PER_SECOND}px`,
                              minWidth: '60px',
                              zIndex: 'auto'
                            }}
                            title={`Click to preview • Drag to move`}
                          >
                            <div className="font-medium truncate">{segment.name.substring(0, 15)}</div>
                            <div className="text-xs opacity-80">
                              {segment.startTime.toFixed(1)}s {previewingSegment === segment.id && '🔊'}
                            </div>

                            {/* Controls on Hover */}
                            <div className="hidden group-hover:flex gap-1 mt-1">
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={segment.startTime}
                                onChange={(e) =>
                                  updateSegmentStartTime(
                                    sequence.id,
                                    segment.id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-12 px-1 py-0.5 rounded bg-white/20 text-white text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSegment(sequence.id, segment.id);
                                }}
                                className="px-1 py-0.5 bg-red-600/80 hover:bg-red-700 rounded text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}

                        {sequence.segments.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-foreground/30 text-xs">
                            Drag segments here
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
