# Implementation Plan

- [x] 1. Set up project dependencies and database schema
  - Install Remotion, fast-check, and related dependencies
  - Create Prisma schema for VideoProject, VideoTrack, VideoKeyFrame models
  - Run database migrations
  - _Requirements: 8.4_

- [x] 2. Extend StudioContext with video editor state
  - [x] 2.1 Define VideoEditorState interface in StudioContext
    - Add VideoProject, VideoTrack, VideoKeyFrame type definitions
    - Define state properties (currentProject, tracks, keyframes, player, etc.)
    - Define action methods (createProject, addTrack, addKeyframe, etc.)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 2.2 Write property test for context state synchronization
    - **Property 24: Editor initialization stores project state**
    - **Validates: Requirements 7.1**
  
  - [x] 2.3 Write property test for track changes
    - **Property 25: Track changes sync to context**
    - **Validates: Requirements 7.2**
  
  - [x] 2.4 Write property test for playback state sync
    - **Property 26: Playback state syncs to context**
    - **Validates: Requirements 7.3**
  
  - [x] 2.5 Write property test for timestamp sync
    - **Property 27: Timestamp syncs to context**
    - **Validates: Requirements 7.4**
  
  - [x] 2.6 Write property test for context propagation
    - **Property 28: Context changes propagate to subscribers**
    - **Validates: Requirements 7.5**

- [x] 3. Create API routes for video projects
  - [x] 3.1 Implement /api/video-projects routes
    - Create GET route for listing projects
    - Create POST route for creating projects
    - Create GET /api/video-projects/[id] for fetching single project
    - Create PATCH /api/video-projects/[id] for updating projects
    - Create DELETE /api/video-projects/[id] for deleting projects
    - _Requirements: 7.1_
  
  - [x] 3.2 Write unit tests for project API routes
    - Test CRUD operations
    - Test error handling for invalid inputs
    - Test database constraints
    - _Requirements: 7.1_

- [x] 4. Create API routes for tracks and keyframes
  - [x] 4.1 Implement /api/video-tracks routes
    - Create POST route for creating tracks
    - Create DELETE /api/video-tracks/[id] for deleting tracks
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 4.2 Implement /api/video-keyframes routes
    - Create POST route for creating keyframes
    - Create PATCH /api/video-keyframes/[id] for updating keyframes
    - Create DELETE /api/video-keyframes/[id] for deleting keyframes
    - _Requirements: 1.3_
  
  - [x] 4.3 Write unit tests for track and keyframe API routes
    - Test track creation for different media types
    - Test keyframe CRUD operations
    - Test cascade deletes
    - _Requirements: 3.1, 3.2, 3.3, 1.3_

- [x] 5. Port TimelineRuler component from videosos
  - [x] 5.1 Copy TimelineRuler component
    - Copy videosos/src/components/video/timeline.tsx to src/components/video-editor/TimelineRuler.tsx
    - Adapt imports to use enguistudio's utilities
    - Apply enguistudio's Tailwind theme classes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2_
  
  - [x] 5.2 Write property test for ruler rendering
    - **Property 5: Timeline renders ruler component**
    - **Validates: Requirements 2.1**
  
  - [x] 5.3 Write property test for tick spacing
    - **Property 6: Ruler tick spacing adapts to duration**
    - **Validates: Requirements 2.2**
  
  - [x] 5.4 Write property test for zoom adjustment
    - **Property 7: Zoom adjusts tick intervals**
    - **Validates: Requirements 2.3**
  
  - [x] 5.5 Write property test for tick labels
    - **Property 8: Major ticks have labels**
    - **Validates: Requirements 2.4**
  
  - [x] 5.6 Write property test for time formatting
    - **Property 9: Time formatting adapts to scale**
    - **Validates: Requirements 2.5**

