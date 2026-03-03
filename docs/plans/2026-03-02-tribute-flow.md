# Tribute Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace automatic tribute transfer with a fully manual tribute and return-tribute flow that follows the confirmed house rules.

**Architecture:** Keep tribute rules server-authoritative. The server determines tribute obligations, validates manual tribute and return submissions, distributes tribute cards only after collection, publishes a revealed action log, and only then advances the game into `playing`. The client renders tribute status, keeps all hand cards visible, and submits a selected card for the active tribute or return actor.

**Tech Stack:** Node.js, Socket.IO, Next.js, React, TypeScript, Jest

---

### Task 1: Lock the manual tribute rule set with failing pure-rule tests

**Files:**
- Modify: `lib/game/__tests__/tributeRules.test.ts`
- Modify: `lib/game/tributeRules.ts`

**Step 1: Write the failing tests**

Add tests for:

- highest eligible tribute rank excludes the heart level card
- any suit at the highest eligible tribute rank is legal
- lower ranks are rejected even if the player holds them
- return tribute remains valid only for `<= 10`

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand lib/game/__tests__/tributeRules.test.ts`
Expected: FAIL because the helper API does not yet expose manual tribute validation.

**Step 3: Write minimal implementation**

Implement pure helpers in `lib/game/tributeRules.ts` for:

- deriving the highest eligible tribute rank
- validating a selected tribute card against that rank
- keeping return validation unchanged

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand lib/game/__tests__/tributeRules.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/game/tributeRules.ts lib/game/__tests__/tributeRules.test.ts
git commit -m "test: lock manual tribute validation rules"
```

### Task 2: Convert tribute orchestration from automatic to manual

**Files:**
- Modify: `lib/game/serverTribute.runtime.js`
- Modify: `lib/game/tributeRules.runtime.js`
- Modify: `lib/game/__tests__/tributeFlow.test.ts`

**Step 1: Write the failing server-flow tests**

Add tests covering:

- finished round enters `tributing` with phase `giving`
- no tribute cards are transferred until players submit them
- double tribute collects two submissions before assigning receivers
- revealed tribute actions are recorded as each player submits

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand lib/game/__tests__/tributeFlow.test.ts`
Expected: FAIL because the runtime still auto-applies tribute cards.

**Step 3: Write minimal implementation**

In the runtime tribute module:

- start tribute rounds in `giving`
- leave tribute cards in giver hands until manual submission
- accept manual tribute submissions in order
- store submitted tribute cards
- after all tribute submissions resolve, assign them to receivers and create return obligations

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand lib/game/__tests__/tributeFlow.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/game/serverTribute.runtime.js lib/game/tributeRules.runtime.js lib/game/__tests__/tributeFlow.test.ts
git commit -m "feat: make tribute selection manual"
```

### Task 3: Wire manual tribute and public action logs through the server

**Files:**
- Modify: `server.js`
- Modify: `lib/constants.ts`
- Modify: `lib/types.ts`
- Modify: `lib/game/__tests__/tributeFlow.test.ts`

**Step 1: Write the failing tests**

Add tests for:

- active tribute giver may submit a legal tribute card
- invalid tribute submissions are rejected
- non-active players cannot submit tribute
- public revealed actions include tribute and return entries
- after all returns resolve, room enters `playing` and the correct lead player starts

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand lib/game/__tests__/tributeFlow.test.ts`
Expected: FAIL because the server socket/API layer does not yet expose manual tribute submission.

**Step 3: Write minimal implementation**

In `server.js` and shared types/constants:

- add a manual tribute socket event
- expose the richer tribute state to clients
- route tribute submissions through the runtime helper
- keep return tribute wired through the same public action log

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand lib/game/__tests__/tributeFlow.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server.js lib/constants.ts lib/types.ts lib/game/__tests__/tributeFlow.test.ts
git commit -m "feat: expose manual tribute flow to clients"
```

### Task 4: Update room UI for manual tribute and public tribute log

**Files:**
- Modify: `components/GameRoom.tsx`
- Modify: `components/game/HandCards.tsx`
- Modify: `components/__tests__/GameRoom.test.ts`
- Modify: `components/game/__tests__/HandCards.test.ts`

**Step 1: Write the failing UI tests**

Add tests that assert:

- active tribute givers see a `进贡` action
- active returners still see a `还贡` action
- the hand stays fully visible during tribute
- revealed tribute/return entries render in the room status area

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts components/game/__tests__/HandCards.test.ts`
Expected: FAIL because the UI still assumes tribute is automatic.

**Step 3: Write minimal implementation**

Update the room UI so:

- tribute mode supports both `giving` and `returning`
- the current actor gets an enabled submit button with the correct label
- hand copy explains the current rule
- the table shows a public running log of tribute and return actions

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts components/game/__tests__/HandCards.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add components/GameRoom.tsx components/game/HandCards.tsx components/__tests__/GameRoom.test.ts components/game/__tests__/HandCards.test.ts
git commit -m "feat: add manual tribute room controls"
```

### Task 5: Verify the full tribute flow

**Files:**
- Test: `lib/game/__tests__/tributeRules.test.ts`
- Test: `lib/game/__tests__/tributeFlow.test.ts`
- Test: `components/__tests__/GameRoom.test.ts`
- Test: `components/game/__tests__/HandCards.test.ts`

**Step 1: Run server tribute tests**

Run: `npm test -- --runInBand lib/game/__tests__/tributeRules.test.ts lib/game/__tests__/tributeFlow.test.ts`
Expected: PASS

**Step 2: Run room UI tests**

Run: `npm test -- --runInBand components/__tests__/GameRoom.test.ts components/game/__tests__/HandCards.test.ts`
Expected: PASS

**Step 3: Run regression tests for owner/reconnect**

Run: `npm test -- --runInBand lib/game/__tests__/lobbyRules.test.ts lib/game/__tests__/serverLobby.test.ts`
Expected: PASS

**Step 4: Run production build**

Run: `npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "test: verify manual tribute flow end to end"
```
