import type { Page } from '@playwright/test'

// Dedicated identity for E2E writes. Kept distinct from the app's real seed user so
// the teardown's enrichment cleanup can never touch hand-entered data.
export const TEST_USER_ID = 'e2e7e57e-0000-4000-8000-00000000e2e5'
export const TEST_USER_NAME = 'E2E Test User'

// Make the app run as the test user in this browser context. Must be called before
// the first navigation so config.ts reads the override on load.
export async function useTestUser(page: Page) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('pg_user_id', id)
  }, TEST_USER_ID)
}
