# Playground Guide 🛝

Find and plan playground visits near you.

---

> **A note on progress:** This project was started during maternity leave, just days before my baby was due to arrive. If commits suddenly stop — that's why! I'll be back when the newborn haze lifts. 🍼

---

## What is this?

A mobile-first app for discovering playgrounds near you and planning visits — whether you're looking for something new in your neighbourhood or scouting ahead for a trip.

Key features (planned):

- **Map view** — see playgrounds near your current location
- **Equipment tags** — filter by swings, trampolines, and other equipment
- **Trip planning** — find playgrounds near a destination you're travelling to
- **Parking & practical info** — know before you go

Data sourced from [OpenStreetMap](https://www.openstreetmap.org/), enriched by users.

## Tech stack

- **Frontend:** React (PWA, mobile-first)
- **Backend:** .NET
- **Database:** PostgreSQL with PostGIS
- **Maps:** OpenStreetMap / Overpass API

## Development approach

This project is as much a learning exercise as it is a real app. It's built using an agentic development workflow with Claude Code — an orchestrator agent manages specialised subagents for implementation, QA, code review, UX, and security. Every ticket goes through a human-in-the-loop review gate before merging: the agents do the work, the human decides what ships.

The goal is to learn modern agentic development patterns — orchestration, subagent design, and effective human oversight — while building something genuinely useful.

## Running locally

**Prerequisites:** Docker, .NET 10 SDK, Node 18+

```bash
# Start PostgreSQL with PostGIS
docker compose up -d

# Backend (runs on http://localhost:5100, applies migrations on startup)
cd backend
dotnet run

# Frontend (runs on http://localhost:5173)
cd frontend
npm install
npm run dev
```

Backend config (connection string, admin key) goes in `backend/appsettings.Development.json` — this file is gitignored and must be created locally:

```json
{
  "ConnectionStrings": { "Default": "Host=localhost;Port=5432;Database=playgroundguide;Username=postgres;Password=postgres" },
  "AdminKey": "your-local-key"
}
```

## Running E2E tests

With the full stack running (Docker + backend + frontend dev server):

```bash
cd frontend
npm run test:e2e
```

The suite runs as a dedicated E2E user (created on setup, cleaned up on teardown), so it never reads or deletes the data you add manually through the app.

## Admin review

Pending enrichment submissions are reviewed at `http://localhost:5173/admin/review`.

The admin page reads the admin key from `VITE_ADMIN_KEY` in `frontend/.env.local` (gitignored). Create this file with:

```
VITE_ADMIN_KEY=your-admin-key
```

The key must match `AdminKey` in `backend/appsettings.Development.json`. Use a strong random value (UUID or 32+ char random string).

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `{ "status": "ok" }` |
| `GET` | `/playgrounds?lat=&lng=&radius=&userId=` | Returns playgrounds within `radius` metres of the given coordinates. `lat`, `lng`, and `radius` are required. If `userId` is supplied, playgrounds that user has hidden from their own view are also excluded. Playgrounds hidden for everyone (3+ flags) are always excluded; flagged-but-still-visible ones are included with their `flagCount` so the frontend can render the flagged pin state. A user-submitted playground is public only once `Approved = true`; until then it is returned only to its submitter. OSM playgrounds are approved on import, so always returned. Enrichment data is gated separately by `enrichment.Reviewed`. Response: `[{ id, name, latitude, longitude, flagCount, isHidden, pending }]`, where `pending` is `true` for a user-submitted playground that is not yet approved. |
| `GET` | `/playgrounds/{id}?userId=` | Returns a single playground (including `latitude`, `longitude`) with reviewed enrichment data. `equipment`, `ageSuitability`, `size`, `otherEquipment`, `transportInfo`, and `notes` are `null` if no reviewed enrichment exists yet. If `userId` is supplied and matches a known user with an enrichment for this playground, also returns `myEnrichment` (the caller's own data, reviewed or not); otherwise `myEnrichment` is `null`. A user-submitted playground is public once `Approved = true`; while unapproved it returns 404 unless the caller is its submitter (so others' pending submissions stay private). Enrichment data shown is gated separately by `enrichment.Reviewed`. |
| `POST` | `/playgrounds` | Submits a playground missing from OSM. Body: `{ userId, latitude, longitude, name, equipment, ageSuitability, size, otherEquipment, transportInfo, notes }`. All detail fields (and `name`) are optional — a location-only submission is valid. Creates a `user_submitted` playground with `Approved = false` plus an unreviewed enrichment recording the submitter; the playground is only visible to that submitter (with a `pending` indicator) until an admin approves it. Server-validates `latitude` (−90..90), `longitude` (−180..180), `name` (≤120 chars), enum values, `otherEquipment`/`transportInfo` (≤200 chars), and `notes` (≤300 chars). Returns 201 with `{ id, latitude, longitude, name, pending }`; 400 if the userId is unknown or any field is invalid. |
| `POST` | `/playgrounds/{id}/enrichment` | Creates the calling user's enrichment for a playground. Body: `{ userId, equipment, ageSuitability, size, otherEquipment, transportInfo, notes }`. All detail fields are optional, but at least one must be provided (400 otherwise). Server-validates enum values, `transportInfo` (≤200 chars), `notes` (≤300 chars), and `otherEquipment` (≤200 chars). Saved as unreviewed. 409 if the user already has one (use PUT). |
| `PUT` | `/playgrounds/{id}/enrichment` | Updates the calling user's existing enrichment (same body/validation as POST). Any edit resets it to unreviewed so it isn't shown publicly until re-approved. 404 if none exists yet. |
| `GET` | `/admin/enrichments` | Lists all unreviewed enrichment submissions. Protected by `X-Admin-Key` header. Response: array of `{ id, playgroundId, playgroundName, equipment, ageSuitability, size, otherEquipment, transportInfo, notes, createdAt }`. |
| `POST` | `/admin/enrichments/{id}/approve` | Sets `reviewed = true` on the enrichment. Protected by `X-Admin-Key`. Returns 404 if not found. |
| `DELETE` | `/admin/enrichments/{id}` | Permanently deletes the enrichment. Protected by `X-Admin-Key`. Returns 404 if not found. |
| `POST` | `/playgrounds/{id}/favourite` | Marks the playground as a favourite for the calling user. Body: `{ userId }`. Idempotent (no duplicate if already favourited). Returns 204. 404 if the playground is unknown, 400 if the userId is unknown. |
| `DELETE` | `/playgrounds/{id}/favourite?userId=` | Removes the favourite for the calling user. Idempotent (204 even if it wasn't favourited). |
| `GET` | `/favourites?userId=` | Returns the user's favourited playgrounds, newest first. Response: `[{ id, name, latitude, longitude }]`. Distance from the user is computed client-side; no user location is stored. |
| `POST` | `/playgrounds/{id}/saved` | Saves the playground for later for the calling user. Body: `{ userId }`. Idempotent (no duplicate if already saved). Returns 204. 404 if the playground is unknown, 400 if the userId is unknown. |
| `DELETE` | `/playgrounds/{id}/saved?userId=` | Removes the saved entry for the calling user. Idempotent (204 even if it wasn't saved). |
| `GET` | `/saved?userId=` | Returns the user's saved playgrounds, newest first. Response: `[{ id, name, latitude, longitude }]`. Distance from the user is computed client-side; no user location is stored. |
| `POST` | `/playgrounds/{id}/hide` | Hides a playground from the calling user's own map view only (other users still see it). Body: `{ userId }`. Idempotent (no duplicate if already hidden). Returns 204. 404 if the playground is unknown, 400 if the userId is unknown. |
| `POST` | `/playgrounds/{id}/flag` | Flags a playground as no longer existing. Body: `{ userId, flagType, reason, reasonNote }` (`flagType` currently only `NoLongerExists`; `reason` one of `PermanentlyClosed`, `TemporarilyClosed`, `NoLongerMaintained`, `Other`; `reasonNote` optional free-text ≤200 chars, only kept when `reason` is `Other`). Flags accumulate one per user; the playground is hidden from `GET /playgrounds` for everyone only once it reaches **3** flags. Below that it stays visible in a flagged state. Returns 200 with `{ flagCount, isHidden }`. 404 if the playground is unknown, 400 if the userId, flagType or reason is invalid, 409 if this user already flagged it. |
| `POST` | `/admin/playgrounds/{id}/restore` | Un-hides a playground and removes its flag rows. Protected by `X-Admin-Key`. Returns 404 if not found. |
| `POST` | `/admin/playgrounds/{id}/force-hide` | Hides a playground for everyone immediately, bypassing the 3-flag threshold (for playgrounds the admin knows are gone). Protected by `X-Admin-Key`. Returns `{ status: "hidden" }`, or 404 if not found. |
| `GET` | `/admin/hidden-playgrounds` | Lists currently hidden playgrounds with their flag metadata, newest flag first. Protected by `X-Admin-Key`. Response: array of `{ id, name, latitude, longitude, userId, userName, reason, reasonNote, createdAt }`. |
| `GET` | `/admin/flagged-playgrounds` | Lists playgrounds that have one or more flags but are not yet hidden (below the 3-flag threshold), most-flagged first. Protected by `X-Admin-Key`. Response: array of `{ id, name, latitude, longitude, flagCount, latestFlaggedAt }`. |
| `GET` | `/admin/pending-playgrounds` | Lists user-submitted playgrounds awaiting approval (`Approved = false`), newest first. Protected by `X-Admin-Key`. Each row carries enough to decide: `{ id, name, latitude, longitude, submittedByUserId, submitterName, equipment, ageSuitability, size, otherEquipment, transportInfo, notes, createdAt }`. Detail fields come from the submitter's own enrichment row and may be empty for a location-only submission. |
| `POST` | `/admin/playgrounds/{id}/approve` | Approves a user-submitted playground (sets `Approved = true`), making it publicly visible. Protected by `X-Admin-Key`. Returns `{ status: "approved" }`, or 404 if not found. |
| `DELETE` | `/admin/playgrounds/{id}` | Rejects a user-submitted playground by hard-deleting it and all dependent rows (enrichments, favourites, saved, flags, hidden entries). Protected by `X-Admin-Key`. 400 if the playground is not user-submitted (OSM rows cannot be deleted this way), 404 if not found, 204 on success. |

## Status

- Map view shows playgrounds near your current location using OpenStreetMap data
- Tapping a pin shows a preview card with the playground name and equipment tags
- "View details" on the preview card opens a full detail page (`/playground/:id`) showing equipment, age suitability, size, other equipment, transport info, notes, and a small static map of the location; "Back to map" returns to the map re-centred on that playground
- Equipment data comes from reviewed enrichments; unreviewed data is never shown
- Users can add or edit playground details (age suitability, equipment, other equipment, size, transport info, notes — all optional, but at least one is required) via a mobile-first bottom-sheet form; submissions are held for review and only visible to their author until approved
- Users can add a playground missing from OSM by tapping "Add playground", placing a pin on the map, and filling an optional form (name plus the same detail fields); the new playground shows only to them with a pending indicator until an admin approves it
- Admin review page at `/admin/review` lets the app owner approve or reject pending enrichment submissions, restore hidden playgrounds, and force-hide flagged-but-not-yet-hidden playgrounds (bypassing the 3-flag threshold)
- The admin review page also lists user-submitted playgrounds awaiting approval (name, location, submitter, submitted details, and a map link) and can approve (publish the playground to everyone) or reject (permanently delete it). This "does this playground exist?" approval is separate from enrichment data review, which is still gated independently by `enrichment.Reviewed`
- Users can tap "Hide from my map" on a playground's detail page to hide it from their own map only (no confirmation; other users still see it). It stays hidden across reloads
- Users can flag a playground as "no longer exists" from the preview card; the first flagger picks a reason (permanently closed, temporarily closed, no longer maintained, or other — with an optional note for "other"). A flagged playground stays on the map with a distinct warning pin, and its preview card asks other users "this has been reported as no longer existing — is this correct?" with a one-tap confirm that adds their flag. Once 3 separate users have flagged it, the playground is hidden from the map for everyone. The admin review page lists flagged-but-visible playgrounds (with flag count) and offers a "Force hide" button to hide them immediately, and lists fully hidden playgrounds (with who flagged them, their reason and note, and when) which it can restore
- Users can favourite a playground from the preview card; favourited playgrounds show a heart on their map pin and appear in a Favourites list (opened from a button on the map) showing each playground's name and distance from the current location. Tapping a row centres the map on that playground and opens its preview card; each row also has a remove button to unfavourite it directly from the list.
- Users can save a playground for later (distinct from favourites — "I want to go here") from the preview card; saved playgrounds show a bookmark on their map pin and appear in a Saved list (opened from a button on the map) showing each playground's name and distance from the current location. A playground that is both saved and favourited shows the heart on its pin. Tapping a row centres the map on that playground and opens its preview card; each row also has a remove button to unsave it directly from the list.
