import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { TEST_USER_ID, TEST_USER_NAME } from './test-user'

// Create the dedicated E2E user before the suite runs. The enrichment POST/PUT
// endpoints reject unknown userIds, so this user must exist for the write tests.
// Kept here (not in a prod migration) so the test identity never ships to real DBs.

export default function globalSetup() {
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
        `INSERT INTO users ("Id", "Name") VALUES ('${TEST_USER_ID}', '${TEST_USER_NAME}') ON CONFLICT ("Id") DO NOTHING;`,
      ],
      { cwd: repoRoot, stdio: 'pipe' }
    )
  } catch (err) {
    console.warn(
      `[global-setup] Could not create the E2E test user: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
  }
}
