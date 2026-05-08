# Web Screen Builder (React + Ant Design + AG Grid + Spring Boot)

This repository provides a practical blueprint for building a **web designer program** where users can:

- log in,
- design screens by drag-and-drop from component groups,
- define a menu connected to screens,
- bind screen components to backend data,
- run the generated web app after login.

---

## 1) Target Product Scope

Your designer has two major runtimes:

1. **Designer App** (for admins/builders)
   - Drag components onto a canvas
   - Configure component properties/events
   - Bind component fields to backend API responses
   - Create menu structure and map menu items to screens
   - Save and publish app metadata

2. **Runtime App** (for end users)
   - Login
   - Render published menus/screens from metadata
   - Fetch/send data to backend APIs
   - Execute events (search, save, delete, navigation)

---

## 2) Recommended High-Level Architecture

```text
[React Designer UI]  --->  [Spring Boot Metadata API] ---> [PostgreSQL]
       |                           |
       |                           +--> Auth (JWT)
       |
       +-- publishes JSON schemas for screens/menus/workflows

[React Runtime UI]   --->  [Spring Boot Runtime API]  ---> [Business DB / services]
```

### Frontend stack
- React (Vite + TypeScript recommended)
- Ant Design (forms/layout/buttons/modal)
- AG Grid (tables/data grids)
- `dnd-kit` or `react-dnd` for drag-and-drop designer canvas
- `react-query` for API data fetching/caching
- `zustand` or Redux Toolkit for editor state

### Backend stack
- Spring Boot 3.x
- Spring Security + JWT
- Spring Data JPA
- PostgreSQL
- Flyway for DB migration

---

## 3) Core Domain Model (Metadata)

Store **screen definitions** as JSON metadata instead of hardcoding pages.

- `users` (login users)
- `apps` (tenant/application)
- `menus` (tree menu structure)
- `screens` (screen metadata)
- `screen_versions` (draft/published versions)
- `data_sources` (API endpoints for binding)
- `component_bindings` (component field -> data path)

### Example screen metadata (simplified)

```json
{
  "screenId": "customer-list",
  "name": "Customer List",
  "layout": {
    "type": "grid",
    "columns": 24
  },
  "components": [
    {
      "id": "searchForm",
      "type": "Form",
      "props": {"layout": "inline"},
      "children": [
        {"id": "name", "type": "Input", "props": {"label": "Name"}},
        {"id": "btnSearch", "type": "Button", "props": {"text": "Search", "action": "searchCustomers"}}
      ]
    },
    {
      "id": "gridCustomers",
      "type": "AgGrid",
      "props": {
        "columnDefs": [
          {"field": "id"},
          {"field": "name"},
          {"field": "email"}
        ]
      },
      "binding": {
        "source": "GET:/api/customers",
        "responsePath": "data.items"
      }
    }
  ]
}
```

---

## 4) Required Backend APIs

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Menu + Screen metadata
- `GET /api/runtime/menus` (menus for logged-in user)
- `GET /api/runtime/screens/{screenId}` (published screen JSON)
- `POST /api/designer/screens` (save draft)
- `POST /api/designer/screens/{screenId}/publish`

### Data binding/proxy (optional)
- `POST /api/runtime/actions/{actionId}`
- `GET /api/runtime/datasource/{sourceId}`

> Tip: A proxy layer avoids exposing arbitrary backend endpoints directly in metadata.

---

## 5) Frontend Modules

### A) Designer application
1. **Component palette**
   - categories: layout/form/grid/navigation/display
2. **Canvas**
   - drop zone + selected component highlight
3. **Property panel**
   - edit props, styles, validation, events
4. **Binding panel**
   - choose API/data source and bind field path
5. **Menu editor**
   - tree editing + route/screen mapping
6. **Version/publish panel**
   - draft save, preview, publish

### B) Runtime application
1. **Login page**
2. **Layout shell** (top/side menu + content)
3. **Dynamic renderer**
   - parse screen JSON -> React components
