# Requirements Document

## Introduction

이 문서는 비디오 편집기에 해상도 조절 및 오디오 음량 제어 기능을 추가하기 위한 요구사항을 정의합니다. 현재 비디오 편집기는 업로드된 미디어의 원본 해상도를 무시하고 고정된 해상도로 렌더링하는 문제가 있습니다. 이 기능은 사용자가 프로젝트 해상도를 선택하고, 업로드된 미디어가 자동으로 fit되도록 하며, 각 오디오 트랙의 음량을 개별적으로 조절할 수 있도록 합니다.

## Glossary

- **VideoEditor**: 중앙 패널의 비디오 편집 인터페이스
- **Resolution**: 비디오의 픽셀 해상도 (예: 1920x1080)
- **AspectRatio**: 화면 비율 (16:9 또는 9:16)
- **QualityPreset**: 해상도 품질 설정 (480p, 720p, 1080p)
- **MediaFitting**: 업로드된 미디어를 프로젝트 해상도에 맞추는 방식
- **AudioTrack**: 음악 또는 보이스오버 오디오 트랙
- **VolumeControl**: 오디오 트랙의 음량 조절 기능
- **ProjectSettings**: 프로젝트 전체 설정 (해상도, 화면비율 등)
- **TrackSettings**: 개별 트랙 설정 (음량, 뮤트 등)

## Requirements

### Requirement 1

**User Story:** 사용자로서, 프로젝트 생성 시 화면 비율(16:9 또는 9:16)과 해상도 품질(480p, 720p, 1080p)을 선택할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 새 프로젝트를 생성하면 THEN VideoEditor SHALL 화면 비율 선택 옵션(16:9, 9:16)을 제공해야 합니다
2. WHEN 사용자가 화면 비율을 선택하면 THEN VideoEditor SHALL 해상도 품질 선택 옵션(480p, 720p, 1080p)을 제공해야 합니다
3. WHEN 사용자가 16:9와 480p를 선택하면 THEN VideoEditor SHALL 프로젝트 해상도를 854x480으로 설정해야 합니다
4. WHEN 사용자가 16:9와 720p를 선택하면 THEN VideoEditor SHALL 프로젝트 해상도를 1280x720으로 설정해야 합니다
5. WHEN 사용자가 16:9와 1080p를 선택하면 THEN VideoEditor SHALL 프로젝트 해상도를 1920x1080으로 설정해야 합니다
6. WHEN 사용자가 9:16와 480p를 선택하면 THEN VideoEditor SHALL 프로젝트 해상도를 480x854로 설정해야 합니다
7. WHEN 사용자가 9:16와 720p를 선택하면 THEN VideoEditor SHALL 프로젝트 해상도를 720x1280으로 설정해야 합니다
8. WHEN 사용자가 9:16와 1080p를 선택하면 THEN VideoEditor SHALL 프로젝트 해상도를 1080x1920으로 설정해야 합니다

### Requirement 2

**User Story:** 사용자로서, 기존 프로젝트의 해상도 설정을 변경할 수 있어야 하며, 변경 시 기존 미디어가 새 해상도에 맞게 자동으로 조정되어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 프로젝트 설정을 열면 THEN VideoEditor SHALL 현재 화면 비율과 해상도 품질을 표시해야 합니다
2. WHEN 사용자가 해상도 설정을 변경하면 THEN VideoEditor SHALL 변경 확인 다이얼로그를 표시해야 합니다
3. WHEN 사용자가 변경을 확인하면 THEN VideoEditor SHALL 프로젝트 해상도를 업데이트해야 합니다
4. WHEN 해상도가 변경되면 THEN VideoEditor SHALL 모든 기존 키프레임의 미디어를 새 해상도에 맞게 재조정해야 합니다
5. WHEN 해상도 변경이 완료되면 THEN VideoEditor SHALL 사용자에게 완료 알림을 표시해야 합니다

### Requirement 3

**User Story:** 사용자로서, 타임라인에 미디어를 추가할 때 해당 미디어가 프로젝트 해상도에 자동으로 fit되어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 이미지를 타임라인에 추가하면 THEN VideoEditor SHALL 이미지를 프로젝트 해상도에 맞게 스케일링해야 합니다
2. WHEN 사용자가 비디오를 타임라인에 추가하면 THEN VideoEditor SHALL 비디오를 프로젝트 해상도에 맞게 스케일링해야 합니다
3. WHEN 미디어의 원본 비율이 프로젝트 비율과 다르면 THEN VideoEditor SHALL 미디어를 letterbox 또는 pillarbox 방식으로 fit해야 합니다
4. WHEN 미디어의 원본 해상도가 프로젝트 해상도보다 작으면 THEN VideoEditor SHALL 미디어를 확대하여 fit해야 합니다
5. WHEN 미디어의 원본 해상도가 프로젝트 해상도보다 크면 THEN VideoEditor SHALL 미디어를 축소하여 fit해야 합니다

