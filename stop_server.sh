#!/bin/bash

# MediaTagging Server Stop Script
# 서버 안전 종료 스크립트
# - 처리 중인 작업 확인
# - Graceful shutdown

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

# PID 파일 디렉토리
PID_DIR="$PROJECT_ROOT/.pids"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# 로그 디렉토리
LOG_DIR="$PROJECT_ROOT/logs"
SHUTDOWN_LOG="$LOG_DIR/shutdown_$(date +"%Y%m%d_%H%M%S").log"
mkdir -p "$LOG_DIR"

# 로그 함수
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$message" >> "$SHUTDOWN_LOG"
}

# Graceful shutdown 타임아웃 (초)
GRACEFUL_TIMEOUT=10
FORCE_TIMEOUT=5

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   MediaTagging Server Stop Script      ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
log "서버 종료 스크립트 실행"

# ============================================
# STEP 1: 처리 중인 작업 확인
# ============================================
echo -e "${YELLOW}[STEP 1] 처리 중인 작업 확인${NC}"

ACTIVE_TASKS=0
TAGGING_IN_PROGRESS=false

# Backend 서버가 실행 중인지 확인
BACKEND_RUNNING=false
if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat "$BACKEND_PID_FILE")
    if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
        BACKEND_RUNNING=true
    fi
fi

# Backend가 실행 중이면 API로 진행 중인 작업 확인
if [ "$BACKEND_RUNNING" = true ]; then
    echo -e "  ${BLUE}→${NC} 진행 중인 태깅 작업 확인 중..."

    # 동영상 태깅 상태 확인 (processing 상태인 것들)
    VIDEO_PROCESSING=$(curl -s --connect-timeout 3 "http://localhost:8000/api/videos" 2>/dev/null | \
        python3 -c "import sys, json; data=json.load(sys.stdin); print(sum(1 for v in data if v.get('status') == 'processing'))" 2>/dev/null || echo "0")

    # 이미지 태깅 상태 확인 (processing 상태인 것들)
    IMAGE_PROCESSING=$(curl -s --connect-timeout 3 "http://localhost:8000/api/images" 2>/dev/null | \
        python3 -c "import sys, json; data=json.load(sys.stdin); print(sum(1 for i in data if i.get('status') == 'processing'))" 2>/dev/null || echo "0")

    # 숫자가 아닌 경우 0으로 처리
    if ! [[ "$VIDEO_PROCESSING" =~ ^[0-9]+$ ]]; then
        VIDEO_PROCESSING=0
    fi
    if ! [[ "$IMAGE_PROCESSING" =~ ^[0-9]+$ ]]; then
        IMAGE_PROCESSING=0
    fi

    ACTIVE_TASKS=$((VIDEO_PROCESSING + IMAGE_PROCESSING))

    if [ "$ACTIVE_TASKS" -gt 0 ]; then
        TAGGING_IN_PROGRESS=true
        echo -e "  ${YELLOW}⚠${NC} 진행 중인 작업 발견:"
        if [ "$VIDEO_PROCESSING" -gt 0 ]; then
            echo -e "    - 동영상 태깅: ${VIDEO_PROCESSING}건"
        fi
        if [ "$IMAGE_PROCESSING" -gt 0 ]; then
            echo -e "    - 이미지 태깅: ${IMAGE_PROCESSING}건"
        fi
        log "WARNING: 진행 중인 작업 발견 - 동영상: $VIDEO_PROCESSING, 이미지: $IMAGE_PROCESSING"
    else
        echo -e "  ${GREEN}✓${NC} 진행 중인 작업 없음"
        log "진행 중인 작업 없음"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} Backend 서버가 실행 중이지 않아 작업 상태를 확인할 수 없습니다."
    log "WARNING: Backend 서버가 실행 중이지 않음"
fi

echo ""

# ============================================
# STEP 2: 사용자 확인 (진행 중인 작업이 있는 경우)
# ============================================
if [ "$TAGGING_IN_PROGRESS" = true ]; then
    echo -e "${YELLOW}[STEP 2] 종료 확인${NC}"
    echo -e "  ${RED}주의:${NC} 진행 중인 태깅 작업이 있습니다."
    echo -e "  서버를 종료하면 해당 작업이 중단됩니다."
    echo ""

    # 인터랙티브 모드에서만 확인
    if [ -t 0 ]; then
        read -p "  계속 진행하시겠습니까? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "  ${BLUE}→${NC} 종료가 취소되었습니다."
            log "사용자가 종료 취소"
            exit 0
        fi
        log "사용자가 종료 확인"
    else
        echo -e "  ${YELLOW}⚠${NC} 비인터랙티브 모드: 강제 종료 진행"
        log "비인터랙티브 모드: 강제 종료 진행"
    fi
    echo ""
fi

# ============================================
# STEP 3: Frontend 서버 종료
# ============================================
echo -e "${YELLOW}[STEP 3] Frontend 서버 종료${NC}"

FRONTEND_STOPPED=false

# PID 파일에서 확인
if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    if ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
        echo -e "  ${BLUE}→${NC} Frontend 서버 종료 중... (PID: $FRONTEND_PID)"

        # SIGTERM으로 graceful shutdown 시도
        kill -TERM "$FRONTEND_PID" 2>/dev/null

        # 종료 대기
        for i in $(seq 1 $GRACEFUL_TIMEOUT); do
            if ! ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
                FRONTEND_STOPPED=true
                break
            fi
            sleep 1
        done

        # 아직 실행 중이면 SIGKILL
        if [ "$FRONTEND_STOPPED" = false ]; then
            echo -e "  ${YELLOW}⚠${NC} Graceful shutdown 실패, 강제 종료 시도..."
            kill -KILL "$FRONTEND_PID" 2>/dev/null
            sleep 1
            FRONTEND_STOPPED=true
        fi

        rm -f "$FRONTEND_PID_FILE"
        echo -e "  ${GREEN}✓${NC} Frontend 서버가 종료되었습니다."
        log "Frontend 서버 종료 (PID: $FRONTEND_PID)"
    else
        rm -f "$FRONTEND_PID_FILE"
        echo -e "  ${YELLOW}⚠${NC} PID 파일은 있지만 프로세스가 실행 중이지 않습니다."
    fi
