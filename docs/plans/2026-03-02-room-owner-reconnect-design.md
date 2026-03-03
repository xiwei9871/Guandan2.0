# Room Owner Reconnect Design

**Problem**

After player `mq1` creates a room and player `mq2` joins, the creator can lose room ownership. Later players using the same room code can also fail to join. The expected rule is that the creator remains the room owner until they explicitly leave the room.

**Root Cause Hypothesis**

The app creates one socket on the home page and a different socket on the room page. During navigation, the home-page socket disconnects and the server currently treats that disconnect as a real leave. That can temporarily empty the room, clear `ownerId`, or mutate the player list before the room-page socket reconnects with the same stable `clientId`.

**Chosen Approach**

Keep room ownership bound to the creator's stable `clientId`, and treat short disconnects as reconnectable session gaps rather than immediate room departures.

**Server Rules**

- `ownerId` is set from the creator's stable `clientId` when the room is created.
- Joining players must never overwrite a valid `ownerId`.
- A disconnect should mark the player as temporarily absent for a grace window instead of removing them immediately.
- A later `room:join` with the same `clientId` should reclaim the existing player slot.
- Ownership transfers only when the current owner truly leaves and is no longer present after reconciliation.

**Implementation Shape**

- Extract lobby room lifecycle logic from `server.js` into a small reusable module so it can be tested without starting Next.js.
- Add room-session bookkeeping for temporary disconnects keyed by stable `clientId`.
- Update join and leave flows to reconcile reconnecting players before capacity checks or owner reassignment.
- Keep the rest of gameplay logic unchanged.

**Testing**

- Add regression tests for:
  - creator remains owner after another player joins
  - creator remains owner across socket replacement with same `clientId`
  - later players can still join after the creator reconnects
  - owner transfers only when the creator is actually gone

**Risk**

The main risk is leaving stale players in a room too long. Mitigation: use a narrow grace window and clear the temporary disconnect record as soon as the player rejoins.