### Requirement 4

**User Story:** 사용자로서, 각 미디어 키프레임의 fit 방식(contain, cover, fill)을 개별적으로 조정할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 키프레임을 선택하면 THEN VideoEditor SHALL fit 방식 선택 옵션을 표시해야 합니다
2. WHEN 사용자가 'contain'을 선택하면 THEN VideoEditor SHALL 미디어 전체가 보이도록 letterbox/pillarbox를 추가해야 합니다
3. WHEN 사용자가 'cover'를 선택하면 THEN VideoEditor SHALL 미디어가 캔버스를 완전히 채우도록 크롭해야 합니다
4. WHEN 사용자가 'fill'을 선택하면 THEN VideoEditor SHALL 미디어를 캔버스 크기에 맞게 늘려야 합니다
5. WHEN fit 방식이 변경되면 THEN VideoEditor SHALL 미리보기를 즉시 업데이트해야 합니다

### Requirement 5

**User Story:** 사용자로서, 각 오디오 트랙의 음량을 개별적으로 조절할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 오디오 트랙을 선택하면 THEN VideoEditor SHALL 음량 조절 슬라이더를 표시해야 합니다
2. WHEN 사용자가 슬라이더를 조정하면 THEN VideoEditor SHALL 트랙의 음량을 0%에서 200% 범위로 조절해야 합니다
3. WHEN 음량이 100%이면 THEN VideoEditor SHALL 원본 오디오 음량을 유지해야 합니다
4. WHEN 음량이 0%이면 THEN VideoEditor SHALL 오디오를 완전히 음소거해야 합니다
5. WHEN 음량이 200%이면 THEN VideoEditor SHALL 오디오를 원본의 2배 크기로 증폭해야 합니다
6. WHEN 음량이 변경되면 THEN VideoEditor SHALL 변경사항을 데이터베이스에 저장해야 합니다

### Requirement 6

**User Story:** 사용자로서, 오디오 트랙을 음소거(mute)하거나 음소거 해제할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 오디오 트랙을 선택하면 THEN VideoEditor SHALL 음소거 토글 버튼을 표시해야 합니다
2. WHEN 사용자가 음소거 버튼을 클릭하면 THEN VideoEditor SHALL 해당 트랙을 음소거해야 합니다
3. WHEN 트랙이 음소거되면 THEN VideoEditor SHALL 음소거 아이콘을 표시해야 합니다
4. WHEN 사용자가 음소거된 트랙의 버튼을 다시 클릭하면 THEN VideoEditor SHALL 음소거를 해제해야 합니다
5. WHEN 트랙이 음소거되면 THEN VideoEditor SHALL 재생 시 해당 트랙의 오디오를 출력하지 않아야 합니다

### Requirement 7

**User Story:** 사용자로서, 개별 오디오 키프레임의 음량을 조절할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 오디오 키프레임을 선택하면 THEN VideoEditor SHALL 키프레임 음량 조절 슬라이더를 표시해야 합니다
2. WHEN 사용자가 키프레임 음량을 조정하면 THEN VideoEditor SHALL 해당 키프레임의 음량만 변경해야 합니다
3. WHEN 키프레임 음량과 트랙 음량이 모두 설정되면 THEN VideoEditor SHALL 두 값을 곱하여 최종 음량을 계산해야 합니다
4. WHEN 키프레임 음량이 설정되지 않으면 THEN VideoEditor SHALL 트랙 음량을 기본값으로 사용해야 합니다
5. WHEN 키프레임 음량이 변경되면 THEN VideoEditor SHALL 변경사항을 데이터베이스에 저장해야 합니다

### Requirement 8

**User Story:** 사용자로서, 프로젝트 설정 UI에서 해상도 및 화면 비율 정보를 명확하게 확인할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 프로젝트 설정을 열면 THEN VideoEditor SHALL 현재 해상도를 픽셀 단위로 표시해야 합니다
2. WHEN 사용자가 프로젝트 설정을 열면 THEN VideoEditor SHALL 현재 화면 비율을 표시해야 합니다
3. WHEN 사용자가 프로젝트 설정을 열면 THEN VideoEditor SHALL 현재 품질 프리셋을 표시해야 합니다
4. WHEN 사용자가 해상도 옵션을 선택하면 THEN VideoEditor SHALL 선택한 옵션의 정확한 픽셀 크기를 미리보기로 표시해야 합니다
5. WHEN 프로젝트 설정이 표시되면 THEN VideoEditor SHALL 설정 변경 버튼을 제공해야 합니다

