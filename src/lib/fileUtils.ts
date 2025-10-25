// 파일 처리 관련 헬퍼 함수들

/**
 * URL에서 File 객체를 생성하는 함수
 * @param url 파일 URL
 * @param filename 파일 이름
 * @param mimeType MIME 타입
 * @returns Promise<File>
 */
export const createFileFromUrl = async (url: string, filename: string, mimeType: string): Promise<File> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: mimeType });
};

/**
 * 재사용 데이터에서 파일 정보를 추출하고 File 객체를 생성하는 함수
 * @param data 재사용 데이터 객체
 * @param filePathKey 파일 경로 키 (예: 'imagePath', 'endImagePath')
 * @param defaultFilename 기본 파일 이름
 * @returns Promise<{file: File, previewUrl: string} | null>
 */
export const createFileFromReuseData = async (
  data: any,
  filePathKey: string,
  defaultFilename: string
): Promise<{file: File, previewUrl: string} | null> => {
  const filePath = data[filePathKey];
  if (!filePath) {
    console.log(`⚠️ ${filePathKey} 경로가 없음`);
    return null;
  }

  try {
    console.log(`🔄 파일 재사용 (${filePathKey}):`, filePath);

    // URL에서 File 객체 생성
    const file = await createFileFromUrl(filePath, defaultFilename, 'image/jpeg');
    console.log(`✅ File 객체 생성 완료 (${filePathKey}):`, file.name);

    return {
      file,
      previewUrl: filePath
    };
  } catch (error) {
    console.error(`❌ File 객체 생성 실패 (${filePathKey}):`, error);
    return null;
  }
};

/**
 * FormData에 파일과 관련 데이터를 추가하는 함수
 * @param formData FormData 객체
 * @param file 추가할 파일
 * @param paramName 파라미터 이름
 * @param additionalData 추가할 데이터 (선택사항)
 */
export const addFileToFormData = (
  formData: FormData,
  file: File | null,
  paramName: string,
  additionalData?: Record<string, string>
): void => {
  if (file) {
    console.log(`🔍 FormData에 파일 추가 (${paramName}):`, {
      name: file.name,
      size: file.size,
      type: file.type
    });
    formData.append(paramName, file);

    // 추가 데이터가 있으면 FormData에 추가
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
  } else {
    console.log(`ℹ️ 추가할 파일 없음 (${paramName})`);
  }
};

/**
 * S3 업로드만 처리하는 함수 (클라이언트용)
 * @param file 업로드할 파일
 * @param fileName 저장할 파일 이름
 * @param uploadFunction S3 업로드 함수
 * @returns Promise<{s3Path: string}>
 */
export const processS3Upload = async (
  file: File,
  fileName: string,
  uploadFunction: (file: File, fileName: string) => Promise<string>
): Promise<{s3Path: string}> => {
  try {
    console.log(`📤 S3 업로드 시작:`, fileName);
    const s3Path = await uploadFunction(file, fileName);
    console.log('✅ S3 업로드 완료:', s3Path);
    return { s3Path };
  } catch (error) {
    console.error('❌ S3 업로드 실패:', error);
    throw error;
  }
};

/**
 * 파일 타입을 확인하는 함수
 * @param file 파일 객체
 * @returns 파일 타입 문자열
 */
export const getFileType = (file: File): string => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'unknown';
};

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 변환하는 함수
 * @param bytes 바이트 크기
 * @returns 포맷된 크기 문자열
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};