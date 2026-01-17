import { describe, expect, it, afterEach } from "vitest";
import { isDocumentHidden } from "../../utils/visibility";

describe("isDocumentHidden", () => {
  const originalDocument = global.document;

  afterEach(() => {
    global.document = originalDocument;
  });

  it("returns false when document is missing", () => {
    global.document = undefined;
    expect(isDocumentHidden()).toBe(false);
  });

  it("returns true when document.hidden is true", () => {
    global.document = { hidden: true };
    expect(isDocumentHidden()).toBe(true);
  });

  it("returns false when document.hidden is false", () => {
    global.document = { hidden: false };
    expect(isDocumentHidden()).toBe(false);
  });
});
