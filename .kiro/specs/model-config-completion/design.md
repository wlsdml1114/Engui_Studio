# Design Document: Model Config Completion

## Overview

이 기능은 기존 AI 모델들(Qwen Image Edit, Infinite Talk, WAN Animate)의 설정을 `modelConfig.ts`에 완전히 통합합니다. 현재 각 API 라우트에서 하드코딩된 파라미터들을 중앙 집중식 설정으로 이동하여 일관성을 확보하고, UI에서 동적으로 파라미터를 렌더링할 수 있도록 합니다.

## Architecture

```mermaid
graph TB
    subgraph "Model Configuration Layer"
        MC[modelConfig.ts]
        MC --> QIE[Qwen Image Edit Config]
        MC --> IT[Infinite Talk Config]
        MC --> WA[WAN Animate Config]
        MC --> FK[Flux Krea Config]
        MC --> W22[WAN 2.2 Config]
    end
    
    subgraph "Validation Layer"
        VL[validateParameter]
        VL --> RV[Range Validation]
        VL --> SV[Select Validation]
        VL --> DV[Dimension Validation]
    end
    
    subgraph "API Layer"
        API[API Routes]
        API --> QIE_API[/api/qwen-image-edit]
        API --> IT_API[/api/infinite-talk]
        API --> WA_API[/api/wan-animate]
    end
    
    subgraph "UI Layer"
        UI[Page Components]
        UI --> MC
        UI --> VL
    end
    
    MC --> API
```

## Components and Interfaces

### 1. Extended ModelParameter Interface

```typescript
export interface ModelParameter {
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'file';
    options?: string[];
    default?: any;
    min?: number;
    max?: number;
    step?: number;
    description?: string;
    group?: 'basic' | 'advanced' | 'hidden';
    // New fields for conditional visibility
    dependsOn?: {
        parameter: string;
        value: any;
    };
    // Validation rules
    validation?: {
        multipleOf?: number;  // e.g., 64 for dimensions
        required?: boolean;
    };
}
```

### 2. Parameter Validation Function

```typescript
export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export function validateParameter(
    param: ModelParameter, 
    value: any
): ValidationResult;

export function validateModelInputs(
    modelId: string, 
    inputs: Record<string, any>
): ValidationResult[];
```

### 3. Conditional Parameter Helper

```typescript
export function getVisibleParameters(
    modelId: string,
    currentValues: Record<string, any>
): ModelParameter[];
```

## Data Models

### Qwen Image Edit Configuration

```typescript
{
    id: 'qwen-image-edit',
    name: 'Qwen Image Edit',
    provider: 'Qwen',
    type: 'image',
    inputs: ['text', 'image'],
    api: {
        type: 'runpod',
        endpoint: 'qwen-image-edit'
    },
    capabilities: {},
    parameters: [
        { name: 'width', label: 'Width', type: 'number', default: 512, min: 256, max: 1024, step: 64, group: 'basic', validation: { multipleOf: 64 } },
        { name: 'height', label: 'Height', type: 'number', default: 512, min: 256, max: 1024, step: 64, group: 'basic', validation: { multipleOf: 64 } },
        { name: 'seed', label: 'Seed', type: 'number', default: -1, group: 'advanced', description: '-1 for random' },
        { name: 'steps', label: 'Steps', type: 'number', default: 4, min: 1, max: 50, group: 'advanced' },
        { name: 'guidance', label: 'Guidance Scale', type: 'number', default: 1, min: 1, max: 20, step: 0.5, group: 'advanced' }
    ]
}
```

### Infinite Talk Configuration

```typescript
{
    id: 'infinite-talk',
    name: 'Infinite Talk',
    provider: 'Infinite Talk',
    type: 'video',
    inputs: ['image', 'video', 'audio'],
    api: {
        type: 'runpod',
        endpoint: 'infinite-talk'
    },
    capabilities: {},
    parameters: [
        { name: 'input_type', label: 'Input Type', type: 'select', options: ['image', 'video'], default: 'image', group: 'basic' },
        { name: 'person_count', label: 'Person Count', type: 'select', options: ['single', 'multi'], default: 'single', group: 'basic' },
        { name: 'width', label: 'Width', type: 'number', default: 640, min: 64, max: 2048, step: 64, group: 'basic' },
        { name: 'height', label: 'Height', type: 'number', default: 640, min: 64, max: 2048, step: 64, group: 'basic' },
        { name: 'audio_start', label: 'Audio Start (s)', type: 'string', default: '', group: 'advanced' },
        { name: 'audio_end', label: 'Audio End (s)', type: 'string', default: '', group: 'advanced' },
        { name: 'audio2_start', label: 'Audio 2 Start (s)', type: 'string', default: '', group: 'advanced', dependsOn: { parameter: 'person_count', value: 'multi' } },
        { name: 'audio2_end', label: 'Audio 2 End (s)', type: 'string', default: '', group: 'advanced', dependsOn: { parameter: 'person_count', value: 'multi' } }
    ]
}
```

