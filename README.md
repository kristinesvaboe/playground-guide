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

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `{ "status": "ok" }` |
| `GET` | `/playgrounds?lat=&lng=&radius=` | Returns playgrounds within `radius` metres of the given coordinates. All three params required. Response: `[{ id, name, latitude, longitude }]`. |
| `GET` | `/playgrounds/{id}` | Returns a single playground with reviewed equipment tags. `equipment` is `null` if no enrichment exists yet, or an array (possibly empty) if it does. |

## Status

- Map view shows playgrounds near your current location using OpenStreetMap data
- Tapping a pin shows a preview card with the playground name and equipment tags
- Equipment data comes from reviewed enrichments; unreviewed data is never shown
