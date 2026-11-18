# Issue tracker: Local Markdown

Issues and specs for this repo live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- Specification: `.scratch/<feature-slug>/spec.md`
- Implementation tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Tickets are numbered from `01`
- Dependencies use `Blocked by: NN, NN`
- Triage state uses a `Status:` line
- Comments are appended under `## Comments`

## Publishing and fetching

When a skill publishes work, create the appropriate file under `.scratch/<feature-slug>/`.

When a skill fetches a ticket, read the referenced issue file directly.

## Wayfinding operations

- Map: `.scratch/<effort>/map.md`
- Child ticket: `.scratch/<effort>/issues/NN-<slug>.md`
- Ticket type: `Type: research|prototype|grilling|task`
- Ticket status: `Status: claimed|resolved`
- A ticket is ready when it is open, unblocked, and unclaimed
- Resolve by adding `## Answer`, changing its status to `resolved`, and updating the map
