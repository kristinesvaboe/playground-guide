import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { TEST_USER_ID } from './test-user'

// The write tests persist playground_enrichments and user_favourites rows for the
// dedicated E2E user. Without cleanup they survive the run, so repeat runs become
// order-dependent (the form opens in "Edit" mode, or a heart is already filled).
// Delete only the TEST user's rows — never the real seed user's hand-entered data.

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
        `DELETE FROM playground_enrichments WHERE "UserId" = '${TEST_USER_ID}'; DELETE FROM user_favourites WHERE "UserId" = '${TEST_USER_ID}';`,
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
