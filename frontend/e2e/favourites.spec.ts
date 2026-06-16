import { test, expect } from '@playwright/test'
import { useTestUser } from './test-user'

// These tests require the full local stack: Docker (Postgres/PostGIS) +
// backend on :5100 + frontend dev server on :5173. They exercise the real
// favourite toggle/list flow, persisting user_favourites for the E2E user.

test.use({
  geolocation: { latitude: 58.97, longitude: 5.7331 },
  permissions: ['geolocation'],
})

test.beforeEach(async ({ page }) => {
  await useTestUser(page)
})

async function openPreview(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
  await page.locator('.leaflet-marker-icon').first().dispatchEvent('click')
  await expect(page.locator('.preview-card')).toBeVisible()
}

async function ensureFavourited(page: import('@playwright/test').Page) {
  const heart = page.locator('.favourite-toggle-btn')
  if ((await heart.getAttribute('aria-pressed')) !== 'true') {
    await heart.click()
    await expect(heart).toHaveAttribute('aria-pressed', 'true')
  }
}

test.describe('favourites (chromium)', () => {
  // Serial: these tests share the same favourite row, so parallel runs interfere.
  test.describe.configure({ mode: 'serial' })

  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'markers may be outside 390px viewport')
  })

  test('tapping the heart on the preview card toggles favourite state', async ({ page }) => {
    await openPreview(page)
    const heart = page.locator('.favourite-toggle-btn')
    await ensureFavourited(page)
    await expect(heart).toHaveText('♥')

    await heart.click()
    await expect(heart).toHaveAttribute('aria-pressed', 'false')
    await expect(heart).toHaveText('♡')
  })

  test('a favourited playground shows a heart pin on the map', async ({ page }) => {
    await openPreview(page)
    await ensureFavourited(page)
    await page.locator('.preview-close-btn').click()
    await expect(page.locator('.favourite-pin').first()).toBeVisible()
  })

  test('the favourites list shows the entry with a distance', async ({ page }) => {
    await openPreview(page)
    await ensureFavourited(page)
    await page.locator('.preview-close-btn').click()

    await page.locator('.favourites-toggle-btn').click()
    await expect(page.locator('.favourites-panel')).toBeVisible()
    const row = page.locator('.favourites-row').first()
    await expect(row).toBeVisible()
    await expect(row.locator('.favourites-row-distance')).toHaveText(/\d+\s(m|km)/)
  })

  test('favourite state persists across a reload', async ({ page }) => {
    await openPreview(page)
    await ensureFavourited(page)
    await page.reload()
    await expect(page.locator('.favourite-pin').first()).toBeVisible({ timeout: 10000 })

    await page.locator('.favourites-toggle-btn').click()
    await expect(page.locator('.favourites-row')).toHaveCount(1)
  })

  test('unfavouriting removes the entry from the list', async ({ page }) => {
    await openPreview(page)
    await ensureFavourited(page)
    // Untoggle, then confirm the list is empty.
    await page.locator('.favourite-toggle-btn').click()
    await expect(page.locator('.favourite-toggle-btn')).toHaveAttribute('aria-pressed', 'false')

    await page.locator('.favourites-toggle-btn').click()
    await expect(page.locator('.favourites-panel')).toBeVisible()
    await expect(page.locator('.favourites-panel .muted')).toHaveText('No favourites yet')
  })
})

test.describe('favourites 390px layout', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('the favourites button and panel fit within the 390px viewport', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.favourites-toggle-btn')).toBeInViewport()
    await page.locator('.favourites-toggle-btn').click()
    await expect(page.locator('.favourites-panel')).toBeInViewport()
  })
})
