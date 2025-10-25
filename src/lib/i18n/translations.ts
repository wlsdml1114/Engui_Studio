// src/lib/i18n/translations.ts

export const translations = {
  ko: {
    // Settings Page
    settings: {
      title: '설정',
      loading: '설정을 불러오는 중...',
      saveSettings: '설정 저장',
      saving: '저장 중...',
      settingsSaved: '설정이 저장되었습니다.',
      simpleSetup: '간단한 설정',
      personalUse: '개인 사용을 위해 암호화가 비활성화되었습니다.',
      howToUse: '사용법',
      howToUseDesc: '아래 설정을 입력하고 저장하세요',
      clearDatabase: '데이터베이스 초기화',
      clearDatabaseWarning: '⚠️  모든 설정 데이터가 삭제됩니다. 계속하시겠습니까?',
      databaseCleared: '데이터베이스가 초기화되었습니다. {count}개 설정이 삭제되었습니다.',
      databaseClearFailed: '데이터베이스 초기화 실패:',

      // RunPod Configuration
      runpodConfig: 'RunPod 설정',
      runpodApiKey: 'RunPod API Key',
      runpodApiKeyPlaceholder: 'RunPod API 키를 입력하세요',
      generateTimeout: '생성 타임아웃 (초)',
      generateTimeoutDesc: 'AI 작업 완료 대기 시간 (초 단위)',

      // Endpoint Names
      multitalkEndpoint: 'MultiTalk Endpoint ID',
      fluxKontextEndpoint: 'FLUX KONTEXT Endpoint ID',
      fluxKreaEndpoint: 'FLUX KREA Endpoint ID',
      wan22Endpoint: 'WAN 2.2 Endpoint ID',
      wanAnimateEndpoint: 'WAN Animate Endpoint ID',
      infiniteTalkEndpoint: 'Infinite Talk Endpoint ID',
      videoUpscaleEndpoint: 'Video Upscale Endpoint ID',

      // Endpoint Placeholders
      enterEndpoint: 'Enter {name} endpoint ID',

      // Buttons
      test: '테스트',
      testing: '테스트 중...',
      testS3: 'S3 테스트',

      // Test Results
      connectionSuccess: '연결 성공!',
      connectionFailed: '연결 실패:',
      connectionError: '연결 오류:',
      status: '상태:',

      // S3 Configuration
      s3Config: 'S3 스토리지 설정',
      endpointUrl: 'Endpoint URL',
      region: 'Region',
      accessKeyId: 'Access Key ID',
      bucketName: 'Bucket Name',
      s3UploadTimeout: 'S3 업로드 타임아웃 (초)',
      s3UploadTimeoutDesc: '💡 기본값: 3600초 (1시간). 큰 파일 업로드 시 늘릴 수 있습니다.',
      secretAccessKey: 'Secret Access Key',

      // Status
      fullyConfigured: '완전히 구성됨',
      partiallyConfigured: '부분적으로 구성됨',
      notConfigured: '구성되지 않음',

      // Placeholders
      placeholder: {
        generateTimeout: '3600',
        endpointUrl: 'https://s3api-region.runpod.io/',
        region: 'eu-ro-1',
        accessKey: 'Access key ID',
        bucketName: 'bucket-name',
        s3Timeout: '3600',
        secretKey: 'Secret access key'
      }
    },

    // Sidebar
    sidebar: {
      github: 'Engui Studio GitHub',
      discord: 'Discord 커뮤니티'
    },

    // Menu Items
    menu: {
      videoGeneration: 'WAN 2.2',
      wanAnimate: 'WAN Animate',
      videoUpscale: 'Video Upscale',
      fluxKontext: 'FLUX KONTEXT',
      fluxKrea: 'FLUX KREA',
      multitalk: 'MultiTalk',
      infiniteTalk: 'Infinite Talk',
      s3Storage: 'S3 Storage',
      settings: '설정'
    },

    // Language Settings
    language: {
      selectLanguage: '언어 선택',
      korean: '한국어',
      english: 'English'
    },

    // Common
    common: {
      loading: '로딩 중...',
      errorLabel: '오류',
      success: '성공',
      save: '저장',
      cancel: '취소',
      delete: '삭제',
      edit: '편집',
      close: '닫기',
      select: '선택',
      remove: '제거',
      download: '다운로드',
      refresh: '새로고침',
      reset: '초기화',
      generate: '생성',
      creating: '생성 중...',
      processing: '처리 중...',
      upload: '업로드',
      uploading: '업로드 중...',
      settings: '설정',
      jobInfo: '작업 정보',
      width: '가로 크기',
      height: '세로 크기',
      seed: 'Seed',
      guidance: 'Guidance',
      steps: 'Steps',
      prompt: '프롬프트',
      status: '상태',
      style: '스타일',
      resolution: '해상도',
      placeholder: {
        prompt: '예: A person walking in a beautiful garden...',
        width: '720',
        height: '480',
        seed: '-1',
        guidance: '2.5',
        steps: '10'
      },

      // Additional translations
      video: '비디오',
      image: '이미지',
      videoSection: {
        resolution: '비디오 해상도',
        estimatedFps: '추정 FPS',
        outputResolution: '출력 해상도',
        original: '원본'
      },
      size: {
        mustBeMultipleOf64: '64의 배수여야 합니다',
        recommended: '권장값'
      },
      error: {
        generationFailed: '생성 요청에 실패했습니다.',
        processingDroppedData: '드롭된 데이터 처리 중 오류가 발생했습니다.',
        noMediaData: '미디어 데이터가 없습니다.',
        generationError: '생성 중 오류가 발생했습니다.',
        processingMedia: '미디어 처리 중 오류가 발생했습니다.'
      }
    },

    // Video Generation (WAN 2.2)
    videoGeneration: {
      title: 'WAN 2.2',
      prompt: '프롬프트 *',
      imageFile: '이미지 파일 *',
      endFrame: '엔드 프레임 파일',
      endFrameOptional: '(선택사항)',
      endFrameDesc: '엔드 프레임 파일을 선택하거나 드래그하세요',
      selectEndFrame: '파일 선택',
      removeEndFrame: '엔드 프레임 제거',
      length: 'Length (16fps)',
      contextOverlap: 'Context Overlap',
      contextOverlapDesc: '긴영상을 생성할때 overlap되는 구간 길이',
      removeFile: '파일 제거',
      selectFile: '파일 선택',
      random: '랜덤',
      thumbnailDownload: '썸네일 다운로드',
      loraRefresh: 'LoRA 목록 새로고침',
      generateBtn: 'WAN 2.2 생성',
      loraSettings: 'LoRA 모델 설정',
      jobStarted: 'WAN 2.2 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
      loraNotAvailable: '사용 가능한 LoRA 파일이 없습니다. 설정 페이지에서 S3 스토리지를 먼저 설정하거나, S3 스토리지에서 .safetensors 파일을 업로드하세요.',
      inputRequired: '이미지와 프롬프트를 모두 입력해주세요.',
      loraPairsRequired: '모든 LoRA pair의 high/low 파일을 선택하고 가중치를 설정해주세요.',
      ffmpegNotInstalled: 'FFmpeg가 설치되지 않았습니다. 썸네일 생성 기능을 사용하려면 FFmpeg를 설치해주세요.',
      thumbnailGenerated: '비디오 썸네일이 성공적으로 생성되었습니다.',
      thumbnailGenerateFailed: '썸네일 생성에 실패했습니다.',
      thumbnailError: '썸네일 생성 중 오류가 발생했습니다.',
      dragAndDrop: {
        dropHere: '🎯 여기에 놓으세요!',
        selectOrDrag: '이미지 파일을 선택하거나 드래그하세요',
        dragFromLibrary: '라이브러리의 결과물(FLUX KONTEXT, FLUX KREA)을 여기에 드래그하세요',
        imageOnly: 'WAN 2.2는 이미지만 입력으로 받을 수 있습니다. {jobType} 결과물은 비디오이므로 사용할 수 없습니다. FLUX KONTEXT나 FLUX KREA의 이미지 결과물을 드래그해주세요.',
        reusedAsInput: '라이브러리에서 {jobType} 결과물을 입력 이미지로 사용했습니다!'
      },
      lora: {
        highFile: 'High 파일 🔺',
        lowFile: 'Low 파일 🔻',
        highWeight: 'High 가중치 (0.1 - 2.0)',
        lowWeight: 'Low 가중치 (0.1 - 2.0)',
        pairNumber: 'LoRA Pair {index}',
        selectHigh: 'High 파일을 선택하세요',
        selectLow: 'Low 파일을 선택하세요',
        loading: '로딩 중...'
      }
    },

    // WAN Animate
    wanAnimate: {
      title: 'WAN Animate',
      prompt: '프롬프트',
      imageUpload: '이미지 업로드',
      videoUpload: '비디오 업로드',
      cfgScale: 'CFG Scale',
      selectImageFile: '이미지 파일 선택',
      selectVideoFile: '비디오 파일 선택',
      selectPerson: '인물 선택',
      completeSelection: '선택 완료 ({count}개 포인트)',
      generateBtn: '애니메이션 생성',
      advancedSettings: '고급 설정',
      userGuide: '사용 안내',
      randomSeed: '-1은 랜덤 시드',
      guidanceDesc: '프롬프트 준수도 (1.0-20.0)',
      stepsDesc: '생성 단계 수',
      widthDesc: '출력 비디오 너비 (64의 배수여야 함)',
      heightDesc: '출력 비디오 높이 (64의 배수여야 함)',
      videoUploadNote: '비디오 업로드 시 "인물 선택" 버튼으로 포인트를 지정할 수 있습니다.',
      clickToAddPoint: '이미지를 클릭하여 원하는 위치에 포인트를 추가하세요.',
      clickToRemovePoint: '포인트를 클릭하면 삭제할 수 있습니다.',
      videoRatioNote: '비디오는 원본 비율을 유지하여 표시됩니다.',
      resolutionNote: '출력 해상도는 원본과 다를 수 있으니 확인해주세요.',
      sizeWarning: '⚠️ Width와 Height는 반드시 64의 배수여야 합니다 (예: 512, 576, 640, 704, 768 등)',
      inputRequired: '이미지 또는 비디오 파일을 업로드해주세요.',
      promptRequired: '프롬프트를 입력해주세요.',
      generationStarted: '비디오 생성이 시작되었습니다. Job ID: {jobId}',
      dragAndDrop: {
        dropHere: '🎯 여기에 놓으세요!',
        selectImage: '이미지 파일 선택',
        selectVideo: '비디오 파일 선택',
        reusedAsMedia: '라이브러리에서 {jobType} 결과물을 {isVideo}로 사용했습니다!'
      },
      personSelection: {
        title: '인물 선택 가이드',
        clickToSelect: '• 이미지를 클릭하여 포인트를 선택하세요',
        clickToDelete: '• 선택된 포인트를 클릭하면 삭제됩니다',
        currentPoints: '• 현재 {count}개 포인트가 선택되었습니다'
      }
    },

    // Video Upscale
    videoUpscale: {
      title: 'Video Upscale',
      videoFile: '비디오 파일 *',
      jobType: '작업 타입 *',
      removeVideo: '비디오 제거',
      selectVideo: '비디오 선택',
      upscale: 'Upscale',
      upscaleInterpolation: 'Upscale & Interpolation',
      upscaleBtn: '비디오 업스케일',
      processingBtn: '처리 중...',
      upscaleDesc: 'Upscale: 비디오 해상도를 높입니다',
      upscaleInterpolationDesc: 'Upscale & Interpolation: 비디오 해상도를 높이고 프레임 보간을 수행합니다',
      jobStarted: '비디오 업스케일 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
      videoRequired: '비디오 파일을 선택해주세요.',
      dragAndDrop: {
        dropHere: '🎯 여기에 놓으세요!',
        selectOrDrag: '비디오 파일을 선택하거나 드래그하세요',
        dragFromLibrary: '라이브러리의 비디오 결과물을 여기에 드래그하세요',
        reusedAsVideo: '라이브러리에서 {jobType} 결과물을 비디오로 사용했습니다!'
      },
      noVideoData: '이 드래그된 항목에는 비디오 데이터가 없습니다. Video Upscale은 비디오만 지원합니다.',
      dropError: '드롭된 데이터를 처리하는 중 오류가 발생했습니다.',
      dropVideoError: '드롭된 비디오를 처리하는 중 오류가 발생했습니다. URL: {url}',
      upscaleRequestFailed: '비디오 업스케일 요청에 실패했습니다.',
      upscaleError: '비디오 업스케일 중 오류가 발생했습니다.',
      settings: '설정',
      jobTypeDesc: '작업 타입 설명',
      resetBtn: '초기화',
      jobInfo: '작업 정보',
      statusProcessing: '백그라운드 처리 중',
      jobInfoText: '✅ 비디오 업스케일 작업이 백그라운드에서 처리되고 있습니다.',
      canPerformOtherTasks: '• 다른 작업을 자유롭게 수행할 수 있습니다',
      checkLibrary: '• Library에서 진행 상황을 확인하세요',
      autoUpdateStatus: '• 작업 완료 시 자동으로 상태가 업데이트됩니다'
    },

    // FLUX KONTEXT
    fluxKontext: {
      title: 'FLUX KONTEXT',
      inputImage: '입력 이미지',
      prompt: '프롬프트',
      seedValue: 'SEED 값',
      guidanceValue: 'Guidance 값',
      generateBtn: '이미지 생성하기',
      detailSettings: '디테일 설정',
      promptTip: '💡 구체적이고 자세한 설명일수록 더 좋은 결과를 얻을 수 있습니다.',
      seedTip: '💡 -1은 랜덤, 고정값은 동일한 결과 생성',
      guidanceTip: '💡 높을수록 프롬프트를 더 엄격하게 따름 (2.5 권장)',
      generationTime: '이미지 생성에는 몇 분 정도 소요될 수 있습니다.',
      jobStarted: 'FLUX KONTEXT 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
      inputRequired: '이미지와 프롬프트를 모두 입력해주세요.',
      dragAndDrop: {
        dropHere: '🎯 여기에 놓으세요!',
        clickToUpload: '이미지를 클릭하여 업로드하세요',
        dragFromLibrary: '라이브러리의 결과물을 드래그하세요',
        supportedFormats: 'PNG, JPG, WEBP 지원',
        reusedAsInput: '라이브러리에서 {jobType} 결과물을 입력 이미지로 사용했습니다!'
      }
    },

    // FLUX KREA
    fluxKrea: {
      title: 'FLUX KREA',
      model: 'Model (선택사항)',
      modelPlaceholder: '모델명을 입력하세요',
      loraOptional: 'LoRA 파일 (선택사항)',
      loraWeight: 'LoRA 가중치 (0.1 - 2.0)',
      generateBtn: 'FLUX KREA 생성',
      loraNotAvailable: '사용 가능한 LoRA 파일이 없습니다. 설정 페이지에서 S3 스토리지를 먼저 설정하거나, S3 스토리지에서 .safetensors 파일을 업로드하세요.',
      jobStarted: 'Flux Krea 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
      noLora: 'LoRA 사용 안함',
      inputRequired: '프롬프트를 입력해주세요.',
      dragAndDrop: {
        dropHere: '🎯 여기에 놓으세요!',
        clickToUpload: '이미지를 클릭하여 업로드하세요',
        dragFromLibrary: '라이브러리의 결과물을 드래그하세요',
        supportedFormats: 'PNG, JPG, WEBP 지원'
      }
    },

    // MultiTalk
    multitalk: {
      title: 'MultiTalk',
      audioFile: '오디오 파일 *',
      audioMode: '오디오 모드',
      removeImage: '이미지 제거',
      selectImage: '이미지 선택',
      removeAudio1: '오디오 1 제거',
      selectAudio1: '오디오 1 선택',
      removeAudio2: '오디오 2 제거',
      selectAudio2: '오디오 2 선택',
      singleMode: '싱글 모드',
      dualMode: '듀얼 모드',
      generateBtn: 'MultiTalk 생성',
      dualAudioTip: '💡 듀얼 오디오 모드에서는 audio_type이 자동으로 \'para\'로 설정됩니다.',
      singleAudioTip: '💡 하나의 오디오 파일로 비디오 생성',
      dualAudioTip2: '💡 두 개의 오디오 파일로 대화형 비디오 생성',
      imageRequired: '이미지를 선택해주세요.',
      audioRequired: '최소 하나의 오디오 파일을 선택해주세요.',
      dualAudioRequired: '듀얼 모드에서는 두 개의 오디오 파일이 필요합니다.',
      jobSubmitted: 'MultiTalk 생성 요청이 성공적으로 접수되었습니다! Job ID: {jobId} (RunPod: {runpodJobId}). 라이브러리에서 진행 상황을 확인하세요.',
      dragAndDrop: {
        dropHere: '🎯 여기에 놓으세요!',
        selectOrDrag: '이미지 파일을 선택하거나 드래그하세요',
        dragFromLibrary: '라이브러리의 결과물을 여기에 드래그하세요',
        reusedAsImage: '라이브러리에서 {jobType} 결과물을 이미지로 사용했습니다!'
      }
    },

    // Infinite Talk
    infiniteTalk: {
      title: 'Infinite Talk',
      imageFile: '이미지 파일 *',
      videoFile: '비디오 파일 *',
      firstAudioFile: '첫 번째 오디오 파일 *',
      secondAudioFile: '두 번째 오디오 파일 *',
      inputType: '입력 타입 *',
      personCount: '인물 수 *',
      audioStartTime: '오디오 시작 시간',
      audioEndTime: '오디오 종료 시간',
      audio2StartTime: '오디오2 시작 시간',
      audio2EndTime: '오디오2 종료 시간',
      removeImage: '이미지 제거',
      removeVideo: '비디오 제거',
      removeAudio: '오디오 제거',
      selectImage: '이미지 선택',
      selectVideo: '비디오 선택',
      selectAudio: '오디오 선택',
      selectSecondAudio: '두 번째 오디오 선택',
      thumbnailDownload: '썸네일 다운로드',
      image: '이미지',
      video: '비디오',
      singlePerson: '단일 인물',
      multiPerson: '다중 인물',
      generateBtn: 'Infinite Talk 생성',
      audioTrim: '오디오 트림',
      audioTrimDesc: '원하는 구간만 잘라 사용할 수 있어요. hh:mm:ss(.ms), mm:ss 또는 초 단위 입력을 지원합니다.',
      jobStarted: 'Infinite Talk 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
      inputRequired: '이미지와 프롬프트를 모두 입력해주세요.',
      dragAndDrop: {
        dropHere: '🎯 여기에 놓으세요!',
        selectOrDragImage: '이미지 파일을 선택하거나 드래그하세요',
        dragImageFromLibrary: '라이브러리의 결과물을 여기에 드래그하세요',
        selectOrDragVideo: '비디오 파일을 선택하거나 드래그하세요',
        dragVideoFromLibrary: '라이브러리의 비디오 결과물을 여기에 드래그하세요',
        selectOrDragAudio: '오디오 파일을 선택하거나 드래그하세요 (WAV 권장)',
        selectOrDragAudio2: '두 번째 오디오 파일을 선택하거나 드래그하세요 (WAV 권장)',
        reusedAsMedia: '라이브러리의 결과물을 {isVideo}로 사용했습니다!',
        processError: '드롭된 미디어를 처리하는 중 오류가 발생했습니다.'
      },
      placeholder: {
        prompt: '예: A person is talking about technology...',
        time: '예: 12.5 또는 00:00:12.5',
        endTime: '예: 24 또는 00:00:24',
        startTime: '예: 5 또는 00:00:05',
        endTime2: '예: 15 또는 00:00:15',
        personCount: '640'
      }
    },

    // S3 Storage
    s3Storage: {
      title: 'S3 Storage Management',
      subtitle: 'RunPod Network Volume의 모델과 LoRA 파일을 관리하세요',
      fileExplorer: '파일 탐색',
      upload: '업로드',
      fileList: '파일 목록',
      itemsCount: '개 항목',
      uploadLocation: '업로드 위치',
      refresh: '새로고침',
      parentFolder: '상위 폴더',
      createFolder: '폴더 생성',
      create: '생성',
      cancel: '취소',
      uploading: '업로드 중...',
      uploadComplete: '업로드가 완료되었습니다!',
      folderCreateNote: 'S3에서는 폴더가 자동으로 생성됩니다. 파일을 업로드하면 해당 경로의 폴더가 자동으로 만들어집니다.',
      uploadDesc: '모델이나 LoRA 파일을 네트워크 볼륨에 업로드하세요',
      uploadLocationNote: '파일이 이 위치에 업로드됩니다',
      status: {
        preparing: '업로드 준비 중...',
        uploading: '파일 업로드 중...',
        processing: '서버에서 처리 중...',
        complete: '업로드 완료!',
        failed: '업로드 실패',
        creatingFolder: '폴더 생성 중...',
        folderCreated: '폴더 생성 완료!',
        folderCreateFailed: '폴더 생성 실패'
      },
      noFiles: '파일이 없습니다',
      fileType: {
        directory: 'directory',
        model: 'model',
        lora: 'lora',
        other: 'other'
      },
      errors: {
        volumeInitFailed: '볼륨을 초기화할 수 없습니다.',
        fileListFailed: '파일 목록을 가져올 수 없습니다.',
        serverUnstable: 'RunPod S3 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.',
        uploadFailed: '파일 업로드에 실패했습니다.',
        pathConflict: '경로 충돌',
        downloadFailed: '파일 다운로드에 실패했습니다.',
        deleteFailed: '파일 삭제에 실패했습니다.',
        createFolderFailed: '폴더 생성에 실패했습니다.'
      },
      formLabels: {
        folderName: '폴더 이름을 입력하세요',
        selectFile: '파일 선택'
      },
      warnings: {
        deleteFile: '정말로 이 파일을 삭제하시겠습니까?'
      }
    },

    // My Presets
    myPresets: {
      title: 'My Presets',
      createNew: 'Create New Preset',
      existing: 'Existing Presets',
      presetName: 'Preset Name',
      type: 'Type',
      options: 'Options (JSON)',
      delete: 'Delete',
      creating: 'Creating...',
      createBtn: 'Create Preset',
      noPresets: 'No presets saved yet.',
      error: 'Error: {error}'
    },

    // Credit Activity
    creditActivity: {
      title: '크레딧 활동',
      noActivities: '아직 크레딧 활동이 없습니다.',
      activity: '활동',
      amount: '금액',
      date: '날짜',
      loading: '크레딧 활동을 불러오는 중...',
      loadFailed: '크레딧 활동을 불로드하는 데 실패했습니다'
    },

    // Library
    library: {
      title: '라이브러리',
      allJobs: '전체 작업',
      favoritesOnly: '즐겨찾기만 보기',
      showAll: '전체 보기',
      noFavorites: '즐겨찾기된 항목이 없습니다.',
      noResults: '작업 결과가 없습니다.',
      processing: '처리 중',
      completed: '완료',
      failed: '실패',
      delete: '삭제',
      cancel: '취소',
      deleting: '삭제 중...',
      reuseInputs: '입력값 재사용',
      moveToWorkspace: '워크스페이스로 이동',
      removeFromWorkspace: '워크스페이스에서 제거',
      addFavorite: '즐겨찾기 추가',
      removeFavorite: '즐겨찾기 해제',
      manage: '관리',
      select: '선택',
      selected: '선택됨',
      previous: '이전',
      next: '다음',
      deleteConfirm: '결과물 삭제',
      deleteConfirmMessage: '결과물을 삭제하시겠습니까?',
      deleteConfirmWarning: '이 작업은 되돌릴 수 없습니다.',
      jobInfo: '작업 정보',
      createdAt: '생성 시간',
      completedAt: '완료 시간',
      status: '상태',
      resultNotFound: '결과물을 찾을 수 없습니다.',
      jobNotCompleted: '작업이 아직 완료되지 않았을 수 있습니다.',
      resultUrlNotSet: '결과 URL이 설정되지 않았을 수 있습니다.',
      tryAgainLater: '잠시 후 다시 시도해보세요.',
      videoNotPlaying: '비디오가 재생되지 않는 경우, 직접 다운로드하여 확인해보세요.',
      fluxKontextImage: 'FLUX KONTEXT로 생성된 이미지입니다.',
      fluxKreaImage: 'FLUX KREA로 생성된 이미지입니다.',
      inputImageInfo: '입력 이미지 정보를 찾을 수 없습니다.',
      inputImageParseError: '입력 이미지 정보를 파싱할 수 없습니다.',
      workspace: '워크스페이스',
      workspaceManagement: '워크스페이스 관리',
      createWorkspace: '새 워크스페이스 생성',
      workspaceNamePlaceholder: '워크스페이스 이름을 입력하세요',
      create: '✨ 생성',
      workspaceList: '워크스페이스 목록',
      default: '기본',
      deleteWorkspace: '워크스페이스 삭제',
      deleteWorkspaceWarning: '이 작업은 되돌릴 수 없습니다',
      deleteWorkspaceConfirm: '"{name}" 워크스페이스를 삭제하시겠습니까?',
      deleteWorkspaceWarningList: '⚠️ 삭제 시 다음이 적용됩니다:\n<ul className="list-disc list-inside space-y-1 ml-2"><li>워크스페이스 내 모든 작업이 기본 워크스페이스로 이동됩니다</li><li>워크스페이스는 완전히 삭제됩니다</li><li>이 작업은 되돌릴 수 없습니다</li></ul>',
      lastUpdated: '최근 업데이트:',
      updating: '업데이트 중...',
      failedToLoadJobs: '작업 불러오기에 실패했습니다',
      loading: '로딩 중...',
      favoriteToggleFailed: '즐겨찾기 상태 변경에 실패했습니다.',
      favoriteToggleError: '즐겨찾기 상태 변경 중 오류가 발생했습니다.',
      deleteFailed: '삭제에 실패했습니다.',
      deleteError: '삭제 중 오류가 발생했습니다.',
      workspaceCreateFailed: '워크스페이스 생성에 실패했습니다.',
      workspaceCreateError: '워크스페이스 생성 중 오류가 발생했습니다.',
      jobMoveFailed: '작업 이동에 실패했습니다.',
      jobMoveError: '작업 이동 중 오류가 발생했습니다.',
      workspaceDeleteFailed: '워크스페이스 삭제에 실패했습니다.',
      workspaceDeleteError: '워크스페이스 삭제 중 오류가 발생했습니다.',
      quotaExceeded: '저장 공간이 부족합니다. 브라우저의 저장된 데이터를 정리한 후 다시 시도해주세요.',
      reuseError: '입력값 재사용 중 오류가 발생했습니다.',
      pageNotFound: '해당 타입의 페이지를 찾을 수 없습니다.',
      inputImageLoadError: '⚠️ 입력 이미지를 불러올 수 없습니다',
      fileNotInPublicFolder: '💡 파일이 public/results 폴더에 있는지 확인하세요',
      wan22InputImageError: '⚠️ WAN 2.2 입력 이미지를 불러올 수 없습니다',
      wanAnimateInputImageError: '⚠️ WAN Animate 입력 이미지를 불러올 수 없습니다',
      wanAnimateInputVideoError: '⚠️ WAN Animate 입력 비디오를 불러올 수 없습니다',
      infiniteTalkInputImageError: '⚠️ Infinite Talk 입력 이미지를 불러올 수 없습니다',
      infiniteTalkInputVideoError: '⚠️ Infinite Talk 입력 비디오를 불러올 수 없습니다',
      webPath: '웹 경로',
      actualPath: '실제 경로',
      fileName: '파일명',
      webAccessIssue: '💡 파일은 존재하지만 웹 접근 경로 문제일 수 있습니다',
      s3Path: 'S3 경로',
      fallbackPath: 'Fallback 경로',
      localWebPath: 'Local Web Path',
      base64ImageData: 'Base64 Image Data',
      format: 'Format',
      size: 'Size',
      available: 'Available',
      inputFiles: '입력 파일',
      inputImage: '입력 이미지',
      inputVideo: '입력 비디오',
      inputFileNotFound: '입력 파일 정보를 찾을 수 없습니다.',
      wanAnimateOptionsParseError: 'WAN Animate 옵션을 파싱할 수 없습니다.',
      infiniteTalkOptionsParseError: 'Infinite Talk 옵션을 파싱할 수 없습니다.',
      infiniteTalkInputImageNotFound: 'Infinite Talk 입력 이미지 정보를 찾을 수 없습니다.'
    },

    // General Messages
    messages: {
      inputsLoaded: '이전 작업의 입력값이 자동으로 로드되었습니다!',
      jobInProgress: '• 다른 작업을 자유롭게 수행할 수 있습니다',
      checkLibrary: '• Library에서 진행 상황을 확인하세요',
      autoUpdate: '• 작업 완료 시 자동으로 상태가 업데이트됩니다',
      generationRequestAccepted: '이미지 생성 요청이 성공적으로 접수되었습니다! Job ID: {jobId}. 라이브러리에서 진행 상황을 확인하세요.',
      error: '오류: {error}'
    },

    // API Messages
    api: {
      // Job Processing Messages
      jobStarted: {
        wan22: 'WAN 2.2 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
        wanAnimate: 'WAN Animate 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
        videoUpscale: '비디오 업스케일 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
        infiniteTalk: 'Infinite Talk 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.',
        fluxKrea: 'Flux Krea 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.'
      },

      // S3 Storage Messages
      s3: {
        fileUploaded: '파일이 성공적으로 업로드되었습니다.',
        folderCreated: '폴더가 성공적으로 생성되었습니다.',
        fileDeleted: '파일이 성공적으로 삭제되었습니다.',
        uploadFailed: '파일 업로드에 실패했습니다.',
        downloadFailed: '파일 다운로드에 실패했습니다.',
        deleteFailed: '파일 삭제에 실패했습니다.',
        createFolderFailed: '폴더 생성에 실패했습니다.',
        fileListFailed: '파일 목록을 가져올 수 없습니다.',
        volumeListFailed: '네트워크 볼륨 목록을 가져올 수 없습니다.',
        serverUnstable: 'RunPod S3 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.',
        folderConflict: '폴더 생성 실패: \'{key}\'는 이미 파일로 존재합니다. 기존 파일을 삭제하거나 다른 폴더명을 사용해주세요.',
        volumeNotSpecified: '볼륨이 지정되지 않았습니다.',
        settingsNotConfigured: 'S3 설정이 완료되지 않았습니다.',
        volumeAndKeyRequired: '볼륨과 파일 키가 필요합니다.',
        volumeAndFolderKeyRequired: '볼륨과 폴더 키가 필요합니다.',
        loraVolumeNotSpecified: '볼륨이 지정되지 않았습니다. S3 Storage 페이지에서 볼륨을 선택해주세요.',
        fileAndVolumeRequired: '파일과 볼륨이 필요합니다.'
      },

      // Workspace Messages
      workspace: {
        nameExists: '워크스페이스 이름이 이미 존재합니다.',
        defaultCannotDelete: '기본 워크스페이스는 삭제할 수 없습니다.'
      },

      // RunPod Integration Messages
      runpod: {
        authFailed: 'RunPod 인증 실패(401). Settings의 API Key/Endpoint ID를 다시 저장해주세요.',
        s3UploadFailed: 'S3 업로드에 실패했습니다. S3 설정을 확인하세요.',
        s3ImageUploadFailed: 'S3 이미지 업로드 실패',
        s3VideoUploadFailed: 'S3 비디오 업로드 실패',
        submissionFailed: 'RunPod 제출 실패',
        wanAnimateFailed: 'WAN Animate 생성 실패',
        settingsNotConfigured: 'RunPod 설정이 완료되지 않았습니다.'
      },

      // Input Validation Messages
      validation: {
        inputTypeRequired: 'input_type은 "image" 또는 "video"여야 합니다.',
        personCountRequired: 'person_count는 "single" 또는 "multi"여야 합니다.',
        imageFileRequired: '이미지 파일이 필요합니다.',
        videoFileRequired: '비디오 파일이 필요합니다.',
        audioAndPromptRequired: '오디오 파일과 프롬프트가 필요합니다.',
        secondAudioRequired: '다중 인물 모드에서는 두 번째 오디오 파일이 필요합니다.',
        unknownError: '알 수 없는 오류가 발생했습니다.'
      },

      // Settings Test Messages
      settingsTest: {
        endpointSuccess: '{endpointType} endpoint 연결 성공!',
        endpointFailed: '{endpointType} endpoint 연결 실패',
        endpointError: '{endpointType} endpoint 연결 오류',
        s3Success: 'S3 연결 성공!',
        s3Failed: 'S3 연결 실패'
      }
    }
  },

  en: {
    // Settings Page
    settings: {
      title: 'Settings',
      loading: 'Loading settings...',
      saveSettings: 'Save Settings',
      saving: 'Saving...',
      settingsSaved: 'Settings saved successfully!',
      simpleSetup: 'Simple Setup',
      personalUse: 'Encryption disabled for personal use.',
      howToUse: 'How to Use',
      howToUseDesc: 'Enter your settings below and save',
      clearDatabase: 'Clear Database',
      clearDatabaseWarning: '⚠️  All settings data will be deleted. Continue?',
      databaseCleared: 'Database has been reset. {count} settings deleted.',
      databaseClearFailed: 'Database reset failed:',

      // RunPod Configuration
      runpodConfig: 'RunPod Configuration',
      runpodApiKey: 'RunPod API Key',
      runpodApiKeyPlaceholder: 'Enter your RunPod API key',
      generateTimeout: 'Generate Timeout (seconds)',
      generateTimeoutDesc: 'AI task completion waiting time (in seconds)',

      // Endpoint Names
      multitalkEndpoint: 'MultiTalk Endpoint ID',
      fluxKontextEndpoint: 'FLUX KONTEXT Endpoint ID',
      fluxKreaEndpoint: 'FLUX KREA Endpoint ID',
      wan22Endpoint: 'WAN 2.2 Endpoint ID',
      wanAnimateEndpoint: 'WAN Animate Endpoint ID',
      infiniteTalkEndpoint: 'Infinite Talk Endpoint ID',
      videoUpscaleEndpoint: 'Video Upscale Endpoint ID',

      // Endpoint Placeholders
      enterEndpoint: 'Enter {name} endpoint ID',

      // Buttons
      test: 'Test',
      testing: 'Testing...',
      testS3: 'Test S3',

      // Test Results
      connectionSuccess: 'Connection successful!',
      connectionFailed: 'Connection failed:',
      connectionError: 'Connection error:',
      status: 'Status:',

      // S3 Configuration
      s3Config: 'S3 Storage Configuration',
      endpointUrl: 'Endpoint URL',
      region: 'Region',
      accessKeyId: 'Access Key ID',
      bucketName: 'Bucket Name',
      s3UploadTimeout: 'S3 Upload Timeout (seconds)',
      s3UploadTimeoutDesc: '💡 Default: 3600 seconds (1 hour). Increase for large file uploads.',
      secretAccessKey: 'Secret Access Key',

      // Status
      fullyConfigured: 'Fully Configured',
      partiallyConfigured: 'Partially Configured',
      notConfigured: 'Not Configured',

      // Placeholders
      placeholder: {
        generateTimeout: '3600',
        endpointUrl: 'https://s3api-region.runpod.io/',
        region: 'eu-ro-1',
        accessKey: 'Access key ID',
        bucketName: 'bucket-name',
        s3Timeout: '3600',
        secretKey: 'Secret access key'
      }
    },

    // Sidebar
    sidebar: {
      github: 'Engui Studio GitHub',
      discord: 'Discord Community'
    },

    // Menu Items
    menu: {
      videoGeneration: 'WAN 2.2',
      wanAnimate: 'WAN Animate',
      videoUpscale: 'Video Upscale',
      fluxKontext: 'FLUX KONTEXT',
      fluxKrea: 'FLUX KREA',
      multitalk: 'MultiTalk',
      infiniteTalk: 'Infinite Talk',
      s3Storage: 'S3 Storage',
      settings: 'Settings'
    },

    // Language Settings
    language: {
      selectLanguage: 'Select Language',
      korean: '한국어',
      english: 'English'
    },

    // Common
    common: {
      loading: 'Loading...',
      errorLabel: 'Error',
      success: 'Success',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      select: 'Select',
      remove: 'Remove',
      download: 'Download',
      refresh: 'Refresh',
      reset: 'Reset',
      generate: 'Generate',
      creating: 'Creating...',
      processing: 'Processing...',
      upload: 'Upload',
      uploading: 'Uploading...',
      settings: 'Settings',
      jobInfo: 'Job Info',
      width: 'Width',
      height: 'Height',
      seed: 'Seed',
      guidance: 'Guidance',
      steps: 'Steps',
      prompt: 'Prompt',
      status: 'Status',
      style: 'Style',
      resolution: 'Resolution',
      placeholder: {
        prompt: 'e.g., A person walking in a beautiful garden...',
        width: '720',
        height: '480',
        seed: '-1',
        guidance: '2.5',
        steps: '10'
      },

      // Additional translations
      video: 'Video',
      image: 'Image',
      videoSection: {
        resolution: 'Video resolution',
        estimatedFps: 'Estimated FPS',
        outputResolution: 'Output resolution',
        original: 'Original'
      },
      size: {
        mustBeMultipleOf64: 'must be multiple of 64',
        recommended: 'Recommended value'
      },
      error: {
        generationFailed: 'Failed to process generation request.',
        processingDroppedData: 'An error occurred while processing dropped data.',
        noMediaData: 'No media data found.',
        generationError: 'An error occurred during generation.',
        processingMedia: 'An error occurred while processing media.'
      }
    },

    // Video Generation (WAN 2.2)
    videoGeneration: {
      title: 'WAN 2.2',
      prompt: 'Prompt *',
      imageFile: 'Image File *',
      endFrame: 'End Frame File',
      endFrameOptional: '(Optional)',
      endFrameDesc: 'Select or drag end frame files',
      selectEndFrame: 'Select File',
      removeEndFrame: 'Remove End Frame',
      length: 'Length (16fps)',
      contextOverlap: 'Context Overlap',
      contextOverlapDesc: 'Overlap length when generating long videos',
      removeFile: 'Remove File',
      selectFile: 'Select File',
      random: 'Random',
      thumbnailDownload: 'Download Thumbnail',
      loraRefresh: 'Refresh LoRA List',
      generateBtn: 'Generate WAN 2.2',
      loraSettings: 'LoRA Model Settings',
      jobStarted: 'WAN 2.2 job is being processed in the background. Check progress in Library.',
      loraNotAvailable: 'No LoRA files available. First set up S3 storage in Settings page, or upload .safetensors files to S3 storage.',
      inputRequired: 'Please enter both image and prompt.',
      loraPairsRequired: 'Please select high/low files for all LoRA pairs and set weights.',
      ffmpegNotInstalled: 'FFmpeg is not installed. Install FFmpeg to use thumbnail generation feature.',
      thumbnailGenerated: 'Video thumbnail successfully generated.',
      thumbnailGenerateFailed: 'Thumbnail generation failed.',
      thumbnailError: 'Error occurred during thumbnail generation.',
      dragAndDrop: {
        dropHere: '🎯 Drop here!',
        selectOrDrag: 'Select or drag image files',
        dragFromLibrary: 'Drag results from Library (FLUX KONTEXT, FLUX KREA) here',
        imageOnly: 'WAN 2.2 only accepts images as input. {jobType} results are videos and cannot be used. Please drag image results from FLUX KONTEXT or FLUX KREA.',
        reusedAsInput: 'Used {jobType} result from library as input image!'
      },
      lora: {
        highFile: 'High File 🔺',
        lowFile: 'Low File 🔻',
        highWeight: 'High Weight (0.1 - 2.0)',
        lowWeight: 'Low Weight (0.1 - 2.0)',
        pairNumber: 'LoRA Pair {index}',
        selectHigh: 'Select High File',
        selectLow: 'Select Low File',
        loading: 'Loading...'
      }
    },

    // WAN Animate
    wanAnimate: {
      title: 'WAN Animate',
      prompt: 'Prompt',
      imageUpload: 'Image Upload',
      videoUpload: 'Video Upload',
      cfgScale: 'CFG Scale',
      selectImageFile: 'Select Image File',
      selectVideoFile: 'Select Video File',
      selectPerson: 'Select Person',
      completeSelection: 'Complete Selection ({count} points)',
      generateBtn: 'Generate Animation',
      advancedSettings: 'Advanced Settings',
      userGuide: 'User Guide',
      randomSeed: '-1 is random seed',
      guidanceDesc: 'Prompt adherence (1.0-20.0)',
      stepsDesc: 'Number of generation steps',
      widthDesc: 'Output video width (must be multiple of 64)',
      heightDesc: 'Output video height (must be multiple of 64)',
      videoUploadNote: 'When uploading video, you can specify points with "Select Person" button.',
      clickToAddPoint: 'Click on image to add points at desired locations.',
      clickToRemovePoint: 'Click on points to delete them.',
      videoRatioNote: 'Video is displayed maintaining original aspect ratio.',
      resolutionNote: 'Output resolution may differ from original, please check.',
      sizeWarning: '⚠️ Width and Height must be multiples of 64 (e.g., 512, 576, 640, 704, 768, etc.)',
      inputRequired: 'Please upload image or video file.',
      promptRequired: 'Please enter a prompt.',
      generationStarted: 'Video generation has started. Job ID: {jobId}',
      dragAndDrop: {
        dropHere: '🎯 Drop here!',
        selectImage: 'Select Image File',
        selectVideo: 'Select Video File',
        reusedAsMedia: 'Used {jobType} result from library as {isVideo}!'
      },
      personSelection: {
        title: 'Person Selection Guide',
        clickToSelect: '• Click on image to select points',
        clickToDelete: '• Selected points are deleted when clicked',
        currentPoints: '• Currently {count} points selected'
      }
    },

    // Video Upscale
    videoUpscale: {
      title: 'Video Upscale',
      videoFile: 'Video File *',
      jobType: 'Job Type *',
      removeVideo: 'Remove Video',
      selectVideo: 'Select Video',
      upscale: 'Upscale',
      upscaleInterpolation: 'Upscale & Interpolation',
      upscaleBtn: 'Upscale Video',
      processingBtn: 'Processing...',
      upscaleDesc: 'Upscale: Increases video resolution',
      upscaleInterpolationDesc: 'Upscale & Interpolation: Increases video resolution and performs frame interpolation',
      jobStarted: 'Video upscale job is being processed in the background. Check progress in Library.',
      videoRequired: 'Please select a video file.',
      dragAndDrop: {
        dropHere: '🎯 Drop here!',
        selectOrDrag: 'Select or drag video files',
        dragFromLibrary: 'Drag video results from Library here',
        reusedAsVideo: 'Used {jobType} result from library as video!'
      },
      noVideoData: 'This dragged item does not contain video data. Video Upscale only supports videos.',
      dropError: 'An error occurred while processing the dropped data.',
      dropVideoError: 'An error occurred while processing the dropped video. URL: {url}',
      upscaleRequestFailed: 'Video upscale request failed.',
      upscaleError: 'An error occurred during video upscale.',
      settings: 'Settings',
      jobTypeDesc: 'Job Type Description',
      resetBtn: 'Reset',
      jobInfo: 'Job Info',
      statusProcessing: 'Background Processing',
      jobInfoText: '✅ Video upscale job is being processed in the background.',
      canPerformOtherTasks: '• You can freely perform other tasks',
      checkLibrary: '• Check progress in Library',
      autoUpdateStatus: '• Status will be automatically updated when job is complete'
    },

    // FLUX KONTEXT
    fluxKontext: {
      title: 'FLUX KONTEXT',
      inputImage: 'Input Image',
      prompt: 'Prompt',
      seedValue: 'SEED Value',
      guidanceValue: 'Guidance Value',
      generateBtn: 'Generate Image',
      detailSettings: 'Detail Settings',
      promptTip: '💡 More specific and detailed descriptions yield better results.',
      seedTip: '💡 -1 is random, fixed values generate same results',
      guidanceTip: '💡 Higher values follow prompt more strictly (2.5 recommended)',
      generationTime: 'Image generation may take several minutes.',
      jobStarted: 'FLUX KONTEXT job is being processed in the background. Check progress in Library.',
      inputRequired: 'Please enter both image and prompt.',
      dragAndDrop: {
        dropHere: '🎯 Drop here!',
        clickToUpload: 'Click on image to upload',
        dragFromLibrary: 'Drag results from Library here',
        supportedFormats: 'PNG, JPG, WEBP supported',
        reusedAsInput: 'Used {jobType} result from library as input image!'
      }
    },

    // FLUX KREA
    fluxKrea: {
      title: 'FLUX KREA',
      model: 'Model (Optional)',
      modelPlaceholder: 'Enter model name',
      loraOptional: 'LoRA File (Optional)',
      loraWeight: 'LoRA Weight (0.1 - 2.0)',
      generateBtn: 'Generate FLUX KREA',
      loraNotAvailable: 'No LoRA files available. First set up S3 storage in Settings page, or upload .safetensors files to S3 storage.',
      jobStarted: 'FLUX Krea job is being processed in the background. Check progress in Library.',
      noLora: 'Do not use LoRA',
      inputRequired: 'Please enter a prompt.',
      dragAndDrop: {
        dropHere: '🎯 Drop here!',
        clickToUpload: 'Click on image to upload',
        dragFromLibrary: 'Drag results from Library here',
        supportedFormats: 'PNG, JPG, WEBP supported'
      }
    },

    // MultiTalk
    multitalk: {
      title: 'MultiTalk',
      audioFile: 'Audio File *',
      audioMode: 'Audio Mode',
      removeImage: 'Remove Image',
      selectImage: 'Select Image',
      removeAudio1: 'Remove Audio 1',
      selectAudio1: 'Select Audio 1',
      removeAudio2: 'Remove Audio 2',
      selectAudio2: 'Select Audio 2',
      singleMode: 'Single Mode',
      dualMode: 'Dual Mode',
      generateBtn: 'Generate MultiTalk',
      dualAudioTip: '💡 In dual audio mode, audio_type is automatically set to \'para\'.',
      singleAudioTip: '💡 Generate video with one audio file',
      dualAudioTip2: '💡 Generate conversational video with two audio files',
      imageRequired: 'Please select an image.',
      audioRequired: 'Please select at least one audio file.',
      dualAudioRequired: 'Dual mode requires two audio files.',
      jobSubmitted: 'MultiTalk generation request successfully submitted! Job ID: {jobId} (RunPod: {runpodJobId}). Check progress in Library.',
      dragAndDrop: {
        dropHere: '🎯 Drop here!',
        selectOrDrag: 'Select or drag image files',
        dragFromLibrary: 'Drag results from Library here',
        reusedAsImage: 'Used {jobType} result from library as image!'
      }
    },

    // Infinite Talk
    infiniteTalk: {
      title: 'Infinite Talk',
      imageFile: 'Image File *',
      videoFile: 'Video File *',
      firstAudioFile: 'First Audio File *',
      secondAudioFile: 'Second Audio File *',
      inputType: 'Input Type *',
      personCount: 'Person Count *',
      audioStartTime: 'Audio Start Time',
      audioEndTime: 'Audio End Time',
      audio2StartTime: 'Audio2 Start Time',
      audio2EndTime: 'Audio2 End Time',
      removeImage: 'Remove Image',
      removeVideo: 'Remove Video',
      removeAudio: 'Remove Audio',
      selectImage: 'Select Image',
      selectVideo: 'Select Video',
      selectAudio: 'Select Audio',
      selectSecondAudio: 'Select Second Audio',
      thumbnailDownload: 'Download Thumbnail',
      image: 'Image',
      video: 'Video',
      singlePerson: 'Single Person',
      multiPerson: 'Multiple People',
      generateBtn: 'Generate Infinite Talk',
      audioTrim: 'Audio Trim',
      audioTrimDesc: 'You can trim and use only desired sections. Supports hh:mm:ss(.ms), mm:ss or second unit input.',
      jobStarted: 'Infinite Talk job is being processed in the background. Check progress in Library.',
      inputRequired: 'Please enter both image and prompt.',
      dragAndDrop: {
        dropHere: '🎯 Drop here!',
        selectOrDragImage: 'Select or drag image files',
        dragImageFromLibrary: 'Drag results from Library here',
        selectOrDragVideo: 'Select or drag video files',
        dragVideoFromLibrary: 'Drag video results from Library here',
        selectOrDragAudio: 'Select or drag audio files (WAV recommended)',
        selectOrDragAudio2: 'Select or drag second audio file (WAV recommended)',
        reusedAsMedia: 'Used {jobType} result from library as {isVideo}!',
        processError: 'Error occurred while processing dropped media.'
      },
      placeholder: {
        prompt: 'e.g., A person is talking about technology...',
        time: 'e.g., 12.5 or 00:00:12.5',
        endTime: 'e.g., 24 or 00:00:24',
        startTime: 'e.g., 5 or 00:00:05',
        endTime2: 'e.g., 15 or 00:00:15',
        personCount: '640'
      }
    },

    // S3 Storage
    s3Storage: {
      title: 'S3 Storage Management',
      subtitle: 'Manage models and LoRA files for RunPod Network Volume',
      fileExplorer: 'File Explorer',
      upload: 'Upload',
      fileList: 'File List',
      itemsCount: 'items',
      uploadLocation: 'Upload Location',
      refresh: 'Refresh',
      parentFolder: 'Parent Folder',
      createFolder: 'Create Folder',
      create: 'Create',
      cancel: 'Cancel',
      uploading: 'Uploading...',
      uploadComplete: 'Upload completed!',
      folderCreateNote: 'In S3, folders are created automatically. When you upload files, folders for that path are automatically created.',
      uploadDesc: 'Upload models or LoRA files to network volume',
      uploadLocationNote: 'Files will be uploaded to this location',
      status: {
        preparing: 'Preparing upload...',
        uploading: 'Uploading file...',
        processing: 'Processing on server...',
        complete: 'Upload complete!',
        failed: 'Upload failed',
        creatingFolder: 'Creating folder...',
        folderCreated: 'Folder created!',
        folderCreateFailed: 'Folder creation failed'
      },
      noFiles: 'No files',
      fileType: {
        directory: 'directory',
        model: 'model',
        lora: 'lora',
        other: 'other'
      },
      errors: {
        volumeInitFailed: 'Failed to initialize volume.',
        fileListFailed: 'Failed to get file list.',
        serverUnstable: 'RunPod S3 server is temporarily unstable. Please try again later.',
        uploadFailed: 'File upload failed.',
        pathConflict: 'Path conflict',
        downloadFailed: 'File download failed.',
        deleteFailed: 'File deletion failed.',
        createFolderFailed: 'Folder creation failed.'
      },
      formLabels: {
        folderName: 'Enter folder name',
        selectFile: 'Select File'
      },
      warnings: {
        deleteFile: 'Are you sure you want to delete this file?'
      }
    },

    // My Presets
    myPresets: {
      title: 'My Presets',
      createNew: 'Create New Preset',
      existing: 'Existing Presets',
      presetName: 'Preset Name',
      type: 'Type',
      options: 'Options (JSON)',
      delete: 'Delete',
      creating: 'Creating...',
      createBtn: 'Create Preset',
      noPresets: 'No presets saved yet.',
      error: 'Error: {error}'
    },

    // Credit Activity
    creditActivity: {
      title: 'Credit Activity',
      noActivities: 'No credit activities yet.',
      activity: 'Activity',
      amount: 'Amount',
      date: 'Date',
      loading: 'Loading credit activities...',
      loadFailed: 'Failed to load credit activities'
    },

    // Library
    library: {
      title: 'Library',
      allJobs: 'All Jobs',
      favoritesOnly: 'Show Favorites Only',
      showAll: 'Show All',
      noFavorites: 'No favorite items found.',
      noResults: 'No job results found.',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      delete: 'Delete',
      cancel: 'Cancel',
      deleting: 'Deleting...',
      reuseInputs: 'Reuse Inputs',
      moveToWorkspace: 'Move to Workspace',
      removeFromWorkspace: 'Remove from Workspace',
      addFavorite: 'Add to Favorites',
      removeFavorite: 'Remove from Favorites',
      manage: 'Manage',
      select: 'Select',
      selected: 'Selected',
      previous: 'Previous',
      next: 'Next',
      deleteConfirm: 'Delete Result',
      deleteConfirmMessage: 'Are you sure you want to delete this result?',
      deleteConfirmWarning: 'This action cannot be undone.',
      jobInfo: 'Job Info',
      createdAt: 'Created At',
      completedAt: 'Completed At',
      status: 'Status',
      resultNotFound: 'Result not found.',
      jobNotCompleted: 'The job may not be completed yet.',
      resultUrlNotSet: 'The result URL may not be set.',
      tryAgainLater: 'Please try again later.',
      videoNotPlaying: 'If the video does not play, please download and check it directly.',
      fluxKontextImage: 'Image generated with FLUX KONTEXT.',
      fluxKreaImage: 'Image generated with FLUX KREA.',
      inputImageInfo: 'Input image information not found.',
      inputImageParseError: 'Could not parse input image information.',
      workspace: 'Workspace',
      workspaceManagement: 'Workspace Management',
      createWorkspace: 'Create New Workspace',
      workspaceNamePlaceholder: 'Enter workspace name',
      create: '✨ Create',
      workspaceList: 'Workspace List',
      default: 'Default',
      deleteWorkspace: 'Delete Workspace',
      deleteWorkspaceWarning: 'This action cannot be undone',
      deleteWorkspaceConfirm: 'Are you sure you want to delete the "{name}" workspace?',
      deleteWorkspaceWarningList: '⚠️ The following will apply when deleted:\n<ul className="list-disc list-inside space-y-1 ml-2"><li>All jobs in the workspace will be moved to the default workspace</li><li>The workspace will be completely deleted</li><li>This action cannot be undone</li></ul>',
      lastUpdated: 'Last updated:',
      updating: 'Updating...',
      failedToLoadJobs: 'Failed to load jobs',
      loading: 'Loading...',
      favoriteToggleFailed: 'Failed to toggle favorite status.',
      favoriteToggleError: 'An error occurred while toggling favorite status.',
      deleteFailed: 'Delete failed.',
      deleteError: 'An error occurred during deletion.',
      workspaceCreateFailed: 'Failed to create workspace.',
      workspaceCreateError: 'An error occurred while creating workspace.',
      jobMoveFailed: 'Failed to move job.',
      jobMoveError: 'An error occurred while moving job.',
      workspaceDeleteFailed: 'Failed to delete workspace.',
      workspaceDeleteError: 'An error occurred while deleting workspace.',
      quotaExceeded: 'Storage space is insufficient. Please clean up browser data and try again.',
      reuseError: 'An error occurred while reusing inputs.',
      pageNotFound: 'Could not find a page for that type.',
      inputImageLoadError: '⚠️ Could not load input image',
      fileNotInPublicFolder: '💡 Please check if the file exists in the public/results folder',
      wan22InputImageError: '⚠️ Could not load WAN 2.2 input image',
      wanAnimateInputImageError: '⚠️ Could not load WAN Animate input image',
      wanAnimateInputVideoError: '⚠️ Could not load WAN Animate input video',
      infiniteTalkInputImageError: '⚠️ Could not load Infinite Talk input image',
      infiniteTalkInputVideoError: '⚠️ Could not load Infinite Talk input video',
      webPath: 'Web Path',
      actualPath: 'Actual Path',
      fileName: 'File Name',
      webAccessIssue: '💡 File exists but there may be a web access path issue',
      s3Path: 'S3 Path',
      fallbackPath: 'Fallback Path',
      localWebPath: 'Local Web Path',
      base64ImageData: 'Base64 Image Data',
      format: 'Format',
      size: 'Size',
      available: 'Available',
      inputFiles: 'Input Files',
      inputImage: 'Input Image',
      inputVideo: 'Input Video',
      inputFileNotFound: 'Input file information not found.',
      wanAnimateOptionsParseError: 'Could not parse WAN Animate options.',
      infiniteTalkOptionsParseError: 'Could not parse Infinite Talk options.',
      infiniteTalkInputImageNotFound: 'Infinite Talk input image information not found.'
    },

    // General Messages
    messages: {
      inputsLoaded: 'Previous job inputs automatically loaded!',
      jobInProgress: '• You can freely perform other tasks',
      checkLibrary: '• Check progress in Library',
      autoUpdate: '• Status automatically updates when job completes',
      generationRequestAccepted: 'Image generation request successfully submitted! Job ID: {jobId}. Check progress in Library.',
      error: 'Error: {error}'
    },

    // API Messages
    api: {
      // Job Processing Messages
      jobStarted: {
        wan22: 'WAN 2.2 job is being processed in the background. Check progress in Library.',
        wanAnimate: 'WAN Animate job is being processed in the background. Check progress in Library.',
        videoUpscale: 'Video upscale job is being processed in the background. Check progress in Library.',
        infiniteTalk: 'Infinite Talk job is being processed in the background. Check progress in Library.',
        fluxKrea: 'Flux Krea job is being processed in the background. Check progress in Library.'
      },

      // S3 Storage Messages
      s3: {
        fileUploaded: 'File uploaded successfully.',
        folderCreated: 'Folder created successfully.',
        fileDeleted: 'File deleted successfully.',
        uploadFailed: 'File upload failed.',
        downloadFailed: 'File download failed.',
        deleteFailed: 'File deletion failed.',
        createFolderFailed: 'Folder creation failed.',
        fileListFailed: 'Failed to get file list.',
        volumeListFailed: 'Failed to get network volume list.',
        serverUnstable: 'RunPod S3 server is temporarily unstable. Please try again later.',
        folderConflict: 'Folder creation failed: \'{key}\' already exists as a file. Please delete the existing file or use a different folder name.',
        volumeNotSpecified: 'Volume not specified.',
        settingsNotConfigured: 'S3 settings not configured.',
        volumeAndKeyRequired: 'Volume and file key are required.',
        volumeAndFolderKeyRequired: 'Volume and folder key are required.',
        loraVolumeNotSpecified: 'Volume not specified. Please select a volume in S3 Storage page.',
        fileAndVolumeRequired: 'File and volume are required.'
      },

      // Workspace Messages
      workspace: {
        nameExists: 'Workspace name already exists.',
        defaultCannotDelete: 'Default workspace cannot be deleted.'
      },

      // RunPod Integration Messages
      runpod: {
        authFailed: 'RunPod authentication failed (401). Please resave your API Key/Endpoint ID in Settings.',
        s3UploadFailed: 'S3 upload failed. Please check your S3 settings.',
        s3ImageUploadFailed: 'S3 image upload failed',
        s3VideoUploadFailed: 'S3 video upload failed',
        submissionFailed: 'RunPod submission failed',
        wanAnimateFailed: 'WAN Animate generation failed',
        settingsNotConfigured: 'RunPod settings not configured.'
      },

      // Input Validation Messages
      validation: {
        inputTypeRequired: 'input_type must be "image" or "video".',
        personCountRequired: 'person_count must be "single" or "multi".',
        imageFileRequired: 'Image file is required.',
        videoFileRequired: 'Video file is required.',
        audioAndPromptRequired: 'Audio file and prompt are required.',
        secondAudioRequired: 'Second audio file is required in multi-person mode.',
        unknownError: 'An unknown error occurred.'
      },

      // Settings Test Messages
      settingsTest: {
        endpointSuccess: '{endpointType} endpoint connection successful!',
        endpointFailed: '{endpointType} endpoint connection failed',
        endpointError: '{endpointType} endpoint connection error',
        s3Success: 'S3 connection successful!',
        s3Failed: 'S3 connection failed'
      }
    }
  }
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.ko;