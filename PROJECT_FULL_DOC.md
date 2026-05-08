# Opslagstavlen — Full Technical Reference

Purpose: concise, developer-oriented deep dive describing API proxy behavior, data models, UI interactions, and notable quirks discovered in the codebase.

Note: all file references are workspace-local paths.

---

## 1) Environment & configuration
- `PLANKA_BASE_URL` — upstream Planka base URL used by all proxy routes. Default in code: `https://tavlen.emilfrom.com`.
- Cookie: `planka_jwt` — JWT token stored in cookie and used for Authorization header.
- next.config.ts uses `output: "standalone"` and `allowedDevOrigins` for local dev origins.

Key files:
- `src/proxy.ts` — middleware for root redirect when JWT present.
- `next.config.ts`

---

## 2) High-level architecture
- The app is a UI wrapper (PWA/mobile-first) for an upstream Planka installation. Next.js route handlers act as a proxy layer to the Planka API. The UI calls local routes under `/api/*`, and those routes forward requests to `${PLANKA_BASE_URL}/api/*` with `Authorization: Bearer <token>`.

Flow:
- Client (browser) -> Next.js route (e.g. `/api/boards`) -> Upstream Planka API -> Proxy processes response and returns JSON to client.

---

## 3) API Endpoints (local proxy) — behavior matrix

- `GET /api/boards`
  - Upstream: `GET ${PLANKA_BASE_URL}/api/projects`
  - Require: `planka_jwt` cookie; returns 401 if missing.
  - Parses `included.boards` when available and returns that array.
  - On upstream non-ok: responds 502 with raw text.
  - File: `src/app/api/boards/route.ts`

- `GET /api/boards/[boardId]/cards`
  - Upstream: `GET ${PLANKA_BASE_URL}/api/boards/${boardId}`
  - Require: `planka_jwt`; 401 if missing.
  - Extracts `included.lists`, `included.cards`, `included.labels`, `included.cardLabels` and returns `{ lists, cards, labels, cardLabels }`.
  - If JSON parse fails, returns upstream raw text as 502.
  - File: `src/app/api/boards/[boardId]/cards/route.ts`

- `POST /api/cards`
  - Purpose: create a new card in a list.
  - Body (required): `{ boardId, listId, name }`, optional `description`.
  - It builds payload: `{ name, position: 65536, type: 'project', description?, boardId? }`.
  - Upstream: `POST ${PLANKA_BASE_URL}/api/lists/${listId}/cards`.
  - Returns upstream response JSON (or raw text if parse fails). Logs outgoing/ incoming payloads to console.
  - File: `src/app/api/cards/route.ts`

- `PATCH /api/cards/[cardId]`
  - Purpose: update card fields (name, description, or move via `listId`/`boardId`).
  - Body: arbitrary JSON forwarded to upstream `PATCH ${PLANKA_BASE_URL}/api/cards/${cardId}`.
  - 401 if cookie missing.
  - File: `src/app/api/cards/[cardId]/route.ts`

- `POST /api/cards/[cardId]/labels`
  - Purpose: attach a label to a card.
  - Body: `{ labelId }` required.
  - Implements compatibility attempts for different Planka APIs (order matters):
    1. `POST /api/cards/${cardId}/card-labels` with `{ labelId }`
    2. `POST /api/cards/${cardId}/labels` with `{ labelId }`
    3. `POST /api/cards/${cardId}/labels/${labelId}` with no payload
    4. `POST /api/card-labels` with `{ cardId, labelId }`
  - Behavior: on 404 try next attempt; on other non-ok status return immediately with that status and body.
  - File: `src/app/api/cards/[cardId]/labels/route.ts`

- `GET /api/me`
  - Purpose: return a minimal `id`, `name`, `username` for current user.
  - First step: decode the JWT payload locally (see JWT section) and map fields: `id = userId || id || sub`, `name = name || username`, `username = username`.
  - If `name` & `username` exist in decoded payload, return them without upstream call.
  - Otherwise, call upstream `GET ${PLANKA_BASE_URL}/api/users/me` and return `item` fields merged with decoded fallback.
  - File: `src/app/api/me/route.ts`

---

## 4) JWT decoding specifics
- Implemented in `src/app/api/me/route.ts` as `decodeJwtPayload(token)`.
- Algorithm:
  - Split token by `.` and take the second segment.
  - Replace `-` -> `+` and `_` -> `/`, pad with `=` to length multiple of 4, base64 decode, parse JSON.
  - Produces a payload typed as:
    - `id`, `userId`, `name`, `username`, `sub` may be present.
- Fallback: if decode fails or fields incomplete, proxy calls upstream `GET /api/users/me`.

