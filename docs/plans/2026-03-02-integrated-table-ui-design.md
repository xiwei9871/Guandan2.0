# Integrated Table UI Design

**Goal**

Rebuild the room/game page as a single integrated card table. Remove the current outer gray side/bottom layout blocks and keep one primary play surface where player information, last-play information, and the current player's hand all live inside the table composition.

## Visual Direction

- Keep a very thin header for room metadata and session controls.
- Turn the rest of the page into one dominant table surface.
- Remove duplicate information cards outside the table.
- Use a single seat card per visible player.
- Prioritize played cards as the largest visual element inside each seat card.
- Replace textual team labels with color cues such as dots, side bars, or badges.

## Core Layout

The page becomes three layers:

1. Header strip
2. Integrated table stage
3. No separate external hand panel

The table stage fills nearly the full viewport below the header. The current player is always rendered at the bottom of the table regardless of their server-side seat position. Other players are remapped into top, left, and right positions relative to the viewer.

## Information Model

Each player appears exactly once inside the table.

Each seat card includes:

- team color marker
- direction marker relative to the current viewer
- player name
- remaining card count
- latest play in the current round
- small state badges for current turn, ready, pass, and rank

The largest area of each seat card is reserved for the played cards. Identity and state metadata become secondary chrome around that played-card area.

## Current Player View

The current player's hand is merged into the bottom edge of the table. It is not rendered in a separate panel outside the table.

The bottom area contains:

- the current player's compact seat summary
- the hand fan / stacked hand row
- action buttons near the hand

This keeps the visual composition consistent with reference game UIs where the player's own hand belongs to the table, not to a detached utility section.

## Component Strategy

Keep the existing behavior and socket/game rules. Only restructure the presentation layer.

- `components/GameRoom.tsx`
  - rebuild page composition into thin header + integrated table stage
  - remove outer placeholder and waiting boxes that live outside the table
  - remap visible seat positions relative to the current player

- `components/game/CenterPlayArea.tsx`
  - become the table shell and central shared-status layer
  - host the seat-card placements instead of only the generic center area

- `components/game/PlayerCard.tsx`
  - evolve into an integrated seat card instead of a standalone profile card
  - emphasize played cards over profile metadata

- `components/game/PlayedCards.tsx`
  - shrink into a presentational section reused inside the integrated seat card or folded into `PlayerCard`

- `components/game/HandCards.tsx`
  - render as the bottom table-edge hand layer instead of a detached white panel

## Interaction Rules

- The current player still sees playable cards, selection state, play/pass/clear actions.
- Other players do not get a separate “waiting” card; their state is shown inside their seat card.
- Empty seats should be lightweight table-edge placeholders only if needed.
- Ready/start/waiting messages should be compressed into small table overlays, not large stacked banners.

## Responsive Behavior

- Desktop keeps the four-seat table layout close to `suggestion.png`.
- Tablet/mobile preserves the same integrated-table idea with tighter card widths and smaller metadata.
- The table must remain readable even when the current player has a wide hand.

## Testing Focus

- View mapping still keeps the current player at the bottom.
- Start/waiting states remain visible after layout changes.
- Existing room/game actions are unaffected.
- No duplicate player information blocks remain outside the table.
