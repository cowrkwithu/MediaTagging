#!/bin/bash

# MediaTagging Frontend Only Startup Script
# 프론트엔드 서버만 시작하는 스크립트

# source로 실행 시 안전하게 종료하는 함수
_exit() {
    if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
        return ${1:-0} 2>/dev/null || true
    else
        exit ${1:-0}
    fi
}

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 프로젝트 루트 디렉토리
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
fi

# 원래 디렉토리 저장
ORIGINAL_DIR="$(pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   MediaTagging Frontend Startup        ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================
# STEP 1: 의존성 확인
# ============================================
echo -e "${YELLOW}[STEP 1] 의존성 확인${NC}"

cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    echo -e "  ${BLUE}→${NC} npm 패키지를 설치합니다..."
    if ! npm install; then
        echo -e "  ${RED}✗${NC} npm 설치 실패"
        cd "$ORIGINAL_DIR"
        _exit 1
    fi
fi
echo -e "  ${GREEN}✓${NC} 의존성 확인 완료"

echo ""

# ============================================
# STEP 2: Frontend 서버 시작
# ============================================
echo -e "${YELLOW}[STEP 2] Frontend 서버 시작${NC}"
echo ""
echo -e "  ${BLUE}Frontend${NC} : http://localhost:3000"
echo ""
echo -e "서버를 종료하려면 ${RED}Ctrl+C${NC}를 누르세요."
echo ""

npm run dev -- --hostname 0.0.0.0

# 서버 종료 후 원래 디렉토리로 복귀
cd "$ORIGINAL_DIR"
