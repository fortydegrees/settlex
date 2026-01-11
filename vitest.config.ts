import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@settlex/game-core": path.resolve(__dirname, "game-core/src/index.ts")
    }
  },
  test: {
    environment: "node",
    globals: true
  }
});
