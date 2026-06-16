import { test, expect } from '@playwright/test'
import { useTestUser } from './test-user'

// These tests require the full local stack: Docker (Postgres/PostGIS) +
// backend on :5100 + frontend dev server on :5173. They exercise the real
// add/edit enrichment flow against a fresh playground with no enrichment.

test.use({
  geolocation: { latitude: 58.97, longitude: 5.7331 },
  permissions: ['geolocation'],
})

test.beforeEach(async ({ page }) => {
  await useTestUser(page)
})

async function openPreview(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 10000 })
  await page.locator('.leaflet-marker-icon').first().dispatchEvent('click')
  await expect(page.locator('.preview-card')).toBeVisible()
}

// The Add/Edit details button lives on the detail page: open the preview, go to
// details, then open the enrichment form from there.
async function openForm(page: import('@playwright/test').Page) {
  await openPreview(page)
  await page.getByRole('button', { name: 'View details' }).dispatchEvent('click')
  await expect(page.locator('.detail-page')).toBeVisible()
  await page.locator('.detail-edit-btn').dispatchEvent('click')
  await expect(page.locator('.enrichment-form')).toBeVisible()
}

test.describe('enrichment form (chromium)', () => {
  // Serial mode: tests write to the same DB row; running in parallel causes 409 conflicts.
  test.describe.configure({ mode: 'serial' })

  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'interaction tested on chromium')
  })

  test('the Add/Edit details button lives on the detail page, not the preview card', async ({ page }) => {
    await openPreview(page)
    await expect(page.locator('.preview-card .details-btn')).toHaveCount(0)
    await page.getByRole('button', { name: 'View details' }).dispatchEvent('click')
    await expect(page.locator('.detail-edit-btn')).toHaveText(/Add details|Edit details/)
  })

  test('tapping the details button opens the form', async ({ page }) => {
    await openForm(page)
    await expect(page.locator('#transport')).toBeVisible()
  })

  test('Save with all fields empty does not submit and surfaces the at-least-one-detail hint', async ({ page }) => {
    await openForm(page)
    await page.locator('.btn-primary').click()
    // Form stays open and shows the inline at-least-one-detail feedback
    await expect(page.locator('.enrichment-form')).toBeVisible()
    await expect(page.locator('.field-error')).toContainText('Please add at least one detail before saving.')
  })

  test('selecting age suitability saves and shows in pending badge section', async ({ page }) => {
    await openForm(page)
    // Click both chips: if either was pre-selected (leftover DB state), toggling it off still
    // leaves the other newly selected, so the at-least-one-detail guard always passes.
    await page.getByRole('button', { name: 'Toddlers' }).click()
    await page.getByRole('button', { name: 'Swing' }).click()
    await page.locator('.btn-primary').click()
    await expect(page.locator('.pending-badge')).toBeVisible({ timeout: 5000 })
  })

  test('saving equipment only (transport left blank) shows the pending badge', async ({ page }) => {
    await openForm(page)
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
    await openForm(page)
    await page.locator('#transport').fill('Free car park next to the entrance')
    await page.locator('.btn-primary').click()
    await expect(page.locator('.save-error')).toBeVisible()
    await expect(page.locator('.enrichment-form')).toBeVisible()
  })
})

test.describe('enrichment form 390px layout', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('form and footer fit within the 390px viewport', async ({ page }) => {
    await openForm(page)
    await expect(page.locator('.enrichment-form')).toBeInViewport()
    await expect(page.locator('.enrichment-form-footer')).toBeInViewport()
  })
})
