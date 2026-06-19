import { test, expect } from '@playwright/test'

const FLAGGED_ID = '88888888-7777-6666-5555-444444444444'

const MOCK_FLAGGED = {
  id: FLAGGED_ID,
  name: 'Maybe Gone Leikeplass',
  latitude: 58.97,
  longitude: 5.7331,
  flagCount: 2,
  latestFlaggedAt: '2026-06-13T12:00:00Z',
}

// Mock the sibling admin endpoints empty so the flagged section's .submission-card
// cards aren't matched alongside enrichment/hidden cards.
test.beforeEach(async ({ page }) => {
  await page.route('**/admin/enrichments', (route) => route.fulfill({ json: [] }))
  await page.route('**/admin/hidden-playgrounds', (route) => route.fulfill({ json: [] }))
  await page.route('**/admin/pending-playgrounds', (route) => route.fulfill({ json: [] }))
})

test.describe('admin flagged playgrounds (chromium)', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'interaction tests run on chromium only')
  })

  test('shows flagged playground cards with the flag count', async ({ page }) => {
    await page.route('**/admin/flagged-playgrounds', (route) =>
      route.fulfill({ json: [MOCK_FLAGGED] })
    )
    await page.goto('/admin/review')
    await expect(page.getByText('Maybe Gone Leikeplass')).toBeVisible()
    await expect(page.getByText('2 of 3 flags')).toBeVisible()
  })

  test('force hide removes the flagged card', async ({ page }) => {
    await page.route('**/admin/flagged-playgrounds', (route) =>
      route.fulfill({ json: [MOCK_FLAGGED] })
    )
    await page.route(`**/admin/playgrounds/${FLAGGED_ID}/force-hide`, (route) =>
      route.fulfill({ json: { status: 'hidden' } })
    )
    await page.goto('/admin/review')
    await expect(page.getByText('Maybe Gone Leikeplass')).toBeVisible()
    await page.getByRole('button', { name: 'Force hide' }).click()
    await expect(page.getByText('Maybe Gone Leikeplass')).not.toBeVisible()
    await expect(page.getByText('No flagged playgrounds.')).toBeVisible()
  })

  test('force hide failure keeps the card with an error', async ({ page }) => {
    await page.route('**/admin/flagged-playgrounds', (route) =>
      route.fulfill({ json: [MOCK_FLAGGED] })
    )
    await page.route(`**/admin/playgrounds/${FLAGGED_ID}/force-hide`, (route) =>
      route.fulfill({ status: 500, json: { error: 'Server error' } })
    )
    await page.goto('/admin/review')
    await page.getByRole('button', { name: 'Force hide' }).click()
    await expect(page.getByText('Maybe Gone Leikeplass')).toBeVisible()
    await expect(page.locator('.card-error')).toBeVisible()
  })

  test('empty state shown when nothing is flagged', async ({ page }) => {
    await page.route('**/admin/flagged-playgrounds', (route) => route.fulfill({ json: [] }))
    await page.goto('/admin/review')
    await expect(page.getByText('No flagged playgrounds.')).toBeVisible()
  })
})

test.describe('admin flagged section 390px layout', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('the flagged card fits within the 390px viewport', async ({ page }) => {
    await page.route('**/admin/flagged-playgrounds', (route) =>
      route.fulfill({ json: [MOCK_FLAGGED] })
    )
    await page.goto('/admin/review')
    await expect(page.getByText('Maybe Gone Leikeplass')).toBeInViewport()
  })
})
