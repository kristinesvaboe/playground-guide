import { test, expect } from '@playwright/test'
import { useTestUser } from './test-user'

// Requires the full local stack: Docker (Postgres/PostGIS) + backend on :5100 +
// frontend dev server on :5173. Exercises navigation from the map preview card
// to the playground detail page and back.

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

// A stable id for the route-mocked tests that load the detail page directly.
const MOCK_ID = '00000000-0000-0000-0000-000000000001'
const DETAIL_URL = /\/playgrounds\/[0-9a-f-]+\?/

// Mock the detail fetch so these tests are independent of DB state.
function mockDetail(page: import('@playwright/test').Page, body: Record<string, unknown>) {
  return page.route(DETAIL_URL, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  )
}

const FULL_DETAIL = {
  id: MOCK_ID,
  name: 'Test Playground',
  latitude: 58.97,
  longitude: 5.7331,
  equipment: ['Swing'],
  ageSuitability: [],
  size: null,
  otherEquipment: null,
  transportInfo: null,
  notes: null,
  myEnrichment: null,
}

test.describe('playground detail (chromium)', () => {
  test.beforeEach((_, testInfo) => {
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

  test('renders styled when opened directly (deep link / refresh)', async ({ page }) => {
    await mockDetail(page, FULL_DETAIL)
    // Navigate straight to the URL — App.tsx (and its App.css) never mounts as a
    // route here, reproducing the deep-link/refresh path that previously rendered
    // unstyled because the detail page didn't import App.css.
    await page.goto(`/playground/${MOCK_ID}`)
    await expect(page.locator('.detail-page')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Test Playground' })).toBeVisible()
    const tag = page.locator('.equipment-tag').first()
    await expect(tag).toBeVisible()
    // .equipment-tag's pill background lives in App.css; a transparent background
    // would mean App.css failed to load on the standalone route.
    const bg = await tag.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(238, 242, 255)')
  })

  test('shows the empty state and name fallback when there is no approved enrichment', async ({ page }) => {
    await mockDetail(page, {
      ...FULL_DETAIL,
      name: null,
      equipment: null,
      ageSuitability: null,
    })
    await page.goto(`/playground/${MOCK_ID}`)
    await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible()
    await expect(page.getByText('No details added yet')).toBeVisible()
  })

  test('shows a not-found message for a missing playground', async ({ page }) => {
    await page.route(DETAIL_URL, (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    )
    await page.goto(`/playground/${MOCK_ID}`)
    await expect(page.getByText('This playground could not be found.')).toBeVisible()
  })

  test('shows a connection message when the detail request fails', async ({ page }) => {
    await page.route(DETAIL_URL, (route) => route.abort())
    await page.goto(`/playground/${MOCK_ID}`)
    await expect(page.getByText("Couldn't load — check your connection.")).toBeVisible()
  })
})

test.describe('playground detail 390px layout', () => {
  test.beforeEach((_, testInfo) => {
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
