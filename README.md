# MediaTagging

AI 기반 동영상 및 사진 자동 태깅 시스템

## 개요

MediaTagging은 동영상과 사진을 업로드하고 AI(Ollama)를 활용하여 자동으로 태그를 생성하는 웹 애플리케이션입니다. 생성된 태그를 기반으로 미디어를 검색하고 관리할 수 있습니다.

## 주요 기능

### 1. 미디어 업로드
- 동영상 업로드 (MP4, MOV, AVI, MKV, WebM, WMV, FLV)
- 사진 업로드 (JPG, PNG, GIF, WebP, BMP, TIFF)
- 여러 파일 동시 업로드
- 폴더 단위 업로드
- 드래그 앤 드롭 지원

### 2. AI 자동 태깅

#### 동영상
- 동영상 요약 생성 (멀티프레임 비전 분석)
- 장면(Scene) 자동 감지 및 분할
- 장면별 썸네일 생성
- 장면별 AI 태그 생성 (3-7개)
- 동영상 전체 태그 집계

#### 사진
- 사진 설명 생성 (2-3문장)
- AI 태그 생성 (5-15개)
- 썸네일 자동 생성

### 3. 검색 기능
- 태그 기반 검색
- 논리 연산자 지원 (AND, OR, NOT)
- 동영상, 사진, 장면 통합 검색

### 4. 장면 관리
- 장면 타임라인 시각화
- 장면 클릭 시 해당 위치로 이동
- 개별 장면 다운로드
- 여러 장면 병합 내보내기

### 5. 사용자 정의 태그
- `#태그` 형식으로 직접 태그 추가
- AI 태그와 사용자 태그 구분 표시

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                          │
│                   Next.js 13 Frontend                        │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend Server                           │
│                    Python / FastAPI                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Videos    │  │   Images    │  │      Search         │  │
│  │   Module    │  │   Module    │  │      Module         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Scenes    │  │  Tagging    │  │      Export         │  │
│  │   Module    │  │   Module    │  │      Module         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│    PostgreSQL    │ │   File Storage   │ │  Ollama (AI)     │
│    Database      │ │     Local        │ │  gemma3:27b      │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

## 기술 스택

### Frontend
| 기술 | 용도 |
|------|------|
| Next.js 13 | React 프레임워크 (App Router) |
| TypeScript | 타입 안정성 |
| Tailwind CSS | 스타일링 |
| TanStack Query | 서버 상태 관리 |
| ReactPlayer | 동영상 재생 |
| Axios | HTTP 클라이언트 |

### Backend
| 기술 | 용도 |
|------|------|
| FastAPI | Python 웹 프레임워크 |
| SQLAlchemy | ORM |
| Alembic | DB 마이그레이션 |
| FFmpeg | 동영상 처리 |
| PySceneDetect | 장면 감지 |
| Pillow | 이미지 처리 |

### Infrastructure
| 기술 | 용도 |
|------|------|
| PostgreSQL | 데이터베이스 |
| Docker | 컨테이너화 |
| Ollama | 로컬 AI 모델 실행 |

## 디렉토리 구조

```
mediaTagging/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # API 엔드포인트
│   │   │   ├── videos.py
│   │   │   ├── images.py
│   │   │   ├── scenes.py
│   │   │   └── search.py
│   │   ├── models/              # 데이터베이스 모델
│   │   │   ├── video.py
│   │   │   ├── image.py
│   │   │   ├── scene.py
│   │   │   └── tag.py
│   │   ├── services/            # 비즈니스 로직
│   │   │   ├── tagging_service.py
│   │   │   └── image_tagging_service.py
│   │   ├── utils/               # 유틸리티
│   │   │   ├── video_processor.py
│   │   │   ├── scene_detector.py
│   │   │   └── ollama_client.py
│   │   ├── config.py
│   │   └── main.py
│   ├── alembic/                 # DB 마이그레이션
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/                 # 페이지
│       │   ├── page.tsx         # 홈
│       │   ├── upload/          # 업로드
│       │   ├── videos/          # 동영상 목록/상세
│       │   ├── images/          # 사진 목록/상세
│       │   └── search/          # 검색
│       ├── components/          # 컴포넌트
│       ├── hooks/               # React 훅
│       ├── lib/                 # API 클라이언트
│       └── types/               # TypeScript 타입
├── storage/                     # 파일 저장소
│   ├── videos/
│   ├── images/
│   ├── thumbnails/
│   ├── clips/
│   └── exports/
├── docker-compose.yml
└── README.md
```

