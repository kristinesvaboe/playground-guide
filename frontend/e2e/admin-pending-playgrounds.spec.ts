import { test, expect } from '@playwright/test'

const PENDING_ID = '12121212-3434-5656-7878-909090909090'

const MOCK_PENDING = {
  id: PENDING_ID,
  name: 'New Leikeplass',
  latitude: 58.97,
  longitude: 5.7331,
  submittedByUserId: 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d',
  submitterName: 'Kristine',
  equipment: ['Swing', 'Slide'],
  ageSuitability: ['Toddlers'],
  size: 'Medium',
  otherEquipment: null,
  transportInfo: 'Bus 11 from city centre',
  notes: null,
  createdAt: '2026-06-18T12:00:00Z',
}

// Mock the sibling admin endpoints empty so the pending section's .submission-card
// cards aren't matched alongside enrichment/hidden/flagged cards.
test.beforeEach(async ({ page }) => {
  await page.route('**/admin/enrichments', (route) => route.fulfill({ json: [] }))
  await page.route('**/admin/hidden-playgrounds', (route) => route.fulfill({ json: [] }))
  await page.route('**/admin/flagged-playgrounds', (route) => route.fulfill({ json: [] }))
})

test.describe('admin pending playgrounds (chromium)', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'interaction tests run on chromium only')
  })

  test('shows the pending card with the user submitted badge', async ({ page }) => {
    await page.route('**/admin/pending-playgrounds', (route) =>
      route.fulfill({ json: [MOCK_PENDING] })
    )
    await page.goto('/admin/review')
    await expect(page.getByText('New Leikeplass')).toBeVisible()
    await expect(page.getByText('User submitted')).toBeVisible()
    await expect(page.getByText('Kristine')).toBeVisible()
    await expect(page.getByText('Swing')).toBeVisible()
  })

  test('approve removes the pending card', async ({ page }) => {
    await page.route('**/admin/pending-playgrounds', (route) =>
      route.fulfill({ json: [MOCK_PENDING] })
    )
    // Register the more specific approve route before the catch-all DELETE route below.
    await page.route(`**/admin/playgrounds/${PENDING_ID}/approve`, (route) =>
      route.fulfill({ json: { status: 'approved' } })
    )
    await page.goto('/admin/review')
    await expect(page.getByText('New Leikeplass')).toBeVisible()
    await page.getByRole('button', { name: 'Approve' }).click()
    await expect(page.getByText('New Leikeplass')).not.toBeVisible()
    await expect(page.getByText('No playgrounds awaiting approval.')).toBeVisible()
  })

  test('reject confirms then removes the pending card', async ({ page }) => {
    await page.route('**/admin/pending-playgrounds', (route) =>
      route.fulfill({ json: [MOCK_PENDING] })
    )
    await page.route(`**/admin/playgrounds/${PENDING_ID}`, (route) => {
      if (route.request().method() === 'DELETE')
        route.fulfill({ status: 204, body: '' })
    })
    page.once('dialog', (d) => d.accept())
    await page.goto('/admin/review')
    await expect(page.getByText('New Leikeplass')).toBeVisible()
    await page.getByRole('button', { name: 'Reject' }).click()
    await expect(page.getByText('New Leikeplass')).not.toBeVisible()
    await expect(page.getByText('No playgrounds awaiting approval.')).toBeVisible()
  })

  test('empty state shown when nothing is pending', async ({ page }) => {
    await page.route('**/admin/pending-playgrounds', (route) => route.fulfill({ json: [] }))
    await page.goto('/admin/review')
    await expect(page.getByText('No playgrounds awaiting approval.')).toBeVisible()
  })
})

test.describe('admin pending section 390px layout', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('the pending card fits within the 390px viewport', async ({ page }) => {
    await page.route('**/admin/pending-playgrounds', (route) =>
      route.fulfill({ json: [MOCK_PENDING] })
    )
    await page.goto('/admin/review')
    await expect(page.getByText('New Leikeplass')).toBeInViewport()
  })
})
