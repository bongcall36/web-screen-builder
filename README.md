<<<<<<< ours
# Web Screen Builder - MVP Step 1

처음에는 이것만 만들어 시작합니다.

## Scope (Only this)
- Login
- Menu
- Screen Metadata Load
- Dynamic Renderer
- Input / Button / Grid 표시

## Structure
- `frontend/runtime`: React + TypeScript + Ant Design + AG Grid
- `backend`: Spring Boot 3 + Java 17

## Backend APIs
- `POST /api/auth/login` → mock token 반환
- `GET /api/menus` → 메뉴 1건 반환 (`sample-screen`)
- `GET /api/screens/{screenId}` → 화면 메타데이터(JSON) 반환

## Dynamic Renderer Supported Components
- `Input`
- `Button`
- `AgGrid`

## Run
### Backend
```bash
cd backend
mvn spring-boot:run
```

### Runtime Frontend
```bash
cd frontend/runtime
npm install
npm run dev
```

## Test/Build
### Frontend
```bash
cd frontend/runtime
npm install
npm run build
```

### Backend
```bash
cd backend
mvn test
```

