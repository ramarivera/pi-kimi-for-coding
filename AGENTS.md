# pi-kimi-for-coding Agent Notes

This repo is a Bun/TypeScript Pi extension that registers the `kimi-for-coding-oauth` provider.

## Workflow

- Run `bun test` after behavior changes.
- Run `bun run check` before reporting type-level correctness.
- Keep `src/index.ts` focused on Pi provider registration and public exports.
- Put model metadata in `src/models.ts`, request payload shaping in `src/payload.ts`, OAuth in `src/oauth.ts`, and Kimi fingerprint/header handling in `src/headers.ts`.

## Pricing

- Pi model `cost` values are USD per 1M tokens.
- Source Kimi pricing from `https://models.dev/api.json` when updating model metadata.
- Map `models.dev` `cache_read` to Pi `cacheRead`; use `cacheWrite: 0` when no cache-write price is published.

## Safety

- Do not commit credentials, OAuth tokens, or local `~/.kimi/device_id` values.
- Do not weaken tests to fit live provider behavior; update fixtures and assertions to describe the intended contract.
