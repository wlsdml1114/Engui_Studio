# 🚀 EnguiStudio

**다양한 오픈소스 AI 모델을 RunPod Serverless로 쉽게 사용할 수 있는 통합 플랫폼**

## 🎯 프로젝트 소개

EnguiStudio는 RunPod Serverless 인프라를 활용하여 다양한 오픈소스 AI 모델들을 웹 인터페이스로 쉽게 사용할 수 있게 해주는 플랫폼입니다. 복잡한 설정 없이도 최신 AI 기술을 바로 체험해볼 수 있습니다.

## ✨ 주요 기능

- **🎬 Video Generation**: WAN 2.2 비디오 생성 모델
- **✨ FLUX KONTEXT**: 이미지 변환 및 스타일링 모델
- **🎤 MultiTalk**: Audio 2 Video 모델
- **⚙️ Unified Settings**: RunPod 엔드포인트를 한 곳에서 관리
- **📚 Library**: 생성된 결과물을 관리

## 🛠️ 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (개발용)
- **AI Infrastructure**: RunPod Serverless API
- **Storage**: S3-compatible storage (선택사항)
- **Authentication**: NextAuth.js (준비됨)

## 🚀 빠른 시작

### 1. 프로젝트 클론
```bash
git clone https://github.com/yourusername/enguistudio.git
cd enguistudio
```

### 2. 의존성 설치
```bash
npm install
# 또는
yarn install
# 또는
pnpm install
```

### 3. 데이터베이스 초기화
```bash
npx prisma generate
npx prisma db push
```

### 4. 개발 서버 시작
```bash
npm run dev
```

### 5. 브라우저에서 접속
```
http://localhost:3000
```

### 6. 초기 설정
1. **설정 페이지 접속**: `/settings` 경로로 이동
2. **RunPod 설정**: API 키와 각 모델별 엔드포인트 ID 입력
3. **S3 설정**: 파일 저장을 위한 S3 호환 스토리지 설정 (선택사항)
4. **설정 저장**: 모든 설정을 저장하고 연결 테스트

## 🔧 RunPod Serverless 설정

### 필요한 엔드포인트들
- **Video Generation**: WAN 2.2, AnimateDiff 등
- **FLUX KONTEXT**: 이미지 변환 모델
- **MultiTalk**: Audio 2 Video 모델
- **기타 커스텀 모델**: 원하는 오픈소스 모델 추가 가능

### 설정 방법
1. [RunPod](https://runpod.io/)에서 원하는 모델의 Serverless 엔드포인트 생성
2. 각 엔드포인트의 ID를 설정 페이지에 입력
3. 연결 테스트로 정상 작동 확인

## 🛠️ 문제 해결

### 설정이 로드되지 않는 경우
1. **데이터베이스 초기화**: 설정 페이지에서 "🗑️ 데이터베이스 초기화" 버튼 클릭
2. **서버 재시작**: `npm run dev` 다시 실행
3. **설정 재입력**: RunPod 및 S3 설정을 다시 입력

### RunPod 연결 실패
1. **API 키 확인**: RunPod 대시보드에서 API 키가 올바른지 확인
2. **엔드포인트 ID 확인**: 각 서비스별 엔드포인트 ID가 정확한지 확인
3. **연결 테스트**: 설정 페이지에서 "테스트" 버튼으로 연결 상태 확인

### 암호화 에러가 발생하는 경우
1. **데이터베이스 초기화**: 기존 암호화된 데이터 정리
2. **서버 재시작**: 환경변수 변경 후 서버 재시작
3. **설정 재입력**: 모든 설정을 새로 입력

## 📋 요구사항

- **Node.js**: 18.x 이상
- **npm**: 8.x 이상
- **RunPod 계정**: AI 모델 사용을 위해 필요
- **S3 호환 스토리지**: 파일 저장을 위해 필요 (선택사항)

## 🔒 보안 주의사항

- API 키와 시크릿은 웹 인터페이스에서만 입력하고 안전하게 보관
- 로컬에서만 실행하여 개인정보를 보호
- 프로덕션 환경에서는 환경변수를 통한 설정 권장

## 🚀 프로덕션 배포

로컬에서 프로덕션 모드로 실행하려면:
```bash
npm run build
npm start
```

## 🤝 기여하기

1. **Fork** 이 프로젝트
2. **Feature branch** 생성 (`git checkout -b feature/AmazingFeature`)
3. **Commit** 변경사항 (`git commit -m 'Add some AmazingFeature'`)
4. **Push** 브랜치 (`git push origin feature/AmazingFeature`)
5. **Pull Request** 생성

## 📞 지원

문제가 발생하면:
1. 설정 페이지의 "🗑️ 데이터베이스 초기화" 버튼 사용
2. 개발 서버 재시작
3. 설정 재입력 및 연결 테스트

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- [Next.js](https://nextjs.org/) - React 프레임워크
- [RunPod](https://runpod.io/) - AI 인프라 서비스
- [Prisma](https://www.prisma.io/) - 데이터베이스 ORM
- [Tailwind CSS](https://tailwindcss.com/) - CSS 프레임워크
- **오픈소스 AI 모델 커뮤니티** - 다양한 AI 모델 제공