4. **Action engine**
   - execute button events/search/save/navigation
5. **Data engine**
   - request backend, map response into component state

---

## 6) Drag-and-Drop Composition Flow

1. User drags component from palette to canvas.
2. Designer creates node with default props.
3. Node appears in component tree and property panel.
4. User configures props/events/bindings.
5. Designer serializes tree into screen JSON.
6. Save as draft, then publish.
7. Runtime loads published JSON and renders screen dynamically.

---

## 7) Suggested Folder Structure

```text
web-screen-builder/
  frontend/
    designer/
      src/
        modules/{palette,canvas,properties,bindings,menu-editor}/
        renderer/
        api/
    runtime/
      src/
        modules/{auth,layout,dynamic-renderer,action-engine}/
        api/
  backend/
    src/main/java/com/example/webscreenbuilder/
      auth/
      menu/
      screen/
      runtime/
      datasource/
    src/main/resources/db/migration/
```

---

## 8) Incremental Build Plan (Recommended)

### Phase 1 (MVP)
- JWT login
- Menu CRUD + screen CRUD
- Basic designer canvas (Form, Input, Button, AG Grid)
- Publish + runtime render

### Phase 2
- Event/action engine
- Data binding mapper
- Validation rules
- Role-based menu authorization

### Phase 3
- Version diff/rollback
- Reusable component templates
- Theme system
- Audit trail

---

## 9) Example “Login -> Menu -> Screen” Runtime Sequence

1. User logs in (`/api/auth/login`) and receives JWT.
2. Runtime requests `/api/runtime/menus`.
3. User clicks a menu item linked to `screenId`.
4. Runtime loads `/api/runtime/screens/{screenId}`.
5. Dynamic renderer builds components from metadata.
6. If screen has data bindings, runtime calls mapped APIs.
7. User interactions trigger configured actions (save/search/navigate).

---

## 10) Practical Notes

- Keep metadata schema versioned (e.g., `schemaVersion: 1`).
- Validate JSON server-side before publishing.
- Maintain a strict allowlist for renderable components and actions.
- Use optimistic locking on `screen_versions` to avoid overwrite conflicts.
- Prefer backend action IDs over raw URLs in metadata for security.

---

## 11) Next Step (Implementation Starter)

If you want, the next commit can scaffold:

- `frontend/designer` (Vite + React + AntD + AG Grid + DnD skeleton)
- `frontend/runtime` (dynamic renderer skeleton)
- `backend` (Spring Boot auth/menu/screen API skeleton + Flyway)



## 12) Development Rules (Required)

- Start with MVP.
- Keep frontend and backend separated.
- Use JSON metadata to render screens dynamically.
- Do not over-engineer advanced features yet.

## 13) Standard Test Commands

### Frontend
```bash
npm install
npm run build
```

### Backend
```bash
./mvnw test
./mvnw spring-boot:run
```

## 14) Initial MVP Scaffold (Implemented)

This repository now includes a simple runnable MVP scaffold:

- `frontend/designer`: React + TypeScript + Ant Design app for saving screen metadata.
- `frontend/runtime`: React + TypeScript + Ant Design app with dynamic renderer supporting `Input`, `Button`, and `AgGrid` from JSON.
- `backend`: Spring Boot 3 (Java 17) mock API server.

Implemented APIs (mock/in-memory):
- `POST /api/auth/login`
- `GET /api/menus`
- `POST /api/screens`
- `GET /api/screens/{screenId}`

Sample metadata is preloaded under `screenId = sample-screen` in backend in-memory storage.

## 15) Run Instructions (MVP)

### Backend
```bash
cd backend
mvn spring-boot:run
```

### Frontend Designer
```bash
cd frontend/designer
npm install
npm run dev
```

### Frontend Runtime
```bash
cd frontend/runtime
npm install
npm run dev
```
