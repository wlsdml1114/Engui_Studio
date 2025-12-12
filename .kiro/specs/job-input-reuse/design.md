# Design Document

## Overview

The Job Input Reuse feature enables users to quickly iterate on AI generations by reusing all input parameters from previously completed jobs. This includes model selection, text prompts, numeric parameters, and media files (images, videos, audio). The system uses a custom event-based architecture to decouple the workspace UI from generation forms, allowing flexible communication without tight coupling.

## Architecture

The feature follows a three-layer architecture:

1. **Data Layer**: Job records in the database store all input parameters including media file paths
2. **Context Layer**: StudioContext manages job state and provides the `reuseJobInput` action
3. **UI Layer**: Workspace components trigger reuse events, generation forms listen and apply inputs

### Component Interaction Flow

```
Workspace Job Card (RightPanel)
    ↓ (user clicks reuse button)
StudioContext.reuseJobInput()
    ↓ (fetches full job details from API)
    ↓ (dispatches custom DOM event)
Generation Form (ImageGenerationForm/VideoGenerationForm)
    ↓ (listens for 'reuseJobInput' event)
    ↓ (applies all input values)
    ↓ (loads media files)
Form State Updated
```

## Components and Interfaces

### Database Schema

The `Job` model already stores basic information. We need to extend it to store media file paths:

```prisma
model Job {
  id            String    @id @default(uuid())
  userId        String
  workspaceId   String?
  status        String
  type          String
  prompt        String?
  runpodJobId   String?
  options       String?   // JSON string containing all input parameters
  resultUrl     String?
  
  // New fields for input reuse
  imageInputPath   String?  // Path to input image file
  videoInputPath   String?  // Path to input video file
  audioInputPath   String?  // Path to input audio file
  
  modelId       String    @default("unknown")
  endpointId    String?
  error         String?
  cost          Float?
  createdAt     DateTime  @default(now())
  completedAt   DateTime?
  
  workspace     Workspace? @relation("WorkspaceJobs", fields: [workspaceId], references: [id])
}
```

### StudioContext Interface

```typescript
interface StudioContextType {
  // ... existing fields
  
  reuseJobInput: (jobId: string) => Promise<void>;
}
```

### Custom Event Interface

```typescript
interface ReuseJobInputEvent extends CustomEvent {
  detail: {
    modelId: string;
    prompt: string;
    type: 'image' | 'video' | 'audio';
    options: Record<string, any>;
    imageInputPath?: string;
    videoInputPath?: string;
    audioInputPath?: string;
  };
}
```

### Generation Form State

Each generation form needs to handle:

```typescript
interface FormState {
  // Text inputs
  prompt: string;
  negativePrompt?: string;
  
  // Numeric inputs
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  
  // Boolean inputs
  useCustomSeed?: boolean;
  
  // Media inputs
  imageFile?: File | null;
  videoFile?: File | null;
  audioFile?: File | null;
  
  // Conditional inputs (model-specific)
  [key: string]: any;
}
```

## Data Models

### Job Options Structure

The `options` field in the Job model stores a JSON string containing all input parameters:

```json
{
  "prompt": "A beautiful sunset",
  "negative_prompt": "blurry, low quality",
  "width": 1024,
  "height": 1024,
  "num_inference_steps": 50,
  "guidance_scale": 7.5,
  "seed": 42,
  "use_custom_seed": true,
  "image_path": "/public/uploads/input-image-123.png",
  "video_path": "/public/uploads/input-video-456.mp4",
  "audio_path": "/public/uploads/input-audio-789.mp3"
}
```

### Media File Handling

When a job is created with media inputs:
1. Files are uploaded to the server (already implemented via S3 or local storage)
2. File paths are stored in the `options` JSON
3. When reusing, the form fetches the file from the stored path
4. The file is loaded into the file input field

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing the prework analysis, several redundancies were identified:

1. **Properties 1.3 and 1.4 are subsumed by 1.1**: Property 1.1 covers all input values, including text, numeric, and boolean inputs. Properties 1.3 and 1.4 are specific cases that don't provide additional validation value.

