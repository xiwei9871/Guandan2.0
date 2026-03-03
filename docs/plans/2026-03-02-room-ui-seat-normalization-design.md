# Room UI Seat Normalization Design

## Goal

Fix the remaining integrated-table regressions seen in `docs/layout.png` and `docs/layout2.png` without changing the overall visual direction. This pass removes duplicate waiting copy, distinguishes the waiting-phase empty state from an actually finished hand, and normalizes all four seat cards so they sit inside the table with a consistent size system.

## Problems

### Duplicate waiting copy

The room currently shows `等待玩家准备` in two places during the waiting phase:

- the top status bar
- the centered waiting-state overlay

The centered overlay is the correct focal point, so the header should stop echoing the same waiting text.

### Wrong empty-state copy in waiting phase

A player with `cardsRemaining === 0` in the waiting phase is not "finished"; cards simply have not been dealt yet. The seat card must show `待发牌` during waiting, and reserve `已出完牌` for active play when a player has actually run out of cards.

### Seats look outside the table and inconsistent

The top, left, right, and bottom seat containers currently use different widths and edge offsets. The side seats are too close to the outer edge, which makes them appear outside the table. The seat system should use one shared width with consistent table padding so all four cards clearly sit inside the blue table.

## Decisions

- Remove the waiting-phase status label from the top bar.
- Keep the centered waiting overlay as the only `等待玩家准备` prompt.
- Pass room phase into the seat card so it can choose between:
  - `待发牌` in `waiting`
  - `等待出牌` when the round is active and no current-round play is shown
  - `已出完牌` only when the player truly has no cards remaining during active play or settlement
- Use one shared seat width constant in `GameRoom`.
- Pull the top/left/right seats inward with larger in-table offsets.
- Keep the current player on the bottom but use the same width as the other seats so the system feels consistent.

## Components

- `components/GameRoom.tsx`
  - remove duplicate waiting label from the top header
  - normalize seat slot widths and offsets
  - pass game phase into `PlayerCard`
- `components/game/PlayerCard.tsx`
  - add waiting-phase empty-state handling (`待发牌`)
- `components/__tests__/GameRoom.test.ts`
  - lock a single `等待玩家准备` prompt
  - lock uniform seat widths in the rendered markup
- `components/game/__tests__/PlayerCard.test.ts`
  - lock `待发牌` for waiting-phase cards

## Testing

- Write failing tests first
- Run targeted UI tests for `GameRoom` and `PlayerCard`
- Run `npm run build`
