# Configuration

After `git clone`, run `npm install` and `npm run setup`. That writes `.env`, starts Postgres, and creates the tables. The variables below are what that file contains.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. This is the only database. |
| `AUTH_SECRET` | yes | Signs the session cookie. At least 16 characters. |
| `CRON_SECRET` | yes | Shared secret for `/api/cron/*`. Vercel Cron sends it as a bearer token. |
| `CRON_INTERNAL` | no | `0` turns off the built-in scheduler. Leave it unset on a long-running Node server. It is ignored on Vercel, where the scheduler does not run. |
| `APP_URL` | recommended | Public origin used in the tracking snippet and email links. |
| `RESEND_API_KEY` | no | Sends uptime mail and password reset. Without it, those sends are skipped. |
| `RESEND_FROM` | no | From address for that mail. |
| `GOOGLE_CLIENT_ID` | no | Google sign-in. |
| `GOOGLE_CLIENT_SECRET` | no | Google sign-in. |
| `COLLECT_SKIP_ORIGIN` | no | `1` accepts collect events from any origin. |

`docker compose up -d` starts Postgres with user `uplytics`, password `uplytics`, database `uplytics`, on port 5432. That matches the sample `DATABASE_URL`.

Apply the schema with `npm run db:push`. It is safe to run again.

`npm run db:demo` fills a read-only workspace at `/demo` with 30 days of sample traffic. Writes there return 403.

There is no second database, no team invite, and no billing. Websites and uptime URLs are not capped.