else
    # PID 파일이 없으면 프로세스 직접 검색
    FRONTEND_PIDS=$(pgrep -f "next dev" 2>/dev/null | grep -v "^$$\$")
    if [ -n "$FRONTEND_PIDS" ]; then
        echo -e "  ${BLUE}→${NC} Frontend 프로세스 발견, 종료 중..."
        echo "$FRONTEND_PIDS" | while read pid; do
            kill -TERM "$pid" 2>/dev/null
        done
        sleep 2

        # 남은 프로세스 강제 종료
        REMAINING=$(pgrep -f "next dev" 2>/dev/null)
        if [ -n "$REMAINING" ]; then
            echo "$REMAINING" | xargs kill -KILL 2>/dev/null
        fi

        echo -e "  ${GREEN}✓${NC} Frontend 서버가 종료되었습니다."
        log "Frontend 서버 종료 (프로세스 직접 검색)"
    else
        echo -e "  ${YELLOW}⚠${NC} 실행 중인 Frontend 서버가 없습니다."
    fi
fi

echo ""

# ============================================
# STEP 4: Backend 서버 종료
# ============================================
echo -e "${YELLOW}[STEP 4] Backend 서버 종료${NC}"

BACKEND_STOPPED=false

# PID 파일에서 확인
if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat "$BACKEND_PID_FILE")
    if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
        echo -e "  ${BLUE}→${NC} Backend 서버 종료 중... (PID: $BACKEND_PID)"

        # SIGTERM으로 graceful shutdown 시도
        kill -TERM "$BACKEND_PID" 2>/dev/null

        # 종료 대기
        for i in $(seq 1 $GRACEFUL_TIMEOUT); do
            if ! ps -p "$BACKEND_PID" > /dev/null 2>&1; then
                BACKEND_STOPPED=true
                break
            fi
            sleep 1
        done

        # 아직 실행 중이면 SIGKILL
        if [ "$BACKEND_STOPPED" = false ]; then
            echo -e "  ${YELLOW}⚠${NC} Graceful shutdown 실패, 강제 종료 시도..."
            kill -KILL "$BACKEND_PID" 2>/dev/null
            sleep 1
            BACKEND_STOPPED=true
        fi

        rm -f "$BACKEND_PID_FILE"
        echo -e "  ${GREEN}✓${NC} Backend 서버가 종료되었습니다."
        log "Backend 서버 종료 (PID: $BACKEND_PID)"
    else
        rm -f "$BACKEND_PID_FILE"
        echo -e "  ${YELLOW}⚠${NC} PID 파일은 있지만 프로세스가 실행 중이지 않습니다."
    fi
else
    # PID 파일이 없으면 프로세스 직접 검색
    BACKEND_PIDS=$(pgrep -f "uvicorn app.main:app" 2>/dev/null | grep -v "^$$\$")
    if [ -n "$BACKEND_PIDS" ]; then
        echo -e "  ${BLUE}→${NC} Backend 프로세스 발견, 종료 중..."
        echo "$BACKEND_PIDS" | while read pid; do
            kill -TERM "$pid" 2>/dev/null
        done
        sleep 2

        # 남은 프로세스 강제 종료
        REMAINING=$(pgrep -f "uvicorn app.main:app" 2>/dev/null)
        if [ -n "$REMAINING" ]; then
            echo "$REMAINING" | xargs kill -KILL 2>/dev/null
        fi

        echo -e "  ${GREEN}✓${NC} Backend 서버가 종료되었습니다."
        log "Backend 서버 종료 (프로세스 직접 검색)"
    else
        echo -e "  ${YELLOW}⚠${NC} 실행 중인 Backend 서버가 없습니다."
    fi
fi

echo ""

# ============================================
# STEP 5: 종료 확인
# ============================================
echo -e "${YELLOW}[STEP 5] 종료 확인${NC}"

# 남은 프로세스 확인
REMAINING_BACKEND=$(pgrep -f "uvicorn app.main:app" 2>/dev/null)
REMAINING_FRONTEND=$(pgrep -f "next dev" 2>/dev/null)

if [ -z "$REMAINING_BACKEND" ] && [ -z "$REMAINING_FRONTEND" ]; then
    echo -e "  ${GREEN}✓${NC} 모든 서버가 정상적으로 종료되었습니다."
    log "모든 서버 정상 종료"
else
    if [ -n "$REMAINING_BACKEND" ]; then
        echo -e "  ${RED}✗${NC} 일부 Backend 프로세스가 아직 실행 중입니다: $REMAINING_BACKEND"
        log "WARNING: 일부 Backend 프로세스가 아직 실행 중: $REMAINING_BACKEND"
    fi
    if [ -n "$REMAINING_FRONTEND" ]; then
        echo -e "  ${RED}✗${NC} 일부 Frontend 프로세스가 아직 실행 중입니다: $REMAINING_FRONTEND"
        log "WARNING: 일부 Frontend 프로세스가 아직 실행 중: $REMAINING_FRONTEND"
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   서버 종료 완료                       ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  ${YELLOW}로그 파일:${NC} $SHUTDOWN_LOG"
echo ""
echo -e "데이터베이스를 종료하려면: ${BLUE}docker compose down${NC}"
echo ""

log "서버 종료 스크립트 완료"