Security note: the code only inspects the token payload locally and does not validate signature — it trusts the token exists and uses it as Bearer token for upstream calls.

---

## 5) Data models (types)
- See `src/types/planka.ts`; primary interfaces of interest:
  - `Board` — id, name, description, isClosed, projectId, background
  - `List` — id, name, isArchived, position, boardId
  - `Card` — id, name, description, dueDate, position, listId, boardId
  - `Label` — id, name, color, boardId
  - `CardLabel` — id, cardId, labelId

These types are used by UI components for rendering and logic.

---

## 6) UI behaviors & components

- `src/components/TaskCard.tsx` (primary task UI)
  - Touch gestures:
    - Long-press (>= 500ms) opens bottom-sheet edit modal.
    - Drag-right with offset.x > 120 triggers label-swipe action to mark as read.
  - Actions:
    - Save edits: `PATCH /api/cards/{cardId}` with `{ name, description }`.
    - Archive: shows confirm dialog then `PATCH /api/cards/{cardId}` with `{ boardId, listId: 1753252979122635795 }`.
    - Swipe-label: POST to `/api/cards/{cardId}/labels` with `{ labelId }` after matching local label by name.
  - Optimistic UI: when attaching a label, `optimisticLabelId` is set so the label appears immediately without refetching.

- `src/app/boards/page.tsx`
  - Fetches `/api/boards` and accepts both `[]` and `{ items: [] }` shapes.

- `src/app/boards/[boardId]/page.tsx`
  - Fetches `/api/boards/${boardId}/cards` and uses `lists` returned from proxy.
  - Filters archived lists and prefers lists named `emil` and `coline` (personalization). If both exist show only them, else show all non-archived lists.

---

## 7) Hardcoded IDs & personalization
- Root redirect board id: `1753252978711594001` in `src/proxy.ts`.
- Archive list id: `1753252979122635795` in `src/components/TaskCard.tsx`.
- Preferred list names: `emil` and `coline` in `src/app/boards/[boardId]/page.tsx`.

Recommendation: move these to a single `src/config.ts` or env vars to make them editable and avoid accidental exposure in code.

---

## 8) Error handling, logging, and resilience
- Proxy logs outgoing requests and upstream raw responses for `POST /api/cards` and `PATCH /api/cards/[id]` via `console.log`/`console.error`.
- Many handlers return raw upstream text back to client when parsing fails — useful for debugging but may leak upstream error formats.
- Label attach uses a resilient approach: multiple endpoint formats with explicit 404 handling.

---

## 9) PWA & UX notes (accessibility for AuDHD / ADHD)
- Large buttons and cards, simple flows, and clear, short toast messages, and bottom-sheet edit UX reduce cognitive load.
- The app reduces buffering expectations by using optimistic UI changes (labels show immediately) and short-lived toasts.

Design suggestions (optional):
- Add explicit visual affordances for success/failure that persist longer for users who need confirmation.
- Make the archive list id configurable with a friendly name in settings.

---

## 10) Quick examples (requests)

Create card example (client -> local proxy):

POST /api/cards
Body:
```
{
  "boardId": "1753252978711594001",
  "listId": "1753252979122635795",
  "name": "Write groceries list",
  "description": "Remember milk"
}
```

Proxy forwards to upstream: `POST ${PLANKA_BASE_URL}/api/lists/{listId}/cards` with payload `{ name, position: 65536, type: 'project', description?, boardId? }` and header `Authorization: Bearer <planka_jwt>`.

Attach label example (client -> local proxy):

POST /api/cards/123/labels
Body: `{ "labelId": "456" }`

Proxy will attempt the ordered list of upstream endpoints until one returns OK or exhausts attempts.

---

## 11) Suggested next work items (concrete)
1. Extract hardcoded constants into `src/config.ts` and wire with env vars for deployment and per-user customization.
2. Add a short `DEVELOPER.md` describing the label-attach compatibility matrix and how to test it against a Planka instance.
3. Consider tightening JWT handling: validate token expiry if desired, or always fetch `/api/users/me` to ensure canonical user info.
4. Add a small integration script to assert which label attach endpoints are supported by a given `PLANKA_BASE_URL` instance.

---

File links (high-value):
- `src/proxy.ts`
- `src/app/api/boards/route.ts`
- `src/app/api/boards/[boardId]/cards/route.ts`
- `src/app/api/cards/route.ts`
- `src/app/api/cards/[cardId]/route.ts`
- `src/app/api/cards/[cardId]/labels/route.ts`
- `src/app/api/me/route.ts`
- `src/components/TaskCard.tsx`
- `src/types/planka.ts`

Generated: thorough developer-focused documentation based on static code inspection.
