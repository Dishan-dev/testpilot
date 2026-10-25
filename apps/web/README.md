# TestPilot web

Next.js App Router frontend with TypeScript strict mode, Tailwind CSS, and ESLint. Source lives in `src/app` and reusable UI in `src/components`. The only client component is navigation; pages render as server components.

From this directory:

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm run build
npm start
```

Development URL: http://localhost:3000. No environment variables or API/database are required yet. Routes: `/`, `/projects`, `/test-runs`, `/settings`. Project creation, persistence, and run history are not implemented in this milestone.

See the [root README](../../README.md) for full setup, worker commands, configuration, and security limitations. Read [AGENTS.md](AGENTS.md) and the installed Next.js docs before changing framework APIs.
