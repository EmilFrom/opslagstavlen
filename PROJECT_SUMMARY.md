# Opslagstavlen — Project Summary

Purpose: a mobile-first PWA that wraps a self-hosted Planka instance to provide a simpler, low-friction asynchronous communication surface optimized for AuDHD / ADHD users (you and your mother).

This document is structured and machine-friendly; each section contains concise facts, behaviors, and file references.

## Tech stack
- Framework: Next.js (app router) — `next` 16.x
- UI: React 19, Tailwind (via PostCSS), Framer Motion, lucide-react icons
- API: Next.js serverless route handlers used as a proxy to upstream Planka

## Key environment & config
- `PLANKA_BASE_URL` (env): base URL of the Planka/Planka-compatible server. Default used in code: `https://tavlen.emilfrom.com`.
- next.config.ts: `output: "standalone"`, `allowedDevOrigins` includes a local IP.

Files:
- [src/proxy.ts](src/proxy.ts)
- [next.config.ts](next.config.ts)

## Authentication & JWT behavior
- Cookie name: `planka_jwt`. All API proxy routes expect this cookie to exist and contain a Bearer JWT.
- Local decoding: `/api/me/route.ts` decodes the JWT client-side (base64 decode) to extract `userId`/`id`/`sub`, `name`, and `username`. If those are missing it falls back to calling the upstream `/api/users/me`.
- JWT decoding is permissive: it extracts whatever fields are present (userId/id/sub for id, name/username for display).

Files:
- [src/app/api/me/route.ts](src/app/api/me/route.ts)

Behavioral notes:
- If `planka_jwt` missing → API returns 401 (Unauthorized) and UI redirects root/boards to landing.
- Upstream calls include `Authorization: Bearer <token>` header.

## Proxy and root redirect
- `src/proxy.ts` contains a middleware that redirects requests to `/` to a specific board id `/boards/1753252978711594001` when `planka_jwt` cookie exists.
- This is a user-specific default landing board (hardcoded board id).

Files:
- [src/proxy.ts](src/proxy.ts)

## Boards
- API route: `GET /api/boards` proxies to `${PLANKA_BASE_URL}/api/projects` and returns `included.boards` if present.
- UI: `/boards` page fetches `/api/boards` and supports a couple of response shapes: an array of boards, or an object with `items` array.

Files:
- [src/app/api/boards/route.ts](src/app/api/boards/route.ts)
- [src/app/boards/page.tsx](src/app/boards/page.tsx)
- [src/components/BoardCard.tsx](src/components/BoardCard.tsx)

Behavioral notes:
- If upstream returns a non-OK response, the proxy returns 502 with raw text.
- Missing token yields 401; UI handles 401 by redirecting back to `/`.

## Board details (lists, cards, labels)
- API route: `GET /api/boards/[boardId]/cards` proxies to `${PLANKA_BASE_URL}/api/boards/${boardId}` and extracts `included.lists`, `included.cards`, `included.labels`, and `included.cardLabels`.
- UI `/boards/[boardId]` fetches that route and displays lists; it filters out archived lists and prefers lists named `emil` and `coline` (personalized views).

Files:
- [src/app/api/boards/[boardId]/cards/route.ts](src/app/api/boards/[boardId]/cards/route.ts)
- [src/app/boards/[boardId]/page.tsx](src/app/boards/[boardId]/page.tsx)

Behavioral notes:
- The proxy returns a compact object: `{ lists, cards, labels, cardLabels }`.
- UI selects two lists named `emil` and `coline` if present; otherwise shows all non-archived lists.

## Cards
- Create card: `POST /api/cards` expects JSON body: `{ boardId, listId, name, description? }`.
  - It validates required fields, builds a payload with `name`, `position: 65536`, `type: 'project'`, and optional `description` and `boardId`.
  - Upstream endpoint used: `POST ${PLANKA_BASE_URL}/api/lists/${listId}/cards`.
- Update card: `PATCH /api/cards/[cardId]` forwards the JSON body to `PATCH ${PLANKA_BASE_URL}/api/cards/${cardId}`.

Files:
- [src/app/api/cards/route.ts](src/app/api/cards/route.ts)
- [src/app/api/cards/[cardId]/route.ts](src/app/api/cards/[cardId]/route.ts)

UI interactions (Task card):
- `TaskCard` is the main UI for a card. Key behaviors:
  - Long-press (>= 500ms) opens an edit modal to change title/description.
  - Drag-right (offset.x > 120) triggers `handleSwipeLabel` which attempts to attach a "read" label for the current user.
  - Archive flows call `PATCH /api/cards/${card.id}` with `boardId` and `listId` set to a hardcoded archive list id `1753252979122635795` (moves the card to that list).
  - Optimistic label assign: sets `optimisticLabelId` when label attach succeeds locally.

