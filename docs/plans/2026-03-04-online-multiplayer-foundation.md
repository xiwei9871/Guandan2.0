# Online Multiplayer Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the project from local-only play to a first production-like internet multiplayer version with invite-only rooms on a single public server.

**Architecture:** Keep the current single-process Node + Next.js + Socket.IO runtime and in-memory room state. Add a tested runtime configuration layer, same-origin socket connection strategy, invite-link UX, room expiry/cleanup, and basic request hardening without introducing accounts, databases, matchmaking, or bots.

**Tech Stack:** Next.js, React, Socket.IO, Node.js, TypeScript, Jest

---

### Task 1: Extract deployable runtime configuration from hard-coded localhost behavior

**Files:**
- Create: `lib/runtime/networkConfig.ts`
- Create: `lib/runtime/__tests__/networkConfig.test.ts`
- Modify: `server.js`
- Modify: `hooks/useSocket.ts`

**Step 1: Write the failing tests**

Add tests for:

- development defaults to `localhost:3003`
- production defaults to same-origin socket mode
- host, port, and allowed origins can be overridden by environment variables
- comma-separated CORS origins are parsed into a stable list

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand lib/runtime/__tests__/networkConfig.test.ts`
Expected: FAIL because the runtime config helper does not exist.

**Step 3: Write minimal implementation**

Create a helper that exports parsed config values such as:

- `host`
- `port`
- `appOrigin`
- `socketCorsOrigins`
- `useSameOriginSocket`

Then update `server.js` and `hooks/useSocket.ts` to consume that helper instead of hard-coded `localhost` values.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand lib/runtime/__tests__/networkConfig.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/runtime/networkConfig.ts lib/runtime/__tests__/networkConfig.test.ts server.js hooks/useSocket.ts
git commit -m "feat: add deployable network runtime config"
```

### Task 2: Lock same-origin socket connection and public invite entry in the UI

**Files:**
- Modify: `components/HomePage.tsx`
- Modify: `components/GameRoom.tsx`
- Modify: `components/__tests__/HomePage.test.ts`
- Modify: `components/__tests__/GameRoom.test.ts`

**Step 1: Write the failing tests**

Add tests that assert:

- the home page can surface a room-share path or invite hint after room creation
- the room page renders a copyable invite link based on the current room id
- the room page shows clearer reconnect or room-unavailable copy when join fails

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand components/__tests__/HomePage.test.ts components/__tests__/GameRoom.test.ts`
Expected: FAIL because invite-link UI and stronger connection copy do not exist yet.

**Step 3: Write minimal implementation**

Update the UI so:

- room creation success exposes the room id more clearly
- `GameRoom` renders a public invite link derived from the current location and room id
- join/reconnect failure messages are explicit enough for public internet use

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand components/__tests__/HomePage.test.ts components/__tests__/GameRoom.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/HomePage.tsx components/GameRoom.tsx components/__tests__/HomePage.test.ts components/__tests__/GameRoom.test.ts
git commit -m "feat: add invite-friendly public room entry"
```

### Task 3: Add room expiry and empty-room cleanup to the lobby lifecycle

**Files:**
- Modify: `lib/game/serverLobby.runtime.js`
- Modify: `lib/game/__tests__/serverLobby.test.ts`
- Modify: `server.js`

**Step 1: Write the failing tests**

Add tests for:

- empty rooms are removed immediately after the last player truly leaves
- waiting rooms expire after `ROOM_IDLE_TTL_MS`
- disconnected players are dropped after reconnect grace expires
- expired rooms cannot be joined again

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand lib/game/__tests__/serverLobby.test.ts`
Expected: FAIL because lobby expiry and cleanup are not fully implemented.

**Step 3: Write minimal implementation**

Extend the lobby runtime to:

- timestamp room activity
- prune idle waiting rooms
- prune expired disconnected players
- fully remove empty rooms

Wire the cleanup pass into the relevant `server.js` room create/join/leave flow.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand lib/game/__tests__/serverLobby.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/game/serverLobby.runtime.js lib/game/__tests__/serverLobby.test.ts server.js
git commit -m "feat: expire idle rooms and clean up empty lobbies"
```

