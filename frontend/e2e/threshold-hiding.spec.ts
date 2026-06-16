import { test, expect } from '@playwright/test'
import { useTestUser } from './test-user'

// Below-threshold flagging keeps the playground visible but flips its pin to a
// warning state and turns the preview's flag button into a one-tap confirm.
// These tests mock the playgrounds + flag endpoints so they don't depend on the
// real flag count of any seeded playground or disturb other specs.

const FLAGGED_ID = '77777777-6666-5555-4444-333333333333'

const FLAGGED_LIST = [
  {
    id: FLAGGED_ID,
    name: 'Reported Leikeplass',
    latitude: 58.97,
    longitude: 5.7331,
    flagCount: 1,
    isHidden: false,
  },
]

const PREVIEW = {
  id: FLAGGED_ID,
  name: 'Reported Leikeplass',
  equipment: null,
  ageSuitability: null,
  size: null,
  myEnrichment: null,
}

test.use({
  geolocation: { latitude: 58.97, longitude: 5.7331 },
  permissions: ['geolocation'],
})

test.beforeEach(async ({ page }) => {
  await useTestUser(page)
  await page.route('**/playgrounds?*', (route) => route.fulfill({ json: FLAGGED_LIST }))
  await page.route(`**/playgrounds/${FLAGGED_ID}?*`, (route) => route.fulfill({ json: PREVIEW }))
})

test.describe('flagged-but-visible playground (chromium)', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'markers may be outside 390px viewport')
  })

  test('an already-flagged playground shows a warning pin and a confirm prompt', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon.flagged-pin')).toBeVisible({ timeout: 10000 })

    await page.locator('.leaflet-marker-icon.flagged-pin').dispatchEvent('click')
    await expect(page.locator('.preview-card')).toBeVisible()
    // The first-flagger dialog button is replaced by the confirm prompt + button
    await expect(page.locator('.flag-gone-btn')).toHaveCount(0)
    await expect(page.locator('.flag-notice')).toBeVisible()
    await expect(page.locator('.flag-confirm-btn')).toBeVisible()
  })

  test('confirming below threshold keeps the pin and bumps the flag count', async ({ page }) => {
    await page.route(`**/playgrounds/${FLAGGED_ID}/flag`, (route) =>
      route.fulfill({ json: { flagCount: 2, isHidden: false } })
    )
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon.flagged-pin')).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon.flagged-pin').dispatchEvent('click')

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/flag') && r.request().method() === 'POST'),
      page.locator('.flag-confirm-btn').click(),
    ])
    expect(response.ok()).toBeTruthy()
    // Still on the map: not yet hidden, no reason dialog was shown
    await expect(page.locator('.flag-reason-dialog')).toHaveCount(0)
    await expect(page.locator('.leaflet-marker-icon.flagged-pin')).toBeVisible()
  })

  test('confirming at threshold removes the pin and closes the preview', async ({ page }) => {
    await page.route(`**/playgrounds/${FLAGGED_ID}/flag`, (route) =>
      route.fulfill({ json: { flagCount: 3, isHidden: true } })
    )
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon.flagged-pin')).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon.flagged-pin').dispatchEvent('click')

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/flag') && r.request().method() === 'POST'),
      page.locator('.flag-confirm-btn').click(),
    ])
    await expect(page.locator('.preview-card')).not.toBeVisible()
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0)
  })
})

test.describe('flagged preview 390px layout', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('the confirm prompt and button fit within the 390px viewport', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().dispatchEvent('click')
    await expect(page.locator('.flag-notice')).toBeInViewport()
    await expect(page.locator('.flag-confirm-btn')).toBeInViewport()
  })
})
