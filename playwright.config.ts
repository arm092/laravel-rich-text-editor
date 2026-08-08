import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/browser',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { viewport: { width: 1280, height: 800 }, locale: 'en-US', reducedMotion: 'reduce' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
})
