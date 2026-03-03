# Tribute Flow Design

## Goal

Implement the full tribute and return-tribute flow for Guandan after a round ends, using the confirmed house rules from this session.

## Rule Set

This implementation follows these rules:

- If the result is `1,2` vs `3,4`, the losing side performs double tribute.
- If the result is `1,3` vs `2,4`, only the last-place player tributes to first place.
- If the result is `1,4` vs `2,3`, only the last-place player tributes to first place. This is the "inner tribute" case.
- In the double-tribute case, first place receives the larger tribute card and second place receives the smaller tribute card.
- If the two tribute cards are equal in rank, seat order is used as the tie-breaker when assigning first/second place receivers.
- Tribute is selected manually by the tribute giver.
- A legal tribute card must belong to the player's highest eligible tribute rank.
- Heart level cards are excluded from tribute ranking. If a player's highest card is the heart level card, the next highest eligible rank is used.
- If several cards share the highest eligible tribute rank, the player may choose any suit among those cards.
- Anti-tribute applies:
  - In the `1,2` vs `3,4` case, tribute is canceled if one losing-side player has both jokers, or the two losing-side players each have one big joker.
  - In the single-tribute cases, tribute is canceled if the last-place player has both jokers.
- Return tribute is selected manually by the receiving player.
- House rule: all return-tribute cards must be `<= 10`, regardless of whether the card is returned to a teammate or an opponent.
- Lead rule: the giver of the largest tribute card leads next; if anti-tribute cancels the process, the player who would have received the largest tribute leads next.

## Phase Flow

After a round finishes and rankings are assigned:

1. The next round starts by dealing fresh cards.
2. The server evaluates whether tribute is required.
3. If anti-tribute applies, the game skips directly to `playing`.
4. Otherwise, the room enters `tributing` with subphase `giving`.
5. The current tribute giver manually selects and submits one legal tribute card.
6. When all tribute cards are collected:
   - single/inner tribute is transferred immediately
   - double tribute compares both submitted tribute cards, assigns the larger card to first place and the smaller to second place, then determines the lead player
7. The room enters tribute subphase `returning`.
8. Each return-tribute player manually selects and submits one legal `<= 10` card.
9. When all returns resolve, the server clears tribute state and enters `playing`.

## Architecture

### Server-owned rules

The server owns all tribute logic:

- determine tribute pattern from previous-round ranks
- detect anti-tribute
- determine the highest eligible tribute rank for each giver
- validate tribute choices
- validate return-tribute choices
- compare double-tribute submissions and assign receivers
- move cards between hands
- decide when `tributing` ends and `playing` begins

The client only renders the current tribute state, highlights the active action, and submits the selected card.

### Tribute state shape

Extend the existing `tribute` room field so the UI can render both the workflow and a public action log:

- `phase`
  - `giving`
  - `returning`
- `mode`
  - `double`
  - `single`
  - `inner`
- `exempt`
  Whether anti-tribute canceled the phase.
- `pendingGives`
  Ordered list of tribute obligations still waiting for manual selection.
- `resolvedGives`
  Tribute selections already submitted by players.
- `pendingReturns`
  Ordered list of return-tribute obligations still waiting for manual selection.
- `resolvedReturns`
  Return-tribute selections already submitted by players.
- `revealedActions`
  Ordered public log of tribute and return actions for the table.
- `leadPlayerId`
  Player who should lead once the phase ends.

Legacy `fromPlayer`, `toPlayer`, and `cards` may remain as compatibility fields, but the UI should be driven by the richer lists above.

## Server Behavior

### End-of-round transition

When the round ends:

- preserve the prior ranking result
- deal fresh hands for the next round
- reset play-state fields (`lastPlay`, `lastPlays`, turn progression)
- evaluate tribute requirement using the prior result and fresh hands

If no tribute is required or anti-tribute is triggered:

- set `gamePhase = 'playing'`
- clear `tribute`
- set opening turn to the correct lead player

If tribute is required:

- set `gamePhase = 'tributing'`
- compute tribute obligations
- do not move any tribute cards yet
- populate `pendingGives`
- wait for manual tribute submissions

### Tribute validation

The server accepts only one selected hand card from the expected tribute giver.
Validation rules:

- it must be the expected player in the `giving` subphase
- the submitted card must exist in that player's hand
- the submitted card rank must equal that player's highest eligible tribute rank
- heart level cards are never valid tribute choices

If invalid:

- do not mutate state
- return an error callback

When valid:

- remove the chosen card from the giver hand
- store it in `resolvedGives`
- append a public `revealedActions` entry
- if more tribute givers remain, advance to the next `pendingGives`
- if all tribute givers are done, distribute the collected tribute cards, compute `pendingReturns`, and switch to `returning`

### Return-tribute validation

The server accepts only one selected hand card from the expected return player.
Validation rules:

- it must be the expected player in the `returning` subphase
- the submitted card must exist in that player's hand
- the card rank must be `<= 10`

If invalid:

- do not mutate state
- return an error callback

When valid:

- remove from returner hand
- add to target hand
- keep hands sorted
- mark the pending return as resolved
- append a public `revealedActions` entry
- if all returns resolve, clear tribute state and switch to `playing`

## Client Behavior

### Room screen

During `tributing`:

- center status area explains whether the table is in `giving` or `returning`
- all players can see a running public log of tribute and return actions
- only the current tribute giver or return player sees an enabled submit button
- the table prompt should identify who is acting and who the target is

### Hand interaction

When the local player must tribute:

- all hand cards remain visible
- the player may click any card
- only a legal tribute choice is accepted by the server
- UI copy should explain that the tribute card must come from the highest eligible rank

When the local player must return tribute:

- all hand cards remain visible
- only `<= 10` cards are accepted by the server
- UI copy should explain the restriction clearly

When the local player is not the active tribute actor:

- hand remains visible but tribute controls are disabled
- UI shows status only

## Testing Strategy

### Server tests

Add focused tests for:

- double tribute enters `giving` instead of auto-transferring tribute cards
- manual tribute accepts only the highest eligible tribute rank
- tribute rejects heart level cards even if selected
- single and inner tribute remain manual
- double tribute assignment sends the larger submitted card to first place and the smaller to second place
- return tribute must be `<= 10`
- tribute state exposes a public revealed action log
- tribute phase completes only after all returns are resolved

### UI tests

Add room UI tests for:

- `tributing` phase shows a tribute prompt in both `giving` and `returning`
- active tribute givers see a `进贡` action
- active returners see a `还贡` action
- tribute hand mode still renders the full hand, not a filtered hand subset
- revealed tribute/return actions are visible in the room prompt area

## Non-goals

- No attempt to support multiple regional rule variants at runtime
- No rule configuration UI in this pass
- No change to the overall table visual direction beyond the new tribute prompts, controls, and public action log
