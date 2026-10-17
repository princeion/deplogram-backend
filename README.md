# deplogram-backend

A [NestJS](https://docs.nestjs.com) backend for Deplogram. It serves two kinds of routes:

- the platform's `/v1/*` API — the contract the web frontend (`deplogram-web`) talks to, and
- a handful of `/utils/*` and `/auth/*` routes used by the browser's developer tools.

## Running

```bash
npm run start:dev   # watch mode on http://localhost:3000
npm test            # unit tests (vitest)
npm run test:e2e    # end-to-end tests (vitest, supertest)
```

The database is an in-memory store (`src/deplogram/store.ts`), seeded on boot with a demo
account (`owner@deplogram.app` / `password`), a personal workspace and a couple of sample
projects. Sessions and all data live exactly as long as the process does.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port the API listens on (default `3000`). |
| `JWT_SECRET` | Secret used by the legacy JWT utilities (`/utils/jwt/*`). |
| `EMAIL_*` / `EMAIL_FROM` | SMTP settings for `/email/send`. |
| `SIGN_IN_ENABLED` | Whether `/v1/auth/sign-in` accepts credentials (default `true`). |

## The `/v1/*` API

Everything the frontend needs is grouped by feature. Date-time strings are ISO 8601; nullable
fields are `null` when they do not apply.

### Workspace & usage

| Method & path | Description |
| --- | --- |
| `GET /v1/workspace` | The signed-in user's workspace: `{ id, name, kind, plan }`. |
| `GET /v1/usage` | Plan usage for the current period: limits, per-day requests and builds, traffic by hour, uptime. |
| `GET /v1/traffic` | The last ~65 seconds of requests across live projects: `{ requests, liveProjects }`. |

### Accounts

| Method & path | Description |
| --- | --- |
| `GET /v1/me` | The signed-in user: `{ id, name, email, image }` (401 when signed out). |
| `GET /v1/me/settings` | The account settings: `{ name, email, preferences }`. |
| `PATCH /v1/me/settings` | Update name and preferences. |
| `DELETE /v1/me` | Permanently delete the account; everything cached is dropped. |

### Projects

| Method & path | Description |
| --- --- | --- |
| `GET /v1/projects` | All projects, each with its latest deployment state. |
| `POST /v1/projects` | Create a project (and start its first deployment). Body: `{ name, repositoryId, branch, runtime, config, env }`. |
| `GET /v1/projects/:id` | A project, with its configuration and variables. |
| `PATCH /v1/projects/:id` | Rename, retarget the branch, or change build/start settings. |
| `DELETE /v1/projects/:id` | Take the project offline and delete its deployments, logs and variables. |
| `GET /v1/projects/:id/env` | The saved variables as `{ key, updatedAt }` — values are never sent back. |
| `PUT /v1/projects/:id/env` | Save the whole variable set: `{ key, value }[]` where `value: null` keeps the saved value. |
| `GET /v1/projects/:id/logs` | The live deployment's runtime log: `{ lines, live }`. `?after=n` appends after line *n*. |
| `GET /v1/projects/:id/metrics` | Traffic, latency and resources for the live deployment. `?range=1h \| 24h \| 7d`. |
| `GET /v1/projects/name-availability?name=` | Is the name (and its URL) free? |

### Deployments

| Method & path | Description |
| --- | --- |
| `GET /v1/deployments` | The deployment list, newest first. Supports `?status=`, `?project=`, `?branch=`, `?trigger=`, `?q=`, `?sort=`, `?page=`, `?pageSize=`. |
| `GET /v1/deployments/:id` | One deployment, with its commit, trigger and live URL. |
| `GET /v1/deployments/:id/logs` | The build log: `{ lines, steps, done }`. `?after=n` appends after line *n*. |
| `POST /v1/deployments/:id/redeploy` | Build the same commit again. Returns the new deployment. |
| `POST /v1/deployments/:id/rollback` | Make the earlier deployment that was live before `:id` live again (no new build). Returns `{ deployment, previousLiveId }`. |

Deployments move through `QUEUED → BUILDING → (BUILD_FAILED \| DEPLOY_FAILED) → RUNNING`, or end in
`CRASHED`. A running build is simulated with timers, so the frontend can watch it happen.

### Git (simulated)

The UI offers a Git account to connect and repositories to import. These endpoints behave as
if they talked to GitHub; in this build they are driven by the seeded store.

| Method & path | Description |
| --- | --- |
| `GET /v1/git/connection` | Which Git account is connected: `{ provider, connected, account }`. |
| `GET /v1/git/repositories?q=` | Importable repositories, searched by name. |
| `GET /v1/git/repositories/:id/branches` | The branches with their head commit. |
| `GET /v1/git/repositories/:id/detect?branch=` | Detect the runtime from the repository contents. |

### Activity

| Method & path | Description |
| --- | --- |
| `GET /v1/activity` | The audit log, newest first, cursor-paginated: `{ items, nextCursor }`. Supports `?type=` and `?project=`. |
| `GET /v1/activity?limit=` | The most recent events, for the Overview. |

Every mutation (project created, deployment started, variable saved, account settings changed,
…) writes an event here, so the feed doubles as a history.

## Developer utility endpoints

These predate the `/v1` API and are handy while working on the platform itself:

- `POST /auth/otp/send` & `POST /auth/otp/verify` — one-time passwords for sign-in (demo only).
- `POST /email/send` — send a transactional email.
- `POST /utils/json/formatter`, `/utils/json/validate`, `/utils/json/minify`
- `POST /utils/jwt/decode`, `/utils/jwt/expiry`, `/utils/jwt/validate`
- `POST /utils/base64/encode`, `/utils/base64/decode`
- `POST /utils/regex/test`, `/utils/regex/validate`
- `POST /utils/cron/parse` and `POST /utils/cron/readable`
- `POST /utils/webhook/test`, `/utils/webhook/received`, `/utils/webhook/clear`
- `POST /utils/image/transform`, `/utils/image/compress`, `/utils/image/convert`
- `POST /utils/qr/generate` (a PNG buffer)
