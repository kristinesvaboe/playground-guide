import { test, expect } from '@playwright/test'
import { useTestUser } from './test-user'

// These tests require the full local stack: Docker (Postgres/PostGIS) +
// backend on :5100 + frontend dev server on :5173. They exercise the real
// "no longer exists" flag flow, which hides a playground globally (IsHidden).
// global-teardown restores it and deletes the test user's flags afterwards.

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

  test('cancelling the confirm does not flag the playground', async ({ page }) => {
    page.on('dialog', (d) => d.dismiss())
    await openThirdPreview(page)
    await page.locator('.flag-gone-btn').click()
    // Dismissed: the preview stays open and the marker is still present.
    await expect(page.locator('.preview-card')).toBeVisible()
    await expect(page.locator('.leaflet-marker-icon').nth(2)).toBeVisible()
  })

  test('confirming flags the playground and hides it from the map', async ({ page }) => {
    await openThirdPreview(page)
    const before = await page.locator('.leaflet-marker-icon').count()

    page.on('dialog', (d) => d.accept())
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/flag') && r.request().method() === 'POST'),
      page.locator('.flag-gone-btn').click(),
    ])
    expect(response.ok()).toBeTruthy()

    await expect(page.locator('.preview-card')).not.toBeVisible()
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(before - 1)

    // Persisted: a reload still excludes the hidden playground. hide.spec may hide
    // another playground for the same user in parallel, so the reloaded count can drop
    // below before-1 — assert it dropped, not the exact figure.
    await page.reload()
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await expect.poll(() => page.locator('.leaflet-marker-icon').count()).toBeLessThan(before)
  })
})

test.describe('flag button 390px layout', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('the flag button fits within the 390px viewport when the preview is open', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().dispatchEvent('click')
    await expect(page.locator('.flag-gone-btn')).toBeInViewport()
  })
})
