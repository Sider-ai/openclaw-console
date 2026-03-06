# OpenClaw Models Web UI (Vite + React)

Minimal admin UI for:

- viewing model settings
- connecting OpenAI API key
- running Codex session auth flow
- changing default model
- listing model catalog entries

## Run

```bash
cd web
npm install
npm run dev -- --port 3001
```

Open http://127.0.0.1:3001

By default the Vite dev server proxies `/api` and `/healthz` to `http://127.0.0.1:18080`, which keeps local development compatible with console HTTP Basic Auth.

If you explicitly set `VITE_ADMIN_API_BASE` to a cross-origin API URL, browser auth prompt behavior is not guaranteed.

## Static Build Output

```bash
npm run build
```

Build output is written to `web/dist/` for embedding into the Go binary.
