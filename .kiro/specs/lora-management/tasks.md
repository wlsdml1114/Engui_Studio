# Implementation Plan: LoRA Management System

- [x] 1. Set up database schema and migrations
  - Create Prisma schema for LoRA model with workspace association
  - Generate and run database migration
  - Add indexes for performance (workspaceId, uploadedAt)
  - _Requirements: 1.3, 6.4_

- [x] 1.1 Write property test for database schema
  - **Property 11: Workspace association**
  - **Validates: Requirements 6.4**

- [x] 2. Create backend API routes for LoRA management
  - Implement GET /api/lora route to fetch all LoRAs for workspace
  - Implement POST /api/lora/upload route with file validation
  - Implement DELETE /api/lora/[id] route with S3 cleanup
  - Add error handling and logging
  - _Requirements: 1.3, 2.1, 3.2_

- [x] 2.1 Implement file validation utilities
  - Create validateLoRAFile function (extension and size checks)
  - Add client-side validation helper
  - Add server-side validation with detailed error messages
  - _Requirements: 1.2, 6.1, 6.2_

- [x] 2.2 Write property tests for file validation
  - **Property 1: File extension validation**
  - **Property 2: File size validation**
  - **Validates: Requirements 1.2, 6.1, 6.2**

- [x] 2.3 Implement S3 upload with database transaction
  - Use existing S3Service for file upload
  - Create database record after successful S3 upload
  - Implement rollback: delete S3 file if database save fails
  - _Requirements: 1.3_

- [x] 2.4 Write property test for upload flow
  - **Property 3: Upload creates both S3 file and database record**
  - **Validates: Requirements 1.3**

- [x] 2.5 Implement S3 deletion with database cleanup
  - Delete S3 file using S3Service
  - Delete database record
  - Handle partial failures gracefully
  - _Requirements: 3.2_

- [x] 2.6 Write property test for deletion flow
  - **Property 6: Deletion removes from both S3 and database**
  - **Validates: Requirements 3.2**

- [x] 3. Create LoRA Management Dialog component
  - Create LoRAManagementDialog.tsx with shadcn/ui Dialog
  - Implement file upload section with drag & drop
  - Implement upload progress indicator
  - Add LoRA list display with grid layout
  - Add delete confirmation dialog
  - _Requirements: 1.1, 1.4, 2.1, 3.1, 3.3_

- [x] 3.1 Implement LoRA list fetching and display
  - Fetch LoRAs from API on dialog open
  - Display LoRA cards with metadata (name, size, date)
  - Handle empty state with message
  - Add loading state
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 3.2 Write property test for LoRA list display
  - **Property 4: LoRA list displays all uploaded files**
  - **Validates: Requirements 2.1, 2.4**

- [x] 3.3 Implement LoRA upload in dialog
  - Handle file selection and drag & drop
  - Validate file before upload
  - Show upload progress
  - Display success/error messages
  - Refresh LoRA list after upload
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 3.4 Implement LoRA deletion in dialog
  - Add delete button to LoRA cards
  - Show confirmation dialog
  - Call delete API
  - Update list and show feedback
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3.5 Write unit tests for dialog interactions
  - Test file upload flow
  - Test delete confirmation flow
  - Test empty state rendering
  - Test error handling

- [x] 4. Create LoRA Selector component
  - Create LoRASelector.tsx component
  - Implement visual card display for selected LoRA
  - Implement searchable dropdown with LoRA previews
  - Add Change, Clear, Manage buttons
  - Add empty state with Select button
  - _Requirements: 4.1, 4.2, 4.3, 5.2_

- [x] 4.1 Implement dropdown with search and recent LoRAs
  - Create dropdown UI with search input
  - Filter LoRAs based on search query
  - Show recent LoRAs section (based on lastUsed)
  - Display LoRA metadata in dropdown items
  - Handle keyboard navigation
  - _Requirements: 4.2_

- [x] 4.2 Write property test for LoRA selector
  - **Property 7: LoRA selection populates all available LoRAs**
  - **Property 8: Form state updates with LoRA selection**
  - **Validates: Requirements 4.2, 4.3**

- [x] 5. Update model configuration for LoRA support
  - Add 'lora-selector' to ModelParameterType
  - Add lora_high and lora_low parameters to wan22 model config
  - Update flux-krea lora parameter to use 'lora-selector' type
  - Update TypeScript types
  - _Requirements: 4.1_

- [x] 5.1 Write unit tests for model config changes
  - Test parameter type validation
  - Test model config retrieval

- [x] 6. Integrate LoRA Selector into VideoGenerationForm
  - Add state for LoRA dialog visibility
  - Add state for available LoRAs list
  - Fetch LoRAs when model has lora-selector parameters
  - Add custom rendering for lora-selector parameter type
  - Pass LoRA S3 path to form submission
  - _Requirements: 4.3, 4.4, 5.3_

- [x] 6.1 Implement LoRA fetching in form
  - Fetch LoRAs on component mount
  - Refresh LoRAs when dialog closes
  - Handle loading and error states
  - _Requirements: 2.3, 5.3_

- [x] 6.2 Write property test for form integration
  - **Property 9: Generation request includes LoRA path**
  - **Property 10: New LoRA upload updates selection list**
  - **Validates: Requirements 4.4, 5.3**

- [x] 6.3 Update form submission to include LoRA paths
  - Include lora_high and lora_low in form data
  - Handle optional LoRA (empty string if not selected)
  - Ensure backward compatibility for models without LoRA
  - _Requirements: 4.4, 4.5_

- [x] 7. Add LoRA management button to form
  - Add "Manage LoRAs" button in LoRASelector
  - Connect button to open LoRA dialog
  - Ensure dialog opens and closes properly
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 7.1 Write unit tests for dialog integration
  - Test dialog open/close
  - Test focus management
  - Test LoRA list refresh after upload

- [x] 8. Implement presigned URL generation for S3
  - Add presigned URL generation to S3Service (if not exists)
  - Set appropriate expiration time (1 hour)
  - Use presigned URLs for LoRA access in generation
  - _Requirements: 6.5_

- [x] 8.1 Write property test for presigned URLs
  - **Property 12: Presigned URL expiration**
  - **Validates: Requirements 6.5**

- [x] 9. Add styling and responsive design
  - Style LoRA Management Dialog with Tailwind
  - Style LoRA Selector component
  - Ensure responsive grid layout (1-3 columns)
  - Add hover effects and transitions
  - Test on mobile, tablet, and desktop
  - _Requirements: All UI requirements_

- [x] 9.1 Write unit tests for responsive behavior
  - Test grid layout at different breakpoints
  - Test touch interactions on mobile

- [x] 10. Fix failing tests
  - Fix LoRAManagementDialog test failures (14 tests failing)
  - Fix API route error handling tests (7 tests failing)
  - Ensure all property-based tests pass consistently
  - _Requirements: All requirements_

- [x] 11. Add error handling and user feedback
  - Add toast notifications for success/error
  - Add loading states throughout
  - Add helpful error messages
  - Add retry logic for transient errors
  - _Requirements: 1.4, 1.5, 3.3, 3.4_

- [x] 11.1 Write unit tests for error scenarios
  - Test upload failure handling
  - Test deletion failure handling
  - Test network error handling

- [-] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
