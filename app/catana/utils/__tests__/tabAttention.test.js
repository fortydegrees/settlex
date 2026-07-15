import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const createLink = ({ rel = "icon", href } = {}) => {
  const attributes = new Map([["rel", rel]]);
  if (href !== undefined) attributes.set("href", href);

  return {
    parentNode: null,
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: vi.fn((name, value) => {
      attributes.set(name, String(value));
    }),
    removeAttribute: vi.fn((name) => {
      attributes.delete(name);
    }),
    remove() {
      this.parentNode?.removeChild?.(this);
    }
  };
};

const createFakeDocument = ({
  hidden = false,
  title = "Original route title",
  iconHref = "/original-icon.svg",
  includeIcon = true
} = {}) => {
  const children = includeIcon ? [createLink({ href: iconHref })] : [];
  const listeners = new Map();
  let currentTitle = title;
  let titleWrites = 0;

  const head = {
    querySelector(selector) {
      if (selector !== 'link[rel~="icon"]') return null;
      return children.find((node) =>
        String(node.getAttribute("rel") ?? "")
          .split(/\s+/)
          .includes("icon")
      ) ?? null;
    },
    appendChild(node) {
      node.parentNode = head;
      children.push(node);
      return node;
    },
    removeChild(node) {
      const index = children.indexOf(node);
      if (index >= 0) children.splice(index, 1);
      node.parentNode = null;
      return node;
    }
  };

  children.forEach((node) => {
    node.parentNode = head;
  });

  const documentRef = {
    hidden,
    head,
    createElement: vi.fn(() => createLink({ rel: "" })),
    addEventListener: vi.fn((name, listener) => {
      listeners.set(name, listener);
    }),
    dispatchVisibilityChange() {
      listeners.get("visibilitychange")?.();
    },
    get title() {
      return currentTitle;
    },
    set title(value) {
      currentTitle = value;
      titleWrites += 1;
    },
    get titleWrites() {
      return titleWrites;
    }
  };

  return { documentRef, children };
};

const loadController = async (documentRef) => {
  vi.resetModules();
  vi.stubGlobal("document", documentRef);
  const controllerModule = await import("../tabAttention.js");
  return controllerModule.tabAttention;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("tabAttention", () => {
  it("does not change the title or favicon while the document is visible", async () => {
    const { documentRef, children } = createFakeDocument();
    const icon = children[0];
    const controller = await loadController(documentRef);

    controller.request("your-turn");

    expect(documentRef.title).toBe("Original route title");
    expect(icon.getAttribute("href")).toBe("/original-icon.svg");
    expect(documentRef.titleWrites).toBe(0);
  });

  it("keeps an actionable turn requested across visible restoration", async () => {
    const { documentRef, children } = createFakeDocument();
    const controller = await loadController(documentRef);

    controller.request("your-turn");
    documentRef.hidden = true;
    documentRef.dispatchVisibilityChange();
    expect(documentRef.title).toBe("🔔 Your turn · Settlehex");

    documentRef.hidden = false;
    documentRef.dispatchVisibilityChange();
    expect(documentRef.title).toBe("Original route title");
    expect(children[0].getAttribute("href")).toBe("/original-icon.svg");

    documentRef.hidden = true;
    documentRef.dispatchVisibilityChange();
    expect(documentRef.title).toBe("🔔 Your turn · Settlehex");
  });

  it("acknowledges match-found when the document is visible", async () => {
    const { documentRef } = createFakeDocument({ hidden: true });
    const controller = await loadController(documentRef);

    controller.request("match-found");
    documentRef.hidden = false;
    documentRef.dispatchVisibilityChange();
    documentRef.hidden = true;
    documentRef.dispatchVisibilityChange();

    expect(documentRef.title).toBe("Original route title");
  });

  it("uses the static your-turn title and shared bell favicon while hidden", async () => {
    const { documentRef, children } = createFakeDocument({ hidden: true });
    const controller = await loadController(documentRef);

    controller.request("your-turn");

    expect(documentRef.title).toBe("🔔 Your turn · Settlehex");
    expect(children[0].getAttribute("href")).toBe("/match-alert-bell.svg");
  });

  it("uses a one-shot player-looking cue for a push received while hidden", async () => {
    const { documentRef, children } = createFakeDocument({ hidden: true });
    const controller = await loadController(documentRef);

    controller.request("player-looking");
    expect(documentRef.title).toBe("🔔 Player looking · Settlehex");
    expect(children[0].getAttribute("href")).toBe("/match-alert-bell.svg");

    documentRef.hidden = false;
    documentRef.dispatchVisibilityChange();
    documentRef.hidden = true;
    documentRef.dispatchVisibilityChange();
    expect(documentRef.title).toBe("Original route title");
  });

  it("prioritizes match-found and reveals a remaining turn request on release", async () => {
    const { documentRef } = createFakeDocument({ hidden: true });
    const controller = await loadController(documentRef);

    controller.request("your-turn");
    controller.request("match-found");
    expect(documentRef.title).toBe("🔔 Match found · Settlehex");

    controller.release("match-found");
    expect(documentRef.title).toBe("🔔 Your turn · Settlehex");
  });

  it("restores the exact title and favicon href when visibility returns", async () => {
    const originalHref = "icons/game.svg?theme=table#primary";
    const { documentRef, children } = createFakeDocument({
      hidden: true,
      title: "Game 74 · Settlehex",
      iconHref: originalHref
    });
    const controller = await loadController(documentRef);

    controller.request("match-found");
    documentRef.hidden = false;
    documentRef.dispatchVisibilityChange();

    expect(documentRef.title).toBe("Game 74 · Settlehex");
    expect(children[0].getAttribute("href")).toBe(originalHref);
  });

  it("removes an attention favicon that it created", async () => {
    const { documentRef, children } = createFakeDocument({
      hidden: true,
      includeIcon: false
    });
    const controller = await loadController(documentRef);

    controller.request("your-turn");
    expect(children).toHaveLength(1);
    expect(children[0].getAttribute("href")).toBe("/match-alert-bell.svg");

    documentRef.hidden = false;
    controller.syncVisibility();
    expect(children).toHaveLength(0);
  });

  it("keeps duplicate calls idempotent and never creates an animation timer", async () => {
    const intervalSpy = vi.spyOn(globalThis, "setInterval");
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const { documentRef, children } = createFakeDocument({ hidden: true });
    const controller = await loadController(documentRef);

    controller.request("your-turn");
    controller.request("your-turn");
    controller.release("your-turn");
    controller.release("your-turn");

    expect(documentRef.title).toBe("Original route title");
    expect(children[0].getAttribute("href")).toBe("/original-icon.svg");
    expect(documentRef.addEventListener).toHaveBeenCalledTimes(1);
    expect(intervalSpy).not.toHaveBeenCalled();
    expect(timeoutSpy).not.toHaveBeenCalled();

    const source = readFileSync(
      resolve(process.cwd(), "app/catana/utils/tabAttention.js"),
      "utf8"
    );
    expect(source).not.toMatch(/setInterval|setTimeout|requestAnimationFrame/);
  });
});
