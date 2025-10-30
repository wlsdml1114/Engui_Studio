'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrashIcon, PlayIcon, PauseIcon, PlusIcon, CheckIcon, HomeIcon } from '@heroicons/react/24/outline';

interface AudioSegment {
  id: string;
  file: File;
  name: string;
  duration: number;
  startTime: number;
  waveformData?: number[];
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
  const router = useRouter();

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
  const [waveformScale, setWaveformScale] = useState(1);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Array<{ id: string; name: string; isDefault?: boolean }>>([]);
  const [currentProject, setCurrentProject] = useState<string>('');
  const [savedProjects, setSavedProjects] = useState<Array<{ id: string; name: string; savedAt: string }>>([]);

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  const timelineTracksRef = useRef<HTMLDivElement>(null);

  // 컴포넌트 마운트 시 저장된 시퀀스 및 workspace 로드
  useEffect(() => {
    const saved = localStorage.getItem('saved_sequences');
    if (saved) {
      try {
        setSavedSequences(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved sequences:', e);
      }
    }

    // API에서 Workspace 로드
    const loadWorkspaces = async () => {
      try {
        const res = await fetch('/api/workspaces?userId=user-with-settings');
        const data = await res.json();
        const workspaces = data.workspaces || [];

        setAvailableWorkspaces(workspaces);

        // 이전에 선택된 workspace 찾기
        const lastWorkspaceId = localStorage.getItem('lastSelectedWorkspaceId');
        if (lastWorkspaceId) {
          const found = workspaces.find((w: any) => w.id === lastWorkspaceId);
          if (found) {
            setSelectedWorkspace(found.id);
            return;
          }
        }

        // Default workspace 찾기
        const defaultWorkspace = workspaces.find((w: any) => w.isDefault === true);
        if (defaultWorkspace) {
          setSelectedWorkspace(defaultWorkspace.id);
        } else if (workspaces.length > 0) {
          setSelectedWorkspace(workspaces[0].id);
        }
      } catch (e) {
        console.error('Failed to load workspaces:', e);
      }
    };

    loadWorkspaces();
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

  // Waveform 데이터 추출
  const extractWaveform = (audioBuffer: AudioBuffer, samples: number = 100) => {
    const rawData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / samples);
    const waveform: number[] = [];

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[i * blockSize + j]);
      }
      waveform.push(sum / blockSize);
    }

