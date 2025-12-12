# Design Document

## Overview

이 설계는 비디오 편집기에 해상도 조절, 미디어 fitting, 오디오 음량 제어, 그리고 프로젝트 관리 기능을 추가합니다. 핵심 목표는 사용자가 다양한 해상도와 화면 비율로 비디오를 제작하고, 각 미디어와 오디오의 설정을 세밀하게 조정하며, 작업을 저장하고 관리할 수 있도록 하는 것입니다.

주요 설계 원칙:
- **유연한 해상도 관리**: 480p, 720p, 1080p 품질 프리셋 지원
- **자동 미디어 fitting**: 업로드된 미디어가 프로젝트 해상도에 자동으로 맞춰짐
- **세밀한 오디오 제어**: 트랙 및 키프레임 레벨의 음량 조절
- **프로젝트 영속성**: 모든 설정이 데이터베이스에 저장되고 복원됨
- **직관적인 UI/UX**: 설정 변경이 즉시 미리보기에 반영됨

## Architecture

### Resolution System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Project Settings                        │
│  - aspectRatio: '16:9' | '9:16'                         │
│  - qualityPreset: '480p' | '720p' | '1080p'             │
│  - width: number                                         │
│  - height: number                                        │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
   │ Media   │      │ Player  │      │ Export  │
   │ Fitting │      │ Canvas  │      │ Render  │
   └─────────┘      └─────────┘      └─────────┘
```

### Audio Control Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Audio Mixer                           │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
   │  Track  │      │Keyframe │      │ Final   │
   │ Volume  │  ×   │ Volume  │  =   │ Volume  │
   │ (0-200%)│      │ (0-200%)│      │         │
   └─────────┘      └─────────┘      └─────────┘
```

### Component Hierarchy

```
VideoEditorView
├── VideoEditorHeader
│   ├── ProjectSelector (새로운 컴포넌트)
│   │   ├── ProjectList
│   │   └── NewProjectDialog
│   ├── ProjectSettingsDialog (새로운 컴포넌트)
│   │   ├── ResolutionSelector
│   │   ├── AspectRatioSelector
│   │   └── ProjectInfoEditor
│   └── ExportButton
├── VideoPreview
│   └── RemotionPlayer (해상도 적용)
└── VideoTimeline
    ├── TimelineControls
    └── TrackList
        └── VideoTrackRow (확장)
            ├── TrackVolumeControl (새로운 컴포넌트)
            ├── TrackMuteButton (새로운 컴포넌트)
            └── KeyframeList
                └── KeyframeItem (확장)
                    ├── KeyframeVolumeControl (새로운 컴포넌트)
                    └── KeyframeFitSelector (새로운 컴포넌트)
```

## Components and Interfaces

### 1. Extended VideoProject Model

```typescript
// src/lib/context/StudioContext.tsx에 확장

export type AspectRatio = '16:9' | '9:16';
export type QualityPreset = '480p' | '720p' | '1080p';
export type FitMode = 'contain' | 'cover' | 'fill';

export interface ResolutionConfig {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  qualityPreset: QualityPreset;
}

export interface VideoProject {
  id: string;
  title: string;
  description: string;
  
  // Resolution settings
  aspectRatio: AspectRatio;
  qualityPreset: QualityPreset;
  width: number;
  height: number;
  
  duration: number;
  createdAt: number;
  updatedAt: number;
}

// Resolution calculation utility
export function getResolutionConfig(
  aspectRatio: AspectRatio,
  qualityPreset: QualityPreset
): ResolutionConfig {
  const resolutions: Record<AspectRatio, Record<QualityPreset, { width: number; height: number }>> = {
    '16:9': {
      '480p': { width: 854, height: 480 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
    },
    '9:16': {
      '480p': { width: 480, height: 854 },
      '720p': { width: 720, height: 1280 },
      '1080p': { width: 1080, height: 1920 },
    },
  };

  const { width, height } = resolutions[aspectRatio][qualityPreset];
  return { width, height, aspectRatio, qualityPreset };
}
```

### 2. Extended VideoTrack Model

```typescript
export interface VideoTrack {
  id: string;
  projectId: string;
  type: 'video' | 'music' | 'voiceover';
  label: string;
  locked: boolean;
  order: number;
  
  // Audio settings
  volume: number; // 0-200, default 100
  muted: boolean; // default false
}
```

### 3. Extended VideoKeyFrame Model

