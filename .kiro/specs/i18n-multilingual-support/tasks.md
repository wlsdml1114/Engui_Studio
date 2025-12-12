# Implementation Plan

- [x] 1. Add Video Editor translations to translation file
  - [x] 1.1 Add Korean translations for Video Editor components
    - Add videoEditor section to translations.ko object
    - Include header, timeline, controls, export, properties, project, messages subsections
    - _Requirements: 2.1, 5.5_
  - [x] 1.2 Add English translations for Video Editor components
    - Add videoEditor section to translations.en object
    - Mirror structure of Korean translations
    - _Requirements: 2.1, 5.5_
  - [ ]* 1.3 Write property test for translation structure consistency
    - **Property 6: Dot-notation key resolution**
    - **Validates: Requirements 3.3**

- [x] 2. Apply i18n to Video Editor Header component
  - [x] 2.1 Update VideoEditorHeader.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded strings with t() calls
    - _Requirements: 5.5_
  - [ ]* 2.2 Write unit test for VideoEditorHeader translations
    - Test that component renders with correct translations
    - _Requirements: 5.5_

- [x] 3. Apply i18n to Timeline Controls component
  - [x] 3.1 Update TimelineControls.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded strings with t() calls
    - _Requirements: 5.5_
  - [ ]* 3.2 Write unit test for TimelineControls translations
    - Test that component renders with correct translations
    - _Requirements: 5.5_

- [x] 4. Apply i18n to Export Dialog component
  - [x] 4.1 Update ExportDialog.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded strings with t() calls
    - _Requirements: 5.5_
  - [ ]* 4.2 Write unit test for ExportDialog translations
    - Test that component renders with correct translations
    - _Requirements: 5.5_

- [x] 5. Apply i18n to Properties Panel component
  - [x] 5.1 Update PropertiesPanel.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded strings with t() calls
    - _Requirements: 5.5_
  - [ ]* 5.2 Write unit test for PropertiesPanel translations
    - Test that component renders with correct translations
    - _Requirements: 5.5_

- [x] 6. Apply i18n to Video Timeline component
  - [x] 6.1 Update VideoTimeline.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded track labels and messages with t() calls
    - _Requirements: 5.5_
  - [ ]* 6.2 Write unit test for VideoTimeline translations
    - Test that component renders with correct translations
    - _Requirements: 5.5_

- [x] 7. Apply i18n to Project Selector component
  - [x] 7.1 Update ProjectSelector.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded strings with t() calls
    - _Requirements: 5.5_
  - [ ]* 7.2 Write unit test for ProjectSelector translations
    - Test that component renders with correct translations
    - _Requirements: 5.5_

- [x] 8. Apply i18n to Settings Dialog component
  - [x] 8.1 Update SettingsDialog.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded strings with t() calls
    - _Requirements: 5.5_
  - [ ]* 8.2 Write unit test for SettingsDialog translations
    - Test that component renders with correct translations
    - _Requirements: 5.5_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Write property-based tests for i18n core functionality
  - [x]* 10.1 Write property test for language change propagation
    - **Property 1: Language change propagation**
    - **Validates: Requirements 1.2**
  - [x]* 10.2 Write property test for language persistence round-trip
    - **Property 2: Language persistence round-trip**
    - **Validates: Requirements 1.3, 1.4**
  - [x]* 10.3 Write property test for translation fallback to English
    - **Property 3: Translation fallback to English**
    - **Validates: Requirements 2.2**
  - [x]* 10.4 Write property test for translation fallback to key
    - **Property 4: Translation fallback to key**
    - **Validates: Requirements 2.3**
  - [x]* 10.5 Write property test for parameter interpolation
    - **Property 5: Parameter interpolation**
    - **Validates: Requirements 2.4**
  - [x]* 10.6 Write property tests for browser language detection
    - **Property 7: Browser language detection - Korean**
    - **Property 8: Browser language detection - English**
    - **Property 9: Browser language detection - fallback**
    - **Validates: Requirements 4.2, 4.3, 4.4**

- [x] 11. Apply i18n to Generation Forms
  - [x] 11.1 Update VideoGenerationForm.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded strings with t() calls for labels, buttons, placeholders
    - _Requirements: 5.2_
  - [x] 11.2 Update ImageGenerationForm.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded strings with t() calls
    - _Requirements: 5.2_
  - [x] 11.3 Update GenerationTabs.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded tab labels with t() calls
    - _Requirements: 5.2_

- [x] 12. Apply i18n to Workspace components
  - [x] 12.1 Update JobDetailsDialog.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded strings with t() calls for dialog titles, buttons, labels
    - _Requirements: 5.3_

- [x] 13. Apply i18n to LoRA components
  - [x] 13.1 Update LoRAManagementDialog.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded strings with t() calls
    - _Requirements: 5.2_
  - [x] 13.2 Update LoRASelector.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded strings with t() calls
    - _Requirements: 5.2_
  - [x] 13.3 Update LoRAPairSelector.tsx with useI18n
    - Import useI18n hook
    - Replace hardcoded strings with t() calls
    - _Requirements: 5.2_

- [x] 14. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
