import type { Event, Phase, Formula } from './types';
function formula(resources: Formula): string {
  const terms = Object.entries(resources).filter(([, n]) => n !== undefined && n > 0).sort(([a], [b]) => a.localeCompare(b));
  if (!terms.length) throw new Error('unsupported-empty-plenty');
  return '(' + terms.map(([r, n]) => r + (n === 1 ? '' : n)).join('') + ')';
}
export function toHAN(event: Event, phase: Phase): string[] {
  switch (event.type) {
    case 'roll':
      return [`R(${event.dice[0]}+${event.dice[1]})`];
    case 'build':
      {
        const piece = {
          road: 'R',
          settlement: 'V',
          city: 'C'
        }[event.piece];
        return [...(phase === 'actions' ? ['B' + piece] : []), 'P' + piece + event.at];
      }
    case 'buyDev':
      return ['BD' + event.card];
    case 'play':
      return ['UD' + event.card + (event.card === 'm' ? event.resource : event.card === 'y' ? formula(event.resources) : '')];
    case 'discard':
      return [event.player + 'A' + formula(event.resources)];
    case 'moveRobber':
      return ['M' + event.at];
    case 'steal':
      return ['S' + event.resource + event.from];
    case 'trade':
      return ['T' + formula(event.give) + formula(event.take) + event.with];
    case 'end':
      return ['E'];
  }
}