```typescript
export interface VideoKeyFrame {
  id: string;
  trackId: string;
  timestamp: number;
  duration: number;
  
  data: {
    type: 'image' | 'video' | 'music' | 'voiceover';
    mediaId: string;
    url: string;
    prompt?: string;
    
    // Media fitting (for image/video)
    fitMode?: FitMode; // default 'contain'
    
    // Audio settings (for music/voiceover)
    volume?: number; // 0-200, default 100 (null means use track volume)
  };
}
```

### 4. ProjectSelector Component

프로젝트 목록을 표시하고 선택할 수 있는 컴포넌트입니다.

```typescript
// src/components/video-editor/ProjectSelector.tsx

interface ProjectSelectorProps {
  currentProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  onNewProject: () => void;
}

export function ProjectSelector({
  currentProjectId,
  onProjectSelect,
  onNewProject,
}: ProjectSelectorProps) {
  const { projects, deleteProject } = useStudio();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const handleDelete = async () => {
    if (!projectToDelete) return;
    await deleteProject(projectToDelete);
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FolderIcon className="w-4 h-4" />
            {currentProject?.title || 'Select Project'}
            <ChevronDownIcon className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80">
          <DropdownMenuItem onClick={onNewProject}>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              className="flex items-center justify-between"
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => {
                  onProjectSelect(project.id);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{project.title}</div>
                <div className="text-xs text-muted-foreground">
                  {project.width}x{project.height} • {project.aspectRatio}
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectToDelete(project.id);
                  setDeleteDialogOpen(true);
                }}
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 5. ProjectSettingsDialog Component

프로젝트 설정을 편집하는 다이얼로그입니다.

```typescript
// src/components/video-editor/ProjectSettingsDialog.tsx

