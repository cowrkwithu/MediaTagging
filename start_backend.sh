#!/bin/bash

# MediaTagging Backend Only Startup Script
# 백엔드 서버만 시작하는 스크립트

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
echo -e "${BLUE}   MediaTagging Backend Startup         ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================
# STEP 1: PostgreSQL 확인
# ============================================
echo -e "${YELLOW}[STEP 1] PostgreSQL 확인${NC}"

cd "$PROJECT_ROOT"

if ! docker compose ps 2>/dev/null | grep -q "mediatagging_db"; then
    echo -e "  ${BLUE}→${NC} PostgreSQL 컨테이너를 시작합니다..."
    docker compose up -d

    echo -e "  ${BLUE}→${NC} 데이터베이스 준비 대기 중..."
    sleep 5

    for i in {1..30}; do
        if docker compose exec -T db pg_isready -U postgres &>/dev/null; then
            echo -e "  ${GREEN}✓${NC} PostgreSQL이 준비되었습니다."
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "  ${RED}✗${NC} PostgreSQL 시작 시간 초과"
            cd "$ORIGINAL_DIR"
            _exit 1
        fi
        sleep 1
    done
else
    echo -e "  ${GREEN}✓${NC} PostgreSQL이 이미 실행 중입니다."
fi

echo ""

# ============================================
# STEP 2: 가상환경 활성화
# ============================================
echo -e "${YELLOW}[STEP 2] 가상환경 활성화${NC}"

cd "$PROJECT_ROOT/backend"

if [ ! -d "editVideoTagging_venv" ]; then
    echo -e "  ${BLUE}→${NC} 가상환경을 생성합니다..."
    python3 -m venv editVideoTagging_venv
fi

source editVideoTagging_venv/bin/activate
echo -e "  ${GREEN}✓${NC} 가상환경 활성화 완료"

# 의존성 확인
pip install -q -r requirements.txt
echo -e "  ${GREEN}✓${NC} 의존성 확인 완료"

echo ""

# ============================================
# STEP 3: 마이그레이션 실행
# ============================================
echo -e "${YELLOW}[STEP 3] 데이터베이스 마이그레이션${NC}"

if ! alembic upgrade head; then
    echo -e "  ${RED}✗${NC} 마이그레이션 실패"
    cd "$ORIGINAL_DIR"
    _exit 1
fi
echo -e "  ${GREEN}✓${NC} 마이그레이션 완료"

echo ""

# ============================================
# STEP 4: Backend 서버 시작
# ============================================
echo -e "${YELLOW}[STEP 4] Backend 서버 시작${NC}"
echo ""
echo -e "  ${BLUE}Backend${NC}  : http://localhost:8000"
echo -e "  ${BLUE}API Docs${NC} : http://localhost:8000/docs"
echo ""
echo -e "서버를 종료하려면 ${RED}Ctrl+C${NC}를 누르세요."
echo ""

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 서버 종료 후 원래 디렉토리로 복귀
cd "$ORIGINAL_DIR"
