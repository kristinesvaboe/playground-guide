import { test, expect } from '@playwright/test'

// Requires the full local stack: Docker (Postgres/PostGIS) + backend on :5100 +
// frontend dev server on :5173. Exercises navigation from the map preview card
// to the playground detail page and back.

test.use({
  geolocation: { latitude: 58.97, longitude: 5.7331 },
  permissions: ['geolocation'],
})

async function openPreview(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
  await page.locator('.leaflet-marker-icon').first().dispatchEvent('click')
  await expect(page.locator('.preview-card')).toBeVisible()
}

test.describe('playground detail (chromium)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'interaction tested on chromium')
  })

  test('View details navigates to /playground/:id', async ({ page }) => {
    await openPreview(page)
    await page.getByRole('button', { name: 'View details' }).click()
    await expect(page).toHaveURL(/\/playground\/[0-9a-f-]+/)
  })

  test('detail page renders its content', async ({ page }) => {
    await openPreview(page)
    await page.getByRole('button', { name: 'View details' }).click()
    await expect(page.locator('.detail-page')).toBeVisible()
    await expect(page.locator('.detail-body h1')).toBeVisible()
    await expect(page.locator('.detail-map')).toBeVisible()
    await expect(page.getByRole('button', { name: /Add details|Edit details/ })).toBeVisible()
  })

  test('Edit details opens the enrichment form', async ({ page }) => {
    await openPreview(page)
    await page.getByRole('button', { name: 'View details' }).click()
    await page.getByRole('button', { name: /Add details|Edit details/ }).click()
    await expect(page.locator('.enrichment-form')).toBeVisible()
  })

  test('Back returns to the map re-centred on the playground', async ({ page }) => {
    await openPreview(page)
    await page.getByRole('button', { name: 'View details' }).click()
    await expect(page.locator('.detail-page')).toBeVisible()
    await page.getByRole('button', { name: 'Back to map' }).click()
    await expect(page).toHaveURL(/\/\?focus=[0-9a-f-]+/)
    // Re-centre re-opens the preview for the focused playground
    await expect(page.locator('.preview-card')).toBeVisible()
  })
})

test.describe('playground detail 390px layout', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('detail page fits within the 390px viewport', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
    await page.locator('.leaflet-marker-icon').first().dispatchEvent('click')
    await expect(page.locator('.preview-card')).toBeVisible()
    await page.getByRole('button', { name: 'View details' }).dispatchEvent('click')
    await expect(page.locator('.detail-page')).toBeInViewport()
    await expect(page.locator('.detail-map')).toBeInViewport()
  })
})
