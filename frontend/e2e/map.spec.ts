import { test, expect } from '@playwright/test'
import { useTestUser } from './test-user'

test.use({
  geolocation: { latitude: 58.97, longitude: 5.7331 },
  permissions: ['geolocation'],
})

test.beforeEach(async ({ page }) => {
  await useTestUser(page)
})

test('map renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.leaflet-container')).toBeVisible()
})

test('playground pins are visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
})

// Interaction tests: pin click, card, dismiss. Skipped on mobile-390 because markers
// can fall outside the 390px viewport bounds and Playwright won't click them.
test.describe('map interactions', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'markers may be outside 390px viewport')
  })

  test('tapping a pin shows the preview card', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().click()
    await expect(page.locator('.preview-card')).toBeVisible()
  })

  test('preview card is within the viewport', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().click()
    // toBeInViewport retries until the slide-up animation completes
    await expect(page.locator('.preview-card')).toBeInViewport()
  })

  test('preview card dismisses on close button', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().click()
    await expect(page.locator('.preview-card')).toBeVisible()
    await page.locator('.preview-close-btn').click()
    await expect(page.locator('.preview-card')).not.toBeVisible()
  })

  test('preview card dismisses when tapping the map', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().click()
    await expect(page.locator('.preview-card')).toBeVisible()
    await page.locator('.leaflet-container').click({ position: { x: 200, y: 100 } })
    await expect(page.locator('.preview-card')).not.toBeVisible()
  })

  test('the view details button is visible and enabled', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().click()
    await expect(page.locator('.preview-card')).toBeVisible()
    await expect(page.locator('.view-details-btn')).toBeVisible()
    await expect(page.locator('.view-details-btn')).toBeEnabled()
  })
})

// Re-fetch on pan/zoom. Skipped on mobile-390 because the smaller viewport makes the
// drag distance unreliable for moving the map centre meaningfully.
test.describe('re-fetch on map move', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'drag distance unreliable at 390px')
  })

  test('panning the map re-fetches playgrounds centred on the new location', async ({ page }) => {
    // Collect list-fetch latitudes from before navigation so the mount-time fetch is
    // never missed (registering the listener after goto() races the initial request).
    const lats: string[] = []
    page.on('request', (req) => {
      const url = new URL(req.url())
      if (url.pathname === '/playgrounds' && url.searchParams.has('lat')) {
        lats.push(url.searchParams.get('lat')!)
      }
    })

    await page.goto('/')
    await expect(page.locator('.leaflet-container')).toBeVisible()
    await expect.poll(() => lats.length).toBeGreaterThanOrEqual(1)
    const initialLat = lats[0]

    const map = page.locator('.leaflet-container')
    const box = await map.boundingBox()
    if (!box) throw new Error('map not visible')
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2

    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx, cy - 200, { steps: 10 })
    await page.mouse.up()

    // The pan fires a debounced re-fetch centred on the new latitude.
    await expect.poll(() => lats[lats.length - 1], { timeout: 5000 }).not.toBe(initialLat)
  })
})

// Layout tests: only meaningful at the 390px viewport the mobile-390 project provides.
test.describe('390px layout', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('map fills the screen', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-container')).toBeVisible()
    const box = await page.locator('.leaflet-container').boundingBox()
    expect(box?.width).toBe(390)
  })

  test('preview card fits within 390px viewport', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().dispatchEvent('click')
    await expect(page.locator('.preview-card')).toBeInViewport()
  })
})
