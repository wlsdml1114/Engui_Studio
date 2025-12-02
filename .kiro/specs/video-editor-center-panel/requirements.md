# Requirements Document

## Introduction

이 문서는 enguistudio에 videosos 스타일의 비디오 편집기를 중앙 패널에 구현하기 위한 요구사항을 정의합니다. videosos는 Remotion 기반의 타임라인 편집기를 제공하며, 비디오/이미지/오디오 트랙을 시각적으로 편집할 수 있는 기능을 갖추고 있습니다. 이 기능을 enguistudio의 기존 아키텍처에 통합하여 사용자가 생성된 콘텐츠를 편집하고 조합할 수 있도록 합니다.

## Glossary

- **VideoEditor**: 중앙 패널에 표시되는 비디오 편집 인터페이스
- **Timeline**: 시간축 기반의 트랙 편집 UI 컴포넌트
- **Track**: 비디오, 이미지, 오디오 등의 미디어를 배치하는 레이어
- **KeyFrame**: 타임라인 상의 특정 시점에 배치된 미디어 요소
- **Remotion**: React 기반 비디오 렌더링 라이브러리
- **Player**: Remotion의 비디오 재생 컴포넌트
- **Composition**: Remotion에서 비디오 구성을 정의하는 단위
- **StudioContext**: enguistudio의 전역 상태 관리 컨텍스트
- **CenterPanel**: enguistudio의 중앙 작업 영역 컴포넌트

## Requirements

### Requirement 1

**User Story:** 사용자로서, 중앙 패널에서 비디오 편집기를 볼 수 있어야 하며, 생성된 미디어를 타임라인에 배치하고 미리보기할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 비디오 편집 모드를 활성화하면 THEN CenterPanel SHALL 비디오 편집기 인터페이스를 표시해야 합니다
2. WHEN 비디오 편집기가 표시되면 THEN VideoEditor SHALL 상단에 비디오 미리보기 영역과 하단에 타임라인을 포함해야 합니다
3. WHEN 사용자가 미디어를 타임라인에 추가하면 THEN VideoEditor SHALL 해당 미디어를 트랙에 KeyFrame으로 배치해야 합니다
4. WHEN 타임라인에 미디어가 배치되면 THEN Player SHALL 해당 미디어를 시간순으로 재생해야 합니다
5. WHEN 사용자가 재생 버튼을 클릭하면 THEN Player SHALL 현재 타임라인 구성을 재생해야 합니다

### Requirement 2

**User Story:** 사용자로서, 타임라인에서 시간 눈금자를 보고 정확한 시간 위치를 파악할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 타임라인이 렌더링되면 THEN Timeline SHALL 시간 눈금자를 상단에 표시해야 합니다
2. WHEN 타임라인의 길이가 변경되면 THEN Timeline SHALL 적절한 간격으로 주요 눈금과 보조 눈금을 표시해야 합니다
3. WHEN 사용자가 타임라인을 확대/축소하면 THEN Timeline SHALL 눈금 간격을 동적으로 조정해야 합니다
4. WHEN 눈금이 표시되면 THEN Timeline SHALL 각 주요 눈금에 시간 레이블을 표시해야 합니다
5. WHEN 시간이 1초 미만이면 THEN Timeline SHALL 밀리초 단위로 표시하고, 1초 이상이면 초/분/시간 단위로 표시해야 합니다

### Requirement 3

**User Story:** 사용자로서, 여러 종류의 트랙(비디오, 이미지, 음악, 보이스오버)을 타임라인에 추가하고 관리할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 비디오를 추가하면 THEN VideoEditor SHALL 비디오 트랙을 생성하고 해당 미디어를 배치해야 합니다
2. WHEN 사용자가 이미지를 추가하면 THEN VideoEditor SHALL 비디오 트랙에 이미지를 배치해야 합니다
3. WHEN 사용자가 오디오를 추가하면 THEN VideoEditor SHALL 음악 또는 보이스오버 트랙을 생성해야 합니다
4. WHEN 트랙이 렌더링되면 THEN Timeline SHALL 트랙 타입에 따라 시각적으로 구분되어야 합니다
5. WHEN 여러 트랙이 존재하면 THEN VideoEditor SHALL 트랙을 타입별로 정렬하여 표시해야 합니다