interface ProjectSettingsDialogProps {
  project: VideoProject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSettingsDialog({
  project,
  open,
  onOpenChange,
}: ProjectSettingsDialogProps) {
  const { updateProject } = useStudio();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(project.aspectRatio);
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>(project.qualityPreset);
  const [confirmResolutionChange, setConfirmResolutionChange] = useState(false);

  const resolutionConfig = getResolutionConfig(aspectRatio, qualityPreset);
  const resolutionChanged =
    aspectRatio !== project.aspectRatio || qualityPreset !== project.qualityPreset;

  const handleSave = async () => {
    if (resolutionChanged && !confirmResolutionChange) {
      setConfirmResolutionChange(true);
      return;
    }

    await updateProject(project.id, {
      title,
      description,
      aspectRatio,
      qualityPreset,
      width: resolutionConfig.width,
      height: resolutionConfig.height,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project Info */}
          <div>
            <Label htmlFor="title">Project Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Video Project"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project description..."
            />
          </div>

          {/* Resolution Settings */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Resolution Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Aspect Ratio</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={aspectRatio === '16:9' ? 'default' : 'outline'}
                    onClick={() => setAspectRatio('16:9')}
                    className="flex-1"
                  >
                    16:9
                  </Button>
                  <Button
                    variant={aspectRatio === '9:16' ? 'default' : 'outline'}
                    onClick={() => setAspectRatio('9:16')}
                    className="flex-1"
                  >
                    9:16
                  </Button>
                </div>
              </div>

              <div>
                <Label>Quality</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={qualityPreset === '480p' ? 'default' : 'outline'}
                    onClick={() => setQualityPreset('480p')}
                    className="flex-1"
                  >
                    480p
                  </Button>
                  <Button
                    variant={qualityPreset === '720p' ? 'default' : 'outline'}
                    onClick={() => setQualityPreset('720p')}
                    className="flex-1"
                  >
                    720p
                  </Button>
                  <Button
                    variant={qualityPreset === '1080p' ? 'default' : 'outline'}
                    onClick={() => setQualityPreset('1080p')}
                    className="flex-1"
                  >
                    1080p
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="text-sm font-medium">Output Resolution</div>
              <div className="text-2xl font-bold">
                {resolutionConfig.width} × {resolutionConfig.height}
              </div>
              <div className="text-xs text-muted-foreground">
                {resolutionConfig.aspectRatio} • {resolutionConfig.qualityPreset}
              </div>
            </div>

            {resolutionChanged && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm font-medium text-yellow-800">
                  Resolution Change Warning
                </div>
                <div className="text-xs text-yellow-700 mt-1">
                  Changing resolution will re-fit all existing media to the new dimensions.
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {resolutionChanged && !confirmResolutionChange ? 'Confirm Changes' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 6. TrackVolumeControl Component

트랙의 음량을 조절하는 컴포넌트입니다.

```typescript
// src/components/video-editor/TrackVolumeControl.tsx

interface TrackVolumeControlProps {
  track: VideoTrack;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: (muted: boolean) => void;
}

export function TrackVolumeControl({
  track,
  onVolumeChange,
  onMuteToggle,
}: TrackVolumeControlProps) {
  const [volume, setVolume] = useState(track.volume);
  const [muted, setMuted] = useState(track.muted);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    onVolumeChange(newVolume);
  };

  const handleMuteToggle = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    onMuteToggle(newMuted);
  };

  if (track.type === 'video') {
    return null; // Video tracks don't have volume control
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleMuteToggle}
        className="p-1"
      >
        {muted ? (
          <VolumeXIcon className="w-4 h-4" />
        ) : (
          <Volume2Icon className="w-4 h-4" />
        )}
      </Button>

      <Slider
        value={[volume]}
        onValueChange={handleVolumeChange}
        min={0}
        max={200}
        step={1}
        className="flex-1"
        disabled={muted}
      />

      <span className="text-xs text-muted-foreground w-12 text-right">
        {volume}%
      </span>
    </div>
  );
}
```

### 7. KeyframeVolumeControl Component

키프레임의 음량을 조절하는 컴포넌트입니다.

```typescript
// src/components/video-editor/KeyframeVolumeControl.tsx

interface KeyframeVolumeControlProps {
  keyframe: VideoKeyFrame;
  trackVolume: number;
  onVolumeChange: (volume: number | null) => void;
}

export function KeyframeVolumeControl({
  keyframe,
  trackVolume,
  onVolumeChange,
}: KeyframeVolumeControlProps) {
  const keyframeVolume = keyframe.data.volume ?? null;
  const effectiveVolume = keyframeVolume ?? trackVolume;
  const [volume, setVolume] = useState(effectiveVolume);
  const [useCustomVolume, setUseCustomVolume] = useState(keyframeVolume !== null);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (useCustomVolume) {
      onVolumeChange(newVolume);
    }
  };

  const handleToggleCustomVolume = () => {
    const newUseCustom = !useCustomVolume;
    setUseCustomVolume(newUseCustom);
    onVolumeChange(newUseCustom ? volume : null);
  };

  if (keyframe.data.type !== 'music' && keyframe.data.type !== 'voiceover') {
    return null;
  }

  return (
    <div className="space-y-2 p-2 border-t">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Keyframe Volume</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleCustomVolume}
          className="h-6 text-xs"
        >
          {useCustomVolume ? 'Use Track Volume' : 'Custom Volume'}
        </Button>
      </div>

      {useCustomVolume && (
        <div className="flex items-center gap-2">
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            min={0}
            max={200}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-12 text-right">
            {volume}%
          </span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Final: {Math.round((useCustomVolume ? volume : trackVolume) * trackVolume / 100)}%
      </div>
    </div>
  );
}
```

### 8. KeyframeFitSelector Component

키프레임의 fit 방식을 선택하는 컴포넌트입니다.

```typescript
// src/components/video-editor/KeyframeFitSelector.tsx

interface KeyframeFitSelectorProps {
  keyframe: VideoKeyFrame;
  onFitModeChange: (fitMode: FitMode) => void;
}

export function KeyframeFitSelector({
  keyframe,
  onFitModeChange,
}: KeyframeFitSelectorProps) {
  const fitMode = keyframe.data.fitMode ?? 'contain';

  if (keyframe.data.type !== 'image' && keyframe.data.type !== 'video') {
    return null;
  }

  return (
    <div className="space-y-2 p-2 border-t">
      <Label className="text-xs">Fit Mode</Label>
      <div className="flex gap-1">
        <Button
          variant={fitMode === 'contain' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFitModeChange('contain')}
          className="flex-1 text-xs"
        >
          Contain
        </Button>
        <Button
          variant={fitMode === 'cover' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFitModeChange('cover')}
          className="flex-1 text-xs"
        >
          Cover
        </Button>
        <Button
          variant={fitMode === 'fill' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFitModeChange('fill')}
          className="flex-1 text-xs"
        >
          Fill
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        {fitMode === 'contain' && 'Fit entire media with letterbox/pillarbox'}
        {fitMode === 'cover' && 'Fill canvas, crop if needed'}
        {fitMode === 'fill' && 'Stretch to fill canvas'}
      </div>
    </div>
  );
}
```

### 9. Media Fitting Utility

미디어를 프로젝트 해상도에 맞추는 유틸리티 함수입니다.

```typescript
// src/lib/mediaFitting.ts

export interface MediaDimensions {
  width: number;
  height: number;
}

export interface FitResult {
  width: number;
  height: number;
  x: number;
  y: number;
  scale: number;
}

export function fitMedia(
  media: MediaDimensions,
  canvas: MediaDimensions,
  fitMode: FitMode
): FitResult {
  const mediaAspect = media.width / media.height;
  const canvasAspect = canvas.width / canvas.height;

  let width: number;
  let height: number;
  let x: number;
  let y: number;
  let scale: number;

  switch (fitMode) {
    case 'contain': {
      // Fit entire media, add letterbox/pillarbox if needed
      if (mediaAspect > canvasAspect) {
        // Media is wider, fit to width
        width = canvas.width;
        height = canvas.width / mediaAspect;
        x = 0;
        y = (canvas.height - height) / 2;
        scale = canvas.width / media.width;
      } else {
        // Media is taller, fit to height
        width = canvas.height * mediaAspect;
        height = canvas.height;
        x = (canvas.width - width) / 2;
        y = 0;
        scale = canvas.height / media.height;
      }
      break;
    }

    case 'cover': {
      // Fill canvas, crop if needed
      if (mediaAspect > canvasAspect) {
        // Media is wider, fit to height and crop width
        width = canvas.height * mediaAspect;
        height = canvas.height;
        x = (canvas.width - width) / 2;
        y = 0;
        scale = canvas.height / media.height;
      } else {
        // Media is taller, fit to width and crop height
        width = canvas.width;
        height = canvas.width / mediaAspect;
        x = 0;
        y = (canvas.height - height) / 2;
        scale = canvas.width / media.width;
      }
      break;
    }

    case 'fill': {
      // Stretch to fill canvas
      width = canvas.width;
      height = canvas.height;
      x = 0;
      y = 0;
      scale = 1;
      break;
    }
  }

  return { width, height, x, y, scale };
}
```

### 10. Audio Mixing Utility

트랙과 키프레임 음량을 계산하는 유틸리티 함수입니다.

```typescript
// src/lib/audioMixing.ts

export function calculateFinalVolume(
  trackVolume: number,
  keyframeVolume: number | null | undefined,
  trackMuted: boolean
): number {
  if (trackMuted) {
    return 0;
  }

  const effectiveKeyframeVolume = keyframeVolume ?? 100;
  return (trackVolume / 100) * (effectiveKeyframeVolume / 100) * 100;
}

export function volumeToGain(volumePercent: number): number {
  // Convert 0-200% to 0-2 gain
  return volumePercent / 100;
}
```

## Data Models

### Database Schema (Prisma)

```prisma
// prisma/schema.prisma 업데이트

model VideoProject {
  id          String   @id @default(cuid())
  title       String
  description String   @default("")
  
  // Resolution settings
  aspectRatio String   @default("16:9")
  qualityPreset String @default("720p")
  width       Int      @default(1280)
  height      Int      @default(720)
  
  duration    Int      @default(30000)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  tracks      VideoTrack[]
  
  @@map("video_projects")
}

model VideoTrack {
  id        String   @id @default(cuid())
  projectId String
  type      String   // 'video' | 'music' | 'voiceover'
  label     String
  locked    Boolean  @default(true)
  order     Int      @default(0)
  
  // Audio settings
  volume    Int      @default(100) // 0-200
  muted     Boolean  @default(false)
  
  createdAt DateTime @default(now())
  
  project   VideoProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  keyframes VideoKeyFrame[]
  
  @@map("video_tracks")
}

model VideoKeyFrame {
  id        String   @id @default(cuid())
  trackId   String
  timestamp Int      // milliseconds
  duration  Int      // milliseconds
  dataType  String   // 'image' | 'video' | 'music' | 'voiceover'
  mediaId   String
  url       String
  prompt    String?
  
  // Media fitting (for image/video)
  fitMode   String?  @default("contain") // 'contain' | 'cover' | 'fill'
  
  // Audio settings (for music/voiceover)
  volume    Int?     // 0-200, null means use track volume
  
  createdAt DateTime @default(now())
  
  track     VideoTrack @relation(fields: [trackId], references: [id], onDelete: Cascade)
  
  @@map("video_keyframes")
}
```

### API Routes

기존 API 라우트에 추가:

```typescript
// src/app/api/video-projects/[id]/route.ts
PATCH  /api/video-projects/[id]
// Body: { title?, description?, aspectRatio?, qualityPreset?, width?, height? }

// src/app/api/video-tracks/[id]/route.ts
PATCH  /api/video-tracks/[id]
// Body: { volume?, muted? }

// src/app/api/video-keyframes/[id]/route.ts
PATCH  /api/video-keyframes/[id]
// Body: { fitMode?, volume? }
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing the prework analysis, the following redundancies were identified:

**Redundant Properties:**
- Requirements 1.4-1.8 are all testing the same resolution calculation rule as 1.3, just with different input values. These can be combined into a single comprehensive property that tests all aspect ratio and quality preset combinations.
- Requirement 3.2 (video scaling) is the same rule as 3.1 (image scaling), just for different media types. These can be combined.
- Requirement 10.4 is redundant with 10.3 - both test that loading a project restores all settings.
- Requirement 12.3 is redundant with 12.2 - both test cascade deletion of project data.

**Combined Properties:**
- Requirements 3.4 and 3.5 (upscaling and downscaling) are both aspects of the general scaling behavior and can be tested together.
- Requirements 5.3, 5.4, 5.5 are edge cases that will be covered by the property testing framework's generators.

After reflection, we will create properties that eliminate redundancy while maintaining comprehensive coverage.

### Correctness Properties

Property 1: Resolution calculation correctness
*For any* valid aspect ratio ('16:9' or '9:16') and quality preset ('480p', '720p', '1080p'), the calculated resolution should match the expected width and height for that combination
**Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**

Property 2: Project resolution update
*For any* project and any new resolution settings, when the user confirms the resolution change, the project's width and height should be updated to match the new settings
**Validates: Requirements 2.3**

Property 3: Keyframe re-fitting on resolution change
*For any* set of keyframes in a project, when the project resolution changes, all keyframes should have their fit calculations updated to match the new resolution
**Validates: Requirements 2.4**

Property 4: Media scaling to project resolution
*For any* image or video media and any project resolution, when the media is added to the timeline, it should be scaled to fit within the project resolution
**Validates: Requirements 3.1, 3.2**

Property 5: Contain fit mode preserves aspect ratio
*For any* media with different aspect ratio than the canvas, when using 'contain' fit mode, the entire media should be visible and the media's aspect ratio should be preserved
**Validates: Requirements 3.3, 4.2**

Property 6: Media upscaling and downscaling
*For any* media dimensions and canvas dimensions, the media should be scaled up if smaller than canvas or scaled down if larger than canvas to fit appropriately
**Validates: Requirements 3.4, 3.5**

Property 7: Cover fit mode fills canvas
*For any* media and canvas dimensions, when using 'cover' fit mode, the resulting dimensions should completely fill the canvas (width and height match canvas)
**Validates: Requirements 4.3**

Property 8: Fill fit mode matches canvas exactly
*For any* media and canvas dimensions, when using 'fill' fit mode, the resulting dimensions should exactly match the canvas dimensions
**Validates: Requirements 4.4**

Property 9: Track volume range validation
*For any* volume value, if it is within the range 0-200, it should be accepted as a valid track volume; values outside this range should be rejected
**Validates: Requirements 5.2**

Property 10: Volume changes persist
*For any* track volume change, the new volume value should be saved to the database and retrievable on subsequent loads
**Validates: Requirements 5.6**

Property 11: Mute button toggles track muted state
*For any* audio track, clicking the mute button should toggle the muted property between true and false
**Validates: Requirements 6.2, 6.4**

Property 12: Muted tracks produce zero volume
*For any* audio track that is muted, the final calculated volume should be 0 regardless of the track's volume setting
**Validates: Requirements 6.5**

Property 13: Keyframe volume isolation
*For any* keyframe volume change, only that specific keyframe's volume should change; other keyframes in the same track should remain unchanged
**Validates: Requirements 7.2**

Property 14: Final volume calculation
*For any* track volume and keyframe volume (or null), the final volume should be calculated as (trackVolume / 100) * (keyframeVolume ?? 100) / 100 * 100, and should be 0 if track is muted
**Validates: Requirements 7.3, 7.4**

Property 15: Keyframe volume persistence
*For any* keyframe volume change, the new volume value should be saved to the database and retrievable on subsequent loads
**Validates: Requirements 7.5**

Property 16: Export uses project resolution
*For any* project with a specific resolution, when exporting, the output video dimensions should match the project's width and height
**Validates: Requirements 9.1**

Property 17: Export reflects track volume
*For any* track with a volume setting, the exported video should have audio at the specified volume level for that track
**Validates: Requirements 9.2**

Property 18: Export reflects keyframe volume
*For any* keyframe with a volume setting, the exported video should have audio at the calculated final volume (track volume * keyframe volume) for that keyframe
**Validates: Requirements 9.3**

Property 19: Export excludes muted tracks
*For any* muted track, the exported video should not include audio from that track
**Validates: Requirements 9.4**

Property 20: Export reflects fit mode
*For any* keyframe with a specific fit mode, the exported video should render that media using the specified fit mode
**Validates: Requirements 9.5**

Property 21: Project creation persistence
*For any* new project, after creation, it should be retrievable from the database with all its properties intact
**Validates: Requirements 10.1**

Property 22: Project list completeness
*For any* set of saved projects, the project list should contain all of them with no duplicates or omissions
**Validates: Requirements 10.2**

Property 23: Project load restoration
*For any* saved project, loading it should restore all settings including resolution, aspect ratio, tracks, keyframes, and volume settings
**Validates: Requirements 10.3, 10.4**

Property 24: Project auto-save
*For any* modification to a project, the changes should be automatically saved to the database within a reasonable time
**Validates: Requirements 10.5**

Property 25: Project name change persistence
*For any* project name change, the new name should be saved to the database and reflected in subsequent loads
**Validates: Requirements 11.3**

Property 26: Default project name generation
*For any* project created with an empty name, a default name should be automatically generated and assigned
**Validates: Requirements 11.5**

Property 27: Project cascade deletion
*For any* project, when deleted, all associated tracks and keyframes should also be deleted from the database
**Validates: Requirements 12.2, 12.3**

Property 28: Project list update after deletion
*For any* deleted project, it should no longer appear in the project list after deletion
**Validates: Requirements 12.4**

Property 29: Resolution settings persistence
*For any* project creation with resolution settings, those settings should be saved to the database
**Validates: Requirements 13.1**

Property 30: Track volume persistence
*For any* track creation with volume settings, those settings should be saved to the database
**Validates: Requirements 13.2**

Property 31: Keyframe settings persistence
*For any* keyframe creation with volume and fit mode settings, those settings should be saved to the database
**Validates: Requirements 13.3**

Property 32: Settings immediate persistence
*For any* setting change, the change should be saved to the database immediately (within a reasonable time threshold)
**Validates: Requirements 13.4**

Property 33: Settings round-trip consistency
*For any* project with all settings configured, saving then loading the project should restore all settings to their original values
**Validates: Requirements 13.5**

## Error Handling

### Client-Side Errors

1. **Invalid Resolution Configuration**
   - Validate aspect ratio and quality preset combinations
   - Display error message for invalid combinations
   - Prevent project creation with invalid settings

2. **Volume Out of Range**
   - Clamp volume values to 0-200 range
   - Display warning when user attempts to set invalid volume
   - Prevent invalid values from being saved

3. **Media Fitting Errors**
   - Handle cases where media dimensions cannot be determined
   - Provide fallback fit mode (contain)
   - Log errors for debugging

4. **Project Load Failures**
   - Catch database errors when loading projects
   - Display user-friendly error message
   - Provide option to retry or create new project

5. **Auto-Save Failures**
   - Detect when auto-save fails
   - Display warning to user
   - Provide manual save option

### Server-Side Errors

1. **Database Constraint Violations**
   - Handle foreign key violations on cascade delete
   - Validate data before insertion
   - Return appropriate error codes

2. **Invalid Data Types**
   - Validate aspect ratio and quality preset enums
   - Validate volume ranges
   - Validate fit mode enums

3. **Concurrent Modifications**
   - Handle race conditions in auto-save
   - Use optimistic locking where appropriate
   - Resolve conflicts gracefully

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      value?: any;
      constraint?: string;
    };
  };
}
```

## Testing Strategy

### Unit Testing

Unit tests will verify specific functionality and edge cases:

1. **Resolution Calculation**
   - Test getResolutionConfig for all valid combinations
   - Test invalid aspect ratio handling
   - Test invalid quality preset handling

2. **Media Fitting**
   - Test fitMedia function for all fit modes
   - Test edge cases (zero dimensions, equal dimensions)
   - Test aspect ratio preservation in contain mode

3. **Audio Mixing**
   - Test calculateFinalVolume with various inputs
   - Test muted track handling
   - Test null keyframe volume handling
   - Test volume range clamping

4. **Component Rendering**
   - Test ProjectSelector renders project list
   - Test ProjectSettingsDialog displays current settings
   - Test TrackVolumeControl updates on slider change
   - Test KeyframeFitSelector displays correct mode

5. **API Routes**
   - Test PATCH /api/video-projects/[id] updates resolution
   - Test PATCH /api/video-tracks/[id] updates volume
   - Test PATCH /api/video-keyframes/[id] updates fit mode and volume

### Property-Based Testing

Property-based tests will verify universal properties across many inputs using **fast-check**:

- Each property-based test should run a minimum of 100 iterations
- Each test must be tagged with: `// Feature: video-resolution-audio-controls, Property {number}: {property_text}`
- Each correctness property should be implemented by a SINGLE property-based test

**Property Test Examples:**

```typescript
// Feature: video-resolution-audio-controls, Property 1: Resolution calculation correctness
test('resolution calculation for all aspect ratios and quality presets', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('16:9', '9:16'),
      fc.constantFrom('480p', '720p', '1080p'),
      (aspectRatio, qualityPreset) => {
        const config = getResolutionConfig(aspectRatio, qualityPreset);
        
        // Verify aspect ratio is correct
        const expectedRatio = aspectRatio === '16:9' ? 16/9 : 9/16;
        const actualRatio = config.width / config.height;
        expect(Math.abs(actualRatio - expectedRatio)).toBeLessThan(0.01);
        
        // Verify quality preset matches
        const shortSide = Math.min(config.width, config.height);
        const expectedShortSide = parseInt(qualityPreset);
        expect(Math.abs(shortSide - expectedShortSide)).toBeLessThan(10);
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: video-resolution-audio-controls, Property 5: Contain fit mode preserves aspect ratio
test('contain fit mode preserves media aspect ratio', () => {
  fc.assert(
    fc.property(
      fc.record({
        width: fc.integer({ min: 100, max: 4000 }),
        height: fc.integer({ min: 100, max: 4000 }),
      }),
      fc.record({
        width: fc.integer({ min: 100, max: 4000 }),
        height: fc.integer({ min: 100, max: 4000 }),
      }),
      (media, canvas) => {
        const result = fitMedia(media, canvas, 'contain');
        
        // Verify aspect ratio is preserved
        const mediaAspect = media.width / media.height;
        const resultAspect = result.width / result.height;
        expect(Math.abs(mediaAspect - resultAspect)).toBeLessThan(0.01);
        
        // Verify entire media fits within canvas
        expect(result.width).toBeLessThanOrEqual(canvas.width);
        expect(result.height).toBeLessThanOrEqual(canvas.height);
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: video-resolution-audio-controls, Property 14: Final volume calculation
test('final volume calculation with track and keyframe volumes', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 200 }), // track volume
      fc.option(fc.integer({ min: 0, max: 200 })), // keyframe volume (nullable)
      fc.boolean(), // track muted
      (trackVolume, keyframeVolume, trackMuted) => {
        const finalVolume = calculateFinalVolume(trackVolume, keyframeVolume, trackMuted);
        
        if (trackMuted) {
          expect(finalVolume).toBe(0);
        } else {
          const effectiveKeyframeVolume = keyframeVolume ?? 100;
          const expected = (trackVolume / 100) * (effectiveKeyframeVolume / 100) * 100;
          expect(Math.abs(finalVolume - expected)).toBeLessThan(0.01);
        }
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: video-resolution-audio-controls, Property 33: Settings round-trip consistency
test('project settings round-trip through save and load', () => {
  fc.assert(
    fc.property(
      fc.record({
        title: fc.string({ minLength: 1, maxLength: 100 }),
        description: fc.string({ maxLength: 500 }),
        aspectRatio: fc.constantFrom('16:9', '9:16'),
        qualityPreset: fc.constantFrom('480p', '720p', '1080p'),
      }),
      async (projectData) => {
        const config = getResolutionConfig(projectData.aspectRatio, projectData.qualityPreset);
        const project = {
          ...projectData,
          width: config.width,
          height: config.height,
        };
        
        // Save project
        const savedId = await createProject(project);
        
        // Load project
        const loaded = await loadProject(savedId);
        
        // Verify all settings match
        expect(loaded.title).toBe(project.title);
        expect(loaded.description).toBe(project.description);
        expect(loaded.aspectRatio).toBe(project.aspectRatio);
        expect(loaded.qualityPreset).toBe(project.qualityPreset);
        expect(loaded.width).toBe(project.width);
        expect(loaded.height).toBe(project.height);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests will verify component interactions:

1. **Resolution Change Flow**
   - User opens settings dialog
   - User changes resolution
   - Confirmation dialog appears
   - User confirms
   - Project and keyframes are updated
   - Preview reflects new resolution

2. **Volume Control Flow**
   - User selects audio track
   - Volume slider appears
   - User adjusts volume
   - Change is saved to database
   - Playback reflects new volume

3. **Project Management Flow**
   - User creates new project
   - Project is saved automatically
   - User loads project from list
   - All settings are restored
   - User deletes project
   - Project is removed from list and database

### Testing Tools

- **Jest**: Unit and integration testing framework
- **React Testing Library**: Component testing
- **fast-check**: Property-based testing library
- **MSW (Mock Service Worker)**: API mocking for tests
- **Prisma Test Environment**: Database testing

## Implementation Notes

### Phase 1: Database Schema & API
1. Update Prisma schema with new fields
2. Create database migration
3. Update API routes for PATCH operations
4. Add validation for new fields

### Phase 2: Core Utilities
1. Implement getResolutionConfig function
2. Implement fitMedia function
3. Implement calculateFinalVolume function
4. Write unit tests for utilities

### Phase 3: UI Components
1. Implement ProjectSelector component
2. Implement ProjectSettingsDialog component
3. Implement TrackVolumeControl component
4. Implement KeyframeVolumeControl component
5. Implement KeyframeFitSelector component

### Phase 4: Integration
1. Integrate components into VideoEditorView
2. Update VideoPreview to use project resolution
3. Update VideoTimeline to show volume controls
4. Update export functionality to use all settings

### Phase 5: Testing & Polish
1. Write property-based tests
2. Write integration tests
3. Test auto-save functionality
4. Optimize performance
5. Add error handling

### Migration Strategy

For existing projects without resolution settings:

```typescript
// Migration script
async function migrateExistingProjects() {
  const projects = await prisma.videoProject.findMany({
    where: {
      qualityPreset: null,
    },
  });

  for (const project of projects) {
    // Default to 720p 16:9
    const aspectRatio = project.aspectRatio || '16:9';
    const qualityPreset = '720p';
    const config = getResolutionConfig(aspectRatio, qualityPreset);

    await prisma.videoProject.update({
      where: { id: project.id },
      data: {
        qualityPreset,
        width: config.width,
        height: config.height,
      },
    });
  }
}
```

For existing tracks without volume settings:

```typescript
async function migrateExistingTracks() {
  await prisma.videoTrack.updateMany({
    where: {
      volume: null,
    },
    data: {
      volume: 100,
      muted: false,
    },
  });
}
```

### Performance Considerations

1. **Auto-Save Debouncing**: Debounce auto-save to avoid excessive database writes
2. **Volume Calculation Caching**: Cache final volume calculations for performance
3. **Media Fitting Memoization**: Memoize fit calculations to avoid recalculation
4. **Lazy Loading**: Load project list lazily with pagination if needed
5. **Optimistic Updates**: Update UI optimistically before database confirmation

### Accessibility

1. **Keyboard Navigation**: Support keyboard control for volume sliders
2. **ARIA Labels**: Add proper labels to all controls
3. **Screen Reader Support**: Announce volume changes and resolution changes
4. **Focus Management**: Maintain focus when dialogs open/close
5. **High Contrast**: Ensure controls are visible in high contrast mode

### Browser Compatibility

- Target: Modern browsers (Chrome, Firefox, Safari, Edge)
- Volume control: Use Web Audio API for precise volume control
- Media fitting: Use CSS transforms for performance
- Fallback: Display message for unsupported browsers
