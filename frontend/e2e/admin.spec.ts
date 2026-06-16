import { test, expect } from '@playwright/test'

const MOCK_SUBMISSION = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  playgroundId: '11111111-2222-3333-4444-555555555555',
  playgroundName: 'Stavanger Leikeplass',
  equipment: ['Swing', 'Slide'],
  ageSuitability: ['Toddlers'],
  size: 'Medium',
  otherEquipment: null,
  transportInfo: 'Bus 11 from city centre',
  notes: null,
  createdAt: '2026-06-10T12:00:00Z',
}

// The admin page also loads the hidden-playgrounds section (#23), whose cards reuse
// the .submission-card class. Mock that endpoint empty so these tests aren't disturbed
// by global hides flag.spec may create concurrently (which would make .submission-card
// match more than one element).
test.beforeEach(async ({ page }) => {
  await page.route('**/admin/hidden-playgrounds', (route) => route.fulfill({ json: [] }))
  await page.route('**/admin/flagged-playgrounds', (route) => route.fulfill({ json: [] }))
})

test.describe('admin review page', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-390', 'interaction tests run on chromium only')
  })

  test('shows submission cards after loading', async ({ page }) => {
    await page.route('**/admin/enrichments', (route) =>
      route.fulfill({ json: [MOCK_SUBMISSION] })
    )
    await page.goto('/admin/review')
    await expect(page.locator('.submission-card')).toBeVisible()
    await expect(page.getByText('Stavanger Leikeplass')).toBeVisible()
    await expect(page.getByText('Swing')).toBeVisible()
    await expect(page.getByText('Slide')).toBeVisible()
  })

  test('approve removes the card and shows empty state', async ({ page }) => {
    await page.route('**/admin/enrichments', (route) =>
      route.fulfill({ json: [MOCK_SUBMISSION] })
    )
    await page.route('**/admin/enrichments/*/approve', (route) =>
      route.fulfill({ json: { status: 'approved' } })
    )
    await page.goto('/admin/review')
    await expect(page.locator('.submission-card')).toBeVisible()
    await page.locator('.btn-approve').click()
    await expect(page.locator('.submission-card')).not.toBeVisible()
    await expect(page.getByText('No pending submissions.')).toBeVisible()
  })

  test('reject prompts for confirmation then removes the card', async ({ page }) => {
    await page.route('**/admin/enrichments', (route) =>
      route.fulfill({ json: [MOCK_SUBMISSION] })
    )
    await page.route('**/admin/enrichments/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', (route) => {
      if (route.request().method() === 'DELETE')
        route.fulfill({ json: { status: 'deleted' } })
    })
    page.on('dialog', (d) => d.accept())
    await page.goto('/admin/review')
    await expect(page.locator('.submission-card')).toBeVisible()
    await page.locator('.btn-reject').click()
    await expect(page.locator('.submission-card')).not.toBeVisible()
    await expect(page.getByText('No pending submissions.')).toBeVisible()
  })

  test('approve failure restores the card with an error', async ({ page }) => {
    await page.route('**/admin/enrichments', (route) =>
      route.fulfill({ json: [MOCK_SUBMISSION] })
    )
    await page.route('**/admin/enrichments/*/approve', (route) =>
      route.fulfill({ status: 500, json: { error: 'Server error' } })
    )
    await page.goto('/admin/review')
    await expect(page.locator('.submission-card')).toBeVisible()
    await page.locator('.btn-approve').click()
    await expect(page.locator('.submission-card')).toBeVisible()
    await expect(page.locator('.card-error')).toBeVisible()
  })

  test('empty state shown when no submissions pending', async ({ page }) => {
    await page.route('**/admin/enrichments', (route) =>
      route.fulfill({ json: [] })
    )
    await page.goto('/admin/review')
    await expect(page.getByText('No pending submissions.')).toBeVisible()
  })

  test('hidden playground card shows the flag reason and note', async ({ page }) => {
    await page.route('**/admin/enrichments', (route) => route.fulfill({ json: [] }))
    // Override the empty hidden mock from the outer beforeEach
    await page.route('**/admin/hidden-playgrounds', (route) =>
      route.fulfill({
        json: [
          {
            id: '99999999-8888-7777-6666-555555555555',
            name: 'Gone Leikeplass',
            latitude: 58.97,
            longitude: 5.7331,
            userId: 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d',
            userName: 'Kristine',
            reason: 'Other',
            reasonNote: 'Replaced by a car park',
            createdAt: '2026-06-12T12:00:00Z',
          },
        ],
      })
    )
    await page.goto('/admin/review')
    await expect(page.getByText('Gone Leikeplass')).toBeVisible()
    await expect(page.getByText('Other')).toBeVisible()
    await expect(page.getByText('Replaced by a car park')).toBeVisible()
  })
})

test.describe('admin page 390px layout', () => {
  test.beforeEach((_, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-390', 'layout tested at 390px only')
  })

  test('admin page and submission card fit within 390px viewport', async ({ page }) => {
    await page.route('**/admin/enrichments', (route) =>
      route.fulfill({ json: [MOCK_SUBMISSION] })
    )
    await page.goto('/admin/review')
    await expect(page.locator('.submission-card')).toBeInViewport()
  })
})
