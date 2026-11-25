import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

/**
 * The test runner. The app itself builds with electron-vite (electron.vite.config.ts);
 * this configuration only serves `npm test`: component tests render in jsdom, and the
 * trusted CI mutation gate runs `npm test` once per mutant, so the suite stays lean.
 */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    pool: "threads",
  },
})
