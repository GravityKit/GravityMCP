You MUST fully ingest @AGENTS.md first.

# Gravity MCP Server

## Project Identity

- **Package:** `@gravitykit/gravitymcp` v1.0.6
- **Type:** Node.js MCP server (ESM)
- **Purpose:** Full Gravity Forms REST API v2 coverage via 28 MCP tools
- **Repo:** https://github.com/GravityKit/GravityMCP

## Key Commands

```bash
npm run dev          # Dev with auto-reload
npm run inspect      # MCP Inspector debugging
npm run check-env    # Validate environment
npm run test:all     # Run all test suites
npm test             # Integration tests (live API)
```

## Environment

Required env vars (see `.env.example` for full list):
- `GRAVITY_FORMS_CONSUMER_KEY` — from WP Admin > Forms > Settings > REST API
- `GRAVITY_FORMS_CONSUMER_SECRET`
- `GRAVITY_FORMS_BASE_URL` — WordPress site URL, no trailing slash

## Critical Rules

1. **Never use `console.log` in MCP mode** — stdout is JSON-RPC. Use `logger.info/error/warn` from `utils/logger.js`
2. **Always use `.js` extension** in imports (ESM requirement)
3. **Delete operations require `GRAVITY_FORMS_ALLOW_DELETE=true`** env var
4. **Fields are form properties** — no direct field endpoints; modify via form PUT
5. **Update operations fetch-then-merge** — always GET existing data first to avoid data loss
