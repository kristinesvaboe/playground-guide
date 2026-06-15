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
| `GET` | `/playgrounds?lat=&lng=&radius=` | Returns playgrounds within `radius` metres of the given coordinates. All three params required. Response: `[{ id, name, latitude, longitude }]`. |
| `GET` | `/playgrounds/{id}?userId=` | Returns a single playground (including `latitude`, `longitude`) with reviewed enrichment data. `equipment`, `ageSuitability`, `size`, `otherEquipment`, `transportInfo`, and `notes` are `null` if no reviewed enrichment exists yet. If `userId` is supplied and matches a known user with an enrichment for this playground, also returns `myEnrichment` (the caller's own data, reviewed or not); otherwise `myEnrichment` is `null`. |
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
| `POST` | `/playgrounds/{id}/flag` | Flags a playground as no longer existing, which hides it from `GET /playgrounds` for everyone. Body: `{ userId, flagType }` (`flagType` currently only `NoLongerExists`). One flag is enough to hide. Returns 204. 404 if the playground is unknown, 400 if the userId or flagType is invalid, 409 if this user already flagged it. |
| `POST` | `/admin/playgrounds/{id}/restore` | Un-hides a playground and removes its flag rows. Protected by `X-Admin-Key`. Returns 404 if not found. |
| `GET` | `/admin/hidden-playgrounds` | Lists currently hidden playgrounds with their flag metadata, newest flag first. Protected by `X-Admin-Key`. Response: array of `{ id, name, latitude, longitude, userId, userName, createdAt }`. |

## Status

- Map view shows playgrounds near your current location using OpenStreetMap data
- Tapping a pin shows a preview card with the playground name and equipment tags
- "View details" on the preview card opens a full detail page (`/playground/:id`) showing equipment, age suitability, size, other equipment, transport info, notes, and a small static map of the location; "Back to map" returns to the map re-centred on that playground
- Equipment data comes from reviewed enrichments; unreviewed data is never shown
- Users can add or edit playground details (age suitability, equipment, other equipment, size, transport info, notes — all optional, but at least one is required) via a mobile-first bottom-sheet form; submissions are held for review and only visible to their author until approved
- Admin review page at `/admin/review` lets the app owner approve or reject pending enrichment submissions, and restore playgrounds that users have hidden
- Users can flag a playground as "no longer exists" from the preview card (after a confirmation); one flag hides it from the map for everyone. The admin review page lists hidden playgrounds (with who flagged them and when) and can restore them
- Users can favourite a playground from the preview card; favourited playgrounds show a heart on their map pin and appear in a Favourites list (opened from a button on the map) showing each playground's name and distance from the current location
- Users can save a playground for later (distinct from favourites — "I want to go here") from the preview card; saved playgrounds show a bookmark on their map pin and appear in a Saved list (opened from a button on the map) showing each playground's name and distance from the current location. A playground that is both saved and favourited shows the heart on its pin.
