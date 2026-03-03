# Room UI Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refine the integrated room UI so waiting hints are not duplicated, seat-card information remains readable, empty-state copy is correct, live remaining-card counts are trustworthy, and hand actions are easier to reach.

**Architecture:** Keep the existing integrated-table layout and update only the room presentation layer. Use TDD to lock the new waiting-state, seat-card, and hand-zone behavior before changing `GameRoom`, `PlayerCard`, and `HandCards`.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Jest

---

### Task 1: Lock the waiting-state refinement with tests

**Files:**
- Modify: `components/__tests__/GameRoom.test.ts`
- Modify: `components/GameRoom.tsx`

**Step 1: Write the failing test**

Add a test that renders a waiting room and asserts only the centered owner/players waiting indicator remains.

```ts
it('shows only one waiting prompt in the waiting phase', () => {
  const html = renderGameRoom(waitingRoomState, 'p1');
  expect((html.match(/data-testid=\"waiting-for-players\"/g) || []).length).toBe(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: FAIL because the detached bottom waiting hint still exists.

**Step 3: Write minimal implementation**

Remove the detached bottom waiting hint from `components/GameRoom.tsx` and keep only the centered waiting-state message inside the table.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/__tests__/GameRoom.test.ts components/GameRoom.tsx
git commit -m "test: lock single waiting prompt in room ui"
```

### Task 2: Fix seat-card empty state and live card count

**Files:**
- Modify: `components/game/__tests__/PlayerCard.test.ts`
- Modify: `components/game/PlayerCard.tsx`

**Step 1: Write the failing tests**

Add tests that assert a player with remaining cards but no current-round play shows a waiting state, and that the rendered count comes straight from `cardsRemaining`.

```ts
it('shows waiting copy instead of finished copy when cards remain', () => {
  // render player with cardsRemaining: 5 and no playInfo
  expect(html).toContain('等待出牌');
  expect(html).not.toContain('已出完牌');
});
```

```ts
it('renders the live remaining card count from player state', () => {
  // render player with cardsRemaining: 5 after a three-card play
  expect(html).toContain('5 张');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand components/game/__tests__/PlayerCard.test.ts`
Expected: FAIL because the current empty-state logic and count presentation do not fully lock this behavior.

**Step 3: Write minimal implementation**

Update `components/game/PlayerCard.tsx` so:

- count display uses `player.cardsRemaining`
- `已出完牌` only appears when `player.cardsRemaining === 0`
- otherwise empty state shows `等待出牌`
- badge layout can wrap in narrow side positions

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand components/game/__tests__/PlayerCard.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/game/__tests__/PlayerCard.test.ts components/game/PlayerCard.tsx
git commit -m "fix: refine seat card status display"
```

### Task 3: Rebalance the integrated hand zone

**Files:**
- Modify: `components/__tests__/GameRoom.test.ts`
- Modify: `components/game/HandCards.tsx`
- Modify: `components/GameRoom.tsx`

**Step 1: Write the failing test**

Add a test that asserts the integrated hand zone exposes a dedicated actions cluster hook inside the table.

```ts
it('renders hand actions inside the integrated hand zone', () => {
  const html = renderGameRoom(playingRoomState, 'p1');
  expect(html).toContain('data-testid="table-hand-zone"');
  expect(html).toContain('data-testid="hand-actions"');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: FAIL because the hand actions do not expose the new layout hook yet.

**Step 3: Write minimal implementation**

Adjust `components/game/HandCards.tsx` so the button cluster sits in a dedicated upper-right actions group near the hand, and widen the hand layout. Move the self seat card in `components/GameRoom.tsx` upward so the hand zone does not overlap it.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/__tests__/GameRoom.test.ts components/game/HandCards.tsx components/GameRoom.tsx
git commit -m "feat: rebalance integrated hand controls"
```

### Task 4: Verify the refinement pass

**Files:**
- Test: `components/__tests__/GameRoom.test.ts`
- Test: `components/game/__tests__/PlayerCard.test.ts`
- Test: `lib/game/__tests__/lobbyRules.test.ts`
- Test: `lib/game/__tests__/serverLobby.test.ts`

**Step 1: Run targeted UI tests**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts components/game/__tests__/PlayerCard.test.ts`
Expected: PASS

**Step 2: Run supporting owner/reconnect tests**

Run: `npm test -- --runInBand lib/game/__tests__/lobbyRules.test.ts lib/game/__tests__/serverLobby.test.ts`
Expected: PASS

**Step 3: Run the production build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add .
git commit -m "test: verify room ui refinement pass"
```
