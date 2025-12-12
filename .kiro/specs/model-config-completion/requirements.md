# Requirements Document

## Introduction

이 기능은 기존에 구현된 AI 모델들(Qwen Image Edit, Infinite Talk, WAN Animate)의 설정을 `modelConfig.ts`에 완전히 통합하고, 각 모델의 입력 파라미터를 일관된 형식으로 관리할 수 있도록 합니다. 현재 Flux Krea와 WAN 2.2만 완전히 설정되어 있으며, 나머지 모델들은 기본 설정만 있거나 실제 API 라우트에서 사용하는 파라미터와 불일치합니다.

## Glossary

- **ModelConfig**: 각 AI 모델의 메타데이터, API 설정, UI 파라미터를 정의하는 TypeScript 인터페이스
- **ModelParameter**: 모델의 개별 입력 파라미터를 정의하는 인터페이스 (name, label, type, default 등)
- **RunPod**: AI 모델을 호스팅하는 서버리스 GPU 플랫폼
- **S3 Storage**: 입력 파일(이미지, 오디오, 비디오)을 저장하는 클라우드 스토리지
- **Qwen Image Edit**: 이미지 편집 AI 모델 (1-2개 이미지 + 프롬프트 입력)
- **Infinite Talk**: 이미지/비디오 + 오디오로 립싱크 비디오를 생성하는 AI 모델
- **WAN Animate**: 이미지/비디오에 모션을 추가하는 AI 모델

## Requirements

### Requirement 1

**User Story:** As a developer, I want the Qwen Image Edit model configuration to match the actual API implementation, so that the UI can correctly display and collect all required parameters.

#### Acceptance Criteria

1. WHEN the Qwen Image Edit model is selected THEN the ModelConfig SHALL include parameters for image (base64), image2 (optional base64), prompt, width, height, seed, steps, and guidance_scale
2. WHEN the model configuration is loaded THEN the system SHALL provide default values matching the API route defaults (width: 1024, height: 1024, seed: 42, steps: 20, guidance: 7.5)
3. WHEN displaying parameters THEN the system SHALL group them appropriately (basic: image, prompt, width, height; advanced: seed, steps, guidance)
4. WHEN the model inputs are defined THEN the system SHALL specify ['text', 'image'] as the input types

### Requirement 2

**User Story:** As a developer, I want the Infinite Talk model configuration to match the actual API implementation, so that all input options are properly exposed in the UI.

#### Acceptance Criteria

1. WHEN the Infinite Talk model is selected THEN the ModelConfig SHALL include parameters for input_type (image/video), person_count (single/multi), width, height, audio_start, audio_end, audio2_start, audio2_end
2. WHEN the model configuration is loaded THEN the system SHALL provide default values matching the API route defaults (input_type: 'image', person_count: 'single', width: 640, height: 640)
3. WHEN displaying parameters THEN the system SHALL group them appropriately (basic: input_type, person_count, width, height; advanced: audio_start, audio_end, audio2_start, audio2_end)
4. WHEN the model inputs are defined THEN the system SHALL specify ['image', 'video', 'audio'] as the input types

### Requirement 3

**User Story:** As a developer, I want the WAN Animate model configuration to match the actual API implementation, so that all motion control parameters are available.

#### Acceptance Criteria

1. WHEN the WAN Animate model is selected THEN the ModelConfig SHALL include parameters for mode (replace/animate), width, height, steps, cfg, seed, fps, points_store, coordinates, neg_coordinates
2. WHEN the model configuration is loaded THEN the system SHALL provide default values matching the API route defaults (mode: 'replace', width: 512, height: 512, steps: 4, cfg: 1.0, seed: -1, fps: 30)
3. WHEN displaying parameters THEN the system SHALL group them appropriately (basic: mode, width, height; advanced: steps, cfg, seed, fps; hidden: points_store, coordinates, neg_coordinates)
4. WHEN the model inputs are defined THEN the system SHALL specify ['image', 'video', 'text'] as the input types

### Requirement 4

**User Story:** As a developer, I want a consistent parameter validation system, so that invalid inputs are caught before API submission.

#### Acceptance Criteria

1. WHEN a parameter has min/max constraints THEN the system SHALL validate the input value falls within the specified range
2. WHEN a parameter has a select type THEN the system SHALL validate the input value is one of the defined options
3. WHEN width or height parameters are used THEN the system SHALL validate they are multiples of 64 (for models that require it)
4. WHEN validation fails THEN the system SHALL provide a clear error message indicating the constraint violation

### Requirement 5

**User Story:** As a developer, I want the model configuration to support conditional parameters, so that parameters can be shown/hidden based on other parameter values.

#### Acceptance Criteria

1. WHEN person_count is 'multi' in Infinite Talk THEN the system SHALL show audio2_start and audio2_end parameters
2. WHEN person_count is 'single' in Infinite Talk THEN the system SHALL hide audio2_start and audio2_end parameters
3. WHEN input_type is 'video' in Infinite Talk THEN the system SHALL accept video file input instead of image
4. WHEN mode is 'animate' in WAN Animate THEN the system SHALL show motion control parameters (points_store, coordinates, neg_coordinates)
