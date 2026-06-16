import { test, expect } from '@playwright/test'
import { useTestUser } from './test-user'

// These tests require the full local stack: Docker (Postgres/PostGIS) +
// backend on :5100 + frontend dev server on :5173. They exercise the real
// "no longer exists" flag flow. A single flag no longer hides a playground —
// it takes 3 community flags to cross the hide threshold — so one flag from the
// test user flips the pin to the flagged warning state but keeps it on the map.
// global-teardown deletes the test user's flags afterwards.

test.use({
  geolocation: { latitude: 58.97, longitude: 5.7331 },
  permissions: ['geolocation'],
})

test.beforeEach(async ({ page }) => {
  await useTestUser(page)
})

// Use the THIRD marker (.nth(2)): favourites.spec uses the first and saved.spec the
// second. flag.spec hides its marker, so it must touch a different playground to
// avoid disturbing those specs running in parallel.
async function openThirdPreview(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(page.locator('.leaflet-marker-icon').nth(2)).toBeVisible({ timeout: 10000 })
  await page.locator('.leaflet-marker-icon').nth(2).dispatchEvent('click')
  await expect(page.locator('.preview-card')).toBeVisible()
}

test.describe('flag no longer exists (chromium)', () => {
  // Serial: the tests share the same marker and hide it, so parallel runs interfere.
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'markers may be outside 390px viewport')
  })

  test('cancelling the reason dialog does not flag the playground', async ({ page }) => {
    await openThirdPreview(page)
    await page.locator('.flag-gone-btn').click()
    await expect(page.locator('.flag-reason-dialog')).toBeVisible()
    await page.locator('.flag-reason-dialog .btn-ghost').click()
    // Cancelled: the dialog closes, the preview stays open and the marker is still present.
    await expect(page.locator('.flag-reason-dialog')).not.toBeVisible()
    await expect(page.locator('.preview-card')).toBeVisible()
    await expect(page.locator('.leaflet-marker-icon').nth(2)).toBeVisible()
  })

  test('choosing a reason flags the playground but keeps it on the map below threshold', async ({ page }) => {
    await openThirdPreview(page)
    const before = await page.locator('.leaflet-marker-icon').count()

    await page.locator('.flag-gone-btn').click()
    await expect(page.locator('.flag-reason-dialog')).toBeVisible()
    await page.locator('.flag-reason-chip').first().click()
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/flag') && r.request().method() === 'POST'),
      page.locator('.flag-reason-submit').click(),
    ])
    expect(response.ok()).toBeTruthy()

    // One flag is below the 3-flag threshold: the dialog closes but the pin stays,
    // now in the flagged warning state. The marker count is unchanged.
    await expect(page.locator('.flag-reason-dialog')).not.toBeVisible()
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(before)
    await expect(page.locator('.leaflet-marker-icon.flagged-pin')).toBeVisible()

    // Persisted: a reload still shows the playground (not hidden) with its flagged pin.
    await page.reload()
    await expect(page.locator('.leaflet-marker-icon.flagged-pin')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('flag button 390px layout', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('the flag button and reason dialog fit within the 390px viewport', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().dispatchEvent('click')
    await expect(page.locator('.flag-gone-btn')).toBeInViewport()

    await page.locator('.flag-gone-btn').click()
    await expect(page.locator('.flag-reason-dialog')).toBeVisible()
    await expect(page.locator('.flag-reason-submit')).toBeInViewport()
  })
})