Files:
- [src/components/TaskCard.tsx](src/components/TaskCard.tsx)

Hardcoded IDs / assumptions:
- Archive list id is hardcoded in `TaskCard` as `1753252979122635795`.
- The redirect board id in `src/proxy.ts` is `1753252978711594001`.

## Labels & attaching labels
- Label attach API: `POST /api/cards/[cardId]/labels` is implemented as a resilient set of attempts to support various Planka/Planka-compatible endpoints:
  1. `POST ${PLANKA_BASE_URL}/api/cards/${cardId}/card-labels` with `{ labelId }`
  2. `POST ${PLANKA_BASE_URL}/api/cards/${cardId}/labels` with `{ labelId }`
  3. `POST ${PLANKA_BASE_URL}/api/cards/${cardId}/labels/${labelId}` with no payload
  4. `POST ${PLANKA_BASE_URL}/api/card-labels` with `{ cardId, labelId }`
- The proxy iterates these attempts and continues on 404 to try the next variant; non-404 non-ok responses return immediately.

Files:
- [src/app/api/cards/[cardId]/labels/route.ts](src/app/api/cards/[cardId]/labels/route.ts)

UI label flow:
- `TaskCard` builds the expected "read label" name from `currentUsername` or `currentUserName` producing `"<username> har læst"` (Danish: "has read").
- On swipe-right, it searches `labels` for that label name (case-insensitive) and posts to `/api/cards/{card.id}/labels` with `{ labelId }`.
- If label already attached, shows "Allerede markeret".

## Archival
- Archival is implemented client-side as a card move to a particular list id (the archivelist). The server-side proxy does not implement a dedicated `archive` endpoint; it relies on `PATCH /api/cards/:cardId` forwarding.

Files:
- [src/components/TaskCard.tsx](src/components/TaskCard.tsx)
- [src/app/api/cards/[cardId]/route.ts](src/app/api/cards/[cardId]/route.ts)

## Error handling & logging
- Proxy routes commonly `console.log` outgoing/incoming payloads and return raw upstream text when parsing fails.
- Most routes return 401 when `planka_jwt` missing.
- Upstream non-ok responses are often returned as 502 or propagated with original status (cards POST uses original response.status).

## UX / PWA specifics
- Mobile-first UI with large touch targets, long-press for edit, swipe gestures, and bottom-sheet edit modals.
- Danish text and concise toast messages to match the target user (mother + you).
- Focus on minimizing buffering and synchronous expectations — interactions are optimistic and give immediate toast feedback.

Files:
- [src/components/TaskCard.tsx], [src/app/boards/[boardId]/page.tsx], [src/app/boards/page.tsx]

## Idiosyncrasies & maintenance notes (actionable)
- Several hardcoded IDs and user-specific names exist; consider extracting these to a config/environment file:
  - Root redirect board id in `src/proxy.ts`.
  - Archive list id in `TaskCard`.
  - Preferred list names `emil` and `coline` in board page logic.
- Label attach tries multiple endpoints — this is deliberate to support Planka version differences; keep the attempt order if upstream compatibility is required.
- JWT decoding in `/api/me` assumes base64-encoded payload; it's tolerant but will silently fall back to upstream request.
- Position default for newly-created cards: `65536` and `type: 'project'` — these are meaningful defaults.

## Files of highest interest (quick links)
- [src/proxy.ts](src/proxy.ts)
- [src/app/api/boards/route.ts](src/app/api/boards/route.ts)
- [src/app/api/boards/[boardId]/cards/route.ts](src/app/api/boards/[boardId]/cards/route.ts)
- [src/app/api/cards/route.ts](src/app/api/cards/route.ts)
- [src/app/api/cards/[cardId]/route.ts](src/app/api/cards/[cardId]/route.ts)
- [src/app/api/cards/[cardId]/labels/route.ts](src/app/api/cards/[cardId]/labels/route.ts)
- [src/app/api/me/route.ts](src/app/api/me/route.ts)
- [src/components/TaskCard.tsx](src/components/TaskCard.tsx)

## Suggested next steps
1. Replace hardcoded ids/names with a small `config.ts` or env vars and document them in README.
2. Add a short developer README section describing the expected Planka API variants and the label-attach attempts.
3. Optionally consolidate JWT handling: use upstream `/api/users/me` as the canonical source for display name after token validation.
4. Add tests or a small script to validate the `PLANKA_BASE_URL` compatibility matrix (which endpoints exist).

---
Generated: concise, LLM-friendly summary of current code behavior and integration points.
