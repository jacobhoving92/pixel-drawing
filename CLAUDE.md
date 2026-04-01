# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `yarn dev:client` — run Parcel dev server for client (hot reload)
- `yarn dev:server` — build and start server in dev mode (sets ADMIN_PASS=testtest)
- `yarn build` — full production build (clean → client → server)
- `yarn build:client` — Parcel build to dist/public
- `yarn build:server` — TypeScript compile server to dist/
- `yarn typecheck` — type-check both client and server tsconfigs
- `yarn prettier` — format all files
- No test runner configured; `test.mjs` exists but no test script

## Architecture

Collaborative pixel-drawing canvas (4096×4096) where each pixel gets a unique color derived from draw order. Self-hosted on Hetzner via Coolify with Redis persistence.

### Server (`src/server/`)
- **index.ts** — Express app, HTTP routes, admin auth (Basic auth, `ADMIN_PASS` env var), file upload via multer
- **socket.ts** — WebSocket server (ws). Sends initial data on connect, broadcasts pixel draws to all clients. Supports erase mode via magic string `erase-810226`
- **canvas.ts** — Server-side canvas logic with ISR (incremental stale revalidation) caching layer. Factory function returns draw/erase/reset/getData methods
- **store.ts** — Redis persistence. Uses a single `pixels` hash for existence checks and a single `canvas` list for draw order

### Client (`src/client/`)
- **app.ts** — Entry point. Wires together canvas, socket, and UI. Handles mouse/touch drawing, pan gestures, demo mode (`?demo`), process/animation mode (`?process`), scroll-to-hash coordinates
- **canvas.ts** — HTML Canvas (4096×4096) rendering. Converts pixel draw order → RGB color (`r = index/256²%256, g = index/256%256, b = index%256`). Supports buffered batch drawing and single-pixel immediate drawing
- **socket.ts** — WebSocket client with exponential backoff reconnect
- **ui.ts** — DOM manipulation for loading state, pixel counter, credits, touch messages, animation controls

### Build
- Client: Parcel bundles `src/client/{index,admin,erase}.html` as entry points
- Server: TypeScript compiled separately via `tsconfig.server.json`
- Two tsconfigs: root for client (includes DOM lib), `tsconfig.server.json` for server
- Styles: SCSS (no Tailwind)

### Key data flow
1. Client connects via WebSocket → server sends initial pixel indices from Redis
2. Client fetches full data via `GET /api/data` → draws all pixels to canvas
3. Mouse/touch events → client checks if pixel empty → sends coordinate index via WebSocket
4. Server stores in Redis, broadcasts `[coordinateIndex, totalCount, isOwner]` to all clients
5. Each client draws the pixel with color derived from its sequential position

### Environment
- `REDIS_URL` — Redis connection (defaults to localhost)
- `ADMIN_PASS` — password for admin routes (`/admin`, `/erase`, `/api/clear`, `/api/upload`, `/api/download`)
- `UPLOAD_PATH` — file upload directory (defaults to `dist/uploads`)
- `PORT` — server port (defaults to 3000)
