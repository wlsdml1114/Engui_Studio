# Implementation Plan

- [x] 1. Update database schema and create migration
  - Add resolution fields (aspectRatio, qualityPreset, width, height) to VideoProject model
  - Add audio fields (volume, muted) to VideoTrack model
  - Add media fitting and audio fields (fitMode, volume) to VideoKeyFrame model
  - Create Prisma migration for schema changes
  - Write migration script for existing projects and tracks
  - _Requirements: 13.1, 13.2, 13.3_

- [x] 2. Implement core utility functions
  - [x] 2.1 Create resolution calculation utility
    - Implement getResolutionConfig function
    - Support all aspect ratio and quality preset combinations
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  
  - [x] 2.2 Write property test for resolution calculation
    - **Property 1: Resolution calculation correctness**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**
  
  - [x] 2.3 Create media fitting utility
    - Implement fitMedia function with contain, cover, fill modes
    - Calculate position and scale for each mode
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 4.3, 4.4_
  
  - [x] 2.4 Write property test for contain fit mode
    - **Property 5: Contain fit mode preserves aspect ratio**
    - **Validates: Requirements 3.3, 4.2**
  
  - [x] 2.5 Write property test for cover fit mode
    - **Property 7: Cover fit mode fills canvas**
    - **Validates: Requirements 4.3**
  
  - [x] 2.6 Write property test for fill fit mode
    - **Property 8: Fill fit mode matches canvas exactly**
    - **Validates: Requirements 4.4**
  
  - [x] 2.7 Create audio mixing utility
    - Implement calculateFinalVolume function
    - Implement volumeToGain conversion function
    - Handle track mute and keyframe volume
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 6.5, 7.3, 7.4_
  
  - [x] 2.8 Write property test for final volume calculation
    - **Property 14: Final volume calculation**
    - **Validates: Requirements 7.3, 7.4**
  
  - [x] 2.9 Write property test for muted tracks
    - **Property 12: Muted tracks produce zero volume**
    - **Validates: Requirements 6.5**

- [x] 3. Update API routes for resolution and audio settings
  - [x] 3.1 Update video-projects API
    - Modify PATCH /api/video-projects/[id] to accept resolution fields
    - Add validation for aspectRatio and qualityPreset
    - Update project resolution and recalculate dimensions
    - _Requirements: 2.3, 8.1, 8.2, 8.3_
  
  - [x] 3.2 Write property test for project resolution update
    - **Property 2: Project resolution update**
    - **Validates: Requirements 2.3**
  
  - [x] 3.3 Update video-tracks API
    - Modify PATCH /api/video-tracks/[id] to accept volume and muted fields
    - Add validation for volume range (0-200)
    - _Requirements: 5.2, 5.6, 6.2, 6.4_
  
  - [x] 3.4 Write property test for track volume range
    - **Property 9: Track volume range validation**
    - **Validates: Requirements 5.2**
  
  - [x] 3.5 Update video-keyframes API
    - Modify PATCH /api/video-keyframes/[id] to accept fitMode and volume fields
    - Add validation for fitMode enum
    - Add validation for volume range
    - _Requirements: 4.2, 4.3, 4.4, 7.2, 7.5_
  
  - [x] 3.6 Write property test for keyframe volume isolation
    - **Property 13: Keyframe volume isolation**
    - **Validates: Requirements 7.2**

- [x] 4. Implement ProjectSelector component
  - [x] 4.1 Create ProjectSelector component
    - Display current project in dropdown trigger
    - Show project list with metadata (name, resolution, date)
    - Add "New Project" option
    - Add delete button for each project
    - _Requirements: 10.2, 11.4_
  
  - [x] 4.2 Write property test for project list completeness
    - **Property 22: Project list completeness**
    - **Validates: Requirements 10.2**
  
  - [x] 4.3 Implement project deletion with confirmation
    - Show confirmation dialog before delete
    - Delete project and cascade to tracks/keyframes
    - Update project list after deletion
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [x] 4.4 Write property test for cascade deletion
    - **Property 27: Project cascade deletion**
    - **Validates: Requirements 12.2, 12.3**
  
  - [x] 4.5 Write property test for project list update after deletion
    - **Property 28: Project list update after deletion**
    - **Validates: Requirements 12.4**

