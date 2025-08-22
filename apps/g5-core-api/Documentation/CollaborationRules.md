# Collaboration Rules (Agreed Working Mode)

These rules capture our agreed workflow so it does not get lost.

## Responsibility Split
- YOU (human) will manually run long‑lived or blocking commands (e.g. starting the dev server, docker compose up, watch builds) so the terminal does not block further conversation.
- I (assistant) will run short, non-blocking, self‑contained commands (build, one‑shot scripts, code generation, lint, snapshot CLI, etc.) directly, and only ask you to do browser checks.
- I will NOT ask you to run commands that I can run myself unless they must remain interactive or keep running.

## What I Will Ask From You
- Only: perform manual UI / browser verification (e.g. open http://localhost:3001/v1/themes, test Swagger docs, check that a theme applied in the admin panel looks correct).
- I will phrase requests explicitly as “Browser test: …” so it’s clear.

## What I Will Avoid
- Asking you to copy/paste multi-step shell commands I could execute.
- Starting long-lived processes myself that would block further tool usage.
- Re‑explaining unchanged context (I’ll provide deltas only).

## Environment Assumptions
- Dev server (fixed port 3001): you run `pnpm -F g5-core-api start:dev` when requested.
- Default tenant ID used in tests: `00000000-0000-0000-0000-000000000000`.
- Queues can be skipped with `SKIP_QUEUES=true` if you need faster startup; stubs are in place.

## If Deviations Are Needed
- I will annotate clearly why (e.g. needing a fresh DB reset that only you can trigger if volumes need manual pruning).

## Quick Reference Tags
- [BROWSER] -> Only action I need you to do in UI/Swagger.
- Theme quick demo (no server needed): `pnpm -F g5-core-api theme:demo`
- [INFO] -> Informational update; no action required.

---
Last updated: 2025-08-20
