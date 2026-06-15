import { test, expect } from '@playwright/test'
import { useTestUser } from './test-user'

// These tests require the full local stack: Docker (Postgres/PostGIS) +
// backend on :5100 + frontend dev server on :5173. They exercise the real
// per-user "Not interested" flow, persisting user_hidden_playgrounds for the
// E2E user. global-teardown deletes those rows afterwards.

test.use({
  geolocation: { latitude: 58.97, longitude: 5.7331 },
  permissions: ['geolocation'],
})

test.beforeEach(async ({ page }) => {
  await useTestUser(page)
})

// Use the FOURTH marker (.nth(3)): favourites.spec uses the first, saved.spec the
// second, flag.spec the third (and hides it globally). Hiding removes our marker, so
// it must touch a different playground to avoid disturbing those parallel specs.
async function openFourthPreview(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(page.locator('.leaflet-marker-icon').nth(3)).toBeVisible({ timeout: 10000 })
  await page.locator('.leaflet-marker-icon').nth(3).dispatchEvent('click')
  await expect(page.locator('.preview-card')).toBeVisible()
}

test.describe('hide from my view (chromium)', () => {
  // Serial: the tests share the same marker and hide it, so parallel runs interfere.
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'markers may be outside 390px viewport')
  })

  test('"Not interested" closes the preview and removes the pin, and it stays hidden after reload', async ({ page }) => {
    await openFourthPreview(page)
    const before = await page.locator('.leaflet-marker-icon').count()

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/hide') && r.request().method() === 'POST'),
      page.locator('.hide-mine-btn').click(),
    ])

    await expect(page.locator('.preview-card')).not.toBeVisible()
    // flag.spec may concurrently hide a playground globally for the same user, so the
    // count can drop by more than one — assert it dropped, not the exact figure.
    await expect.poll(() => page.locator('.leaflet-marker-icon').count()).toBeLessThan(before)

    await page.reload()
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await expect.poll(() => page.locator('.leaflet-marker-icon').count()).toBeLessThan(before)
  })
})

test.describe('hide button 390px layout', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('the "Not interested" button fits within the 390px viewport when the preview is open', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().dispatchEvent('click')
    await expect(page.locator('.hide-mine-btn')).toBeInViewport()
  })
})
