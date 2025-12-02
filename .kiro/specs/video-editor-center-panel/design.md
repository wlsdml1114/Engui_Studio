# Design Document

## Overview

이 설계는 videosos의 Remotion 기반 비디오 편집기를 enguistudio의 중앙 패널에 통합하는 방법을 정의합니다. 핵심 목표는 videosos의 타임라인 편집 기능을 재사용하면서 enguistudio의 기존 아키텍처(StudioContext, 컴포넌트 구조)와 원활하게 통합하는 것입니다.

주요 설계 원칙:
- **컴포넌트 재사용**: videosos의 검증된 컴포넌트를 최대한 활용
- **상태 통합**: StudioContext를 확장하여 비디오 편집 상태 관리
- **점진적 통합**: 기존 기능을 유지하면서 새로운 편집기 추가
- **타입 안전성**: TypeScript를 활용한 강력한 타입 시스템

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    StudioProvider                        │
│  (기존 상태 + VideoEditorState 확장)                     │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
   │  Left   │      │ Center  │      │  Right  │
   │  Panel  │      │  Panel  │      │  Panel  │
   └─────────┘      └────┬────┘      └─────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         ┌────▼────┐          ┌────▼────┐
         │  Video  │          │  Video  │
         │ Preview │          │Timeline │
         │(Player) │          │ Editor  │
         └─────────┘          └─────────┘
```

### Component Hierarchy

```
CenterPanel
├── VideoEditorView (새로운 컴포넌트)
│   ├── VideoEditorHeader
│   │   ├── AspectRatioSelector
│   │   ├── ExportButton
│   │   └── PlaybackControls
│   ├── VideoPreview (videosos에서 가져옴)
│   │   └── RemotionPlayer
│   └── VideoTimeline (새로운 컴포넌트)
│       ├── TimelineControls
│       │   ├── ZoomControls
│       │   └── TimeDisplay
│       ├── TimelineRuler (videosos에서 가져옴)
│       └── TrackList
│           └── VideoTrackRow[] (videosos에서 가져옴)
└── DefaultView (기존 컴포넌트)
```

## Components and Interfaces

### 1. VideoEditorState (StudioContext 확장)

StudioContext에 비디오 편집기 상태를 추가합니다.

```typescript
// src/lib/context/StudioContext.tsx에 추가

export interface VideoProject {
  id: string;
  title: string;
  description: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  duration: number; // milliseconds
  createdAt: number;
  updatedAt: number;
}

export interface VideoTrack {
  id: string;
  projectId: string;
  type: 'video' | 'music' | 'voiceover';
  label: string;
  locked: boolean;
  order: number;
}

export interface VideoKeyFrame {
  id: string;
  trackId: string;
  timestamp: number; // milliseconds
  duration: number; // milliseconds
  data: {
    type: 'image' | 'video' | 'music' | 'voiceover';
    mediaId: string;
    url: string;
    prompt?: string;
  };
}

export interface VideoEditorState {
  // Project
  currentProject: VideoProject | null;
  projects: VideoProject[];
  
  // Tracks & Keyframes
  tracks: VideoTrack[];
  keyframes: Record<string, VideoKeyFrame[]>; // trackId -> keyframes
  
  // Playback
  player: PlayerRef | null;
  playerState: 'playing' | 'paused';
  currentTimestamp: number; // seconds
  
  // UI State
  zoom: number;
  selectedKeyframeIds: string[];
  exportDialogOpen: boolean;
  
