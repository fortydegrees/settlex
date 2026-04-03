import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.resolve(__dirname, "..", "server.js");

describe("server route wiring", () => {
  it("parses JSON bodies for the idle acknowledge route", () => {
    const contents = fs.readFileSync(serverPath, "utf8");

    expect(contents).toContain('import koaBody from "koa-body"');
    expect(contents).toContain(
      'server.router.post("/idle/:matchID/ack", koaBody(), async (ctx) => {'
    );
  });
});
