#!/bin/bash

# MediaTagging Server Startup Script
# 서버 구동을 위한 단계별 스크립트
# - 백그라운드로 동작
# - 로그 파일 기록

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
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
fi

# 원래 디렉토리 저장
ORIGINAL_DIR="$(pwd)"

# 로그 디렉토리 설정
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

# 로그 파일명 (날짜 포함)
DATE_STAMP=$(date +"%Y%m%d")
TIME_STAMP=$(date +"%Y%m%d_%H%M%S")
BACKEND_LOG="$LOG_DIR/backend_${DATE_STAMP}.log"
FRONTEND_LOG="$LOG_DIR/frontend_${DATE_STAMP}.log"
STARTUP_LOG="$LOG_DIR/startup_${TIME_STAMP}.log"

# PID 파일
PID_DIR="$PROJECT_ROOT/.pids"
mkdir -p "$PID_DIR"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# 로그 함수
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$message" | tee -a "$STARTUP_LOG"
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   MediaTagging Server Startup Script   ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
log "서버 시작 스크립트 실행"

# ============================================
# STEP 1: 사전 요구사항 확인
# ============================================
echo -e "${YELLOW}[STEP 1] 사전 요구사항 확인${NC}"

# Python 확인
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo -e "  ${GREEN}✓${NC} Python: $PYTHON_VERSION"
else
    echo -e "  ${RED}✗${NC} Python3가 설치되어 있지 않습니다."
    log "ERROR: Python3가 설치되어 있지 않습니다."
    cd "$ORIGINAL_DIR"
    _exit 1
fi

# Node.js 확인
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version 2>&1)
    echo -e "  ${GREEN}✓${NC} Node.js: $NODE_VERSION"
else
    echo -e "  ${RED}✗${NC} Node.js가 설치되어 있지 않습니다."
    log "ERROR: Node.js가 설치되어 있지 않습니다."
    cd "$ORIGINAL_DIR"
    _exit 1
fi

# npm 확인
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version 2>&1)
    echo -e "  ${GREEN}✓${NC} npm: $NPM_VERSION"
else
    echo -e "  ${RED}✗${NC} npm이 설치되어 있지 않습니다."
    log "ERROR: npm이 설치되어 있지 않습니다."
    cd "$ORIGINAL_DIR"
    _exit 1
fi

# Docker 확인
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version 2>&1)
    echo -e "  ${GREEN}✓${NC} Docker: $DOCKER_VERSION"
else
    echo -e "  ${RED}✗${NC} Docker가 설치되어 있지 않습니다."
    log "ERROR: Docker가 설치되어 있지 않습니다."
    cd "$ORIGINAL_DIR"
    _exit 1
fi

# FFmpeg 확인
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n 1)
    echo -e "  ${GREEN}✓${NC} FFmpeg: $FFMPEG_VERSION"
else
    echo -e "  ${RED}✗${NC} FFmpeg가 설치되어 있지 않습니다."
    log "ERROR: FFmpeg가 설치되어 있지 않습니다."
    cd "$ORIGINAL_DIR"
    _exit 1
fi

# Ollama 확인
if command -v ollama &> /dev/null; then
    OLLAMA_VERSION=$(ollama --version 2>&1)
    echo -e "  ${GREEN}✓${NC} Ollama: $OLLAMA_VERSION"
else
    echo -e "  ${YELLOW}⚠${NC} Ollama가 설치되어 있지 않습니다. AI 태깅 기능을 사용하려면 설치가 필요합니다."
    log "WARNING: Ollama가 설치되어 있지 않습니다."
fi

echo ""

# ============================================
# STEP 2: 이미 실행 중인 서버 확인
# ============================================
echo -e "${YELLOW}[STEP 2] 기존 서버 프로세스 확인${NC}"

# 기존 Backend 프로세스 확인
if [ -f "$BACKEND_PID_FILE" ]; then
    OLD_BACKEND_PID=$(cat "$BACKEND_PID_FILE")
    if ps -p "$OLD_BACKEND_PID" > /dev/null 2>&1; then
        echo -e "  ${YELLOW}⚠${NC} Backend 서버가 이미 실행 중입니다. (PID: $OLD_BACKEND_PID)"
        echo -e "  ${BLUE}→${NC} 기존 서버를 종료하려면 ./stop_server.sh를 실행하세요."
        log "WARNING: Backend 서버가 이미 실행 중 (PID: $OLD_BACKEND_PID)"
        cd "$ORIGINAL_DIR"
        _exit 1
    fi
fi

# 기존 Frontend 프로세스 확인
if [ -f "$FRONTEND_PID_FILE" ]; then
    OLD_FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    if ps -p "$OLD_FRONTEND_PID" > /dev/null 2>&1; then
        echo -e "  ${YELLOW}⚠${NC} Frontend 서버가 이미 실행 중입니다. (PID: $OLD_FRONTEND_PID)"
        echo -e "  ${BLUE}→${NC} 기존 서버를 종료하려면 ./stop_server.sh를 실행하세요."
        log "WARNING: Frontend 서버가 이미 실행 중 (PID: $OLD_FRONTEND_PID)"
        cd "$ORIGINAL_DIR"
        _exit 1
    fi
