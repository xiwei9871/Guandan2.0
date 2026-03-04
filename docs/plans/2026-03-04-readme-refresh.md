# README Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the garbled repository README with a product-oriented Chinese README that matches the current project state.

**Architecture:** Keep the change documentation-only. Source the README from current code, scripts, tests, and recent implementation plans so the homepage reflects real runtime behavior and recently delivered gameplay features.

**Tech Stack:** Markdown, Next.js, Socket.IO, Jest

---

### Task 1: Lock the README scope from current project facts

**Files:**
- Modify: `README.md`
- Reference: `package.json`
- Reference: `server.js`
- Reference: `docs/plans/2026-03-02-integrated-table-ui.md`
- Reference: `docs/plans/2026-03-02-room-owner-reconnect.md`
- Reference: `docs/plans/2026-03-02-tribute-flow.md`

**Step 1: Gather the runtime facts**

Confirm the local start command, service port, test commands, and the latest player-facing features already merged.

**Step 2: Reduce the homepage scope**

Keep the README focused on:

- project positioning
- implemented features
- local startup
- testing
- repository structure

**Step 3: Avoid unsupported claims**

Do not document unverified deployment flows, online services, or features not backed by code or tests.

### Task 2: Rewrite the README as a product page

**Files:**
- Modify: `README.md`

**Step 1: Replace garbled content**

Rewrite the full file in UTF-8 Chinese with a clean structure.

**Step 2: Add clear sections**

Include:

- project intro
- implemented features
- gameplay flow and tribute rules
- quick start
- common commands
- testing
- directory structure
- related docs

**Step 3: Reference the current UI**

Include the latest room layout screenshot from `docs/layout2.png`.

### Task 3: Verify and publish the documentation update

**Files:**
- Modify: `README.md`

**Step 1: Read back the final README**

Run a file read to verify the content is complete and not garbled.

**Step 2: Check repository status**

Confirm only the intended documentation files are staged for the commit.

**Step 3: Commit and push**

Commit the README rewrite and push it to `https://github.com/xiwei9871/Guandan2.0.git`.
