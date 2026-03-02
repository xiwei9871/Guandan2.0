# Local Server Launcher Design

**Context**

The app runs correctly when `node server.js` is alive, but local testing frequently fails because the Node process is not started or does not remain visible to the user. This causes the homepage to stay at "正在连接服务器..." even though the frontend socket logic itself is correct.

**Goal**

Add simple Windows launch scripts so the user can reliably start and restart the local game server and immediately open the app in the browser.

**Approaches**

1. `README` instructions only
   Trade-off: no code changes, but it does not solve the repeated operator error of forgetting to keep the server process alive.

2. Windows launcher scripts
   Trade-off: platform-specific, but matches the user's environment and solves the actual failure mode with minimal scope.

3. Rebuild the runtime into a packaged desktop launcher
   Trade-off: overkill for the current need.

**Recommendation**

Use approach 2. Add one script to start the server in a dedicated window and open the browser, plus one script to stop old `node server.js` processes and relaunch cleanly.