fi

echo -e "  ${GREEN}✓${NC} 기존 서버 프로세스 없음"
echo ""

# ============================================
# STEP 3: PostgreSQL 데이터베이스 시작 (Docker)
# ============================================
echo -e "${YELLOW}[STEP 3] PostgreSQL 데이터베이스 시작${NC}"

cd "$PROJECT_ROOT"

# Docker Compose 실행
if docker compose ps 2>/dev/null | grep -q "mediatagging_db"; then
    echo -e "  ${GREEN}✓${NC} PostgreSQL 컨테이너가 이미 실행 중입니다."
    log "PostgreSQL 컨테이너가 이미 실행 중"
else
    echo -e "  ${BLUE}→${NC} PostgreSQL 컨테이너를 시작합니다..."
    docker compose up -d >> "$STARTUP_LOG" 2>&1

    # DB가 준비될 때까지 대기
    echo -e "  ${BLUE}→${NC} 데이터베이스 준비 대기 중..."
    sleep 5

    # Health check
    for i in {1..30}; do
        if docker compose exec -T db pg_isready -U postgres &>/dev/null; then
            echo -e "  ${GREEN}✓${NC} PostgreSQL이 준비되었습니다."
            log "PostgreSQL 시작 완료"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "  ${RED}✗${NC} PostgreSQL 시작 시간 초과"
            log "ERROR: PostgreSQL 시작 시간 초과"
            cd "$ORIGINAL_DIR"
            _exit 1
        fi
        sleep 1
    done
fi

echo ""

# ============================================
# STEP 4: Backend 가상환경 설정
# ============================================
echo -e "${YELLOW}[STEP 4] Backend 가상환경 설정${NC}"

cd "$PROJECT_ROOT/backend"

# 가상환경 확인 및 생성
if [ -d "editVideoTagging_venv" ]; then
    echo -e "  ${GREEN}✓${NC} 가상환경이 이미 존재합니다."
else
    echo -e "  ${BLUE}→${NC} 가상환경을 생성합니다..."
    python3 -m venv editVideoTagging_venv
    echo -e "  ${GREEN}✓${NC} 가상환경 생성 완료"
    log "Python 가상환경 생성 완료"
fi

# 가상환경 활성화
echo -e "  ${BLUE}→${NC} 가상환경을 활성화합니다..."
source editVideoTagging_venv/bin/activate

# 의존성 설치
echo -e "  ${BLUE}→${NC} Python 패키지를 설치합니다..."
pip install -q -r requirements.txt >> "$STARTUP_LOG" 2>&1
echo -e "  ${GREEN}✓${NC} Python 패키지 설치 완료"

echo ""

# ============================================
# STEP 5: 데이터베이스 마이그레이션
# ============================================
echo -e "${YELLOW}[STEP 5] 데이터베이스 마이그레이션${NC}"

cd "$PROJECT_ROOT/backend"

echo -e "  ${BLUE}→${NC} Alembic 마이그레이션을 실행합니다..."
if ! alembic upgrade head >> "$STARTUP_LOG" 2>&1; then
    echo -e "  ${RED}✗${NC} 마이그레이션 실패"
    log "ERROR: 마이그레이션 실패"
    cd "$ORIGINAL_DIR"
    _exit 1
fi
echo -e "  ${GREEN}✓${NC} 데이터베이스 마이그레이션 완료"
log "데이터베이스 마이그레이션 완료"

echo ""

# ============================================
# STEP 6: Storage 디렉토리 확인
# ============================================
echo -e "${YELLOW}[STEP 6] Storage 디렉토리 확인${NC}"

STORAGE_DIRS=(
    "$PROJECT_ROOT/storage/videos"
    "$PROJECT_ROOT/storage/images"
    "$PROJECT_ROOT/storage/thumbnails"
    "$PROJECT_ROOT/storage/clips"
    "$PROJECT_ROOT/storage/exports"
)

for dir in "${STORAGE_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo -e "  ${BLUE}→${NC} 디렉토리 생성: $dir"
    fi
done
echo -e "  ${GREEN}✓${NC} Storage 디렉토리 준비 완료"

echo ""

# ============================================
# STEP 7: Ollama 모델 확인
# ============================================
echo -e "${YELLOW}[STEP 7] Ollama AI 모델 확인${NC}"