### WAN Animate Configuration

```typescript
{
    id: 'wan-animate',
    name: 'Wan Animate',
    provider: 'Wan',
    type: 'video',
    inputs: ['image', 'video', 'text'],
    api: {
        type: 'runpod',
        endpoint: 'wan-animate'
    },
    capabilities: {},
    parameters: [
        { name: 'mode', label: 'Mode', type: 'select', options: ['replace', 'animate'], default: 'replace', group: 'basic' },
        { name: 'width', label: 'Width', type: 'number', default: 512, min: 64, max: 2048, step: 64, group: 'basic', validation: { multipleOf: 64 } },
        { name: 'height', label: 'Height', type: 'number', default: 512, min: 64, max: 2048, step: 64, group: 'basic', validation: { multipleOf: 64 } },
        { name: 'steps', label: 'Steps', type: 'number', default: 4, min: 1, max: 50, group: 'advanced' },
        { name: 'cfg', label: 'CFG Scale', type: 'number', default: 1.0, min: 0.1, max: 20, step: 0.1, group: 'advanced' },
        { name: 'seed', label: 'Seed', type: 'number', default: -1, group: 'advanced' },
        { name: 'fps', label: 'FPS', type: 'number', default: 30, min: 1, max: 60, group: 'advanced' },
        { name: 'points_store', label: 'Points Store', type: 'string', default: '', group: 'hidden', dependsOn: { parameter: 'mode', value: 'animate' } },
        { name: 'coordinates', label: 'Coordinates', type: 'string', default: '', group: 'hidden', dependsOn: { parameter: 'mode', value: 'animate' } },
        { name: 'neg_coordinates', label: 'Negative Coordinates', type: 'string', default: '', group: 'hidden', dependsOn: { parameter: 'mode', value: 'animate' } }
    ]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Model Configuration Completeness
*For any* model ID in the MODELS array, the configuration SHALL contain all required fields (id, name, provider, type, inputs, api, parameters) and each parameter SHALL have at minimum (name, label, type, default).
**Validates: Requirements 1.1, 2.1, 3.1**

### Property 2: Parameter Group Assignment Validity
*For any* parameter in any model configuration, the group field SHALL be one of 'basic', 'advanced', or 'hidden', and if not specified, SHALL default to 'advanced'.
**Validates: Requirements 1.3, 2.3, 3.3**

### Property 3: Range Validation Correctness
*For any* parameter with min/max constraints, the validateParameter function SHALL return valid=true for values within [min, max] and valid=false with an error message for values outside the range.
**Validates: Requirements 4.1, 4.4**

### Property 4: Select Validation Correctness
*For any* parameter with type='select' and defined options, the validateParameter function SHALL return valid=true for values in the options array and valid=false for values not in the options array.
**Validates: Requirements 4.2, 4.4**

### Property 5: Dimension Multiple Validation
*For any* parameter with validation.multipleOf defined, the validateParameter function SHALL return valid=true only when the value is a multiple of the specified number.
**Validates: Requirements 4.3, 4.4**

### Property 6: Conditional Parameter Visibility
*For any* parameter with dependsOn defined, the getVisibleParameters function SHALL include the parameter only when the dependent parameter's current value matches the specified value.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

## Error Handling

1. **Invalid Parameter Value**: 검증 실패 시 구체적인 오류 메시지 반환
   - Range violation: "Value {value} is outside the allowed range [{min}, {max}]"
   - Select violation: "Value '{value}' is not a valid option. Valid options: {options}"
   - Multiple violation: "Value {value} must be a multiple of {multipleOf}"

2. **Missing Required Parameter**: 필수 파라미터 누락 시 오류
   - "Required parameter '{name}' is missing"

3. **Model Not Found**: 존재하지 않는 모델 ID 요청 시
   - "Model '{modelId}' not found in configuration"

## Testing Strategy

### Unit Tests
- 각 모델 설정의 기본값 검증
- 개별 파라미터 검증 함수 테스트
- 조건부 파라미터 가시성 테스트

### Property-Based Tests
- **Testing Library**: fast-check (TypeScript PBT library)
- **Minimum Iterations**: 100

각 property-based test는 다음 형식의 주석으로 태그됩니다:
```typescript
// **Feature: model-config-completion, Property {number}: {property_text}**
```

테스트 전략:
1. 모델 설정 완전성 검증 (Property 1)
2. 파라미터 그룹 유효성 검증 (Property 2)
3. 범위 검증 정확성 (Property 3)
4. Select 검증 정확성 (Property 4)
5. 차원 배수 검증 (Property 5)
6. 조건부 파라미터 가시성 (Property 6)
