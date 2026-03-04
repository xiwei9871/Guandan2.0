# Ubuntu Manual Deploy Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Ubuntu-focused deployment support for the current single-server internet room version using a manual Node process and Nginx reverse proxy.

**Architecture:** Keep the application runtime unchanged and add deployment support artifacts around it: an Ubuntu self-check script, an Nginx config template, and step-by-step deployment documentation. Validate the script in isolation and then verify the existing app still tests and builds.

**Tech Stack:** Node.js, Next.js, Bash, Nginx, Jest

---

### Task 1: Add a small Ubuntu deployment self-check script

**Files:**
- Create: `scripts/ubuntu-deploy-check.sh`
- Create: `scripts/__tests__/ubuntuDeployCheck.test.js`

**Step 1: Write the failing test**

Add tests that assert:

- the script checks for `node`, `npm`, `package.json`, `server.js`, `.env`, and `.next`
- missing required environment keys are reported
- the success path exits with status `0`

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand scripts/__tests__/ubuntuDeployCheck.test.js`
Expected: FAIL because the script does not exist yet.

**Step 3: Write minimal implementation**

Create a Bash script that:

- supports `PROJECT_ROOT` override for tests
- checks required files in the project root
- parses `.env` with simple `KEY=` detection
- prints missing items and exits non-zero if checks fail
- exits `0` when all required checks pass

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand scripts/__tests__/ubuntuDeployCheck.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/ubuntu-deploy-check.sh scripts/__tests__/ubuntuDeployCheck.test.js
git commit -m "feat: add ubuntu deploy self-check script"
```

### Task 2: Add an Ubuntu Nginx reverse-proxy template

**Files:**
- Create: `deploy/nginx/guandan.conf.example`

**Step 1: Write the template**

Create a minimal Nginx config template that includes:

- `server_name`
- `location /`
- `location /socket.io/`
- WebSocket headers
- proxy target `http://127.0.0.1:3003`

**Step 2: Verify the template covers the required socket path**

Run: `rg -n "server_name|location /socket.io/|Upgrade|proxy_pass" deploy/nginx/guandan.conf.example`
Expected: matching lines for all required directives

**Step 3: Commit**

```bash
git add deploy/nginx/guandan.conf.example
git commit -m "docs: add nginx template for ubuntu deploy"
```

### Task 3: Expand Ubuntu deployment documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-03-04-online-multiplayer-deploy-notes.md`
- Create: `docs/plans/2026-03-04-ubuntu-manual-deploy-runbook.md`

**Step 1: Write the documentation changes**

Document:

- Ubuntu deployment directory convention
- manual `.env` creation
- install, build, start commands
- Nginx enable/reload steps
- first online smoke test flow
- links to the Nginx template and self-check script

**Step 2: Verify documentation coverage**

Run: `rg -n "ubuntu-deploy-check|guandan.conf.example|nginx|npm run build|npm start|APP_ORIGIN" README.md docs/plans/2026-03-04-online-multiplayer-deploy-notes.md docs/plans/2026-03-04-ubuntu-manual-deploy-runbook.md`
Expected: matching lines for the deploy script, template, and manual steps

**Step 3: Commit**

```bash
git add README.md docs/plans/2026-03-04-online-multiplayer-deploy-notes.md docs/plans/2026-03-04-ubuntu-manual-deploy-runbook.md
git commit -m "docs: add ubuntu manual deploy runbook"
```

### Task 4: Verify Ubuntu deploy support without breaking the app

**Files:**
- Test: `scripts/__tests__/ubuntuDeployCheck.test.js`
- Test: `lib/runtime/__tests__/networkConfig.test.ts`
- Test: `components/__tests__/HomePage.test.ts`
- Test: `components/__tests__/GameRoom.test.ts`

**Step 1: Run the script test**

Run: `npm test -- --runInBand scripts/__tests__/ubuntuDeployCheck.test.js`
Expected: PASS

**Step 2: Run the impacted regression tests**

Run: `npm test -- --runInBand lib/runtime/__tests__/networkConfig.test.ts components/__tests__/HomePage.test.ts components/__tests__/GameRoom.test.ts`
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
git commit -m "test: verify ubuntu deploy support"
```