### Task 4: Reject invalid public-room joins during active games

**Files:**
- Modify: `lib/game/serverLobby.runtime.js`
- Modify: `server.js`
- Modify: `lib/game/__tests__/serverLobby.test.ts`

**Step 1: Write the failing tests**

Add tests covering:

- a fifth player cannot join a full room
- a new outsider cannot join a room once the game has started
- an existing player with the same `clientId` can still rejoin an active game

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand lib/game/__tests__/serverLobby.test.ts`
Expected: FAIL because the public-room restrictions are not explicit enough for internet play.

**Step 3: Write minimal implementation**

Make the lobby/server rules explicit:

- keep active-game rejoin for known players
- reject outsider joins during `playing`, `tributing`, or `finished` states unless the room is being restarted by existing players
- return stable error messages for blocked joins

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand lib/game/__tests__/serverLobby.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/game/serverLobby.runtime.js lib/game/__tests__/serverLobby.test.ts server.js
git commit -m "feat: harden public room join rules"
```

### Task 5: Add basic socket payload validation and lightweight rate limiting

**Files:**
- Create: `lib/runtime/socketGuards.ts`
- Create: `lib/runtime/__tests__/socketGuards.test.ts`
- Modify: `server.js`
- Modify: `lib/constants.ts`

**Step 1: Write the failing tests**

Add tests for:

- invalid room ids are normalized or rejected
- empty or malformed player names are rejected
- repeated create/join attempts from one socket exceed a small burst limit

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand lib/runtime/__tests__/socketGuards.test.ts`
Expected: FAIL because the guard helper does not exist.

**Step 3: Write minimal implementation**

Create small server-side helpers for:

- validating player names
- validating room ids
- enforcing a simple in-memory fixed-window limit per socket and event name

Use these guards inside the create/join flow before mutating room state.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand lib/runtime/__tests__/socketGuards.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/runtime/socketGuards.ts lib/runtime/__tests__/socketGuards.test.ts server.js lib/constants.ts
git commit -m "feat: add basic socket guards for internet rooms"
```

### Task 6: Document deployment and environment setup for a single public server

**Files:**
- Create: `.env.example`
- Modify: `README.md`
- Create: `docs/plans/2026-03-04-online-multiplayer-deploy-notes.md`

**Step 1: Write the documentation changes**

Document:

- required environment variables
- local versus production defaults
- expected public origin
- reverse-proxy requirement for WebSocket support
- first deployment checklist

**Step 2: Verify documentation is complete**

Run: `rg -n "HOST|PORT|APP_ORIGIN|SOCKET_CORS_ORIGINS|ROOM_IDLE_TTL_MS|RATE_LIMIT" README.md .env.example docs/plans/2026-03-04-online-multiplayer-deploy-notes.md`
Expected: matching lines for all required deployment knobs

**Step 3: Commit**

```bash
git add .env.example README.md docs/plans/2026-03-04-online-multiplayer-deploy-notes.md
git commit -m "docs: add single-server deployment guide"
```

### Task 7: Verify the full internet-room foundation

**Files:**
- Test: `lib/runtime/__tests__/networkConfig.test.ts`
- Test: `lib/runtime/__tests__/socketGuards.test.ts`
- Test: `lib/game/__tests__/serverLobby.test.ts`
- Test: `components/__tests__/HomePage.test.ts`
- Test: `components/__tests__/GameRoom.test.ts`

**Step 1: Run the new runtime and lobby tests**

Run: `npm test -- --runInBand lib/runtime/__tests__/networkConfig.test.ts lib/runtime/__tests__/socketGuards.test.ts lib/game/__tests__/serverLobby.test.ts`
Expected: PASS

**Step 2: Run the room UI regression tests**

Run: `npm test -- --runInBand components/__tests__/HomePage.test.ts components/__tests__/GameRoom.test.ts`
Expected: PASS

**Step 3: Run the full project test suite**

Run: `npm test`
Expected: PASS

**Step 4: Run the production build**

Run: `npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "test: verify internet multiplayer foundation"
```