- [x] 5. Implement ProjectSettingsDialog component
  - [x] 5.1 Create ProjectSettingsDialog component
    - Add project name and description fields
    - Add aspect ratio selector (16:9, 9:16)
    - Add quality preset selector (480p, 720p, 1080p)
    - Display calculated resolution preview
    - Show warning when resolution changes
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 8.1, 8.2, 8.3, 8.4, 11.2_
  
  - [x] 5.2 Implement resolution change confirmation
    - Detect when resolution settings change
    - Show confirmation dialog with warning
    - Update project and re-fit all keyframes on confirm
    - _Requirements: 2.2, 2.3, 2.4, 2.5_
  
  - [x] 5.3 Write property test for keyframe re-fitting
    - **Property 3: Keyframe re-fitting on resolution change**
    - **Validates: Requirements 2.4**
  
  - [x] 5.4 Implement project name and description editing
    - Save changes to database
    - Generate default name if empty
    - _Requirements: 11.1, 11.2, 11.3, 11.5_
  
  - [x] 5.5 Write property test for project name persistence
    - **Property 25: Project name change persistence**
    - **Validates: Requirements 11.3**
  
  - [x] 5.6 Write property test for default name generation
    - **Property 26: Default project name generation**
    - **Validates: Requirements 11.5**

- [x] 6. Implement TrackVolumeControl component
  - [x] 6.1 Create TrackVolumeControl component
    - Add volume slider (0-200%)
    - Add mute toggle button
    - Display current volume percentage
    - Disable slider when muted
    - Only show for audio tracks (music, voiceover)
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4_
  
  - [x] 6.2 Write property test for mute toggle
    - **Property 11: Mute button toggles track muted state**
    - **Validates: Requirements 6.2, 6.4**
  
  - [x] 6.3 Integrate with VideoTrackRow
    - Update VideoTrackRow to include TrackVolumeControl
    - Save volume changes to database via API
    - _Requirements: 5.6_
  
  - [x] 6.4 Write property test for volume persistence
    - **Property 10: Volume changes persist**
    - **Validates: Requirements 5.6**

- [x] 7. Implement KeyframeVolumeControl component
  - [x] 7.1 Create KeyframeVolumeControl component
    - Add volume slider for keyframe
    - Add toggle for custom vs track volume
    - Display final calculated volume
    - Only show for audio keyframes
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 7.2 Integrate with keyframe selection UI
    - Show KeyframeVolumeControl when audio keyframe is selected
    - Save keyframe volume changes to database
    - _Requirements: 7.5_
  
  - [x] 7.3 Write property test for keyframe volume persistence
    - **Property 15: Keyframe volume persistence**
    - **Validates: Requirements 7.5**

- [x] 8. Implement KeyframeFitSelector component
  - [x] 8.1 Create KeyframeFitSelector component
    - Add buttons for contain, cover, fill modes
    - Display description of each mode
    - Only show for image/video keyframes
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 8.2 Integrate with keyframe selection UI
    - Show KeyframeFitSelector when image/video keyframe is selected
    - Save fit mode changes to database
    - Update preview immediately on change
    - _Requirements: 4.5_

- [x] 9. Update VideoPreview component for resolution
  - [x] 9.1 Modify VideoPreview to use project resolution
    - Get width and height from project settings
    - Pass to Remotion Player compositionWidth/Height
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  
  - [x] 9.2 Update VideoComposition to apply media fitting
    - Use fitMedia utility for each keyframe
    - Apply fit mode from keyframe settings
    - Scale and position media correctly
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 4.3, 4.4_
  
  - [x] 9.3 Write property test for media scaling
    - **Property 4: Media scaling to project resolution**
    - **Validates: Requirements 3.1, 3.2**
  
  - [x] 9.4 Write property test for media upscaling and downscaling
    - **Property 6: Media upscaling and downscaling**
    - **Validates: Requirements 3.4, 3.5**

- [x] 10. Update VideoComposition for audio mixing
  - [x] 10.1 Apply track volume to audio tracks
    - Get volume from track settings
    - Apply to Remotion Audio component
    - _Requirements: 5.2, 5.3, 5.4, 5.5_
  
  - [x] 10.2 Apply keyframe volume to audio keyframes
    - Calculate final volume using track and keyframe volumes
    - Apply to individual audio keyframes
    - _Requirements: 7.3, 7.4_
  
  - [x] 10.3 Handle muted tracks
    - Set volume to 0 for muted tracks
    - _Requirements: 6.5_

