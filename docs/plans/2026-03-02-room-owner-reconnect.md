# Room Owner Reconnect Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the room creator as owner across page-navigation reconnects and preserve room joinability for later players.

**Architecture:** Move room-lobby lifecycle decisions into a small server-side helper module that manages create, join, disconnect, and reconnect behavior using stable `clientId` values. Keep `server.js` as the socket wiring layer and verify the bug with focused Jest regression tests before changing behavior.

**Tech Stack:** Node.js, Socket.IO, Next.js custom server, Jest

---

### Task 1: Extract lobby lifecycle into a testable module

**Files:**
- Create: `lib/game/serverLobby.runtime.js`
- Modify: `server.js`
- Test: `lib/game/__tests__/serverLobby.test.ts`

**Step 1: Write the failing test**

Add a test that creates a room, simulates a creator disconnect during page navigation, rejoins with the same stable `clientId`, and then adds more players. Assert that the creator still owns the room and that the room still accepts players 3 and 4.

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/game/__tests__/serverLobby.test.ts`
Expected: FAIL because the lobby lifecycle helper does not exist yet.

**Step 3: Write minimal implementation**

Create a helper that stores room metadata and player slots, supports stable-client rejoin, and keeps ownership attached to the creator unless the owner is truly gone.

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/game/__tests__/serverLobby.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/game/serverLobby.runtime.js lib/game/__tests__/serverLobby.test.ts server.js
git commit -m "fix: preserve room owner across reconnects"
```

### Task 2: Wire the server to use the lobby helper

**Files:**
- Modify: `server.js`
- Test: `lib/game/__tests__/serverLobby.test.ts`

**Step 1: Write the failing test**

Add a test that verifies a true leave removes the owner and transfers ownership only to the first remaining player.

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/game/__tests__/serverLobby.test.ts`
Expected: FAIL because the helper does not yet distinguish reconnectable disconnects from real departure cleanup.

**Step 3: Write minimal implementation**

Update the helper/server integration so:
- disconnect marks a player as away
- rejoin restores the same slot
- explicit leave or expired absence removes the player and recalculates `ownerId`

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/game/__tests__/serverLobby.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/game/serverLobby.runtime.js lib/game/__tests__/serverLobby.test.ts server.js
git commit -m "fix: reconcile room leaves and reconnects"
```

### Task 3: Verify no lobby ownership regressions

**Files:**
- Test: `lib/game/__tests__/lobbyRules.test.ts`
- Test: `lib/game/__tests__/serverLobby.test.ts`

**Step 1: Run targeted regression tests**

Run: `npm test -- lib/game/__tests__/lobbyRules.test.ts lib/game/__tests__/serverLobby.test.ts`
Expected: PASS

**Step 2: Run broader server-adjacent tests**

Run: `npm test -- components/__tests__/GameRoom.test.ts lib/game/__tests__/serverRoundState.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add .
git commit -m "test: cover room owner reconnect regressions"
```