### Requirement 4

**User Story:** 사용자로서, Remotion Player를 통해 편집 중인 비디오를 실시간으로 미리보기할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 비디오 편집기가 로드되면 THEN Player SHALL Remotion Player 컴포넌트를 초기화해야 합니다
2. WHEN 타임라인에 변경사항이 발생하면 THEN Player SHALL 변경된 구성을 반영해야 합니다
3. WHEN 사용자가 재생 위치를 변경하면 THEN Player SHALL 해당 시점의 프레임을 표시해야 합니다
4. WHEN 비디오가 재생 중이면 THEN Player SHALL 현재 재생 시간을 StudioContext에 업데이트해야 합니다
5. WHEN 미디어가 로드되면 THEN Player SHALL 비디오와 오디오를 사전 로드하여 재생 성능을 최적화해야 합니다

### Requirement 5

**User Story:** 사용자로서, 프로젝트의 종횡비(16:9, 9:16, 1:1)를 선택하고 그에 맞는 캔버스에서 작업할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 종횡비를 선택하면 THEN VideoEditor SHALL 해당 종횡비로 캔버스 크기를 조정해야 합니다
2. WHEN 종횡비가 16:9이면 THEN Player SHALL 1024x576 해상도로 렌더링해야 합니다
3. WHEN 종횡비가 9:16이면 THEN Player SHALL 576x1024 해상도로 렌더링해야 합니다
4. WHEN 종횡비가 1:1이면 THEN Player SHALL 1024x1024 해상도로 렌더링해야 합니다
5. WHEN 종횡비가 변경되면 THEN Player SHALL 기존 미디어를 새로운 종횡비에 맞게 재배치해야 합니다

### Requirement 6

**User Story:** 사용자로서, 편집한 비디오를 내보내기(export)할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 내보내기 버튼을 클릭하면 THEN VideoEditor SHALL 내보내기 다이얼로그를 표시해야 합니다
2. WHEN 타임라인이 비어있으면 THEN VideoEditor SHALL 내보내기 버튼을 비활성화해야 합니다
3. WHEN 내보내기가 시작되면 THEN VideoEditor SHALL 렌더링 진행 상태를 표시해야 합니다
4. WHEN 렌더링이 완료되면 THEN VideoEditor SHALL 사용자에게 다운로드 옵션을 제공해야 합니다
5. WHEN 내보내기 중 오류가 발생하면 THEN VideoEditor SHALL 오류 메시지를 표시하고 사용자에게 알려야 합니다

### Requirement 7

**User Story:** 사용자로서, StudioContext를 통해 비디오 편집기의 상태를 다른 컴포넌트와 공유할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 비디오 편집기가 초기화되면 THEN StudioContext SHALL 비디오 프로젝트 상태를 저장해야 합니다
2. WHEN 트랙이 추가/수정/삭제되면 THEN StudioContext SHALL 변경사항을 반영해야 합니다
3. WHEN 재생 상태가 변경되면 THEN StudioContext SHALL 재생/일시정지 상태를 업데이트해야 합니다
4. WHEN 현재 재생 시간이 변경되면 THEN StudioContext SHALL 타임스탬프를 업데이트해야 합니다
5. WHEN 다른 컴포넌트가 상태를 구독하면 THEN StudioContext SHALL 변경사항을 실시간으로 전파해야 합니다

### Requirement 8

**User Story:** 개발자로서, videosos의 기존 컴포넌트를 재사용하면서 enguistudio의 디자인 시스템과 통합할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN videosos 컴포넌트를 가져올 때 THEN VideoEditor SHALL 필요한 컴포넌트만 선택적으로 import해야 합니다
2. WHEN 컴포넌트를 렌더링할 때 THEN VideoEditor SHALL enguistudio의 Tailwind 테마를 적용해야 합니다
3. WHEN 스타일 충돌이 발생하면 THEN VideoEditor SHALL enguistudio의 스타일을 우선 적용해야 합니다
4. WHEN 의존성을 추가할 때 THEN VideoEditor SHALL Remotion과 관련 라이브러리를 package.json에 포함해야 합니다
5. WHEN 타입 정의가 필요하면 THEN VideoEditor SHALL videosos의 스키마를 참조하거나 재정의해야 합니다
