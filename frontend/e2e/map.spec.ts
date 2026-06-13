import { test, expect } from '@playwright/test'

test.use({
  geolocation: { latitude: 58.97, longitude: 5.7331 },
  permissions: ['geolocation'],
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

  test('the details button is visible and enabled', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().click()
    await expect(page.locator('.preview-card')).toBeVisible()
    await expect(page.locator('.details-btn')).toBeVisible()
    await expect(page.locator('.details-btn')).toBeEnabled()
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
