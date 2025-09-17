@echo off
chcp 65001 >nul
title EnguiStudio 서버 시작

echo.
echo ========================================
echo    EnguiStudio 서버 시작
echo ========================================
echo.

timeout /t 2 >nul

pushd "%~dp0"

echo [INFO] 현재 디렉토리: %CD%
echo.

REM Node.js 설치 확인
echo [INFO] Node.js 설치 확인 중...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js가 설치되지 않았습니다.
    echo.
    echo 해결 방법:
    echo 1. https://nodejs.org 에서 Node.js를 다운로드하여 설치하세요
    echo 2. 설치 후 명령 프롬프트를 다시 시작하세요
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js가 설치되어 있습니다.
echo.

REM 의존성 설치 확인
echo [INFO] 의존성 설치 확인 중...
if not exist "node_modules" (
    echo [INFO] 의존성 설치 중... (처음 실행시 시간이 걸릴 수 있습니다)
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] 의존성 설치에 실패했습니다.
        echo.
        echo 해결 방법:
        echo 1. 인터넷 연결을 확인하세요
        echo 2. npm 캐시를 정리하세요: npm cache clean --force
        echo 3. node_modules 폴더를 삭제하고 다시 시도하세요
        echo.
        pause
        exit /b 1
    )
    echo [OK] 의존성 설치가 완료되었습니다.
) else (
    echo [OK] 의존성이 이미 설치되어 있습니다.
)
echo.

REM Prisma 클라이언트 생성
echo [INFO] Prisma 클라이언트 생성 중...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma 클라이언트 생성에 실패했습니다.
    echo.
    echo 해결 방법:
    echo 1. Prisma 스키마 파일을 확인하세요
    echo 2. 데이터베이스 연결을 확인하세요
    echo.
    pause
    exit /b 1
)
echo [OK] Prisma 클라이언트가 생성되었습니다.
echo.

REM 데이터베이스 초기화 (처음 실행시에만)
echo [INFO] 데이터베이스 상태 확인 중...
if exist "prisma\db\database.db" (
    echo [OK] 데이터베이스가 이미 존재합니다.
    echo [INFO] 기존 데이터베이스를 사용합니다.
) else (
    echo [INFO] 데이터베이스가 존재하지 않습니다.
    echo [INFO] 새 데이터베이스를 생성합니다...
    call npx prisma db push
    if %errorlevel% neq 0 (
        echo [ERROR] 데이터베이스 생성에 실패했습니다.
        echo.
        echo 해결 방법:
        echo 1. 데이터베이스 연결 설정을 확인하세요
        echo 2. Prisma 스키마를 확인하세요
        echo.
        pause
        exit /b 1
    )
    echo [OK] 데이터베이스가 생성되었습니다.
)
echo.

REM 개발 서버 시작
echo [INFO] 개발 서버를 시작합니다...
echo [INFO] 브라우저가 자동으로 열립니다...
echo.
echo ========================================
echo    개발 서버가 시작되었습니다!
echo    브라우저에서 http://localhost:3000 을 확인하세요
echo ========================================
echo.
echo 서버를 중지하려면 Ctrl+C를 누르세요
echo.

REM 브라우저 열기
start http://localhost:3000

REM 개발 서버 시작
call npm run dev

popd
pause
