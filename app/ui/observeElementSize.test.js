import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeElementSize } from './observeElementSize';

afterEach(() => vi.unstubAllGlobals());
function harness(axis = 'width') {
  let deliver;
  let disconnected = false;
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { deliver = callback; }
    observe() {}
    disconnect() { disconnected = true; }
  });
  const node = { offsetWidth: 120, offsetHeight: 40 };
  const sizes = [];
  const stop = observeElementSize(node, axis, size => sizes.push(size));
  return { node, sizes, stop, deliver: () => deliver?.(), disconnected: () => disconnected };
}
describe('intrinsic size subscription', () => {
  it('reports initial size and both directions including removal to zero', () => {
    const h = harness();
    h.node.offsetWidth = 240; h.deliver();
    h.node.offsetWidth = 80; h.deliver();
    h.node.offsetWidth = 0; h.deliver();
    expect(h.sizes).toEqual([120, 240, 80, 0]);
  });
  it('measures height independently and suppresses unchanged deliveries', () => {
    const h = harness('height');
    h.node.offsetWidth = 600; h.deliver(); h.deliver();
    h.node.offsetHeight = 65; h.deliver();
    expect(h.sizes).toEqual([40, 65]);
  });
  it('disconnects and ignores stale deliveries after unmount', () => {
    const h = harness(); h.stop();
    h.node.offsetWidth = 999; h.deliver();
    expect(h.disconnected()).toBe(true);
    expect(h.sizes).toEqual([120]);
  });
  it('leaves intrinsic layout in place without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const sizes = [];
    const stop = observeElementSize({offsetWidth: 120}, 'width', size => sizes.push(size));
    expect(sizes).toEqual([]);
    expect(() => stop()).not.toThrow();
  });
});
