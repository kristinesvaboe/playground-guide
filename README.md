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

## Admin API

### Import playgrounds from OpenStreetMap

```
POST /admin/import/osm
X-Admin-Key: <your-admin-key>
```

Fetches all `leisure=playground` nodes within Rogaland (bounding box `57.8,5.3,59.7,7.0`) from the Overpass API and upserts them into the database. Re-running is safe — existing records are updated by OSM node ID; enrichment data is never touched.

Returns:
```json
{ "created": 42, "updated": 7 }
```

**Setup:** Set `AdminKey` in `appsettings.Development.json` (or via environment variable `AdminKey`) to a secret value of your choice. The placeholder value `"change-me"` in `appsettings.json` must be overridden before use.

```json
{
  "AdminKey": "your-secret-key-here"
}
```

## Status

Early scaffolding. Watch this space.
