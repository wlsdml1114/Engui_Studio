# Implementation Plan

- [x] 1. Update database schema for media input storage
  - Add imageInputPath, videoInputPath, audioInputPath fields to Job model in Prisma schema
  - Create and run database migration
  - Run `prisma generate` to update TypeScript types
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 1.1 Write property test for media path storage
  - **Property 4: Media path storage**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 2. Enhance job creation to store media input paths
  - [x] 2.1 Update file upload handling to return file paths
    - Modify S3 upload service to return both URL and local path
    - Update local file upload to return file path
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Update generate API route to store media paths
    - Extract media file paths from request
    - Store paths in job options JSON
    - Update job creation payload to include media paths
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.3 Write unit tests for job creation with media paths
    - Test that image paths are stored correctly
    - Test that video paths are stored correctly
    - Test that audio paths are stored correctly
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Implement complete input reuse in StudioContext
  - [x] 3.1 Enhance reuseJobInput to fetch full job details
    - Fetch job from API including options field
    - Parse options JSON safely with error handling
    - Extract all input parameters including media paths
    - _Requirements: 1.1, 4.1_

  - [x] 3.2 Dispatch custom event with complete job data
    - Include modelId, prompt, type, and all options
    - Include media input paths (imageInputPath, videoInputPath, audioInputPath)
    - Add error handling for event dispatch failures
    - _Requirements: 4.1, 4.4_

  - [x] 3.3 Write property test for event dispatching
    - **Property 5: Event dispatching**
    - **Validates: Requirements 4.1**

  - [x] 3.4 Write property test for error handling
    - **Property 7: Error handling**
    - **Validates: Requirements 4.4**

- [x] 4. Implement form event handling for input reuse
  - [x] 4.1 Add event listener in ImageGenerationForm
    - Register listener for 'reuseJobInput' event on mount
    - Clean up listener on unmount
    - _Requirements: 1.1, 4.2_

  - [x] 4.2 Add event listener in VideoGenerationForm
    - Register listener for 'reuseJobInput' event on mount
    - Clean up listener on unmount
    - _Requirements: 1.1, 4.2_

  - [x] 4.3 Implement input value application logic
    - Extract all input values from event detail
    - Update form state with text inputs (prompt, negative prompt, etc.)
    - Update form state with numeric inputs (width, height, steps, etc.)
    - Update form state with boolean inputs
    - Switch to correct model if different from current
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 4.4 Write property test for complete input restoration
    - **Property 1: Complete input restoration**
    - **Validates: Requirements 1.1, 1.3, 1.4**

  - [x] 4.5 Write property test for model switching
    - **Property 2: Model switching**
    - **Validates: Requirements 1.2**

- [x] 5. Implement media file loading
  - [x] 5.1 Create utility function to load file from path
    - Fetch file from server using path
    - Convert response to File object
    - Handle errors gracefully
    - _Requirements: 1.5, 4.3_

  - [x] 5.2 Implement async media file loading in forms
    - Load image files when imageInputPath is present
    - Load video files when videoInputPath is present
    - Load audio files when audioInputPath is present
    - Update file input state with loaded files
    - Show loading indicator during file loading
    - _Requirements: 1.5, 2.4, 2.5, 2.6, 4.3_

  - [x] 5.3 Write property test for media file loading
    - **Property 3: Media file loading**
    - **Validates: Requirements 1.5, 2.4, 2.5, 2.6**

  - [x] 5.4 Write property test for async file loading
    - **Property 6: Async file loading**
    - **Validates: Requirements 4.3**

- [x] 6. Implement conditional input handling
  - [x] 6.1 Store conditional input values in job options
    - Ensure all conditional inputs are included in options JSON
    - Test with models that have conditional inputs (e.g., qwen-image-edit)
    - _Requirements: 5.1_

  - [x] 6.2 Implement parent-first restoration order
    - Identify parent inputs from model configuration
    - Restore parent inputs before dependent inputs
    - Add delay or callback to ensure parent inputs are applied first
    - _Requirements: 5.2_

  - [x] 6.3 Implement conditional visibility logic
    - Check dependsOn conditions after parent inputs are restored
    - Make dependent inputs visible when conditions are met
    - Use existing isInputVisible helper function
    - _Requirements: 5.3_

  - [x] 6.4 Populate conditional inputs with original values
    - After dependent inputs become visible, populate with stored values
    - Skip inputs whose conditions are not met
    - _Requirements: 5.4, 5.5_

  - [x] 6.5 Write property test for conditional input storage
    - **Property 8: Conditional input storage**
    - **Validates: Requirements 5.1**

  - [x] 6.6 Write property test for parent-first restoration
    - **Property 9: Parent-first restoration order**
    - **Validates: Requirements 5.2**

  - [x] 6.7 Write property test for conditional visibility
    - **Property 10: Conditional visibility**
    - **Validates: Requirements 5.3**

  - [x] 6.8 Write property test for conditional value population
    - **Property 11: Conditional value population**
    - **Validates: Requirements 5.4**

  - [x] 6.9 Write property test for conditional skip logic
    - **Property 12: Conditional skip logic**
    - **Validates: Requirements 5.5**

- [x] 7. Add UI feedback and polish
  - [x] 7.1 Add loading state during file loading
    - Show spinner or progress indicator
    - Disable form submission during loading
    - _Requirements: 3.3_

  - [x] 7.2 Add success feedback after reuse completes
    - Show toast notification or subtle animation
    - Focus the generation form
    - _Requirements: 3.4_

  - [x] 7.3 Improve reuse button visibility
    - Ensure button is visible on hover
    - Add tooltip explaining the action
    - _Requirements: 3.1, 3.2_

  - [x] 7.4 Write unit tests for UI feedback
    - Test loading state is shown during file loading
    - Test success feedback is displayed
    - Test form receives focus after reuse
    - _Requirements: 3.3, 3.4_

- [-] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
