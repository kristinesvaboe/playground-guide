export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'

// Placeholder identity until authentication exists; matches AppDbContext.SeedUserId
const DEFAULT_USER_ID = 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d'

// E2E tests set a `pg_user_id` override so their writes go in as a dedicated test
// user — that way the test teardown never deletes the real user's enrichments.
function resolveUserId(): string {
  if (typeof window !== 'undefined') {
    const override = window.localStorage.getItem('pg_user_id')
    if (override) return override
  }
  return DEFAULT_USER_ID
}

export const CURRENT_USER_ID = resolveUserId()