- [x] 6. Port VideoTrackRow component from videosos
  - [x] 6.1 Copy VideoTrackRow component
    - Copy videosos/src/components/video/track.tsx to src/components/video-editor/VideoTrackRow.tsx
    - Adapt to use enguistudio's state management
    - Apply enguistudio's styling
    - _Requirements: 3.4, 3.5, 8.1, 8.2_
  
  - [x] 6.2 Write property test for track visual distinction
    - **Property 13: Track types have distinct visual styles**
    - **Validates: Requirements 3.4**
  
  - [x] 6.3 Write property test for track sorting
    - **Property 14: Tracks are sorted by type**
    - **Validates: Requirements 3.5**

- [x] 7. Implement VideoComposition for Remotion
  - [x] 7.1 Create VideoComposition component
    - Define Remotion Composition with project props
    - Implement MainComposition to render tracks
    - Implement VideoTrackSequence for video/image rendering
    - Implement AudioTrackSequence for audio rendering
    - Handle aspect ratio and duration
    - _Requirements: 1.4, 4.2, 5.1_
  
  - [x] 7.2 Write property test for chronological playback
    - **Property 3: Timeline playback respects chronological order**
    - **Validates: Requirements 1.4**
  
  - [x] 7.3 Write property test for composition updates
    - **Property 16: Player reflects timeline changes**
    - **Validates: Requirements 4.2**

- [x] 8. Implement VideoPreview component
  - [x] 8.1 Create VideoPreview component
    - Initialize Remotion Player with VideoComposition
    - Handle player events (play, pause, frameupdate, seeked)
    - Update StudioContext with player state and timestamp
    - Implement aspect ratio responsive sizing
    - Preload media for performance
    - _Requirements: 1.5, 4.1, 4.3, 4.4, 4.5, 5.1_
  
  - [x] 8.2 Write property test for player initialization
    - **Property 15: Player initializes on editor load**
    - **Validates: Requirements 4.1**
  
  - [x] 8.3 Write property test for play button
    - **Property 4: Play button changes player state**
    - **Validates: Requirements 1.5**
  
  - [x] 8.4 Write property test for seek functionality
    - **Property 17: Seek updates displayed frame**
    - **Validates: Requirements 4.3**
  
  - [x] 8.5 Write property test for timestamp updates
    - **Property 18: Playback updates context timestamp**
    - **Validates: Requirements 4.4**

- [x] 9. Implement VideoTimeline component
  - [x] 9.1 Create VideoTimeline component
    - Render TimelineRuler at the top
    - Render VideoTrackRow for each track
    - Implement timeline click to seek
    - Implement drag-and-drop for adding media
    - Handle zoom controls
    - Display current playback position indicator
    - _Requirements: 1.2, 1.3, 2.1_
  
  - [x] 9.2 Write property test for media addition
    - **Property 2: Media addition creates keyframes**
    - **Validates: Requirements 1.3**
  
  - [x] 9.3 Write property test for video track creation
    - **Property 10: Video media creates video track**
    - **Validates: Requirements 3.1**
  
  - [x] 9.4 Write property test for image placement
    - **Property 11: Image media uses video track**
    - **Validates: Requirements 3.2**
  
  - [x] 9.5 Write property test for audio track creation
    - **Property 12: Audio media creates appropriate track**
    - **Validates: Requirements 3.3**

- [x] 10. Implement TimelineControls component
  - [x] 10.1 Create TimelineControls component
    - Display current time and total duration
    - Implement zoom slider and buttons
    - Implement play/pause controls
    - Handle keyboard shortcuts (arrow keys, +/-, space)
    - _Requirements: 1.5, 2.3_
  
  - [x] 10.2 Write unit tests for timeline controls
    - Test zoom controls update state
    - Test play/pause button functionality
    - Test keyboard shortcuts
    - _Requirements: 1.5, 2.3_

- [x] 11. Implement VideoEditorHeader component
  - [x] 11.1 Create VideoEditorHeader component
    - Display project title
    - Implement AspectRatioSelector dropdown
    - Implement Export button
    - Show playback controls
    - _Requirements: 5.1, 6.1_
  
  - [x] 11.2 Write property test for aspect ratio changes
    - **Property 19: Aspect ratio changes canvas dimensions**
    - **Validates: Requirements 5.1**
  
  - [x] 11.3 Write property test for export button
    - **Property 20: Export button opens dialog**
    - **Validates: Requirements 6.1**

