# Domain Docs

This repository uses a single domain context for the Surat Digital product.

## Before exploring

- Read `GLOSSARY.md` at the repository root when it exists.
- Read relevant ADRs under `docs/adr/`.
- If either location does not exist, continue without treating its absence as an error.

## Layout

```text
/
|-- GLOSSARY.md
|-- docs/adr/
|-- apps/
|-- packages/
`-- supabase/
```

## Rules

- Use terminology defined in `GLOSSARY.md`.
- Do not introduce competing synonyms for established domain concepts.
- Record material, difficult-to-reverse technical decisions as ADRs.
- Explicitly flag work that contradicts an existing ADR.
