import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@settlehex/game-core": path.resolve(__dirname, "game-core/src/index.ts")
    }
  },
  test: {
    environment: "node",
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/.git/**",
      "**/.next/**",
      "**/.worktrees/**",
      "**/game-core/dist/**",
      "**/coverage/**"
    ]
  }
});
