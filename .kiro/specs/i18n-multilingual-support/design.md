# Design Document: i18n Multilingual Support

## Overview

이 문서는 Engui Studio 애플리케이션의 다국어(한국어/영어) 지원 기능의 설계를 정의합니다. 현재 부분적으로 구현된 i18n 시스템을 완성하여 모든 UI 컴포넌트에서 일관된 다국어 지원을 제공합니다.

현재 상태:
- I18nProvider와 useI18n hook이 구현됨 (`src/lib/i18n/context.tsx`)
- 번역 파일이 존재함 (`src/lib/i18n/translations.ts`)
- 대부분의 페이지 컴포넌트에 i18n이 적용됨
- Video Editor 컴포넌트들에는 아직 i18n이 미적용

## Architecture

```mermaid
graph TB
    subgraph "I18n System"
        I18nProvider[I18nProvider]
        TranslationFile[translations.ts]
        LocalStorage[(localStorage)]
    end
    
    subgraph "Components"
        Settings[Settings Page]
        Sidebar[Sidebar]
        Forms[Generation Forms]
        Library[Library]
        VideoEditor[Video Editor]
    end
    
    I18nProvider --> |provides t()| Settings
    I18nProvider --> |provides t()| Sidebar
    I18nProvider --> |provides t()| Forms
    I18nProvider --> |provides t()| Library
    I18nProvider --> |provides t()| VideoEditor
    
    TranslationFile --> |ko/en translations| I18nProvider
    LocalStorage --> |saved preference| I18nProvider
    Settings --> |setLanguage()| LocalStorage
```

## Components and Interfaces

### I18nProvider (기존)

```typescript
interface I18nContextType {
  language: Language;                                    // 현재 선택된 언어
  setLanguage: (lang: Language) => void;                // 언어 변경 함수
  t: (key: string, params?: Record<string, string | number>) => string;  // 번역 함수
}

type Language = 'ko' | 'en';
```

### Translation Structure (기존)

```typescript
interface Translations {
  ko: TranslationObject;
  en: TranslationObject;
}

interface TranslationObject {
  settings: SettingsTranslations;
  sidebar: SidebarTranslations;
  menu: MenuTranslations;
  language: LanguageTranslations;
  common: CommonTranslations;
  videoGeneration: VideoGenerationTranslations;
  // ... 기타 섹션들
  videoEditor: VideoEditorTranslations;  // 새로 추가
}
```

### Video Editor Translations (신규)

```typescript
interface VideoEditorTranslations {
  header: {
    addMedia: string;
    export: string;
  };
  timeline: {
    videoTrack: string;
    musicTrack: string;
    voiceoverTrack: string;
    addTrack: string;
    deleteTrack: string;
    lockTrack: string;
    unlockTrack: string;
  };
  controls: {
    play: string;
    pause: string;
    stop: string;
    skipForward: string;
    skipBackward: string;
    zoomIn: string;
    zoomOut: string;
    fitToView: string;
  };
  export: {
    title: string;
    format: string;
    quality: string;
    resolution: string;
    exportButton: string;
    exporting: string;
    success: string;
    failed: string;
  };
  properties: {
    title: string;
    duration: string;
    volume: string;
    fit: string;
    fitOptions: {
      contain: string;
      cover: string;
      fill: string;
    };
  };
  project: {
    newProject: string;
    openProject: string;
    saveProject: string;
    projectSettings: string;
    aspectRatio: string;
    qualityPreset: string;
  };
  messages: {
    noProject: string;
    loadingProject: string;
    savingProject: string;
    exportComplete: string;
    exportFailed: string;
  };
}
```

## Data Models

### Language Preference Storage

```typescript
// localStorage key
const LANGUAGE_KEY = 'engui-language';

// Stored value
type StoredLanguage = 'ko' | 'en';
```

### Browser Language Detection

```typescript
// Detection logic
function getBrowserLanguage(): Language {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('ko')) return 'ko';
  if (browserLang.startsWith('en')) return 'en';
  return 'ko'; // default
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Language change propagation
*For any* language selection (ko or en), when setLanguage is called, all subsequent calls to t() SHALL return translations in the newly selected language.
**Validates: Requirements 1.2**

### Property 2: Language persistence round-trip
*For any* language selection, after calling setLanguage and reloading the context, the language SHALL be restored from localStorage.
**Validates: Requirements 1.3, 1.4**

### Property 3: Translation fallback to English
*For any* Translation_Key that exists only in English translations, calling t() with Korean selected SHALL return the English translation.
**Validates: Requirements 2.2**

### Property 4: Translation fallback to key
*For any* non-existent Translation_Key, calling t() SHALL return the key itself as a string.
**Validates: Requirements 2.3**

### Property 5: Parameter interpolation
*For any* translation string containing {param} placeholders and any parameter values, calling t(key, params) SHALL replace all placeholders with their corresponding parameter values.
**Validates: Requirements 2.4**

### Property 6: Dot-notation key resolution
*For any* valid dot-notation Translation_Key (e.g., 'settings.title'), calling t() SHALL correctly traverse the nested translation object and return the value.
**Validates: Requirements 3.3**

### Property 7: Browser language detection - Korean
*For any* browser language string starting with 'ko' (e.g., 'ko', 'ko-KR', 'ko-kr'), the system SHALL detect and default to Korean.
**Validates: Requirements 4.2**

### Property 8: Browser language detection - English
*For any* browser language string starting with 'en' (e.g., 'en', 'en-US', 'en-GB'), the system SHALL detect and default to English.
**Validates: Requirements 4.3**

### Property 9: Browser language detection - fallback
*For any* browser language string not starting with 'ko' or 'en', the system SHALL default to Korean.
**Validates: Requirements 4.4**

## Error Handling

### Missing Translation Keys
- 1차 fallback: 영어 번역 반환
- 2차 fallback: Translation_Key 자체를 문자열로 반환
- 콘솔에 경고 로그 출력 (개발 모드에서만)

### Invalid Language Value
- localStorage에 잘못된 값이 저장된 경우 기본값(ko)으로 fallback
- 유효한 언어 값: 'ko', 'en'

### Parameter Interpolation Errors
- 누락된 파라미터는 원본 placeholder 유지 (예: {missing})
- 추가 파라미터는 무시

## Testing Strategy

### Dual Testing Approach

이 기능은 unit tests와 property-based tests를 모두 사용합니다:
- Unit tests: 특정 예제와 엣지 케이스 검증
- Property tests: 모든 입력에 대해 유지되어야 하는 속성 검증

### Property-Based Testing

Property-based testing library: **fast-check**

각 property test는 최소 100회 반복 실행됩니다.

테스트 파일 위치: `src/lib/i18n/i18n.property.test.ts`

### Unit Testing

Unit test 파일 위치: `src/lib/i18n/i18n.test.ts`

테스트 케이스:
1. I18nProvider 렌더링 테스트
2. useI18n hook 사용 테스트
3. 언어 전환 테스트
4. localStorage 저장/복원 테스트
5. 브라우저 언어 감지 테스트

### Component Integration Tests

Video Editor 컴포넌트 i18n 적용 테스트:
- VideoEditorHeader 번역 테스트
- TimelineControls 번역 테스트
- ExportDialog 번역 테스트
- PropertiesPanel 번역 테스트
