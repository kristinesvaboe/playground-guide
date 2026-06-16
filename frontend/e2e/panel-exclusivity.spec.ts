import { test, expect } from '@playwright/test'
import { useTestUser } from './test-user'

// Regression for #55: opening a list panel while the preview card is open must close
// the card so the two don't stack. (The list panels render a full-screen scrim above
// the map, so the reverse directions — tapping a pin or the other toggle while a panel
// is open — are already intercepted by that scrim; this covers the reachable case.)

test.use({
  geolocation: { latitude: 58.97, longitude: 5.7331 },
  permissions: ['geolocation'],
})

test.beforeEach(async ({ page }) => {
  await useTestUser(page)
})

test.describe('one panel at a time (chromium)', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'markers may be outside 390px viewport')
  })

  async function openPreview(page: import('@playwright/test').Page) {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().dispatchEvent('click')
    await expect(page.locator('.preview-card')).toBeVisible()
  }

  test('opening Saved closes an open preview card', async ({ page }) => {
    await openPreview(page)
    await page.locator('.saved-list-toggle-btn').click()
    await expect(page.locator('.saved-panel')).toBeVisible()
    await expect(page.locator('.preview-card')).toHaveCount(0)
  })

  test('opening Favourites closes an open preview card', async ({ page }) => {
    await openPreview(page)
    await page.locator('.favourites-toggle-btn').click()
    await expect(page.locator('.favourites-panel')).toBeVisible()
    await expect(page.locator('.preview-card')).toHaveCount(0)
  })
})
