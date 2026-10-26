import { describe, expect, it } from 'vitest';
import { installFocusModality } from './focusInputMode';

function fixture() {
  const document = new EventTarget();
  const attributes = new Map();
  document.documentElement = {
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
  };
  const send = (type, properties = {}) => {
    const event = new Event(type);
    Object.defineProperties(event, Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [key, { value }])
    ));
    document.dispatchEvent(event);
  };
  const mode = () => document.documentElement.getAttribute('data-settlehex-input');
  return { document, send, mode };
}

describe('shared keyboard focus modality', () => {
  it('shows keyboard focus after Tab and hides it on mouse, touch or pen input', () => {
    const { document, send, mode } = fixture();
    const cleanup = installFocusModality(document);
    expect(mode()).toBe('pointer');
    for (const pointerType of ['mouse', 'touch', 'pen']) {
      send('keydown', { key: 'Tab' });
      expect(mode()).toBe('keyboard');
      send('pointerdown', { pointerType });
      expect(mode()).toBe('pointer');
    }
    send('keydown', { key: 'Tab', shiftKey: true });
    expect(mode()).toBe('keyboard');
    cleanup();
  });

  it('recognises keyboard control navigation and activation without waiting for focus to move', () => {
    const { document, send, mode } = fixture();
    const cleanup = installFocusModality(document);
    for (const key of ['ArrowRight', 'ArrowDown', 'Home', 'End', 'Enter', ' ', 'Escape']) {
      send('pointerdown');
      send('keydown', { key });
      expect(mode()).toBe('keyboard');
    }
    cleanup();
  });

  it('does not turn text editing or shortcuts into keyboard navigation', () => {
    const { document, send, mode } = fixture();
    const cleanup = installFocusModality(document);
    for (const target of [{ tagName: 'INPUT', type: 'text' }, { tagName: 'TEXTAREA' }, { isContentEditable: true }]) {
      for (const key of ['a', ' ', 'ArrowLeft', 'Home', 'Enter']) {
        send('keydown', { key, target });
        expect(mode()).toBe('pointer');
      }
      send('keydown', { key: 'Tab', target });
      expect(mode()).toBe('keyboard');
      send('pointerdown');
    }
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
      send('keydown', { key: 'ArrowLeft', [modifier]: true });
      expect(mode()).toBe('pointer');
    }
    cleanup();
  });

  it('treats range and checkbox keyboard actions as control navigation', () => {
    const { document, send, mode } = fixture();
    const cleanup = installFocusModality(document);
    send('keydown', { key: 'ArrowRight', target: { tagName: 'INPUT', type: 'range' } });
    expect(mode()).toBe('keyboard');
    send('pointerdown');
    send('keydown', { key: ' ', target: { tagName: 'INPUT', type: 'checkbox' } });
    expect(mode()).toBe('keyboard');
    cleanup();
  });

  it('retains keyboard mode through text entry and restores the document on cleanup', () => {
    const { document, send, mode } = fixture();
    const cleanup = installFocusModality(document);
    send('keydown', { key: 'Tab' });
    send('keydown', { key: 'a', target: { tagName: 'INPUT', type: 'text' } });
    expect(mode()).toBe('keyboard');
    cleanup();
    expect(mode()).toBeNull();
    send('keydown', { key: 'Tab' });
    send('pointerdown');
    expect(mode()).toBeNull();
  });
});
