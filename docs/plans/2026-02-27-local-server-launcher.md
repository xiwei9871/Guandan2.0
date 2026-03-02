# Local Server Launcher Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add double-clickable Windows scripts to start and restart the local Guandan server reliably.

**Architecture:** Use `.bat` wrappers that call small PowerShell scripts. The PowerShell layer handles process discovery, log files, server health checks, and browser launch against `http://localhost:3003/`.

**Tech Stack:** Windows batch, PowerShell, Node.js

---

### Task 1: Add start launcher

**Files:**
- Create: `scripts/start-local-game.ps1`
- Create: `start-game.bat`

**Step 1: Write the failing verification**

Run: `powershell -ExecutionPolicy Bypass -File scripts/start-local-game.ps1`

Expected before implementation: FAIL because script file does not exist.

**Step 2: Write minimal implementation**

Start `node server.js`, wait for `http://localhost:3003/`, then open the browser.

**Step 3: Run verification**

Run the PowerShell script and confirm it returns a ready message and reachable status code.

### Task 2: Add restart launcher

**Files:**
- Create: `scripts/restart-local-game.ps1`
- Create: `restart-game.bat`

**Step 1: Write the failing verification**

Run: `powershell -ExecutionPolicy Bypass -File scripts/restart-local-game.ps1`

Expected before implementation: FAIL because script file does not exist.

**Step 2: Write minimal implementation**

Stop old `node server.js` processes, then start a new one, wait for health, and open the browser.

**Step 3: Run verification**

Run the restart script and confirm the server becomes healthy again on port `3003`.

### Task 3: Document usage

**Files:**
- Modify: `README.md`

**Step 1: Add a short Chinese section**

Explain which script to double-click for first launch and which one to use when reconnecting fails.

**Step 2: Verify**

Run `npm run build` to make sure documentation changes did not affect the app, then manually confirm scripts exist at repo root.