- [x] 12. Implement VideoEditorView main component
  - [x] 12.1 Create VideoEditorView component
    - Compose VideoEditorHeader, VideoPreview, and VideoTimeline
    - Load project data on mount
    - Handle loading and error states
    - _Requirements: 1.1, 1.2_
  
  - [x] 12.2 Write property test for editor activation
    - **Property 1: Video editor activation displays correct interface**
    - **Validates: Requirements 1.1, 1.2**
  
  - [x] 12.3 Write property test for theme application
    - **Property 29: Components use enguistudio theme**
    - **Validates: Requirements 8.2**

- [x] 13. Integrate VideoEditorView into CenterPanel
  - [x] 13.1 Update CenterPanel component
    - Add conditional rendering for video editor mode
    - Pass activeArtifactId as projectId to VideoEditorView
    - Maintain existing default view for other modes
    - _Requirements: 1.1_
  
  - [x] 13.2 Write integration test for CenterPanel
    - Test switching between default view and video editor
    - Test that video editor receives correct props
    - _Requirements: 1.1_

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement ExportDialog component
  - [x] 15.1 Create ExportDialog component
    - Display export options (format, quality, resolution)
    - Show progress bar during rendering
    - Handle export completion with download button
    - Display error messages on failure
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 15.2 Write property test for export progress
    - **Property 21: Export shows progress**
    - **Validates: Requirements 6.3**
  
  - [x] 15.3 Write property test for export completion
    - **Property 22: Export completion shows download option**
    - **Validates: Requirements 6.4**
  
  - [x] 15.4 Write property test for export errors
    - **Property 23: Export errors display messages**
    - **Validates: Requirements 6.5**

- [x] 16. Implement video export API route
  - [x] 16.1 Create /api/video-export route
    - Accept project ID and export options
    - Use Remotion's server-side rendering
    - Stream progress updates
    - Return download URL on completion
    - Handle errors gracefully
    - _Requirements: 6.3, 6.4, 6.5_
  
  - [x] 16.2 Write unit tests for export API
    - Test successful export flow
    - Test error handling
    - Test progress updates
    - _Requirements: 6.3, 6.4, 6.5_

- [x] 17. Add error boundaries and error handling
  - [x] 17.1 Implement error boundaries
    - Create ErrorBoundary component for VideoEditorView
    - Add error fallback UI
    - Log errors for debugging
    - _Requirements: 6.5_
  
  - [x] 17.2 Add client-side error handling
    - Validate media formats before adding
    - Handle player initialization failures
    - Validate keyframe data
    - _Requirements: 6.5_
  
  - [x] 17.3 Write unit tests for error handling
    - Test error boundary catches errors
    - Test invalid media format handling
    - Test player initialization error handling
    - _Requirements: 6.5_

- [x] 18. Optimize performance
  - [x] 18.1 Implement performance optimizations
    - Add React.memo to expensive components
    - Implement debouncing for timeline updates
    - Add lazy loading for Remotion Player
    - Optimize re-renders with useMemo and useCallback
    - _Requirements: 4.5_
  
  - [x] 18.2 Write performance tests
    - Test that components don't re-render unnecessarily
    - Test that timeline updates are debounced
    - _Requirements: 4.5_

- [x] 19. Add accessibility features
  - [x] 19.1 Implement accessibility improvements
    - Add ARIA labels to interactive elements
    - Implement keyboard navigation for timeline
    - Add focus management
    - Test with screen readers
    - _Requirements: 1.5, 2.3_
  
  - [x] 19.2 Write accessibility tests
    - Test keyboard navigation works
    - Test ARIA labels are present
    - Test focus management
    - _Requirements: 1.5, 2.3_

- [x] 20. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
