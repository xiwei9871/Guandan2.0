# Room UI Refinement Design

## Goal

Polish the integrated table room UI without changing the overall table-first layout. This pass focuses on removing duplicated waiting hints, making seat-card text resilient in narrow side slots, correcting misleading empty-state copy, keeping the live remaining-card count accurate, improving hand-to-action mouse travel, and preventing the self seat card from being obscured by the hand area.

## Scope

This pass does not change socket behavior, game rules, or the overall color direction. It only adjusts the room page presentation and interaction density inside the existing integrated table.

## Decisions

### Waiting-state messaging

Only one waiting message should be visible during the waiting phase. The centered table message remains the source of truth. The detached bottom duplicate hint is removed.

### Seat-card content behavior

Seat cards keep the same information set, but the status badges must tolerate narrow side placements. The metadata row should be allowed to wrap or break into smaller badge groups so right/left/top cards do not clip.

The remaining-card count always comes from the live player state (`player.cardsRemaining`). The UI must not infer a count from the currently displayed play.

### Empty-state copy

Before cards are dealt or before a player has played in the current round, the seat card should show a neutral waiting state. `已出完牌` should only appear when the player actually has zero cards left. A player with cards remaining and no current-round play should show a waiting label instead.

### Hand/action layout

The hand zone stays integrated into the table, but its content should be rebalanced:

- hand area gets more visual width and height
- action buttons move closer to the selected cards, toward the upper-right edge of the hand band
- button layout should reduce pointer travel between card selection and action clicks

### Self seat positioning

The current player's seat card remains inside the table, but it shifts upward and grows slightly so it is easier to read and no longer collides visually with the hand band.

## Components

- `components/GameRoom.tsx`
  Remove the duplicate waiting hint and reposition the self seat card plus hand zone spacing.
- `components/game/PlayerCard.tsx`
  Make badge layout resilient, keep live card counts, and fix the empty-state rules.
- `components/game/HandCards.tsx`
  Rebalance the hand header and button cluster so actions sit near the hand instead of far right.
- `components/__tests__/GameRoom.test.ts`
  Add assertions for a single waiting-state prompt and integrated table structure after the refinement.
- `components/game/__tests__/PlayerCard.test.ts`
  Add assertions for empty-state copy and live remaining-card count rendering.

## Testing

- Add failing tests first for:
  - only one waiting prompt in waiting state
  - player-card empty-state copy when cards remain
  - live card count display
  - integrated hand zone action layout hooks
- Run targeted Jest suites for `GameRoom` and `PlayerCard`
- Run `npm run build` to confirm the room page still compiles cleanly