    return waveform;
  };

  // Segment를 시퀀스에 추가
  const addSegmentToSequence = (sequenceId: string, audioId: string) => {
    const file = audioFiles.get(audioId);
    if (!file) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
        const waveformData = extractWaveform(audioBuffer);

        const audio = new Audio(URL.createObjectURL(file));
        audio.onloadedmetadata = () => {
          const segment: AudioSegment = {
            id: `seg-${Date.now()}`,
            file,
            name: file.name,
            duration: audio.duration,
            startTime: 0,
            waveformData
          };

          setSequences(prevs =>
            prevs.map(seq =>
              seq.id === sequenceId
                ? { ...seq, segments: [...seq.segments, segment] }
                : seq
            )
          );
        };
      });
    };

    fileReader.readAsArrayBuffer(file);
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

  // Segment를 playhead 위치에서 자르기
  const cutSegmentAtPlayhead = (sequenceId: string, segmentId: string) => {
    setSequences(prevs =>
      prevs.map(seq =>
        seq.id === sequenceId
          ? {
              ...seq,
              segments: seq.segments.flatMap(seg => {
                if (seg.id !== segmentId) return seg;

                // Segment의 시작과 끝 시간
                const segmentStart = seg.startTime;
                const segmentEnd = seg.startTime + seg.duration;

                // playhead가 segment 내에 있는지 확인
                if (currentTime <= segmentStart || currentTime >= segmentEnd) {
                  return seg;
                }

                // Playhead 위치에서 자르기
                const cutPoint = currentTime - segmentStart; // segment 내에서의 상대 위치

                // 첫 번째 부분
                const firstSegment: AudioSegment = {
                  ...seg,
                  id: `${seg.id}-1-${Date.now()}`,
                  duration: cutPoint,
                  waveformData: seg.waveformData
                    ? seg.waveformData.slice(
                        0,
                        Math.floor((cutPoint / seg.duration) * seg.waveformData.length)
                      )
                    : undefined
                };

                // 두 번째 부분
                const secondSegment: AudioSegment = {
                  ...seg,
                  id: `${seg.id}-2-${Date.now()}`,
                  startTime: currentTime,
                  duration: segmentEnd - currentTime,
                  waveformData: seg.waveformData
                    ? seg.waveformData.slice(
                        Math.floor((cutPoint / seg.duration) * seg.waveformData.length)
                      )
                    : undefined
                };

                return [firstSegment, secondSegment];
              })
            }
          : seq
      )
    );
  };

  // 미리듣기
  const playSegmentPreview = (segment: AudioSegment) => {
    // segment.file 검증
    if (!segment.file) {
      console.warn('⚠️ Segment file not available:', segment.name);
      alert('Audio file not available for this segment');
      return;
    }

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

  // 각 speaker별 오디오 렌더링 (시간에 맞춰 silence와 함께)
  const renderAudioForSpeaker = async (speakerId: string): Promise<Blob | null> => {
    const sequence = sequences.find(s => s.id === speakerId);
    if (!sequence || sequence.segments.length === 0) return null;

    // File 객체가 없는 segments 확인 (로드된 프로젝트의 경우)
    const segmentsWithFile = sequence.segments.filter(seg => seg.file);
    const segmentsWithoutFile = sequence.segments.filter(seg => !seg.file);

    if (segmentsWithFile.length === 0) {
      console.warn(`⚠️ No audio files for ${sequence.speaker}. This might be a loaded project without original audio files.`);
      return null;
    }

    if (segmentsWithoutFile.length > 0) {
      console.warn(`⚠️ ${segmentsWithoutFile.length} segment(s) in ${sequence.speaker} have no audio file (from loaded project)`);
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const maxDuration = getTotalDuration();
    const sampleRate = audioContext.sampleRate;
    const totalSamples = Math.ceil(maxDuration * sampleRate);
    const audioBuffer = audioContext.createBuffer(1, totalSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // 각 segment를 순서대로 렌더링 (File이 있는 것만)
    for (const segment of segmentsWithFile) {
      if (!segment.file) continue;

      const fileReader = new FileReader();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        fileReader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        fileReader.onerror = () => reject(new Error('Failed to read file'));
        fileReader.readAsArrayBuffer(segment.file);
      });

      const segmentAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const segmentData = segmentAudioBuffer.getChannelData(0);
      const startSample = Math.floor(segment.startTime * sampleRate);

      // Segment 데이터를 버퍼에 복사
      for (let i = 0; i < segmentData.length; i++) {
        if (startSample + i < totalSamples) {
          channelData[startSample + i] = segmentData[i];
        }
      }
    }

    // AudioBuffer를 WAV Blob으로 변환
    const offlineContext = new OfflineAudioContext(1, totalSamples, sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    const renderedBuffer = await offlineContext.startRendering();
    const wavData = audioBufferToWave(renderedBuffer);
    return new Blob([wavData], { type: 'audio/wav' });
  };

  // AudioBuffer를 WAV 형식으로 변환
  const audioBufferToWave = (audioBuffer: AudioBuffer): ArrayBuffer => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = new Float32Array(audioBuffer.length * numberOfChannels);
    const channelData = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channelData.push(audioBuffer.getChannelData(i));
    }

    let offset = 0;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        data[offset++] = channelData[channel][i];
      }
    }

    const dataLength = data.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    let index = 44;
    const volume = 0.8;
    for (let i = 0; i < data.length; i++) {
      view.setInt16(index, data[i] < 0 ? data[i] * 0x8000 : data[i] * 0x7fff, true);
      index += 2;
    }

    return buffer;
  };

  // 프로젝트 저장
  const saveProject = async (projectName: string) => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    try {
      const projectId = `project-${Date.now()}`;

      // 각 segment의 audio file을 public/upload에 저장
      const segmentsWithFilePaths = await Promise.all(
        sequences.map(async (seq) => ({
          ...seq,
          segments: await Promise.all(
            seq.segments.map(async (seg) => {
              let audioPath = null;

              if (seg.file) {
                // 파일을 public/upload에 저장
                const fileName = `${projectId}_${seg.id}_${seg.name}`;
                const formData = new FormData();
                formData.append('file', seg.file, fileName);

                const uploadRes = await fetch('/api/save-project-audio', {
                  method: 'POST',
                  body: formData
                });

                if (uploadRes.ok) {
                  const uploadData = await uploadRes.json();
                  audioPath = uploadData.filePath;
                  console.log(`✅ Segment file saved: ${audioPath}`);
                } else {
                  console.warn(`⚠️ Failed to save segment file ${seg.name}`);
                }
              }

              return {
                id: seg.id,
                name: seg.name,
                duration: seg.duration,
                startTime: seg.startTime,
                waveformData: seg.waveformData,
                audioPath: audioPath,
                audioMimeType: seg.file?.type || 'audio/wav'
              };
            })
          )
        }))
      );

      const projectData = {
        id: projectId,
        name: projectName,
        sequences: segmentsWithFilePaths,
        currentTime,
        waveformScale,
        savedAt: new Date().toLocaleString()
      };

      // localStorage에 저장
      const existingProjects = JSON.parse(localStorage.getItem('speech_sequencer_projects') || '[]');
      const updatedProjects = existingProjects.filter((p: any) => p.id !== projectId);
      updatedProjects.push(projectData);
      localStorage.setItem('speech_sequencer_projects', JSON.stringify(updatedProjects));

      // 프로젝트 목록 업데이트
      setSavedProjects(updatedProjects.map((p: any) => ({
        id: p.id,
        name: p.name,
        savedAt: p.savedAt
      })));

      setCurrentProject(projectId);
      alert(`Project "${projectName}" saved successfully!`);
      console.log('💾 Project saved:', projectName);
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Failed to save project');
    }
  };

  // 프로젝트 로드
  const loadProject = async (projectId: string) => {
    try {
      console.log('🔄 Loading project:', projectId);
      const projects = JSON.parse(localStorage.getItem('speech_sequencer_projects') || '[]');
      console.log('📋 Total projects in storage:', projects.length);

      const projectData = projects.find((p: any) => p.id === projectId);

      if (!projectData) {
        console.error('❌ Project not found:', projectId);
        alert('Project not found');
        return;
      }

      console.log('📂 Project data found:', projectData.name);
      console.log('📊 Sequences count:', projectData.sequences.length);

      // 파일 경로에서 File 객체로 복구
      const sequencesWithFiles = await Promise.all(
        projectData.sequences.map(async (seq: any, seqIdx: number) => {
          console.log(`Processing sequence ${seqIdx}:`, seq.speaker, 'segments:', seq.segments.length);

          return {
            ...seq,
            segments: await Promise.all(
              seq.segments.map(async (seg: any) => {
                let fileObj = null;

                if (seg.audioPath) {
                  // 저장된 파일을 fetch해서 File 객체로 변환
                  try {
                    console.log(`📥 Fetching file from: ${seg.audioPath}`);
                    const response = await fetch(seg.audioPath);
                    if (!response.ok) {
                      throw new Error(`HTTP ${response.status}`);
                    }
                    const blob = await response.blob();
                    fileObj = new File([blob], seg.name, { type: seg.audioMimeType });
                    console.log(`✅ Loaded segment file: ${seg.name} (${blob.size} bytes)`);
                  } catch (fetchError) {
                    console.warn(`⚠️ Failed to load segment file: ${seg.audioPath}`, fetchError);
                  }
                } else {
                  console.log(`⚠️ No audioPath for segment: ${seg.name}`);
                }

                return {
                  id: seg.id,
                  name: seg.name,
                  duration: seg.duration,
                  startTime: seg.startTime,
                  waveformData: seg.waveformData,
                  file: fileObj
                };
              })
            )
          };
        })
      );

      console.log('🔄 Setting sequences, count:', sequencesWithFiles.length);

      // 시퀀스 복구
      setSequences(sequencesWithFiles);
      setCurrentTime(projectData.currentTime);
      setWaveformScale(projectData.waveformScale);
      setCurrentProject(projectId);

      console.log('✅ Project loaded successfully');
      alert(`Project "${projectData.name}" loaded successfully! ✓\n\nAll audio segments are restored and ready to save to library.`);
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Failed to load project: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // 프로젝트 삭제
  const deleteProject = (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const projects = JSON.parse(localStorage.getItem('speech_sequencer_projects') || '[]');
      const updatedProjects = projects.filter((p: any) => p.id !== projectId);
      localStorage.setItem('speech_sequencer_projects', JSON.stringify(updatedProjects));

      setSavedProjects(updatedProjects.map((p: any) => ({
        id: p.id,
        name: p.name,
        savedAt: p.savedAt
      })));

      if (currentProject === projectId) {
        setCurrentProject('');
      }

      console.log('🗑️ Project deleted');
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  // 저장된 프로젝트 로드 (컴포넌트 마운트 시)
  useEffect(() => {
    try {
      const projects = JSON.parse(localStorage.getItem('speech_sequencer_projects') || '[]');
      setSavedProjects(projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        savedAt: p.savedAt
      })));
    } catch (e) {
      console.error('Failed to load saved projects:', e);
    }
  }, []);

  // 썸네일 이미지 생성
  const generateThumbnail = (sequenceName: string, speaker: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 120;

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 배경 그라디언트
    const gradient = ctx.createLinearGradient(0, 0, 200, 120);
    if (speaker === 'Speaker 1') {
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#1e40af');
    } else {
      gradient.addColorStop(0, '#8b5cf6');
      gradient.addColorStop(1, '#6d28d9');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 200, 120);

    // 텍스트
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 시퀀스 이름
    ctx.fillText(sequenceName.substring(0, 15), 100, 40);

    // Speaker 정보
    ctx.font = 'bold 20px Arial';
    ctx.fillText(speaker, 100, 75);

    // 음성 아이콘 표현 (간단한 파형)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    const wavePoints = [20, 50, 80, 110, 140, 170];
    for (let i = 0; i < wavePoints.length; i++) {
      const x = wavePoints[i];
      const height = 15 + Math.sin(i) * 8;
      ctx.beginPath();
      ctx.moveTo(x, 100);
      ctx.lineTo(x, 100 + height);
      ctx.stroke();
    }

    return canvas.toDataURL('image/png');
  };

  // 시퀀스 저장 - Parent window (main library)에 전송
  const saveSequence = async () => {
    if (!sequenceName.trim()) {
      alert('Please enter a sequence name');
      return;
    }

    if (!selectedWorkspace) {
      alert('Please select a workspace');
      return;
    }

    try {
      console.log('🎬 Starting sequence save...');

      // 각 speaker별 오디오 렌더링
      const audioBlobs: Record<string, Blob> = {};

      for (const sequence of sequences) {
        const blob = await renderAudioForSpeaker(sequence.id);
        if (blob) {
          audioBlobs[sequence.speaker] = blob;
        }
      }

      if (Object.keys(audioBlobs).length === 0) {
        alert('No audio segments to save. Make sure to load a project with audio files or add new segments.');
        console.error('❌ Cannot save: No audio blobs generated. This usually happens when loading a saved project without the original audio files.');
        return;
      }

      console.log('✅ Audio blobs created:', Object.keys(audioBlobs));

      // selectedWorkspace는 이미 workspace ID입니다
      const workspaceId = selectedWorkspace;
      console.log('🔍 Using workspace ID:', workspaceId);

      // 각 speaker별 오디오를 로컬에 저장하고 DB에 저장
      for (const [speaker, blob] of Object.entries(audioBlobs)) {
        console.log(`📁 Processing ${speaker}...`);

        // 1. 썸네일 이미지 생성
        const thumbnailDataUrl = generateThumbnail(sequenceName, speaker);
        const thumbnailRes = await fetch(thumbnailDataUrl);
        const thumbnailBlob = await thumbnailRes.blob();
        const thumbnailFileName = `${sequenceName}_${speaker}_thumb_${Date.now()}.png`;

        console.log(`🖼️ Saving thumbnail for ${speaker}...`);
        const thumbFormData = new FormData();
        thumbFormData.append('file', thumbnailBlob, thumbnailFileName);

        const thumbUploadRes = await fetch('/api/save-audio', {
          method: 'POST',
          body: thumbFormData
        });

        let thumbnailPath = null;
        if (thumbUploadRes.ok) {
          const thumbData = await thumbUploadRes.json();
          thumbnailPath = thumbData.filePath;
          console.log(`✅ Thumbnail saved to: ${thumbnailPath}`);
        } else {
          console.warn(`⚠️ Failed to save thumbnail for ${speaker}, continuing...`);
        }

        // 2. 오디오 파일 저장
        const fileName = `${sequenceName}_${speaker}_${Date.now()}.wav`;
        console.log(`💾 Saving ${speaker} to local storage...`);

        const formData = new FormData();
        formData.append('file', blob, fileName);

        const uploadRes = await fetch('/api/save-audio', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          console.error(`❌ Failed to save ${speaker}:`, errorText);
          throw new Error(`Failed to save ${speaker} audio`);
        }

        const uploadData = await uploadRes.json();
        const audioPath = uploadData.filePath;
        console.log(`✅ ${speaker} saved to: ${audioPath}`);

        // 3. Job 기록을 database에 생성
        console.log(`📝 Creating job record for ${speaker}...`);
        const jobRes = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user-with-settings',
            workspaceId,
            type: 'audio',
            status: 'completed',
            prompt: `${sequenceName} - ${speaker}`,
            resultUrl: audioPath,
            thumbnailUrl: thumbnailPath
          })
        });

        if (!jobRes.ok) {
          const errorText = await jobRes.text();
          console.error(`❌ Job creation failed for ${speaker}:`, errorText);
          throw new Error(`Failed to create job for ${speaker} audio`);
        }

        const jobData = await jobRes.json();
        console.log(`✅ Job created for ${speaker}:`, jobData.job.id);
      }

      // 저장 완료 후 정리
      setSequenceName('');
      console.log('🎉 Sequence saved successfully!');
      alert('Sequence saved to library!');
    } catch (error) {
      console.error('Error saving sequence:', error);
      alert('Failed to save sequence. Please try again.');
    }
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
      <div className="border-b border-border bg-secondary/30 px-6 py-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Speech Sequencer</h1>
          <p className="text-sm text-foreground/70">
            Arrange audio segments by speaker and create perfectly timed sequences
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition text-sm font-medium"
        >
          <HomeIcon className="w-4 h-4" />
          Home
        </button>
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

              <button
                onClick={() => {
                  // 현재 playhead 위치와 교차하는 모든 segment를 자르기
                  sequences.forEach(seq => {
                    seq.segments.forEach(seg => {
                      const segmentStart = seg.startTime;
                      const segmentEnd = seg.startTime + seg.duration;
                      if (currentTime > segmentStart && currentTime < segmentEnd) {
                        cutSegmentAtPlayhead(seq.id, seg.id);
                      }
                    });
                  });
                }}
                disabled={audioFiles.size === 0 && sequences.every(s => s.segments.length === 0)}
                className="w-full px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
              >
                Cut at Playhead
              </button>
            </div>
          </div>

          {/* 시퀀스 저장 */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Save Sequence</h2>
            <div className="space-y-2">
              {availableWorkspaces.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-foreground/70 block mb-1">
                    Workspace
                  </label>
                  <select
                    value={selectedWorkspace}
                    onChange={(e) => {
                      setSelectedWorkspace(e.target.value);
                      localStorage.setItem('lastSelectedWorkspaceId', e.target.value);
                    }}
                    className="w-full px-2 py-2 border border-border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {availableWorkspaces.map(workspace => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name} {workspace.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <input
                type="text"
                value={sequenceName}
                onChange={(e) => setSequenceName(e.target.value)}
                placeholder="Enter sequence name"
                className="w-full px-2 py-2 border border-border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={saveSequence}
                disabled={sequences.every(s => s.segments.length === 0)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                <CheckIcon className="w-4 h-4" />
                Save to Library
              </button>
            </div>
          </div>

          {/* Project Management */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Project</h2>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  id="projectNameInput"
                  placeholder="Project name"
                  className="flex-1 px-2 py-2 border border-border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={async () => {
                    const input = document.getElementById('projectNameInput') as HTMLInputElement;
                    if (input) {
                      await saveProject(input.value);
                      input.value = '';
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                >
                  Save
                </button>
              </div>

              {currentProject && (
                <div className="text-xs text-green-400">
                  ✓ Current: {savedProjects.find(p => p.id === currentProject)?.name}
                </div>
              )}

              {savedProjects.length > 0 && (
                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                  <div className="text-xs font-medium text-foreground/70 mb-2">Saved Projects:</div>
                  {savedProjects.map(project => (
                    <div
                      key={project.id}
                      className="p-2 bg-secondary rounded-lg text-xs flex justify-between items-center mb-1"
                    >
                      <div
                        onClick={async () => await loadProject(project.id)}
                        className="flex-1 cursor-pointer hover:text-primary transition"
                      >
                        <p className="font-medium">{project.name}</p>
                        <p className="text-foreground/50 text-xs">{project.savedAt}</p>
                      </div>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="text-red-500 hover:text-red-700 transition"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Waveform Scale Control */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Waveform</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium">Scale</label>
                <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">
                  {waveformScale.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={waveformScale}
                onChange={(e) => setWaveformScale(parseFloat(e.target.value))}
                className="w-full cursor-pointer"
              />
              <div className="text-xs text-foreground/50 flex justify-between">
                <span>0.5x</span>
                <span>3x</span>
              </div>
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
            {audioFiles.size === 0 && sequences.every(seq => seq.segments.length === 0) ? (
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
                            {/* Waveform */}
                            {segment.waveformData && segment.waveformData.length > 0 && (
                              <svg
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                viewBox={`0 0 ${segment.waveformData.length} 100`}
                                preserveAspectRatio="none"
                              >
                                <polyline
                                  points={segment.waveformData
                                    .map((value, i) => `${i},${50 - Math.min(value * 100 * waveformScale, 50)}`)
                                    .join(' ')}
                                  fill="none"
                                  stroke="rgba(255,255,255,0.5)"
                                  strokeWidth="0.5"
                                />
                                <polyline
                                  points={segment.waveformData
                                    .map((value, i) => `${i},${50 + Math.min(value * 100 * waveformScale, 50)}`)
                                    .join(' ')}
                                  fill="none"
                                  stroke="rgba(255,255,255,0.5)"
                                  strokeWidth="0.5"
                                />
                              </svg>
                            )}

                            <div className="font-medium truncate relative z-10">{segment.name.substring(0, 15)}</div>
                            <div className="text-xs opacity-80 relative z-10">
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
