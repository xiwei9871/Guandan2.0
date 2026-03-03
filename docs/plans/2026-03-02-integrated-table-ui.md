# Integrated Table UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the room/game screen into a single integrated card table where all player info and the current player's hand live inside the same table surface.

**Architecture:** Keep all socket, lobby, and game-state behavior unchanged. Refactor the room page presentation so `GameRoom` owns a table-centric layout, seat data is remapped relative to the current viewer, and the existing player/play/hand components are reshaped into one cohesive visual system.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Jest

---

### Task 1: Lock the viewer-relative seat mapping with tests

**Files:**
- Modify: `components/__tests__/GameRoom.test.ts`
- Modify: `components/GameRoom.tsx`

**Step 1: Write the failing test**

Add a test that renders the room for a non-south player and asserts the current viewer is still placed in the bottom seat container while other players map to top, left, and right.

```ts
it('maps the current player to the bottom seat regardless of original position', () => {
  const html = renderGameRoom(waitingRoomState, 'p3');
  expect(html).toContain('data-testid="seat-self-bottom"');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: FAIL because the current layout still uses fixed north/west/east/south placement.

**Step 3: Write minimal implementation**

Add a small viewer-relative seat-mapping helper inside `components/GameRoom.tsx` and apply it to the rendered seat slots.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/__tests__/GameRoom.test.ts components/GameRoom.tsx
git commit -m "test: lock viewer-relative table seats"
```

### Task 2: Rebuild the room page into an integrated table shell

**Files:**
- Modify: `components/GameRoom.tsx`
- Modify: `components/game/CenterPlayArea.tsx`
- Test: `components/__tests__/GameRoom.test.ts`

**Step 1: Write the failing test**

Add a test that checks the room renders a single integrated table container and no longer renders the old detached waiting/seat sections outside the table.

```ts
it('renders an integrated table shell', () => {
  const html = renderGameRoom(waitingRoomState, 'p1');
  expect(html).toContain('data-testid="integrated-table"');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: FAIL because the integrated table shell does not exist yet.

**Step 3: Write minimal implementation**

Restructure `components/GameRoom.tsx` so it renders:

- thin header
- integrated table shell
- seat slots inside the table
- current-player hand area attached to the table bottom edge

Update `components/game/CenterPlayArea.tsx` to act as the table shell and shared center-status layer.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/GameRoom.tsx components/game/CenterPlayArea.tsx components/__tests__/GameRoom.test.ts
git commit -m "feat: create integrated table room layout"
```

### Task 3: Convert player seats into single integrated information cards

**Files:**
- Modify: `components/game/PlayerCard.tsx`
- Modify: `components/game/PlayedCards.tsx`
- Modify: `components/__tests__/GameRoom.test.ts`
- Modify: `components/game/__tests__/PlayerCard.test.ts`

**Step 1: Write the failing test**

Add or update tests to assert each seat card contains one integrated block with:

- team color cue
- player name
- direction marker
- remaining card count
- current-round played cards

```ts
expect(html).toContain('data-testid="seat-card-top"');
expect(html).toContain('data-team="red"');
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand components/game/__tests__/PlayerCard.test.ts components/__tests__/GameRoom.test.ts`
Expected: FAIL because the current player card and played-cards UI are still split.

**Step 3: Write minimal implementation**

Refactor `components/game/PlayerCard.tsx` into a table-seat card whose largest visual block is the last-play area. Reduce textual chrome by using color markers for teams and small badges for turn/ready/pass/rank. Fold `PlayedCards` into this flow as a nested display rather than a separate card system.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand components/game/__tests__/PlayerCard.test.ts components/__tests__/GameRoom.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/game/PlayerCard.tsx components/game/PlayedCards.tsx components/game/__tests__/PlayerCard.test.ts components/__tests__/GameRoom.test.ts
git commit -m "feat: unify table seat information cards"
```

### Task 4: Merge the current player's hand into the table

**Files:**
- Modify: `components/game/HandCards.tsx`
- Modify: `components/GameRoom.tsx`
- Test: `components/__tests__/GameRoom.test.ts`

**Step 1: Write the failing test**

Add a test that asserts the hand area renders as part of the integrated table rather than as a detached bottom panel.

```ts
it('renders the current hand inside the table shell', () => {
  const html = renderGameRoom(playingRoomState, 'p1');
  expect(html).toContain('data-testid="table-hand-zone"');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: FAIL because the hand still renders as a separate panel.

**Step 3: Write minimal implementation**

Update `components/game/HandCards.tsx` to remove the detached card-panel styling and fit into a transparent or table-edge container. Mount it from `components/GameRoom.tsx` inside the bottom portion of the integrated table.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/game/HandCards.tsx components/GameRoom.tsx components/__tests__/GameRoom.test.ts
git commit -m "feat: merge hand controls into integrated table"
```

### Task 5: Verify layout behavior regressions

**Files:**
- Test: `components/__tests__/GameRoom.test.ts`
- Test: `components/game/__tests__/PlayerCard.test.ts`

**Step 1: Run targeted UI regression tests**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts components/game/__tests__/PlayerCard.test.ts`
Expected: PASS

**Step 2: Run supporting state/owner tests**

Run: `npm test -- --runInBand lib/game/__tests__/lobbyRules.test.ts lib/game/__tests__/serverLobby.test.ts`
Expected: PASS

**Step 3: Manual verification**

Run the local game server and confirm:

- the table is a single unified surface
- no duplicate outer player info cards remain
- the current player always appears at the bottom
- played cards are visually dominant inside seat cards

**Step 4: Commit**

```bash
git add .
git commit -m "test: verify integrated table room ui"
```
