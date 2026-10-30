import { formatLogEntry, getGameLogEntryKey } from '../../../../lib/shared/gameText';

// Turn ends are boundaries, not events to select. Delay the next heading until
// an incoming player's action: a trailing end/result must not invent a new turn.
export function buildGameLogRows(entries = [], playerMap = {}, { tiles = [], phase: currentPhase } = {}) {
  const rows = [];
  let pendingTurn = true;
  let phase = 'main';
  let turn = 0;
  let sourceTurn = null;
  let finished = false;

  let shownPhase = null;
  const showPhase = (nextPhase) => {
    if (shownPhase === nextPhase) return;
    shownPhase = phase = nextPhase;
    pendingTurn = true;
    sourceTurn = null;
    if (phase === 'main') turn = 0;
    rows.push({ key: `phase-${phase}`, isDivider: true, isPhase: true,
      animateArrival: false, phase });
  };
  if (!entries.length && currentPhase === 'placement') showPhase('placement');

  entries.forEach((entry, index) => {
    const tokens = formatLogEntry(entry, playerMap);
    if (!tokens.length) return;
    if (tokens.every((token) => token.kind === 'divider')) {
      pendingTurn = true;
      if (entry.type === 'phase:main') showPhase('main');
      else if (entry.type === 'phase:placement') showPhase('placement');
      return;
    }

    const isPlacement = entry.phase === 'placement' || entry.data?.initialPlacement;
    if (isPlacement) showPhase('placement');
    else if (shownPhase === 'placement' && (entry.phase === 'main' || entry.type === 'roll')) showPhase('main');

    // Board topology is public and fixed, so this also enriches older archives
    // without changing persisted events or replay seek identities.
    if (entry.type === 'build:settlement' && (isPlacement || shownPhase === 'placement') && entry.data?.nodeId != null) {
      const adjacent = tiles.filter(({ type, tile }) => type === 'Land' &&
        Object.values(tile?.nodes ?? {}).some(id => String(id) === String(entry.data.nodeId)));
      if (adjacent.length) {
        tokens.push({ kind: 'text', text: ' beside ' });
        adjacent.forEach(({ tile }, tileIndex) => {
          if (tileIndex) tokens.push({ kind: 'text', text: ' ' });
          tokens.push({ kind: 'tileDestination', resource: tile.resource, number: tile.number });
        });
      }
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
      // Setup actions name each player; only normal play needs turn headings.
      // A phase heading also replaces the first turn heading. Track every turn
      // even when its heading is omitted so later actions stay grouped.
      if (phase === 'main' && !rows[rows.length - 1]?.isPhase) {
        rows.push({
          key: `turn-${key}`, isDivider: true, animateArrival: false,
          phase, turn,
          player: tokens.find((token) => token.kind === 'player'),
        });
      }
      pendingTurn = false;
      sourceTurn = entryTurn;
    }
    rows.push({ key, entry, tokens, isServerEntry });
  });
  return rows;
}
