# Guandan UI/UX and Button Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve lobby and room UI clarity, button behavior, and navigation flow for a smoother player journey.

**Architecture:** Introduce a small `lib/ui` rule layer for deterministic button/navigation states and reuse it in React components. Keep server/game logic intact while refactoring page layouts and interaction states in `HomePage` and `GameRoom`.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Jest

---

### Task 1: Add UI rules tests (Red)

**Files:**
- Create: `lib/ui/__tests__/navigationRules.test.ts`
- Create: `lib/ui/navigationRules.ts`

**Step 1:** Add failing tests for room id normalization, create/join button guards, and room action visibility.

**Step 2:** Run only the new test file and verify failures.

**Step 3:** Implement the minimal rule functions to satisfy tests.

**Step 4:** Re-run tests and verify pass.

### Task 2: Refactor lobby page with deterministic button states

**Files:**
- Modify: `components/HomePage.tsx`

**Step 1:** Use rule functions for validation and button disabled/loading state.

**Step 2:** Normalize room id input/output and use server-returned room id when available.

**Step 3:** Improve layout hierarchy and consistent button variants.

**Step 4:** Keep existing socket events and callbacks unchanged.

### Task 3: Refactor room page action bar and navigation fallback

**Files:**
- Modify: `components/GameRoom.tsx`

**Step 1:** Replace inline action conditions with rule-based booleans from `lib/ui/navigationRules.ts`.

**Step 2:** Improve leave-room flow with deterministic disabled state and safer home fallback.

**Step 3:** Refresh header/action area UI for clearer status and button hierarchy.

### Task 4: Improve global visual tokens

**Files:**
- Modify: `app/globals.css`

**Step 1:** Add lightweight CSS tokens for surface, text, and action styles.

**Step 2:** Keep compatibility with existing Tailwind classes and no external UI dependencies.

### Task 5: Verify and report

**Files:**
- Test: `lib/ui/__tests__/navigationRules.test.ts`
- Test: targeted project tests related to gameplay rules

**Step 1:** Run new UI rule tests.

**Step 2:** Run at least one existing gameplay test file to ensure no regression in shared imports.

**Step 3:** Summarize exactly what changed and what verification passed.