  // Actions
  createProject: (project: Omit<VideoProject, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  loadProject: (projectId: string) => Promise<void>;
  updateProject: (projectId: string, updates: Partial<VideoProject>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  
  addTrack: (track: Omit<VideoTrack, 'id'>) => Promise<string>;
  removeTrack: (trackId: string) => Promise<void>;
  
  addKeyframe: (keyframe: Omit<VideoKeyFrame, 'id'>) => Promise<string>;
  updateKeyframe: (keyframeId: string, updates: Partial<VideoKeyFrame>) => Promise<void>;
  removeKeyframe: (keyframeId: string) => Promise<void>;
  
  setPlayer: (player: PlayerRef | null) => void;
  setPlayerState: (state: 'playing' | 'paused') => void;
  setCurrentTimestamp: (timestamp: number) => void;
  
  setZoom: (zoom: number) => void;
  selectKeyframe: (keyframeId: string) => void;
  deselectKeyframe: (keyframeId: string) => void;
  clearSelection: () => void;
  
  setExportDialogOpen: (open: boolean) => void;
}
```

### 2. VideoEditorView Component

중앙 패널에서 비디오 편집 모드를 표시하는 메인 컴포넌트입니다.

```typescript
// src/components/video-editor/VideoEditorView.tsx

interface VideoEditorViewProps {
  projectId: string;
}

export function VideoEditorView({ projectId }: VideoEditorViewProps) {
  const {
    currentProject,
    tracks,
    keyframes,
    player,
    playerState,
    currentTimestamp,
    zoom,
    loadProject,
    setPlayer,
    setPlayerState,
    setCurrentTimestamp,
  } = useStudio();

  useEffect(() => {
    loadProject(projectId);
  }, [projectId]);

  if (!currentProject) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col h-full">
      <VideoEditorHeader project={currentProject} />
      <VideoPreview
        project={currentProject}
        tracks={tracks}
        keyframes={keyframes}
        onPlayerReady={setPlayer}
        onStateChange={setPlayerState}
        onTimeUpdate={setCurrentTimestamp}
      />
      <VideoTimeline
        project={currentProject}
        tracks={tracks}
        keyframes={keyframes}
        currentTimestamp={currentTimestamp}
        zoom={zoom}
      />
    </div>
  );
}
```

### 3. VideoPreview Component (videosos 기반)

Remotion Player를 래핑하여 비디오 미리보기를 제공합니다.

```typescript
// src/components/video-editor/VideoPreview.tsx

interface VideoPreviewProps {
  project: VideoProject;
  tracks: VideoTrack[];
  keyframes: Record<string, VideoKeyFrame[]>;
  onPlayerReady: (player: PlayerRef) => void;
  onStateChange: (state: 'playing' | 'paused') => void;
  onTimeUpdate: (timestamp: number) => void;
}

export function VideoPreview({
  project,
  tracks,
  keyframes,
  onPlayerReady,
  onStateChange,
  onTimeUpdate,
}: VideoPreviewProps) {
  const playerRef = useCallback((player: PlayerRef) => {
    if (!player) return;
    
    onPlayerReady(player);
    
    player.addEventListener('play', () => onStateChange('playing'));
    player.addEventListener('pause', () => onStateChange('paused'));
    player.addEventListener('frameupdate', (e) => {
      const timestamp = e.detail.frame / FPS;
      onTimeUpdate(timestamp);
    });
  }, [onPlayerReady, onStateChange, onTimeUpdate]);

  const { width, height } = getAspectRatioDimensions(project.aspectRatio);

  return (
    <div className="flex-1 flex items-center justify-center bg-black/20">
      <Player
        ref={playerRef}
        component={VideoComposition}
        inputProps={{ project, tracks, keyframes }}
        durationInFrames={Math.ceil(project.duration / 1000 * FPS)}
        fps={FPS}
        compositionWidth={width}
        compositionHeight={height}
        style={{ width: '100%', height: '100%', maxHeight: '500px' }}
        controls={false}
        clickToPlay={true}
      />
    </div>
  );
}
```

### 4. VideoTimeline Component

타임라인 UI를 제공하는 컴포넌트입니다.

```typescript
// src/components/video-editor/VideoTimeline.tsx

interface VideoTimelineProps {
  project: VideoProject;
  tracks: VideoTrack[];
  keyframes: Record<string, VideoKeyFrame[]>;
  currentTimestamp: number;
  zoom: number;
}

export function VideoTimeline({
  project,
  tracks,
  keyframes,
  currentTimestamp,
  zoom,
}: VideoTimelineProps) {
  const { setZoom, setCurrentTimestamp, addKeyframe } = useStudio();
  const timelineRef = useRef<HTMLDivElement>(null);

  const durationSeconds = project.duration / 1000;
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  const timelineWidth = pixelsPerSecond * durationSeconds;

  const handleTimelineClick = (event: MouseEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relativeX = event.clientX - rect.left;
    const timestamp = (relativeX / timelineWidth) * durationSeconds;
    setCurrentTimestamp(timestamp);
  };

  const handleDrop = async (event: DragEvent) => {
    const mediaData = JSON.parse(event.dataTransfer.getData('application/json'));
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relativeX = event.clientX - rect.left;
    const timestamp = (relativeX / timelineWidth) * durationSeconds * 1000;

    await addKeyframe({
      trackId: getTrackIdForMediaType(mediaData.type),
      timestamp,
      duration: mediaData.duration || 5000,
      data: {
        type: mediaData.type,
        mediaId: mediaData.id,
        url: mediaData.url,
        prompt: mediaData.prompt,
      },
    });
  };

  return (
    <div className="border-t border-border bg-background-light">
      <TimelineControls
        currentTimestamp={currentTimestamp}
        duration={durationSeconds}
        zoom={zoom}
        onZoomChange={setZoom}
      />
      <div
        ref={timelineRef}
        className="relative overflow-x-auto"
        onClick={handleTimelineClick}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <TimelineRuler
          duration={durationSeconds}
          zoom={zoom}
          timelineWidth={timelineWidth}
        />
        <div className="relative" style={{ width: timelineWidth }}>
          {tracks.map((track) => (
            <VideoTrackRow
              key={track.id}
              track={track}
              keyframes={keyframes[track.id] || []}
              pixelsPerMs={pixelsPerSecond / 1000}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 5. TimelineRuler Component (videosos에서 가져옴)

시간 눈금자를 표시하는 컴포넌트입니다. videosos의 구현을 그대로 사용합니다.

```typescript
// src/components/video-editor/TimelineRuler.tsx
// videosos/src/components/video/timeline.tsx에서 가져옴
```

### 6. VideoTrackRow Component (videosos에서 가져옴)

개별 트랙과 키프레임을 표시하는 컴포넌트입니다.

```typescript
// src/components/video-editor/VideoTrackRow.tsx
// videosos/src/components/video/track.tsx에서 가져옴
```

## Data Models

### Database Schema (Prisma)

```prisma
// prisma/schema.prisma에 추가

model VideoProject {
  id          String   @id @default(cuid())
  title       String
  description String   @default("")
  aspectRatio String   @default("16:9")
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
  createdAt DateTime @default(now())
  
  track     VideoTrack @relation(fields: [trackId], references: [id], onDelete: Cascade)
  
  @@map("video_keyframes")
}
```

### API Routes

```typescript
// src/app/api/video-projects/route.ts
GET    /api/video-projects          // 프로젝트 목록 조회
POST   /api/video-projects          // 프로젝트 생성

// src/app/api/video-projects/[id]/route.ts
GET    /api/video-projects/[id]     // 프로젝트 상세 조회
PATCH  /api/video-projects/[id]     // 프로젝트 수정
DELETE /api/video-projects/[id]     // 프로젝트 삭제

// src/app/api/video-tracks/route.ts
POST   /api/video-tracks            // 트랙 생성

// src/app/api/video-tracks/[id]/route.ts
DELETE /api/video-tracks/[id]       // 트랙 삭제

// src/app/api/video-keyframes/route.ts
POST   /api/video-keyframes         // 키프레임 생성

// src/app/api/video-keyframes/[id]/route.ts
PATCH  /api/video-keyframes/[id]    // 키프레임 수정
DELETE /api/video-keyframes/[id]    // 키프레임 삭제

// src/app/api/video-export/route.ts
POST   /api/video-export            // 비디오 내보내기
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Video editor activation displays correct interface
*For any* initial UI state, when the user activates video editing mode, the CenterPanel should render the VideoEditorView component with VideoPreview and VideoTimeline child components.
**Validates: Requirements 1.1, 1.2**

### Property 2: Media addition creates keyframes
*For any* valid media item (image, video, or audio), when added to the timeline, a corresponding KeyFrame should be created in the appropriate track with the correct media data.
**Validates: Requirements 1.3**

### Property 3: Timeline playback respects chronological order
*For any* set of keyframes with different timestamps, when the player plays the timeline, keyframes should appear in ascending order of their timestamps.
**Validates: Requirements 1.4**

### Property 4: Play button changes player state
*For any* timeline configuration, when the user clicks the play button, the player state should transition to 'playing'.
**Validates: Requirements 1.5**

### Property 5: Timeline renders ruler component
*For any* timeline configuration, when the timeline is rendered, it should contain a TimelineRuler component.
**Validates: Requirements 2.1**

### Property 6: Ruler tick spacing adapts to duration
*For any* timeline duration, the ruler should display major and minor ticks with spacing that maintains readability (major ticks at least 96px apart).
**Validates: Requirements 2.2**

### Property 7: Zoom adjusts tick intervals
*For any* zoom level between MIN_ZOOM and MAX_ZOOM, changing the zoom should result in different tick intervals while maintaining minimum spacing requirements.
**Validates: Requirements 2.3**

### Property 8: Major ticks have labels
*For any* rendered timeline, each major tick should have an associated time label.
**Validates: Requirements 2.4**

### Property 9: Time formatting adapts to scale
*For any* time value, if the value is less than 1 second, it should be formatted in milliseconds; otherwise, it should use seconds/minutes/hours format.
**Validates: Requirements 2.5**

### Property 10: Video media creates video track
*For any* video media item, when added to the timeline, a track with type 'video' should exist or be created.
**Validates: Requirements 3.1**

### Property 11: Image media uses video track
*For any* image media item, when added to the timeline, it should be placed in a track with type 'video'.
**Validates: Requirements 3.2**

### Property 12: Audio media creates appropriate track
*For any* audio media item, when added to the timeline, a track with type 'music' or 'voiceover' should exist or be created based on the audio type.
**Validates: Requirements 3.3**

### Property 13: Track types have distinct visual styles
*For any* rendered track, tracks of different types (video, music, voiceover) should have distinguishable visual styling.
**Validates: Requirements 3.4**

### Property 14: Tracks are sorted by type
*For any* set of tracks, when rendered, they should appear in the order defined by TRACK_TYPE_ORDER (video, music, voiceover).
**Validates: Requirements 3.5**

### Property 15: Player initializes on editor load
*For any* video editor instance, when the editor loads, the Remotion Player should be initialized and stored in the state.
**Validates: Requirements 4.1**

### Property 16: Player reflects timeline changes
*For any* timeline modification (adding/removing keyframes), the player's composition should update to reflect the changes.
**Validates: Requirements 4.2**

### Property 17: Seek updates displayed frame
*For any* valid timestamp within the timeline duration, when seeking to that timestamp, the player should display the frame at that time.
**Validates: Requirements 4.3**

### Property 18: Playback updates context timestamp
*For any* playing video, the StudioContext's currentTimestamp should be updated as the video plays.
**Validates: Requirements 4.4**

### Property 19: Aspect ratio changes canvas dimensions
*For any* aspect ratio selection ('16:9', '9:16', '1:1'), the player's canvas dimensions should match the corresponding resolution.
**Validates: Requirements 5.1**

### Property 20: Export button opens dialog
*For any* non-empty timeline, when the export button is clicked, the export dialog should open.
**Validates: Requirements 6.1**

### Property 21: Export shows progress
*For any* export operation, while rendering is in progress, a progress indicator should be visible.
**Validates: Requirements 6.3**

### Property 22: Export completion shows download option
*For any* completed export, a download option should be presented to the user.
**Validates: Requirements 6.4**

### Property 23: Export errors display messages
*For any* export operation that fails, an error message should be displayed to the user.
**Validates: Requirements 6.5**

### Property 24: Editor initialization stores project state
*For any* video project, when the editor initializes with that project, the StudioContext should contain the project's state.
**Validates: Requirements 7.1**

### Property 25: Track changes sync to context
*For any* track operation (add/update/delete), the StudioContext's tracks array should reflect the change.
**Validates: Requirements 7.2**

### Property 26: Playback state syncs to context
*For any* player state change (play/pause), the StudioContext's playerState should update accordingly.
**Validates: Requirements 7.3**

### Property 27: Timestamp syncs to context
*For any* change in playback position, the StudioContext's currentTimestamp should update to match.
**Validates: Requirements 7.4**

### Property 28: Context changes propagate to subscribers
*For any* state change in StudioContext, components subscribing to that state should re-render with the new value.
**Validates: Requirements 7.5**

### Property 29: Components use enguistudio theme
*For any* rendered VideoEditor component, it should apply Tailwind classes from enguistudio's theme configuration.
**Validates: Requirements 8.2**

## Error Handling

### Client-Side Errors

1. **Invalid Media Format**
   - Detect unsupported media formats before adding to timeline
   - Display user-friendly error message
   - Prevent timeline corruption

2. **Player Initialization Failure**
   - Catch Remotion Player initialization errors
   - Display fallback UI with error message
   - Provide retry mechanism

3. **Timeline State Corruption**
   - Validate keyframe data before rendering
   - Implement state recovery mechanisms
   - Log errors for debugging

4. **Export Failures**
   - Catch rendering errors during export
   - Display detailed error messages
   - Allow users to retry or adjust settings

### Server-Side Errors

1. **Database Operations**
   - Wrap all Prisma operations in try-catch
   - Return standardized error responses
   - Log errors with context

2. **File System Operations**
   - Handle file read/write errors
   - Validate file paths and permissions
   - Clean up temporary files on error

3. **API Rate Limiting**
   - Implement request throttling
   - Return 429 status with retry-after header
   - Queue requests when possible

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

## Testing Strategy

### Unit Testing

Unit tests will verify specific functionality and edge cases:

1. **Component Rendering**
   - VideoEditorView renders with correct props
   - VideoPreview initializes Remotion Player
   - VideoTimeline displays tracks and keyframes
   - TimelineRuler calculates tick positions correctly

2. **State Management**
   - StudioContext actions update state correctly
   - State changes trigger re-renders
   - State persists across component unmounts

3. **Utility Functions**
   - Time formatting functions handle edge cases
   - Aspect ratio calculations return correct dimensions
   - Keyframe positioning calculations are accurate

4. **API Routes**
   - CRUD operations for projects, tracks, keyframes
   - Error handling for invalid inputs
   - Authorization checks

### Property-Based Testing

Property-based tests will verify universal properties across many inputs using **fast-check** (JavaScript/TypeScript property testing library):

- Each property-based test should run a minimum of 100 iterations
- Each test must be tagged with a comment referencing the correctness property from this design document
- Tag format: `// Feature: video-editor-center-panel, Property {number}: {property_text}`
- Each correctness property should be implemented by a SINGLE property-based test

**Property Test Examples:**

```typescript
// Feature: video-editor-center-panel, Property 2: Media addition creates keyframes
test('adding any media creates corresponding keyframe', () => {
  fc.assert(
    fc.property(
      fc.record({
        id: fc.uuid(),
        type: fc.constantFrom('image', 'video', 'music', 'voiceover'),
        url: fc.webUrl(),
      }),
      (media) => {
        const result = addMediaToTimeline(media);
        expect(result.keyframes).toContainEqual(
          expect.objectContaining({
            data: expect.objectContaining({
              mediaId: media.id,
              type: media.type,
            }),
          })
        );
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: video-editor-center-panel, Property 9: Time formatting adapts to scale
test('time formatting uses correct units', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 0, max: 86400 }), // 0 to 24 hours
      (seconds) => {
        const formatted = formatTime(seconds);
        if (seconds < 1) {
          expect(formatted).toMatch(/\d+ms/);
        } else if (seconds < 60) {
          expect(formatted).toMatch(/\d+(\.\d+)?s/);
        } else if (seconds < 3600) {
          expect(formatted).toMatch(/\d+(\.\d+)?m/);
        } else {
          expect(formatted).toMatch(/\d+(\.\d+)?h/);
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests will verify component interactions:

1. **Timeline to Player Integration**
   - Adding keyframes updates player composition
   - Seeking in timeline updates player position
   - Player events update timeline UI

2. **Context to Component Integration**
   - Context state changes trigger component updates
   - Component actions update context state
   - Multiple components stay synchronized

3. **API to Database Integration**
   - API routes correctly interact with Prisma
   - Database constraints are enforced
   - Transactions maintain data integrity

### Testing Tools

- **Jest**: Unit and integration testing framework
- **React Testing Library**: Component testing
- **fast-check**: Property-based testing library
- **MSW (Mock Service Worker)**: API mocking for tests
- **Prisma Test Environment**: Database testing

## Implementation Notes

### Phase 1: Foundation
1. Install dependencies (Remotion, fast-check)
2. Extend StudioContext with VideoEditorState
3. Create database schema and migrations
4. Set up API routes

### Phase 2: Core Components
1. Implement VideoEditorView
2. Port TimelineRuler from videosos
3. Port VideoTrackRow from videosos
4. Implement VideoPreview with Remotion Player

### Phase 3: Timeline Functionality
1. Implement drag-and-drop for media
2. Implement timeline controls (zoom, seek)
3. Implement keyframe manipulation
4. Add track management

### Phase 4: Export & Polish
1. Implement export functionality
2. Add error handling
3. Optimize performance
4. Write tests

### Dependency Management

```json
{
  "dependencies": {
    "@remotion/player": "^4.0.0",
    "@remotion/preload": "^4.0.0",
    "remotion": "^4.0.0",
    "throttle-debounce": "^5.0.0"
  },
  "devDependencies": {
    "fast-check": "^3.15.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "msw": "^2.0.0"
  }
}
```

### Style Integration

videosos uses Tailwind CSS, which is compatible with enguistudio. Key considerations:

1. **CSS Variables**: Ensure enguistudio's CSS variables are defined for videosos components
2. **Class Conflicts**: Use `cn()` utility to merge classes safely
3. **Theme Consistency**: Map videosos color tokens to enguistudio theme

```typescript
// Example: Adapting videosos component styles
import { cn } from '@/lib/utils';

// videosos original
<div className="bg-background-dark border-border">

// Adapted for enguistudio
<div className={cn("bg-background border-border", props.className)}>
```

### Performance Considerations

1. **Lazy Loading**: Load Remotion Player only when video editor is active
2. **Memoization**: Use React.memo for expensive components
3. **Virtual Scrolling**: Consider virtualizing long track lists
4. **Debouncing**: Debounce timeline updates during playback
5. **Web Workers**: Offload heavy computations (if needed)

### Accessibility

1. **Keyboard Navigation**: Support arrow keys for timeline navigation
2. **ARIA Labels**: Add proper labels to interactive elements
3. **Focus Management**: Maintain focus when switching between components
4. **Screen Reader Support**: Announce state changes

### Browser Compatibility

- Target: Modern browsers (Chrome, Firefox, Safari, Edge)
- Remotion requires: ES2020+ features
- Fallback: Display message for unsupported browsers