- [x] 11. Update export functionality
  - [x] 11.1 Use project resolution in export
    - Pass project width and height to Remotion render
    - _Requirements: 9.1_
  
  - [x] 11.2 Write property test for export resolution
    - **Property 16: Export uses project resolution**
    - **Validates: Requirements 9.1**
  
  - [x] 11.3 Apply all audio settings in export
    - Include track volume in export
    - Include keyframe volume in export
    - Exclude muted tracks from export
    - _Requirements: 9.2, 9.3, 9.4_
  
  - [x] 11.4 Write property test for export track volume
    - **Property 17: Export reflects track volume**
    - **Validates: Requirements 9.2**
  
  - [x] 11.5 Write property test for export keyframe volume
    - **Property 18: Export reflects keyframe volume**
    - **Validates: Requirements 9.3**
  
  - [x] 11.6 Write property test for export muted tracks
    - **Property 19: Export excludes muted tracks**
    - **Validates: Requirements 9.4**
  
  - [x] 11.7 Apply fit mode in export
    - Use keyframe fit mode settings in export render
    - _Requirements: 9.5_
  
  - [x] 11.8 Write property test for export fit mode
    - **Property 20: Export reflects fit mode**
    - **Validates: Requirements 9.5**

- [x] 12. Implement project management in StudioContext
  - [x] 12.1 Add project CRUD operations to context
    - Implement createProject action
    - Implement loadProject action
    - Implement updateProject action
    - Implement deleteProject action
    - _Requirements: 10.1, 10.3, 10.5, 12.2_
  
  - [x] 12.2 Write property test for project creation persistence
    - **Property 21: Project creation persistence**
    - **Validates: Requirements 10.1**
  
  - [x] 12.3 Write property test for project load restoration
    - **Property 23: Project load restoration**
    - **Validates: Requirements 10.3, 10.4**
  
  - [x] 12.2 Implement auto-save functionality
    - Debounce project updates
    - Save changes automatically after modifications
    - Handle save failures gracefully
    - _Requirements: 10.5_
  
  - [x] 12.5 Write property test for auto-save
    - **Property 24: Project auto-save**
    - **Validates: Requirements 10.5**

- [x] 13. Integrate components into VideoEditorView
  - [x] 13.1 Add ProjectSelector to VideoEditorHeader
    - Place ProjectSelector in header
    - Handle project selection
    - Handle new project creation
    - _Requirements: 10.2, 11.1_
  
  - [x] 13.2 Add ProjectSettingsDialog to VideoEditorHeader
    - Add settings button to header
    - Open dialog on button click
    - _Requirements: 2.1, 8.5_
  
  - [x] 13.3 Update VideoTimeline to show volume controls
    - Display TrackVolumeControl for each audio track
    - Display KeyframeVolumeControl when audio keyframe selected
    - Display KeyframeFitSelector when image/video keyframe selected
    - _Requirements: 5.1, 6.1, 7.1, 4.1_

- [x] 14. Write persistence property tests
  - [x] 14.1 Write property test for resolution settings persistence
    - **Property 29: Resolution settings persistence**
    - **Validates: Requirements 13.1**
  
  - [x] 14.2 Write property test for track volume persistence
    - **Property 30: Track volume persistence**
    - **Validates: Requirements 13.2**
  
  - [x] 14.3 Write property test for keyframe settings persistence
    - **Property 31: Keyframe settings persistence**
    - **Validates: Requirements 13.3**
  
  - [x] 14.4 Write property test for immediate persistence
    - **Property 32: Settings immediate persistence**
    - **Validates: Requirements 13.4**
  
  - [x] 14.5 Write property test for round-trip consistency
    - **Property 33: Settings round-trip consistency**
    - **Validates: Requirements 13.5**

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Add error handling and validation
  - [x] 16.1 Add client-side validation
    - Validate resolution configuration
    - Validate volume range (0-200)
    - Validate fit mode enum
    - Display user-friendly error messages
  
  - [x] 16.2 Add server-side validation
    - Validate aspect ratio and quality preset enums
    - Validate volume ranges in API routes
    - Handle database constraint violations
    - Return standardized error responses
  
  - [x] 16.3 Add error handling for edge cases
    - Handle media dimensions unavailable
    - Handle project load failures
    - Handle auto-save failures
    - Provide retry mechanisms

- [x] 17. Performance optimization
  - [x] 17.1 Implement auto-save debouncing
    - Debounce project updates to avoid excessive writes
    - Use 500ms debounce delay
  
  - [x] 17.2 Optimize media fitting calculations
    - Memoize fitMedia results
    - Cache calculations for unchanged inputs
  
  - [x] 17.3 Optimize volume calculations
    - Cache final volume calculations
    - Recalculate only when inputs change

- [-] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
