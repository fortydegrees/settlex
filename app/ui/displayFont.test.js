import { describe, expect, it } from 'vitest';
import { canUseDisplayFont } from './displayFont';

describe('partial display font coverage', () => {
  it.each(['SettleHex', 'Victory!', 'You win!', 'Your turn', 'Settings', 'Rematch'])('supports %s without mixing fonts', text => {
    expect(canUseDisplayFont(text)).toBe(true);
  });
  it.each(['David wins!', 'Élodie', '勝利!', '123', '😀', '', null])('falls back for unsupported text %s', text => {
    expect(canUseDisplayFont(text)).toBe(false);
  });
});
