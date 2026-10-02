# Cron

Three jobs keep the data current:

| Job | When | What it does |
|---|---|---|
| Health checks | Every 10 minutes | Requests every uptime URL on verified sites. Mail goes out only when a URL changes between up and down. |
| Hourly rollup | Once each UTC hour | Copies finished hour buckets into `hourly_stats`, then clears those buckets. Also drops live pings older than 10 minutes, finished downtime older than 3 months, hourly stats older than 400 days, and processed buckets older than 2 days. Tops up the sample dashboard when its hours are behind. |
| Daily purge | 03:15 UTC | Deletes finished downtime older than 3 months and activity-log rows older than 180 days. |

Page views still show on the dashboard before the hourly job runs. That job is what keeps the long-range charts after the raw bucket is cleared.

A Postgres advisory lock stops two runners from doing the same job at once. Each run is recorded in `cron_jobs`.

## Built-in scheduler

`next dev` and `next start` start the scheduler inside the Node process. It checks once a minute and runs whichever job is due. Nothing else has to call the app.

Turn it off with `CRON_INTERNAL=0` if you want an outside scheduler to be the only trigger. It also stays off when `VERCEL` is set, because a Vercel function does not stay awake between requests.

See the last run with:

```bash
curl -H "X-Cron-Secret: $CRON_SECRET" https://your-host/api/cron
```

The response includes `mode` (`internal`, `external`, or `vercel`) and each job’s last start, last finish, error, and whether it is due.

## Calling the routes yourself

The same jobs are HTTP routes. Send `CRON_SECRET` as `X-Cron-Secret` or `Authorization: Bearer <secret>`.

| Job | Schedule | URL |
|---|---|---|
| Health checks | `*/10 * * * *` | `https://your-host/api/cron/health-check` |
| Hourly rollup | `0 * * * *` | `https://your-host/api/cron/hourly` |
| Daily purge | `15 3 * * *` | `https://your-host/api/cron/daily` |

Use the host that returns 200. If that host redirects, the secret header is dropped and the route answers 401.

## Hosting on Vercel

The built-in scheduler does not run on Vercel. The platform starts a function for a request and then freezes it, so a timer inside the process never keeps firing. `vercel.json` in this repo registers the three routes with Vercel Cron instead. Set `CRON_SECRET` on the project. Vercel sends it as `Authorization: Bearer <CRON_SECRET>`.

These are the failures that show up, and what to change.

**Hobby only allows a cron once a day.** Deploying `0 * * * *` or `*/10 * * * *` fails on the Hobby plan. On Pro those schedules are allowed. On Hobby, either move the project to Pro, or edit `vercel.json` so each job runs once a day (uptime is then checked once a day), or skip Vercel Cron and call the routes from an outside scheduler.

**A redirect drops the secret.** If the public hostname redirects (the apex host to `www`, or `http` to `https`), an outside caller that follows the redirect loses `Authorization` and `X-Cron-Secret`. The route then returns 401. Point the caller at the host that answers 200 with no redirect. Vercel Cron uses the path in `vercel.json` and hits the deployment directly, so it does not go through that public redirect. Prefer that over an outside job aimed at a hostname that 308s.

**The function times out.** Health checks of many URLs, and a large hourly rollup, can run longer than the Hobby limit of 10 seconds. These routes set `maxDuration` to 60, which applies on Pro. On Hobby the run is killed at 10 seconds and the job looks failed. Use Pro, run cron on a long-running Node server (the built-in scheduler has no function timeout), or check fewer URLs.

**Cron runs on Production only.** Preview deployments do not fire `vercel.json` crons. Test the route with a manual request that sends `CRON_SECRET`, or test on a long-running server.

**Missing `CRON_SECRET`.** Every cron request is 401 until that variable is set in the Vercel project environment for Production.
