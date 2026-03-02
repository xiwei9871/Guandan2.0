# Chinese UI And Round Finish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore Chinese UI text without rolling back the current layout, then stabilize and verify the full room-to-finish gameplay flow.

**Architecture:** Keep the existing component structure and strict runtime rule engine. Fix user-facing strings and selector assumptions in the UI layer, then verify and adjust server-side round progression through focused tests before rerunning end-to-end flows.

**Tech Stack:** Next.js, React, Socket.IO, Jest, Playwright

---

### Task 1: Restore readable Chinese navigation and lobby copy

**Files:**
- Modify: `components/HomePage.tsx`
- Modify: `components/GameRoom.tsx`
- Modify: `lib/ui/navigationRules.ts`
- Test: `lib/ui/__tests__/navigationRules.test.ts`

**Step 1: Write the failing test**

Update the navigation rules test expectations to readable Chinese strings so current mojibake fails.

**Step 2: Run test to verify it fails**

Run: `npm test -- lib/ui/__tests__/navigationRules.test.ts --runInBand`

Expected: FAIL because current strings are mojibake.

**Step 3: Write minimal implementation**

Replace mojibake strings with readable Chinese copy and fix any incorrect guard binding in the home page join section.

**Step 4: Run test to verify it passes**

Run: `npm test -- lib/ui/__tests__/navigationRules.test.ts --runInBand`

Expected: PASS

### Task 2: Lock down round finish and active-turn progression

**Files:**
- Modify: `lib/game/__tests__/serverRoundState.test.ts`
- Modify: `tests/e2e/long-round-smoke.spec.ts`
- Modify: `tests/utils/helpers.ts`
- Modify: `server.js` only if tests reveal runtime issues

**Step 1: Write the failing test**

Tighten the long-round E2E current-turn detection and, if needed, add/adjust a unit assertion around turn skipping or finished-state settlement.

**Step 2: Run test to verify it fails**

Run focused unit/E2E commands to observe the actual failure location.

**Step 3: Write minimal implementation**

Adjust selector logic first. Only touch runtime logic if the failure proves the server still advances turns or clears state incorrectly.

**Step 4: Run test to verify it passes**

Re-run the focused E2E.

### Task 3: Verify full build and gameplay smoke paths

**Files:**
- No new source files expected

**Step 1: Run focused unit tests**

Run: `npm test -- lib/game/__tests__/serverRoundState.test.ts lib/game/__tests__/cardChecker.test.ts lib/game/__tests__/roundRules.test.ts lib/ui/__tests__/navigationRules.test.ts --runInBand`

Expected: PASS

**Step 2: Run build**

Run: `npm run build`

Expected: PASS

**Step 3: Run focused Playwright**

Run:
- `npx playwright test tests/e2e/new-round-play.spec.ts`
- `npx playwright test tests/e2e/long-round-smoke.spec.ts`

Expected: PASS
