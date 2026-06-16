import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { TEST_USER_ID } from './test-user'

// The write tests persist playground_enrichments, user_favourites, user_saved,
// playground_flags, and user_hidden_playgrounds rows for the dedicated E2E user. Without cleanup they survive the
// run, so repeat runs become order-dependent (the form opens in "Edit" mode, or a
// heart/bookmark is already filled). The flag test also flips a real playground's
// IsHidden to true — left uncleaned, every run permanently hides another playground.
// So before deleting flags, restore any playground this user hid. Delete only the
// TEST user's rows — never the real seed user's hand-entered data.

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
        `UPDATE playgrounds SET "IsHidden" = false WHERE "Id" IN (SELECT "PlaygroundId" FROM playground_flags WHERE "UserId" = '${TEST_USER_ID}'); DELETE FROM playground_flags WHERE "UserId" = '${TEST_USER_ID}'; WITH mine AS (SELECT "Id" FROM playgrounds WHERE "Source" = 1 AND "Id" IN (SELECT "PlaygroundId" FROM playground_enrichments WHERE "UserId" = '${TEST_USER_ID}')), de AS (DELETE FROM playground_enrichments WHERE "PlaygroundId" IN (SELECT "Id" FROM mine)) DELETE FROM playgrounds WHERE "Id" IN (SELECT "Id" FROM mine); DELETE FROM playground_enrichments WHERE "UserId" = '${TEST_USER_ID}'; DELETE FROM user_favourites WHERE "UserId" = '${TEST_USER_ID}'; DELETE FROM user_saved WHERE "UserId" = '${TEST_USER_ID}'; DELETE FROM user_hidden_playgrounds WHERE "UserId" = '${TEST_USER_ID}';`,
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
