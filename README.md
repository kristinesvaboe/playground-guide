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

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `{ "status": "ok" }` |
| `GET` | `/playgrounds?lat=&lng=&radius=` | Returns playgrounds within `radius` metres of the given coordinates. All three query params are required. Response: array of `{ id, name, latitude, longitude }`. |

## Status

Map view is live — the app shows playgrounds near your current location using OpenStreetMap data.
