# Web Screen Builder

Metadata-driven MVP for designing and running simple web screens.

## Modules
- `frontend/designer`: React designer for screens, menus, grid columns/rows, and communication metadata.
- `frontend/runtime`: React runtime that renders menus and screens from metadata.
- `backend`: Spring Boot API server with in-memory MVP storage.

## Metadata Shape
Screens are saved as JSON with:
- `components`: visual components such as `Input`, `Button`, and `AgGrid`.
- `communications`: action definitions that connect input components to backend calls and response rows to output components.

Menus are saved independently and can be nested:
- `id`, `name`: menu node identity.
- `parentId`: empty for root menus, or another menu id for tree depth.
- `targetType`: `folder` for grouping or `screen` for a menu that opens a screen.
- `screenId`: required when `targetType` is `screen`.
- `openMode`: `inline` opens in the runtime content area, `popup` opens the screen in a modal.

Example communication:
```json
{
  "id": "searchUsers",
  "name": "Search Users",
  "triggerComponentId": "button1",
  "inputBindings": [{ "field": "keyword", "componentId": "input1" }],
  "outputBindings": [{ "field": "rows", "componentId": "grid1" }],
  "sampleRows": [{ "id": 1, "name": "Alice" }]
}
```

## Backend APIs
- `POST /api/auth/login`
- `GET /api/menus`
- `POST /api/menus`
- `GET /api/screens`
- `GET /api/screens/{screenId}`
- `POST /api/screens`
- `GET /api/communications/formats`
- `POST /api/communications/formats`
- `POST /api/communications/{actionId}/execute`

## Persistence
MVP metadata is stored as JSON files under:
- `backend/data/screens/{screenId}.json`
- `backend/data/menus/{menuId}.json`
- `backend/data/communication-formats/{formatId}.json`

## Run
```bash
cd backend
mvn spring-boot:run
```

```bash
cd frontend/designer
npm install
npm run dev
```

```bash
cd frontend/runtime
npm install
npm run dev
```

## Validation
```bash
cd backend
mvn test
```

```bash
cd frontend/designer
npm run build
```

```bash
cd frontend/runtime
npm run build
```

## Current Limitations
- Communication execution is an MVP mock endpoint that filters configured sample rows using the first string input value.
