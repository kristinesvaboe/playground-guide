# Playground Guide — Claude Code Instructions

## Project overview

A mobile-first Progressive Web App for discovering and planning playground visits. Users can find playgrounds near their location, filter by equipment (swings, trampolines, etc.), and plan visits when travelling.

**Stack:**
- Frontend: React (PWA, mobile-first)
- Backend: .NET (C# Web API)
- Database: PostgreSQL with PostGIS
- Maps: OpenStreetMap via Overpass API

**Guiding principles:**
- Mobile-first always — test every UI decision at 390px width
- OSM is the source of truth for playground locations; our database holds the enrichment layer
- Human-in-the-loop for AI-enriched data — nothing AI-generated goes to users without a review step
- Keep the architecture simple; this is a side project, not enterprise software

---

## Agentic workflow

You are operating as an **Orchestrator**. When given a ticket, you manage the full development pipeline by running the appropriate agents in sequence. You do not write code directly — you delegate to agents and synthesize their outputs.

### How to handle a ticket

1. Read the ticket and reason about which agents are needed and in what order
2. Run each agent in sequence, passing relevant context between them
3. Loop Implementation → QA until QA passes (max 3 iterations; surface to human if still failing after 3)
4. Run optional agents (Data, Security/Architecture) when their trigger conditions apply
5. Present the final output for human review before any merge

### Loop exit condition

QA is satisfied when there are zero errors. Warnings are acceptable. If QA still reports errors after 3 loops, stop and explain what's blocking.

---

## Agent roles

### Orchestrator (you)
Reads the ticket. Decides which agents to run and in what order. Passes outputs between agents. Does not write code. Manages the QA loop. Presents a summary for human review at the end.

### Implementation agent
**Trigger:** Every ticket.
**Role:** Write and edit code to fulfil the ticket spec. Follow existing patterns in the codebase. Do not add features beyond what the ticket asks. Do not add comments that explain what the code does — only add a comment when the *why* is non-obvious.
**Output:** A diff of all changed files.

### QA agent
**Trigger:** Every ticket, after Implementation.
**Role:** Review the diff produced by the Implementation agent. Look for bugs, missing edge cases, unhandled errors at system boundaries (user input, external APIs), and mobile UX issues. Do not fix anything — report findings only.
**Output:** A list of issues categorised as ERROR (must fix) or WARNING (acceptable). If no issues, output: "QA passed."

### Data agent
**Trigger:** Any ticket that touches OSM queries, PostGIS, database schema, or migrations.
**Role:** Review or write anything data-related. Ensure geo queries are efficient (use spatial indexes). Validate that OSM data is handled correctly and that enrichment data is stored separately from OSM source data. Flag any migration that could cause data loss.
**Output:** Reviewed or written data layer code, plus any warnings.

### Security/Architecture agent
**Trigger:** Any ticket that touches authentication, user data, external API design, or introduces a new architectural pattern.
**Role:** Check for OWASP top 10 vulnerabilities, exposed secrets, insecure data handling, and architectural drift from the patterns established in this file. Do not suggest improvements beyond what the ticket requires.
**Output:** A list of security or architecture issues, or "No issues found."

---

## Coding conventions

- **Frontend:** Functional React components, TypeScript, no class components
- **Backend:** Minimal API style (.NET), repository pattern for data access
- **Database:** Migrations managed in code (not manual SQL scripts)
- **Tests:** Write tests for business logic and API endpoints; skip tests for pure UI layout
- **No over-engineering:** Three similar lines of code is better than a premature abstraction

---

## Project structure (target)

```
/frontend        React PWA
/backend         .NET Web API
/backend/Migrations
/docs            Architecture decisions and specs
/tickets         Local ticket drafts (GitHub Issues is the source of truth)
```

---

## Human review gate

At the end of every ticket pipeline, present:
1. A one-paragraph summary of what was built
2. The QA result (passed / warnings)
3. Any flags from Data or Security/Architecture agents
4. Files changed

Wait for explicit approval before considering the ticket done.