2. **Properties 2.1, 2.2, and 2.3 can be combined**: All three properties test the same behavior (storing media paths) for different media types. A single property can cover all media types.

3. **Properties 2.4, 2.5, and 2.6 are redundant with 1.5**: Property 1.5 already covers loading all media files. The specific properties for each media type don't add unique validation.

4. **Property 4.2 is redundant with 1.1**: Both test that input values are applied to the form. Property 1.1 covers this from the user's perspective, which is sufficient.

After eliminating redundancies, we have the following unique properties:

- Property 1: Complete input restoration (combines 1.1, 1.3, 1.4, 4.2)
- Property 2: Model switching
- Property 3: Media file loading
- Property 4: Media path storage (combines 2.1, 2.2, 2.3)
- Property 5: Event dispatching
- Property 6: Async file loading
- Property 7: Error handling
- Property 8: Conditional input storage
- Property 9: Parent-first restoration order
- Property 10: Conditional visibility
- Property 11: Conditional value population
- Property 12: Conditional skip logic

### Correctness Properties

Property 1: Complete input restoration
*For any* job with stored input parameters, when reuse is triggered, all input values (text, numeric, boolean) should be correctly populated in the generation form
**Validates: Requirements 1.1, 1.3, 1.4**

Property 2: Model switching
*For any* job using a different model than currently selected, when reuse is triggered, the system should switch to the correct model
**Validates: Requirements 1.2**

Property 3: Media file loading
*For any* job with media inputs (image, video, or audio), when reuse is triggered, all media files should be loaded into their appropriate form input fields
**Validates: Requirements 1.5, 2.4, 2.5, 2.6**

Property 4: Media path storage
*For any* job created with media inputs, the system should store the file paths in the job record's options field
**Validates: Requirements 2.1, 2.2, 2.3**

Property 5: Event dispatching
*For any* reuse action, the system should dispatch a custom event containing the complete job data including modelId, prompt, type, options, and media paths
**Validates: Requirements 4.1**

Property 6: Async file loading
*For any* job with media files, file loading should complete asynchronously without blocking the UI thread
**Validates: Requirements 4.3**

Property 7: Error handling
*For any* reuse operation that encounters an error, the system should log the error and maintain UI functionality
**Validates: Requirements 4.4**

Property 8: Conditional input storage
*For any* job using a model with conditional inputs, all conditional input values should be stored in the job record's options field
**Validates: Requirements 5.1**

Property 9: Parent-first restoration order
*For any* job with conditional inputs, when reuse is triggered, parent input values should be restored before dependent input values
**Validates: Requirements 5.2**

Property 10: Conditional visibility
*For any* job with conditional inputs, when parent inputs are restored, dependent inputs should become visible according to the model configuration's dependsOn rules
**Validates: Requirements 5.3**

Property 11: Conditional value population
*For any* job with conditional inputs, when dependent inputs become visible, they should be populated with their original values
**Validates: Requirements 5.4**

Property 12: Conditional skip logic
*For any* job with conditional inputs, when a conditional input's dependency is not met during reuse, the system should skip restoring that input value
**Validates: Requirements 5.5**

## Error Handling

### Error Scenarios

1. **Job Not Found**: If the job ID doesn't exist, log a warning and do nothing
2. **API Failure**: If fetching job details fails, fall back to basic reuse with available data
3. **Media File Not Found**: If a media file path is invalid, log an error and skip that file
4. **Invalid Options JSON**: If the options field contains invalid JSON, use empty object as fallback
5. **Model Not Found**: If the model ID doesn't exist in modelConfig, log a warning but continue with other inputs
6. **File Loading Failure**: If a media file fails to load, show an error message but don't block other inputs

### Error Handling Strategy

```typescript
try {
  // Attempt full reuse with all features
  await reuseJobInput(jobId);
} catch (error) {
  console.error('Input reuse failed:', error);
  // Graceful degradation: at minimum, set the model and prompt
  setSelectedModel(job.modelId);
  // Dispatch event with partial data
  window.dispatchEvent(new CustomEvent('reuseJobInput', {
    detail: { modelId: job.modelId, prompt: job.prompt, type: job.type }
  }));
}
```

