# Implementation Plan

- [x] 1. Extend ModelParameter interface and add validation types
  - [x] 1.1 Add `dependsOn` field to ModelParameter interface for conditional visibility
    - Add `dependsOn?: { parameter: string; value: any }` to the interface
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 1.2 Add `validation` field to ModelParameter interface
    - Add `validation?: { multipleOf?: number; required?: boolean }` to the interface
    - _Requirements: 4.3_
  - [x] 1.3 Add ValidationResult interface and validateParameter function
    - Create `ValidationResult` interface with `valid: boolean` and `error?: string`
    - Implement `validateParameter(param: ModelParameter, value: any): ValidationResult`
    - Handle range validation (min/max), select validation (options), and multipleOf validation
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 1.4 Write property test for range validation
    - **Property 3: Range Validation Correctness**
    - **Validates: Requirements 4.1, 4.4**
  - [x] 1.5 Write property test for select validation
    - **Property 4: Select Validation Correctness**
    - **Validates: Requirements 4.2, 4.4**
  - [x] 1.6 Write property test for dimension multiple validation
    - **Property 5: Dimension Multiple Validation**
    - **Validates: Requirements 4.3, 4.4**

- [x] 2. Update Qwen Image Edit model configuration
  - [x] 2.1 Update parameters array with complete settings from API route
    - Add width (default: 512, min: 256, max: 1024, step: 64, group: basic)
    - Add height (default: 512, min: 256, max: 1024, step: 64, group: basic)
    - Add seed (default: -1, group: advanced)
    - Add steps (default: 4, min: 1, max: 50, group: advanced)
    - Add guidance (default: 1, min: 1, max: 20, step: 0.5, group: advanced)
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.2 Verify inputs array is ['text', 'image']
    - _Requirements: 1.4_

- [x] 3. Update Infinite Talk model configuration
  - [x] 3.1 Update parameters array with complete settings from API route
    - Add input_type (select: ['image', 'video'], default: 'image', group: basic)
    - Add person_count (select: ['single', 'multi'], default: 'single', group: basic)
    - Update width (default: 640, group: basic)
    - Update height (default: 640, group: basic)
    - Add audio_start (string, default: '', group: advanced)
    - Add audio_end (string, default: '', group: advanced)
    - Add audio2_start with dependsOn: { parameter: 'person_count', value: 'multi' }
    - Add audio2_end with dependsOn: { parameter: 'person_count', value: 'multi' }
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 3.2 Verify inputs array is ['image', 'video', 'audio']
    - _Requirements: 2.4_

- [x] 4. Update WAN Animate model configuration
  - [x] 4.1 Update parameters array with complete settings from API route
    - Verify mode (select: ['replace', 'animate'], default: 'replace', group: basic)
    - Verify width (default: 512, validation: { multipleOf: 64 }, group: basic)
    - Verify height (default: 512, validation: { multipleOf: 64 }, group: basic)
    - Verify steps (default: 4, group: advanced)
    - Verify cfg (default: 1.0, group: advanced)
    - Verify seed (default: -1, group: advanced)
    - Verify fps (default: 30, group: advanced)
    - Add points_store with dependsOn: { parameter: 'mode', value: 'animate' }, group: hidden
    - Add coordinates with dependsOn: { parameter: 'mode', value: 'animate' }, group: hidden
    - Add neg_coordinates with dependsOn: { parameter: 'mode', value: 'animate' }, group: hidden
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 4.2 Verify inputs array is ['image', 'video', 'text']
    - _Requirements: 3.4_

- [x] 5. Implement getVisibleParameters helper function
  - [x] 5.1 Create getVisibleParameters function
    - Takes modelId and currentValues as parameters
    - Returns filtered parameters based on dependsOn conditions
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 5.2 Write property test for conditional parameter visibility
    - **Property 6: Conditional Parameter Visibility**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 6. Add validateModelInputs function
  - [x] 6.1 Implement validateModelInputs function
    - Takes modelId and inputs record
    - Returns array of ValidationResult for all parameters
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Write property tests for model configuration completeness
  - [x] 8.1 Write property test for model configuration completeness
    - **Property 1: Model Configuration Completeness**
    - **Validates: Requirements 1.1, 2.1, 3.1**
  - [x] 8.2 Write property test for parameter group assignment validity
    - **Property 2: Parameter Group Assignment Validity**
    - **Validates: Requirements 1.3, 2.3, 3.3**

- [x] 9. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
