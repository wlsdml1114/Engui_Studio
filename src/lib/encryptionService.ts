// src/lib/encryptionService.ts

class EncryptionService {
  constructor() {
    console.log('🔓 Encryption disabled - using plain text for personal use');
  }

  encrypt(text: string): string {
    // 암호화 비활성화 - 평문 반환
    return text;
  }

  decrypt(encryptedData: string): string {
    // 복호화 비활성화 - 입력값 그대로 반환
    return encryptedData;
  }

  // Check if a string looks like encrypted data (항상 false 반환)
  isEncrypted(data: string): boolean {
    return false; // 암호화되지 않음
  }

  // Mask sensitive data for display (개인 사용이므로 전체 표시)
  maskSensitiveData(data: string): string {
    return data; // 마스킹 없이 전체 표시
  }
}

export default EncryptionService;