import { formatLogEntry, getGameLogEntryKey } from '../../../../lib/shared/gameText';

// Turn ends are boundaries, not events to select. Delay the next heading until
// an incoming player's action: a trailing end/result must not invent a new turn.
export function buildGameLogRows(entries = [], playerMap = {}) {
  const rows = [];
  let pendingTurn = true;
  let phase = 'main';
  let turn = 0;
  let sourceTurn = null;
  let finished = false;

  entries.forEach((entry, index) => {
    const tokens = formatLogEntry(entry, playerMap);
    if (!tokens.length) return;
    if (tokens.every((token) => token.kind === 'divider')) {
      pendingTurn = true;
      if (entry.type === 'phase:main') {
        phase = 'main';
        turn = 0;
        sourceTurn = null;
      } else if (entry.type === 'phase:placement') {
        phase = 'placement';
      }
      return;
    }

    const key = getGameLogEntryKey(entry, index);
    const isServerEntry = entry.type?.startsWith('server:');
    const ownsTurn = entry.actorId != null && entry.actorId !== 'system' &&
      /^(roll|build:|dev:|trade:|robber:)/.test(entry.type);
    const entryTurn = Number.isFinite(entry.turn) ? entry.turn : null;
    if (entry.type === 'game:over') finished = true;
    if (!finished && ownsTurn && (pendingTurn || (entryTurn != null && entryTurn !== sourceTurn))) {
      if (entry.phase === 'placement' || entry.data?.initialPlacement) phase = 'placement';
      if (entry.type === 'roll') phase = 'main';
      if (phase === 'main') turn = entryTurn ?? turn + 1;
      rows.push({
        key: `turn-${key}`, isDivider: true, animateArrival: false,
        phase, turn: phase === 'placement' ? null : turn,
        player: tokens.find((token) => token.kind === 'player'),
      });
      pendingTurn = false;
      sourceTurn = entryTurn;
    }
    rows.push({ key, entry, tokens, isServerEntry });
  });
  return rows;
}
