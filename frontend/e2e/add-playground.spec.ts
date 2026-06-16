import { test, expect } from '@playwright/test'
import { useTestUser } from './test-user'

// These tests require the full local stack: Docker (Postgres/PostGIS) + backend on
// :5100 + frontend dev server on :5173. They exercise the real add-a-playground flow,
// creating a user_submitted playground + unreviewed enrichment as the dedicated test
// user (cleaned up in global-teardown).

test.use({
  geolocation: { latitude: 58.97, longitude: 5.7331 },
  permissions: ['geolocation'],
})

test.beforeEach(async ({ page }) => {
  await useTestUser(page)
})

test.describe('add a playground (chromium)', () => {
  // Serial: each test writes a new user_submitted playground to the same DB.
  test.describe.configure({ mode: 'serial' })

  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'interaction tested on chromium')
  })

  test('clicking Add playground shows the placement banner', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-container')).toBeVisible()
    await page.locator('.add-playground-btn').click()
    await expect(page.locator('.add-pin-banner')).toBeVisible()
  })

  test('tapping the map places a pin and opens the form', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-container')).toBeVisible()
    await page.locator('.add-playground-btn').click()
    await expect(page.locator('.add-pin-banner')).toBeVisible()
    await page.locator('.leaflet-container').click({ position: { x: 200, y: 250 } })
    await expect(page.locator('.add-pin-banner')).not.toBeVisible()
    await expect(page.locator('.enrichment-form')).toBeVisible()
  })

  test('submitting closes the form and a pending pin appears on the map', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-container')).toBeVisible()
    await page.locator('.add-playground-btn').click()
    await page.locator('.leaflet-container').click({ position: { x: 200, y: 250 } })
    await expect(page.locator('.enrichment-form')).toBeVisible()

    await page.locator('#newName').fill('E2E added playground')
    await page.getByRole('button', { name: 'Swing' }).click()
    await page.locator('.btn-primary').click()

    await expect(page.locator('.enrichment-form')).not.toBeVisible()
    await expect(page.locator('.pending-pin').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('add a playground 390px layout', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('the add button and placement banner fit within the 390px viewport', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-container')).toBeVisible()
    await expect(page.locator('.add-playground-btn')).toBeInViewport()
    await page.locator('.add-playground-btn').click()
    await expect(page.locator('.add-pin-banner')).toBeInViewport()
  })
})
