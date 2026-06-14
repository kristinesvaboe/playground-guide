import { test, expect } from '@playwright/test'

// These tests require the full local stack: Docker (Postgres/PostGIS) +
// backend on :5100 + frontend dev server on :5173. They exercise the real
// add/edit enrichment flow against a fresh playground with no enrichment.

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

test.describe('enrichment form (chromium)', () => {
  // Serial mode: tests write to the same DB row; running in parallel causes 409 conflicts.
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'interaction tested on chromium')
  })

  test('preview card offers an Add/Edit details button', async ({ page }) => {
    await openPreview(page)
    await expect(page.locator('.details-btn')).toHaveText(/Add details|Edit details/)
  })

  test('tapping the details button opens the form', async ({ page }) => {
    await openPreview(page)
    await page.locator('.details-btn').click()
    await expect(page.locator('.enrichment-form')).toBeVisible()
    await expect(page.locator('#transport')).toBeVisible()
  })

  test('Save with all fields empty does not submit and surfaces the at-least-one-detail hint', async ({ page }) => {
    await openPreview(page)
    await page.locator('.details-btn').click()
    await expect(page.locator('.enrichment-form')).toBeVisible()
    await page.locator('.btn-primary').click()
    // Form stays open and shows the inline at-least-one-detail feedback
    await expect(page.locator('.enrichment-form')).toBeVisible()
    await expect(page.locator('.field-error')).toContainText('Please add at least one detail before saving.')
  })

  test('selecting age suitability saves and shows in pending badge section', async ({ page }) => {
    await openPreview(page)
    await page.locator('.details-btn').click()
    await expect(page.locator('.enrichment-form')).toBeVisible()
    // Click both chips: if either was pre-selected (leftover DB state), toggling it off still
    // leaves the other newly selected, so the at-least-one-detail guard always passes.
    await page.getByRole('button', { name: 'Toddlers' }).click()
    await page.getByRole('button', { name: 'Swing' }).click()
    await page.locator('.btn-primary').click()
    await expect(page.locator('.pending-badge')).toBeVisible({ timeout: 5000 })
  })

  test('saving equipment only (transport left blank) shows the pending badge', async ({ page }) => {
    await openPreview(page)
    await page.locator('.details-btn').click()
    // Click two chips so if one was pre-selected (from the age-suitability test above),
    // toggling it off still leaves the other newly selected.
    await page.getByRole('button', { name: 'Swing' }).click()
    await page.getByRole('button', { name: 'Slide' }).click()
    await page.locator('.btn-primary').click()
    // Transport is optional: equipment alone is enough to save
    await expect(page.locator('.enrichment-form')).not.toBeVisible()
    await expect(page.locator('.pending-badge')).toBeVisible()
  })

  test('a failed save shows an inline error and keeps the form open', async ({ page }) => {
    // Mock the save so this test never writes to the DB.
    await page.route('**/enrichment', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
    )
    await openPreview(page)
    await page.locator('.details-btn').click()
    await page.locator('#transport').fill('Free car park next to the entrance')
    await page.locator('.btn-primary').click()
    await expect(page.locator('.save-error')).toBeVisible()
    await expect(page.locator('.enrichment-form')).toBeVisible()
  })
})

test.describe('enrichment form 390px layout', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('form and footer fit within the 390px viewport', async ({ page }) => {
    await openPreview(page)
    await page.locator('.details-btn').dispatchEvent('click')
    await expect(page.locator('.enrichment-form')).toBeInViewport()
    await expect(page.locator('.enrichment-form-footer')).toBeInViewport()
  })
})