## Testing Strategy

### Unit Testing

Unit tests will cover:

1. **StudioContext.reuseJobInput**: Test that the function correctly fetches job details and dispatches events
2. **Event Listener Setup**: Test that generation forms correctly register event listeners
3. **Input Value Application**: Test that form state is updated with event data
4. **Media File Loading**: Test that files are correctly loaded from paths
5. **Conditional Input Logic**: Test that conditional inputs are handled correctly

### Property-Based Testing

Property-based tests will use **fast-check** (for TypeScript/JavaScript) to verify the correctness properties defined above.

Each property-based test will:
- Generate random job data with various input combinations
- Execute the reuse operation
- Verify that the expected property holds

Configuration:
- Minimum 100 iterations per property test
- Each test will be tagged with the format: `**Feature: job-input-reuse, Property {number}: {property_text}**`

### Integration Testing

Integration tests will cover:

1. **End-to-End Reuse Flow**: Create a job, complete it, trigger reuse, verify form state
2. **Cross-Component Communication**: Test that events flow correctly from workspace to forms
3. **Database Persistence**: Test that media paths are correctly stored and retrieved
4. **Multi-Model Scenarios**: Test reuse across different model types

### Test Data Generators

For property-based testing, we'll need generators for:

```typescript
// Generate random job data
const jobGenerator = fc.record({
  id: fc.uuid(),
  modelId: fc.constantFrom('flux-krea', 'wan-animate', 'qwen-image-edit'),
  type: fc.constantFrom('image', 'video', 'audio'),
  prompt: fc.string({ minLength: 10, maxLength: 200 }),
  options: fc.record({
    width: fc.integer({ min: 512, max: 2048 }),
    height: fc.integer({ min: 512, max: 2048 }),
    steps: fc.integer({ min: 20, max: 100 }),
    seed: fc.integer({ min: 0, max: 999999 }),
  }),
});

// Generate random media paths
const mediaPathGenerator = fc.constantFrom(
  '/public/uploads/test-image.png',
  '/public/uploads/test-video.mp4',
  '/public/uploads/test-audio.mp3'
);
```

## Implementation Notes

### Phase 1: Database Schema Update

1. Add migration to include media input path fields in Job model
2. Update Prisma schema
3. Run `prisma generate` to update types

### Phase 2: Job Creation Enhancement

1. Update `/api/generate/route.ts` to store media input paths in options
2. Modify file upload handling to return file paths
3. Ensure paths are included in job creation payload

### Phase 3: Reuse Logic Implementation

1. Update `StudioContext.reuseJobInput` to fetch full job details
2. Include media paths in the custom event detail
3. Add error handling for API failures

### Phase 4: Form Event Handling

1. Add event listeners in `ImageGenerationForm` and `VideoGenerationForm`
2. Implement input value application logic
3. Add media file loading from paths
4. Handle conditional inputs correctly

### Phase 5: UI Polish

1. Ensure reuse button is visible and accessible
2. Add loading states during file loading
3. Show success/error feedback
4. Test across different models and input combinations

## Dependencies

- Existing file upload system (S3 or local storage)
- Existing model configuration system
- Existing conditional input logic
- Prisma ORM for database operations
- React context for state management
- Custom DOM events for component communication

## Performance Considerations

1. **File Loading**: Media files should be loaded asynchronously to avoid blocking the UI
2. **Event Debouncing**: If multiple reuse actions are triggered rapidly, debounce to prevent race conditions
3. **Database Queries**: Fetch job details efficiently with a single query including all related data
4. **Memory Management**: Ensure file objects are properly cleaned up after loading

## Security Considerations

1. **Path Validation**: Validate that media file paths are within allowed directories
2. **User Authorization**: Ensure users can only reuse their own jobs
3. **File Access**: Verify file permissions before loading
4. **XSS Prevention**: Sanitize any user-generated content before displaying
