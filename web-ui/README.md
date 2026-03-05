# OpenClaw Models Web UI (Next.js)

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
NEXT_PUBLIC_ADMIN_API_BASE=http://127.0.0.1:18080 npm run dev -- -p 3001
```

Open http://127.0.0.1:3001