### Requirement 9

**User Story:** 사용자로서, 비디오 내보내기 시 선택한 해상도와 오디오 설정이 정확하게 반영되어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 비디오를 내보내면 THEN VideoEditor SHALL 프로젝트 해상도로 비디오를 렌더링해야 합니다
2. WHEN 비디오를 내보내면 THEN VideoEditor SHALL 각 트랙의 음량 설정을 반영해야 합니다
3. WHEN 비디오를 내보내면 THEN VideoEditor SHALL 각 키프레임의 음량 설정을 반영해야 합니다
4. WHEN 비디오를 내보내면 THEN VideoEditor SHALL 음소거된 트랙을 출력에서 제외해야 합니다
5. WHEN 비디오를 내보내면 THEN VideoEditor SHALL 각 미디어의 fit 방식을 반영해야 합니다

### Requirement 10

**User Story:** 사용자로서, 작업 중인 프로젝트를 저장하고 나중에 불러올 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 프로젝트를 생성하면 THEN VideoEditor SHALL 프로젝트를 자동으로 데이터베이스에 저장해야 합니다
2. WHEN 사용자가 프로젝트 목록을 열면 THEN VideoEditor SHALL 저장된 모든 프로젝트를 표시해야 합니다
3. WHEN 사용자가 프로젝트를 선택하면 THEN VideoEditor SHALL 해당 프로젝트의 모든 설정과 미디어를 로드해야 합니다
4. WHEN 프로젝트를 로드하면 THEN VideoEditor SHALL 해상도, 화면 비율, 트랙, 키프레임, 음량 설정을 복원해야 합니다
5. WHEN 사용자가 프로젝트를 수정하면 THEN VideoEditor SHALL 변경사항을 자동으로 저장해야 합니다

### Requirement 11

**User Story:** 사용자로서, 프로젝트에 이름과 설명을 추가하여 관리할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 새 프로젝트를 생성하면 THEN VideoEditor SHALL 프로젝트 이름 입력을 요청해야 합니다
2. WHEN 사용자가 프로젝트 설정을 열면 THEN VideoEditor SHALL 프로젝트 이름과 설명을 편집할 수 있는 필드를 제공해야 합니다
3. WHEN 사용자가 프로젝트 이름을 변경하면 THEN VideoEditor SHALL 변경사항을 데이터베이스에 저장해야 합니다
4. WHEN 프로젝트 목록을 표시하면 THEN VideoEditor SHALL 각 프로젝트의 이름, 설명, 생성일, 수정일을 표시해야 합니다
5. WHEN 프로젝트 이름이 비어있으면 THEN VideoEditor SHALL 기본 이름을 자동으로 생성해야 합니다

### Requirement 12

**User Story:** 사용자로서, 더 이상 필요하지 않은 프로젝트를 삭제할 수 있어야 합니다.

#### Acceptance Criteria

1. WHEN 사용자가 프로젝트 목록에서 삭제 버튼을 클릭하면 THEN VideoEditor SHALL 삭제 확인 다이얼로그를 표시해야 합니다
2. WHEN 사용자가 삭제를 확인하면 THEN VideoEditor SHALL 프로젝트와 관련된 모든 데이터를 데이터베이스에서 삭제해야 합니다
3. WHEN 프로젝트가 삭제되면 THEN VideoEditor SHALL 해당 프로젝트의 트랙과 키프레임도 함께 삭제해야 합니다
4. WHEN 프로젝트가 삭제되면 THEN VideoEditor SHALL 프로젝트 목록을 업데이트해야 합니다
5. WHEN 현재 열려있는 프로젝트가 삭제되면 THEN VideoEditor SHALL 편집기를 초기 상태로 되돌려야 합니다

### Requirement 13

**User Story:** 개발자로서, 해상도 및 오디오 설정이 데이터베이스에 영구적으로 저장되어야 합니다.

#### Acceptance Criteria

1. WHEN 프로젝트가 생성되면 THEN VideoEditor SHALL 해상도 설정을 데이터베이스에 저장해야 합니다
2. WHEN 트랙이 생성되면 THEN VideoEditor SHALL 트랙 음량 설정을 데이터베이스에 저장해야 합니다
3. WHEN 키프레임이 생성되면 THEN VideoEditor SHALL 키프레임 음량 및 fit 방식을 데이터베이스에 저장해야 합니다
4. WHEN 설정이 변경되면 THEN VideoEditor SHALL 변경사항을 즉시 데이터베이스에 업데이트해야 합니다
5. WHEN 프로젝트를 로드하면 THEN VideoEditor SHALL 저장된 모든 설정을 복원해야 합니다