## API 엔드포인트

### 동영상 (/api/videos)
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /upload | 동영상 업로드 |
| GET | / | 목록 조회 |
| GET | /{id} | 상세 조회 |
| PUT | /{id} | 수정 |
| DELETE | /{id} | 삭제 |
| POST | /{id}/tagging/start | 태깅 시작 |
| GET | /{id}/tagging/status | 태깅 상태 |
| GET | /{id}/scenes | 장면 목록 |
| GET | /{id}/stream | 스트리밍 |

### 사진 (/api/images)
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /upload | 사진 업로드 |
| GET | / | 목록 조회 |
| GET | /{id} | 상세 조회 |
| PUT | /{id} | 수정 |
| DELETE | /{id} | 삭제 |
| POST | /{id}/tagging/start | 태깅 시작 |
| GET | /{id}/file | 원본 다운로드 |
| GET | /{id}/thumbnail | 썸네일 |

### 장면 (/api/scenes)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /{id} | 상세 조회 |
| GET | /{id}/download | 클립 다운로드 |
| POST | /export | 병합 내보내기 |

### 검색 (/api/search)
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | / | 태그 검색 |
| GET | /tags | 태그 목록 |

## 데이터베이스 스키마

### 주요 테이블
- **videos**: 동영상 메타데이터
- **images**: 사진 메타데이터
- **scenes**: 동영상 장면 정보
- **tags**: 태그 목록
- **video_tags**: 동영상-태그 연결
- **scene_tags**: 장면-태그 연결
- **image_tags**: 사진-태그 연결

## 설치 및 실행

### 사전 요구사항
- Python 3.11+
- Node.js 18+
- Docker
- FFmpeg
- Ollama (gemma3:27b 모델)

### 1. 저장소 클론
```bash
git clone https://github.com/cowrkwithu/MediaTagging.git
cd MediaTagging
```

### 2. 데이터베이스 시작
```bash
docker compose up -d
```

### 3. 백엔드 설정 및 실행
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 프론트엔드 설정 및 실행
```bash
cd frontend
npm install
npm run dev -- --hostname 0.0.0.0
```

### 5. Ollama 모델 설치
```bash
ollama pull gemma3:27b
```

## 접속

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

## 환경 변수

### backend/.env
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mediatagging
OLLAMA_BASE_URL=http://localhost:11434
STORAGE_PATH=/path/to/mediaTagging/storage
DEBUG=True
```

## 워크플로우

### 동영상 태깅
```
업로드 → 메타데이터 추출 → 태깅 시작
    → AI 요약 생성 (3개 프레임 분석)
    → 장면 감지 (PySceneDetect)
    → 장면별 썸네일 생성
    → 장면별 태그 생성 (3개 프레임 분석)
    → 동영상 태그 집계
    → 완료 (status: tagged)
```

### 사진 태깅
```
업로드 → 썸네일 생성 → 태깅 시작
    → AI 설명 생성
    → AI 태그 생성 (5-15개)
    → 완료 (status: tagged)
```

## 라이선스

MIT License

## 문서

- [요구사항분석서](zWorkingDocs/요구사항분석_v20260127.md)
- [시스템설계서](zWorkingDocs/시스템설계_v20260127.md)
- [구현설계서](zWorkingDocs/구현설계_v20260127.md)
