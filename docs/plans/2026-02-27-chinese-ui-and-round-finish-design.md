# Chinese UI And Round Finish Design

**Context**

The project already has the main Guandan room flow, stricter card-type validation, and partial round reset fixes. The current blocker is not a single bug. It is a combination of:

- multiple UI files containing mojibake instead of readable Chinese text
- E2E selectors still carrying mixed Chinese/English assumptions from a temporary Figma-driven UI pass
- server-side round settlement and turn advancement now partially implemented, but not yet fully verified through a full game flow

**Goal**

Keep the current visual structure, restore the product UI to Chinese, and make the runtime flow stable enough to validate a full room lifecycle from create/join/ready/start into multi-trick play and end-of-round settlement.

**Approaches Considered**

1. Full UI rollback
   Trade-off: fast if a clean rollback point exists, but it risks discarding working gameplay fixes and recent stricter rule-engine changes.

2. Minimal stabilization on top of current branch
   Trade-off: slightly more manual cleanup, but it preserves the current structure and targets only confirmed regressions.

3. Separate UI rewrite plus gameplay refactor
   Trade-off: cleaner long-term, but too large for the current debugging scope and would delay restoring a reliable playable build.

**Recommendation**

Use approach 2. Preserve current layout and interaction structure, restore Chinese strings in the affected files, align navigation guard copy and E2E selectors with that UI, then verify the round-finish path under automated tests.

**Design**

## UI

- Keep the current homepage and room layout.
- Restore all visible user-facing copy to Chinese in `components/HomePage.tsx`, `components/GameRoom.tsx`, and guard/helper text providers.
- Fix any guard wiring mistakes introduced during the rewrite, especially incorrect reason bindings between create/join sections.

## Gameplay Flow

- Preserve the existing strict card validation path in `server.js`.
- Keep the existing settlement helper as the single place for ranking and level updates.
- Validate that turn advancement skips players who have already emptied their hands.
- Validate that when a player goes out mid-round, the next active player can lead a fresh trick.
- Validate that when the third player is ranked, the fourth is auto-ranked and the room transitions to `finished`.

## Testing

- Use test-first updates for the currently failing E2E assumptions.
- Keep unit tests around navigation rules and server-side settlement helpers.
- Run:
  - focused unit tests for navigation and settlement
  - `npm run build`
  - focused Playwright flows for new-round reset and long-round smoke

**Success Criteria**

- Homepage and room page render readable Chinese copy.
- Create/join/ready/start still work through current UI.
- Multi-trick flow works after players go out.
- Finished game state is reached by runtime logic and no longer depends on implicit assumptions in the test.
