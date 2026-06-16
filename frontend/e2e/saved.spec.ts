import { test, expect } from '@playwright/test'
import { useTestUser } from './test-user'

// These tests require the full local stack: Docker (Postgres/PostGIS) +
// backend on :5100 + frontend dev server on :5173. They exercise the real
// save toggle/list flow, persisting user_saved for the E2E user.

test.use({
  geolocation: { latitude: 58.97, longitude: 5.7331 },
  permissions: ['geolocation'],
})

test.beforeEach(async ({ page }) => {
  await useTestUser(page)
})

// Use the SECOND marker, not the first: favourites.spec runs in parallel on the
// first marker, and a both-saved-and-favourited pin shows the favourite heart
// (precedence), which would hide the bookmark this spec asserts on. Different
// playground = no cross-spec interference.
async function openPreview(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(page.locator('.leaflet-marker-icon').nth(1)).toBeVisible({ timeout: 10000 })
  await page.locator('.leaflet-marker-icon').nth(1).dispatchEvent('click')
  await expect(page.locator('.preview-card')).toBeVisible()
}

async function ensureSaved(page: import('@playwright/test').Page) {
  const bookmark = page.locator('.saved-toggle-btn')
  if ((await bookmark.getAttribute('aria-pressed')) !== 'true') {
    await bookmark.click()
    await expect(bookmark).toHaveAttribute('aria-pressed', 'true')
  }
}

test.describe('saved (chromium)', () => {
  // Serial: these tests share the same saved row, so parallel runs interfere.
  test.describe.configure({ mode: 'serial' })

  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'markers may be outside 390px viewport')
  })

  test('tapping the bookmark on the preview card toggles saved state', async ({ page }) => {
    await openPreview(page)
    const bookmark = page.locator('.saved-toggle-btn')
    await ensureSaved(page)

    await bookmark.click()
    await expect(bookmark).toHaveAttribute('aria-pressed', 'false')
  })

  test('a saved playground shows a bookmark pin on the map', async ({ page }) => {
    await openPreview(page)
    await ensureSaved(page)
    await page.locator('.preview-close-btn').click()
    await expect(page.locator('.saved-pin').first()).toBeVisible()
  })

  test('the saved list shows the entry with a distance', async ({ page }) => {
    await openPreview(page)
    await ensureSaved(page)
    await page.locator('.preview-close-btn').click()

    await page.locator('.saved-list-toggle-btn').click()
    await expect(page.locator('.saved-panel')).toBeVisible()
    const row = page.locator('.saved-row').first()
    await expect(row).toBeVisible()
    await expect(row.locator('.saved-row-distance')).toHaveText(/\d+\s(m|km)/)
  })

  test('saved state persists across a reload', async ({ page }) => {
    await openPreview(page)
    await ensureSaved(page)
    await page.reload()
    await expect(page.locator('.saved-pin').first()).toBeVisible({ timeout: 10000 })

    await page.locator('.saved-list-toggle-btn').click()
    await expect(page.locator('.saved-row')).toHaveCount(1)
  })

  test('unsaving removes the entry from the list', async ({ page }) => {
    await openPreview(page)
    await ensureSaved(page)
    // Untoggle, then confirm the list is empty.
    await page.locator('.saved-toggle-btn').click()
    await expect(page.locator('.saved-toggle-btn')).toHaveAttribute('aria-pressed', 'false')

    await page.locator('.saved-list-toggle-btn').click()
    await expect(page.locator('.saved-panel')).toBeVisible()
    // Scope to the saved panel: a bare .muted also matches the preview card's "No details added yet".
    await expect(page.locator('.saved-panel .muted')).toHaveText('No saved playgrounds yet')
  })
})

test.describe('saved 390px layout', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('the saved button and panel fit within the 390px viewport', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.saved-list-toggle-btn')).toBeInViewport()
    await page.locator('.saved-list-toggle-btn').click()
    await expect(page.locator('.saved-panel')).toBeInViewport()
  })
})
