# OpenClaw Models Web UI (Vite + React)

Minimal admin UI for:

- viewing model settings
- connecting OpenAI API key
- running Codex session auth flow
- changing default model
- listing model catalog entries

## Run

```bash
cd web-ui
npm install
VITE_ADMIN_API_BASE=http://127.0.0.1:18080/api npm run dev -- --port 3001
```

Open http://127.0.0.1:3001

## Static Build Output

```bash
npm run build
```

Build output is written to `web-ui/dist/` for embedding into the Go binary.
