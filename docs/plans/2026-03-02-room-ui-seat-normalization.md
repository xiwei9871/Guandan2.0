# Room UI Seat Normalization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicated waiting copy, fix waiting-phase seat empty text, and normalize all four player seat cards so they sit inside the table with one consistent size system.

**Architecture:** Keep the integrated-table layout intact and only refine presentation. `GameRoom` will own the single-source waiting copy and shared seat placement rules, while `PlayerCard` will differentiate between waiting-phase empty seats and truly finished players.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Jest

---

### Task 1: Lock a single waiting prompt

**Files:**
- Modify: `components/__tests__/GameRoom.test.ts`
- Modify: `components/GameRoom.tsx`

**Step 1: Write the failing test**

Add a test that asserts `等待玩家准备` appears only once in a waiting room render.

```ts
it('shows the waiting-ready copy only once', () => {
  const html = renderGameRoom(waitingRoomState, 'p1');
  expect((html.match(/等待玩家准备/g) || []).length).toBe(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: FAIL because the header and center overlay both show the same waiting text.

**Step 3: Write minimal implementation**

Remove the waiting-phase label from the top status bar in `components/GameRoom.tsx`.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/__tests__/GameRoom.test.ts components/GameRoom.tsx
git commit -m "fix: collapse duplicate waiting copy"
```

### Task 2: Fix waiting-phase seat empty-state copy

**Files:**
- Modify: `components/game/__tests__/PlayerCard.test.ts`
- Modify: `components/game/PlayerCard.tsx`
- Modify: `components/GameRoom.tsx`

**Step 1: Write the failing test**

Add a test that renders a waiting-phase seat card with zero cards and expects `待发牌`.

```ts
it('shows waiting-phase empty seats as pending deal', () => {
  expect(html).toContain('待发牌');
  expect(html).not.toContain('已出完牌');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand components/game/__tests__/PlayerCard.test.ts`
Expected: FAIL because the current empty-state logic only checks `cardsRemaining`.

**Step 3: Write minimal implementation**

Pass `gamePhase` from `GameRoom` into `PlayerCard` and update the empty-state rules:

- `waiting` -> `待发牌`
- active play with cards left -> `等待出牌`
- active play / finished with zero cards -> `已出完牌`

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand components/game/__tests__/PlayerCard.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/game/__tests__/PlayerCard.test.ts components/game/PlayerCard.tsx components/GameRoom.tsx
git commit -m "fix: distinguish waiting seats from finished seats"
```

### Task 3: Normalize all four seat cards inside the table

**Files:**
- Modify: `components/__tests__/GameRoom.test.ts`
- Modify: `components/GameRoom.tsx`

**Step 1: Write the failing test**

Add a test that checks all rendered seat slots use one shared width token.

```ts
it('uses the same seat width for all four integrated seat slots', () => {
  const html = renderGameRoom(waitingRoomState, 'p1');
  expect((html.match(/w-\\[190px\\]/g) || []).length).toBe(4);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: FAIL because the current seat widths differ.

**Step 3: Write minimal implementation**

Introduce one shared seat width class in `components/GameRoom.tsx` and pull the top/left/right slots farther inward so all four cards sit clearly inside the table.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/__tests__/GameRoom.test.ts components/GameRoom.tsx
git commit -m "fix: normalize integrated table seat sizing"
```

### Task 4: Verify the seat-normalization pass

**Files:**
- Test: `components/__tests__/GameRoom.test.ts`
- Test: `components/game/__tests__/PlayerCard.test.ts`

**Step 1: Run targeted UI tests**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts components/game/__tests__/PlayerCard.test.ts`
Expected: PASS

**Step 2: Run the production build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add .
git commit -m "test: verify seat normalization ui pass"
```
