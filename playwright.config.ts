import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
