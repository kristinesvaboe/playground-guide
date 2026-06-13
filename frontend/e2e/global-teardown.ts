import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// The "successful save" test persists a real playground_enrichments row for the
// seed user. Without cleanup that row survives the run, so repeat runs become
// order-dependent (the form opens in "Edit" mode and the pending badge may
// already exist). Delete the seed user's enrichments after the suite so the
// dev DB returns to a clean state.

const SEED_USER_ID = 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d'

export default function globalTeardown() {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
  try {
    execFileSync(
      'docker',
      [
        'compose',
        'exec',
        '-T',
        'db',
        'psql',
        '-U',
        'postgres',
        '-d',
        'playgroundguide',
        '-c',
        `DELETE FROM playground_enrichments WHERE "UserId" = '${SEED_USER_ID}';`,
      ],
      { cwd: repoRoot, stdio: 'pipe' }
    )
  } catch (err) {
    console.warn(
      `[global-teardown] Could not clean up seed enrichments: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
  }
}
