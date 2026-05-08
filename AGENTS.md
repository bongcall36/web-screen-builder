# AGENTS.md

## Scope
This file applies to the entire repository.

## Project purpose
Build a metadata-driven web screen builder:
- Frontend: React + Ant Design + AG Grid
- Backend: Spring Boot
- Features: login, menu/screen designer, drag-and-drop component layout, backend data binding, runtime rendering.

## Working agreements for agents
1. Prefer incremental, working code over large one-shot changes.
2. Keep frontend and backend contracts explicit (DTOs, API paths, auth requirements).
3. Preserve backward compatibility for metadata schema when possible.
4. Add or update documentation whenever architecture, API, or setup changes.
5. For runnable code changes, include at least one validation command (build/test/lint) in final report.

## Coding conventions
- Frontend
  - Use TypeScript.
  - Use functional React components and hooks.
  - Keep view components separated from API/state logic where practical.
- Backend
  - Use Spring Boot 3 conventions.
  - Use constructor injection.
  - Validate request payloads and return consistent error models.

## Security requirements
- Never expose secrets in code or logs.
- Authenticate runtime/designer APIs.
- Authorize menu/screen access by role.
- Prefer server-side action identifiers over arbitrary client-provided URLs.

## PR/commit guidance
- Keep commit messages concise and imperative.
- Summarize changed files and validation steps in PR description.
- If changes are docs-only, clearly state that no runtime tests were executed.