if command -v ollama &> /dev/null; then
    # Ollama 서비스 실행 확인
    if ! pgrep -x "ollama" > /dev/null; then
        echo -e "  ${YELLOW}⚠${NC} Ollama 서비스가 실행되지 않았습니다."
        echo -e "  ${BLUE}→${NC} 다른 터미널에서 'ollama serve'를 실행해주세요."
        log "WARNING: Ollama 서비스가 실행되지 않음"
    fi

    # gemma3:27b 모델 확인
    if ollama list 2>/dev/null | grep -q "gemma3:27b"; then
        echo -e "  ${GREEN}✓${NC} gemma3:27b 모델이 설치되어 있습니다."
    else
        echo -e "  ${YELLOW}⚠${NC} gemma3:27b 모델이 설치되어 있지 않습니다."
        echo -e "  ${BLUE}→${NC} 'ollama pull gemma3:27b' 명령으로 설치해주세요."
        log "WARNING: gemma3:27b 모델이 설치되어 있지 않음"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Ollama가 설치되어 있지 않습니다."
fi

echo ""

# ============================================
# STEP 8: Frontend 의존성 설치
# ============================================
echo -e "${YELLOW}[STEP 8] Frontend 의존성 설치${NC}"

cd "$PROJECT_ROOT/frontend"

if [ -d "node_modules" ]; then
    echo -e "  ${GREEN}✓${NC} node_modules가 이미 존재합니다."
else
    echo -e "  ${BLUE}→${NC} npm 패키지를 설치합니다..."
    npm install >> "$STARTUP_LOG" 2>&1
    echo -e "  ${GREEN}✓${NC} npm 패키지 설치 완료"
    log "npm 패키지 설치 완료"
fi

echo ""

# ============================================
# STEP 9: 서버 시작 (백그라운드)
# ============================================
echo -e "${YELLOW}[STEP 9] 서버 시작 (백그라운드)${NC}"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}서버를 백그라운드로 시작합니다...${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 로그 파일 헤더 추가
echo "" >> "$BACKEND_LOG"
echo "========================================" >> "$BACKEND_LOG"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backend 서버 시작" >> "$BACKEND_LOG"
echo "========================================" >> "$BACKEND_LOG"

echo "" >> "$FRONTEND_LOG"
echo "========================================" >> "$FRONTEND_LOG"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Frontend 서버 시작" >> "$FRONTEND_LOG"
echo "========================================" >> "$FRONTEND_LOG"

# Backend 서버 시작 (nohup으로 백그라운드 실행)
cd "$PROJECT_ROOT/backend"
source editVideoTagging_venv/bin/activate
echo -e "  ${BLUE}→${NC} Backend 서버를 시작합니다..."
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 >> "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"
sleep 2

# Backend 시작 확인
if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Backend 서버 시작 (PID: $BACKEND_PID)"
    log "Backend 서버 시작 (PID: $BACKEND_PID)"
else
    echo -e "  ${RED}✗${NC} Backend 서버 시작 실패"
    log "ERROR: Backend 서버 시작 실패"
    echo -e "  ${BLUE}→${NC} 로그 확인: $BACKEND_LOG"
    cd "$ORIGINAL_DIR"
    _exit 1
fi

# Frontend 서버 시작 (nohup으로 백그라운드 실행)
cd "$PROJECT_ROOT/frontend"
echo -e "  ${BLUE}→${NC} Frontend 서버를 시작합니다..."
nohup npm run dev -- --hostname 0.0.0.0 >> "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"
sleep 3

# Frontend 시작 확인
if ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Frontend 서버 시작 (PID: $FRONTEND_PID)"
    log "Frontend 서버 시작 (PID: $FRONTEND_PID)"
else
    echo -e "  ${RED}✗${NC} Frontend 서버 시작 실패"
    log "ERROR: Frontend 서버 시작 실패"
    echo -e "  ${BLUE}→${NC} 로그 확인: $FRONTEND_LOG"
    # Backend도 종료
    kill "$BACKEND_PID" 2>/dev/null
    rm -f "$BACKEND_PID_FILE"
    cd "$ORIGINAL_DIR"
    _exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   모든 서버가 백그라운드로 시작됨!     ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  ${BLUE}Backend${NC}  : http://localhost:8000"
echo -e "  ${BLUE}Frontend${NC} : http://localhost:3000"
echo -e "  ${BLUE}API Docs${NC} : http://localhost:8000/docs"
echo ""
echo -e "  ${YELLOW}로그 파일:${NC}"
echo -e "    Backend  : $BACKEND_LOG"
echo -e "    Frontend : $FRONTEND_LOG"
echo -e "    Startup  : $STARTUP_LOG"
echo ""
echo -e "  ${YELLOW}실시간 로그 확인:${NC}"
echo -e "    tail -f $BACKEND_LOG"
echo -e "    tail -f $FRONTEND_LOG"
echo ""
echo -e "서버를 종료하려면: ${BLUE}./stop_server.sh${NC}"
echo ""

log "모든 서버 시작 완료"

# 원래 디렉토리로 복귀
cd "$ORIGINAL_DIR"
