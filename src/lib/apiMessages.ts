// src/lib/apiMessages.ts

// API 응답 메시지 상수
// TODO: 추후 i18n 연동 시 translations.ts와 통합

export const ApiMessages = {
  // 언어별 메시지 (현재는 한국어만 정의)
  ko: {
    // 작업 시작 메시지
    JOB_STARTED: {
      wan22: 'WAN 2.2 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
      wanAnimate: 'WAN Animate 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
      videoUpscale: '비디오 업스케일 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
      infiniteTalk: 'Infinite Talk 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
      fluxKrea: 'Flux Krea 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.'
    },

    // S3 스토리지 메시지
    S3: {
      FILE_UPLOADED: '파일이 성공적으로 업로드되었습니다.',
      FOLDER_CREATED: '폴더가 성공적으로 생성되었습니다.',
      FILE_DELETED: '파일이 성공적으로 삭제되었습니다.',
      UPLOAD_FAILED: '파일 업로드에 실패했습니다.',
      DOWNLOAD_FAILED: '파일 다운로드에 실패했습니다.',
      DELETE_FAILED: '파일 삭제에 실패했습니다.',
      CREATE_FOLDER_FAILED: '폴더 생성에 실패했습니다.',
      FILE_LIST_FAILED: '파일 목록을 가져올 수 없습니다.',
      VOLUME_LIST_FAILED: '네트워크 볼륨 목록을 가져올 수 없습니다.',
      SERVER_UNSTABLE: 'RunPod S3 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.',
      FOLDER_CONFLICT: (key: string) => `폴더 생성 실패: '${key}'는 이미 파일로 존재합니다. 기존 파일을 삭제하거나 다른 폴더명을 사용해주세요.`,
      VOLUME_NOT_SPECIFIED: '볼륨이 지정되지 않았습니다.',
      SETTINGS_NOT_CONFIGURED: 'S3 설정이 완료되지 않았습니다.',
      VOLUME_AND_KEY_REQUIRED: '볼륨과 파일 키가 필요합니다.',
      VOLUME_AND_FOLDER_KEY_REQUIRED: '볼륨과 폴더 키가 필요합니다.',
      LORA_VOLUME_NOT_SPECIFIED: '볼륨이 지정되지 않았습니다. S3 Storage 페이지에서 볼륨을 선택해주세요.',
      FILE_AND_VOLUME_REQUIRED: '파일과 볼륨이 필요합니다.'
    },

    // 워크스페이스 메시지
    WORKSPACE: {
      NAME_EXISTS: '워크스페이스 이름이 이미 존재합니다.',
      DEFAULT_CANNOT_DELETE: '기본 워크스페이스는 삭제할 수 없습니다.'
    },

    // RunPod 통합 메시지
    RUNPOD: {
      AUTH_FAILED: 'RunPod 인증 실패(401). Settings의 API Key/Endpoint ID를 다시 저장해주세요.',
      S3_UPLOAD_FAILED: 'S3 업로드에 실패했습니다. S3 설정을 확인하세요.',
      S3_IMAGE_UPLOAD_FAILED: 'S3 이미지 업로드 실패',
      S3_VIDEO_UPLOAD_FAILED: 'S3 비디오 업로드 실패',
      SUBMISSION_FAILED: 'RunPod 제출 실패',
      WAN_ANIMATE_FAILED: 'WAN Animate 생성 실패',
      SETTINGS_NOT_CONFIGURED: 'RunPod 설정이 완료되지 않았습니다.'
    },

    // 입력 검증 메시지
    VALIDATION: {
      INPUT_TYPE_REQUIRED: 'input_type은 "image" 또는 "video"여야 합니다.',
      PERSON_COUNT_REQUIRED: 'person_count는 "single" 또는 "multi"여야 합니다.',
      IMAGE_FILE_REQUIRED: '이미지 파일이 필요합니다.',
      VIDEO_FILE_REQUIRED: '비디오 파일이 필요합니다.',
      AUDIO_AND_PROMPT_REQUIRED: '오디오 파일과 프롬프트가 필요합니다.',
      SECOND_AUDIO_REQUIRED: '다중 인물 모드에서는 두 번째 오디오 파일이 필요합니다.',
      UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.'
    },

    // 설정 테스트 메시지
    SETTINGS_TEST: {
      ENDPOINT_SUCCESS: (endpointType: string) => `${endpointType} endpoint 연결 성공!`,
      ENDPOINT_FAILED: (endpointType: string, error?: string) => `${endpointType} endpoint 연결 실패${error ? ': ' + error : ''}`,
      ENDPOINT_ERROR: (endpointType: string, error?: string) => `${endpointType} endpoint 연결 오류${error ? ': ' + error : ''}`,
      S3_SUCCESS: 'S3 연결 성공!',
      S3_FAILED: (error?: string) => `S3 연결 실패${error ? ': ' + error : ''}`
    },

    // 파일 관련 메시지
    FILE: {
      NO_FILES_PROVIDED: '파일이 제공되지 않았습니다.',
      FILE_NOT_FOUND: '파일을 찾을 수 없습니다.',
      FAILED_TO_SERVE_FILE: '파일 제공에 실패했습니다.',
      INVALID_VIDEO_FILE: '잘못된 비디오 파일입니다.',
      FAILED_TO_GENERATE_THUMBNAIL: '썸네일 생성에 실패했습니다.',
      INTERNAL_SERVER_ERROR: '내부 서버 오류가 발생했습니다.'
    },

    // 데이터베이스 관련 메시지
    DATABASE: {
      FAILED_TO_FETCH: '데이터를 가져오는데 실패했습니다.',
      FAILED_TO_CREATE: '생성에 실패했습니다.',
      FAILED_TO_UPDATE: '업데이트에 실패했습니다.',
      FAILED_TO_DELETE: '삭제에 실패했습니다.',
      NOT_FOUND: '데이터를 찾을 수 없습니다.',
      CONNECTION_SUCCESSFUL: '데이터베이스 연결에 성공했습니다!'
    },

    // RunPod 설정 관련 메시지
    RUNPOD_CONFIG: {
      INCOMPLETE: (service: string) => `RunPod 설정이 불완전합니다. 설정에서 API 키와 ${service} 엔드포인트를 구성해주세요.`,
      MISSING_FOR_BACKGROUND: '백그라운드 처리를 위한 RunPod 설정이 누락되었습니다.',
      NOT_FOUND: 'RunPod 설정을 찾을 수 없습니다.'
    },

    // 작업 관련 메시지
    JOB: {
      NOT_FOUND: '작업을 찾을 수 없습니다.',
      NOT_COMPLETED: '작업이 완료되지 않았거나 결과를 사용할 수 없습니다.',
      FAILED_TO_GENERATE: '콘텐츠 생성에 실패했습니다.',
      ID_REQUIRED: '작업 ID가 필요합니다.',
      DELETED_SUCCESSFULLY: '작업이 성공적으로 삭제되었습니다.',
      FAILED_TO_DELETE: '작업 삭제에 실패했습니다.',
      FAILED_TO_TOGGLE_FAVORITE: '즐겨찾기 토글에 실패했습니다.',
      FAILED_TO_MOVE: '작업 이동에 실패했습니다.',
      FAILED_TO_REMOVE: '작업 제거에 실패했습니다.'
    },

    // 프리셋 관련 메시지
    PRESET: {
      FAILED_TO_FETCH: '프리셋을 가져오는데 실패했습니다.',
      MISSING_ID: '프리셋 ID가 누락되었습니다.',
      MISSING_FIELDS: '필수 필드가 누락되었습니다.',
      FAILED_TO_CREATE: '프리셋 생성에 실패했습니다.',
      FAILED_TO_DELETE: '프리셋 삭제에 실패했습니다.',
      DELETED_SUCCESSFULLY: '프리셋이 성공적으로 삭제되었습니다.'
    },

    // 워크스페이스 관련 메시지
    WORKSPACE: {
      NAME_EXISTS: '워크스페이스 이름이 이미 존재합니다.',
      DEFAULT_CANNOT_DELETE: '기본 워크스페이스는 삭제할 수 없습니다.',
      FAILED_TO_FETCH: '워크스페이스를 가져오는데 실패했습니다.',
      NOT_FOUND: '워크스페이스를 찾을 수 없습니다.',
      FAILED_TO_CREATE: '워크스페이스 생성에 실패했습니다.',
      FAILED_TO_UPDATE: '워크스페이스 업데이트에 실패했습니다.',
      FAILED_TO_DELETE: '워크스페이스 삭제에 실패했습니다.',
      FAILED_TO_INITIALIZE: '워크스페이스 초기화에 실패했습니다.',
      SAME_USER_REQUIRED: '워크스페이스와 작업은 같은 사용자에게 속해야 합니다.',
      JOB_NOT_IN_WORKSPACE: '작업이 지정된 워크스페이스에 없습니다.',
      DEFAULT_WORKSPACE: 'Default workspace',
      DEFAULT_DESCRIPTION: 'Default workspace where all your work is saved.'
    },

    // 설정 관련 메시지
    SETTINGS: {
      DATA_REQUIRED: '설정 데이터가 필요합니다.',
      MUST_BE_OBJECT: '설정은 객체여야 합니다.',
      RUNPOD_KEY_MUST_BE_STRING: 'RunPod API 키는 문자열이어야 합니다.',
      SAVED_SUCCESSFULLY: '설정이 성공적으로 저장되었습니다.',
      API_KEY_AND_ENDPOINT_REQUIRED: 'API 키와 엔드포인트 ID가 필요합니다.',
      MISSING_API_KEY: 'API 키가 누락되었습니다.',
      INVALID_SERVICE_TYPE: '잘못된 서비스 타입입니다.',
      RUNPOD_KEY_REQUIRED: 'RunPod API 키가 필요합니다.',
      INVALID_API_KEY: '잘못된 API 키 - 인증 실패',
      ENDPOINT_NOT_FOUND: '엔드포인트를 찾을 수 없습니다 - 엔드포인트 ID를 확인하세요',
      CONNECTION_FAILED: '연결 실패 - 네트워크와 API 키를 확인하세요'
    },

    // 마이그레이션 관련 메시지
    MIGRATION: {
      FAILED_TO_CHECK_STATUS: '마이그레이션 상태 확인 실패',
      COMPLETED_SUCCESSFULLY: '마이그레이션이 성공적으로 완료되었습니다.',
      CLEANUP_COMPLETED: '정리가 완료되었습니다',
      INVALID_ACTION: '잘못된 작업입니다',
      ACTION_FAILED: '마이그레이션 작업 실패'
    },

    // MultiTalk 관련 메시지
    MULTITALK: {
      IMAGE_AND_AUDIO_REQUIRED: '이미지와 최소 하나의 오디오 파일이 필요합니다.',
      SECOND_AUDIO_REQUIRED: '듀얼 모드에서는 두 번째 오디오 파일이 필요합니다.'
    },

    // 결과 관련 메시지
    RESULT: {
      NO_VALID_URL: '유효한 결과 URL을 찾을 수 없습니다.',
      FAILED_TO_SERVE: '결과 제공에 실패했습니다.',
      ACCESS_DIRECTLY: '결과에 직접 접근해주세요',
      NO_ACCESSIBLE_RESULT: '이 작업에는 접근 가능한 결과가 없습니다. 자세한 내용은 작업 옵션을 확인하세요.'
    },

    // 웹훅 관련 메시지
    WEBHOOK: {
      MISSING_JOB_ID_OR_URL: '작업 ID 또는 결과 URL이 누락되었습니다.',
      RECEIVED_AND_UPDATED: '웹훅이 수신되고 작업이 업데이트되었습니다',
      FAILED_TO_PROCESS: '웹훅 처리에 실패했습니다'
    },

    // 일반 메시지
    GENERAL: {
      TEST_FAILED: '테스트 실패',
      UNKNOWN_ERROR: '알 수 없는 오류',
      NO_STACK_TRACE: '스택 추적 없음'
    }
  },

  // 영어 메시지 (추후 확장용)
  en: {
    // 작업 시작 메시지
    JOB_STARTED: {
      wan22: 'WAN 2.2 job is being processed in the background. Check progress in Library.',
      wanAnimate: 'WAN Animate job is being processed in the background. Check progress in Library.',
      videoUpscale: 'Video upscale job is being processed in the background. Check progress in Library.',
      infiniteTalk: 'Infinite Talk job is being processed in the background. Check progress in Library.',
      fluxKrea: 'Flux Krea job is being processed in the background. Check progress in Library.'
    },

    // S3 스토리지 메시지
    S3: {
      FILE_UPLOADED: 'File uploaded successfully.',
      FOLDER_CREATED: 'Folder created successfully.',
      FILE_DELETED: 'File deleted successfully.',
      UPLOAD_FAILED: 'File upload failed.',
      DOWNLOAD_FAILED: 'File download failed.',
      DELETE_FAILED: 'File deletion failed.',
      CREATE_FOLDER_FAILED: 'Folder creation failed.',
      FILE_LIST_FAILED: 'Failed to get file list.',
      VOLUME_LIST_FAILED: 'Failed to get network volume list.',
      SERVER_UNSTABLE: 'RunPod S3 server is temporarily unstable. Please try again later.',
      FOLDER_CONFLICT: (key: string) => `Folder creation failed: '${key}' already exists as a file. Please delete the existing file or use a different folder name.`,
      VOLUME_NOT_SPECIFIED: 'Volume not specified.',
      SETTINGS_NOT_CONFIGURED: 'S3 settings not configured.',
      VOLUME_AND_KEY_REQUIRED: 'Volume and file key are required.',
      VOLUME_AND_FOLDER_KEY_REQUIRED: 'Volume and folder key are required.',
      LORA_VOLUME_NOT_SPECIFIED: 'Volume not specified. Please select a volume in S3 Storage page.',
      FILE_AND_VOLUME_REQUIRED: 'File and volume are required.'
    },

    // 워크스페이스 메시지
    WORKSPACE: {
      NAME_EXISTS: 'Workspace name already exists.',
      DEFAULT_CANNOT_DELETE: 'Default workspace cannot be deleted.'
    },

    // RunPod 통합 메시지
    RUNPOD: {
      AUTH_FAILED: 'RunPod authentication failed (401). Please resave your API Key/Endpoint ID in Settings.',
      S3_UPLOAD_FAILED: 'S3 upload failed. Please check your S3 settings.',
      S3_IMAGE_UPLOAD_FAILED: 'S3 image upload failed',
      S3_VIDEO_UPLOAD_FAILED: 'S3 video upload failed',
      SUBMISSION_FAILED: 'RunPod submission failed',
      WAN_ANIMATE_FAILED: 'WAN Animate generation failed',
      SETTINGS_NOT_CONFIGURED: 'RunPod settings not configured.'
    },

    // 입력 검증 메시지
    VALIDATION: {
      INPUT_TYPE_REQUIRED: 'input_type must be "image" or "video".',
      PERSON_COUNT_REQUIRED: 'person_count must be "single" or "multi".',
      IMAGE_FILE_REQUIRED: 'Image file is required.',
      VIDEO_FILE_REQUIRED: 'Video file is required.',
      AUDIO_AND_PROMPT_REQUIRED: 'Audio file and prompt are required.',
      SECOND_AUDIO_REQUIRED: 'Second audio file is required in multi-person mode.',
      UNKNOWN_ERROR: 'An unknown error occurred.'
    },

    // 설정 테스트 메시지
    SETTINGS_TEST: {
      ENDPOINT_SUCCESS: (endpointType: string) => `${endpointType} endpoint connection successful!`,
      ENDPOINT_FAILED: (endpointType: string, error?: string) => `${endpointType} endpoint connection failed${error ? ': ' + error : ''}`,
      ENDPOINT_ERROR: (endpointType: string, error?: string) => `${endpointType} endpoint connection error${error ? ': ' + error : ''}`,
      S3_SUCCESS: 'S3 connection successful!',
      S3_FAILED: (error?: string) => `S3 connection failed${error ? ': ' + error : ''}`
    },

    // 파일 관련 메시지
    FILE: {
      NO_FILES_PROVIDED: 'No files provided',
      FILE_NOT_FOUND: 'File not found',
      FAILED_TO_SERVE_FILE: 'Failed to serve file',
      INVALID_VIDEO_FILE: 'Invalid video file',
      FAILED_TO_GENERATE_THUMBNAIL: 'Failed to generate thumbnail',
      INTERNAL_SERVER_ERROR: 'Internal server error'
    },

    // 데이터베이스 관련 메시지
    DATABASE: {
      FAILED_TO_FETCH: 'Failed to fetch data',
      FAILED_TO_CREATE: 'Failed to create',
      FAILED_TO_UPDATE: 'Failed to update',
      FAILED_TO_DELETE: 'Failed to delete',
      NOT_FOUND: 'Data not found',
      CONNECTION_SUCCESSFUL: 'Database connection successful!'
    },

    // RunPod 설정 관련 메시지
    RUNPOD_CONFIG: {
      INCOMPLETE: (service: string) => `RunPod configuration incomplete. Please configure your API key and ${service} endpoint in Settings.`,
      MISSING_FOR_BACKGROUND: 'RunPod configuration missing for background processing',
      NOT_FOUND: 'RunPod configuration not found'
    },

    // 작업 관련 메시지
    JOB: {
      NOT_FOUND: 'Job not found',
      NOT_COMPLETED: 'Job not completed or no result available',
      FAILED_TO_GENERATE: 'Failed to generate content',
      ID_REQUIRED: 'Job ID is required',
      DELETED_SUCCESSFULLY: 'Job deleted successfully',
      FAILED_TO_DELETE: 'Failed to delete job',
      FAILED_TO_TOGGLE_FAVORITE: 'Failed to toggle favorite',
      FAILED_TO_MOVE: 'Failed to move job to workspace',
      FAILED_TO_REMOVE: 'Failed to remove job from workspace'
    },

    // 프리셋 관련 메시지
    PRESET: {
      FAILED_TO_FETCH: 'Failed to fetch presets',
      MISSING_ID: 'Missing preset ID',
      MISSING_FIELDS: 'Missing required fields',
      FAILED_TO_CREATE: 'Failed to create preset',
      FAILED_TO_DELETE: 'Failed to delete preset',
      DELETED_SUCCESSFULLY: 'Preset deleted successfully'
    },

    // 워크스페이스 관련 메시지
    WORKSPACE: {
      NAME_EXISTS: 'Workspace name already exists',
      DEFAULT_CANNOT_DELETE: 'Default workspace cannot be deleted',
      FAILED_TO_FETCH: 'Failed to fetch workspaces',
      NOT_FOUND: 'Workspace not found',
      FAILED_TO_CREATE: 'Failed to create workspace',
      FAILED_TO_UPDATE: 'Failed to update workspace',
      FAILED_TO_DELETE: 'Failed to delete workspace',
      FAILED_TO_INITIALIZE: 'Failed to initialize workspace',
      SAME_USER_REQUIRED: 'Workspace and job must belong to the same user',
      JOB_NOT_IN_WORKSPACE: 'Job is not in the specified workspace',
      DEFAULT_WORKSPACE: 'Default workspace',
      DEFAULT_DESCRIPTION: 'Default workspace where all your work is saved.'
    },

    // 설정 관련 메시지
    SETTINGS: {
      DATA_REQUIRED: 'Settings data is required',
      MUST_BE_OBJECT: 'Settings must be an object',
      RUNPOD_KEY_MUST_BE_STRING: 'RunPod API key must be a string',
      SAVED_SUCCESSFULLY: 'Settings saved successfully',
      API_KEY_AND_ENDPOINT_REQUIRED: 'API key and endpoint ID are required',
      MISSING_API_KEY: 'Missing API key',
      INVALID_SERVICE_TYPE: 'Invalid service type',
      RUNPOD_KEY_REQUIRED: 'RunPod API key is required',
      INVALID_API_KEY: 'Invalid API key - Authentication failed',
      ENDPOINT_NOT_FOUND: 'Endpoint not found - Check your endpoint ID',
      CONNECTION_FAILED: 'Connection failed - Check your network and API key'
    },

    // 마이그레이션 관련 메시지
    MIGRATION: {
      FAILED_TO_CHECK_STATUS: 'Failed to check migration status',
      COMPLETED_SUCCESSFULLY: 'Migration completed successfully',
      CLEANUP_COMPLETED: 'Cleanup completed',
      INVALID_ACTION: 'Invalid action',
      ACTION_FAILED: 'Migration action failed'
    },

    // MultiTalk 관련 메시지
    MULTITALK: {
      IMAGE_AND_AUDIO_REQUIRED: 'Image and at least one audio file are required',
      SECOND_AUDIO_REQUIRED: 'Second audio file is required for dual mode'
    },

    // 결과 관련 메시지
    RESULT: {
      NO_VALID_URL: 'No valid result URL found',
      FAILED_TO_SERVE: 'Failed to serve result',
      ACCESS_DIRECTLY: 'Please access the result directly',
      NO_ACCESSIBLE_RESULT: 'This job has no accessible result. Check the job options for more details.'
    },

    // 웹훅 관련 메시지
    WEBHOOK: {
      MISSING_JOB_ID_OR_URL: 'Missing jobId or resultUrl',
      RECEIVED_AND_UPDATED: 'Webhook received and job updated',
      FAILED_TO_PROCESS: 'Failed to process webhook'
    },

    // 일반 메시지
    GENERAL: {
      TEST_FAILED: 'Test failed',
      UNKNOWN_ERROR: 'Unknown error',
      NO_STACK_TRACE: 'No stack trace'
    }
  }
} as const;

// 메시지 getter 함수
export const getApiMessage = (category: keyof typeof ApiMessages.ko, key: string, language: 'ko' | 'en' = 'ko', ...params: any[]): string => {
  const langMessages = ApiMessages[language] || ApiMessages.ko;
  const messages = langMessages[category];
  const messageKey = key as keyof typeof messages;

  if (messages && messageKey in messages) {
    const message = (messages as any)[messageKey];

    // 함수형 메시지 처리
    if (typeof message === 'function') {
      return message(...params);
    }

    return message;
  }

  // 메시지가 없으면 키 반환
  return `${category}.${key}`;
};