<p align="center">
  <img src="public/icons/icon.svg" width="72" height="72" alt="Uplitycs">
</p>

<h1 align="center">Uplitycs</h1>

<p align="center">
  Cookieless website analytics and uptime monitoring.<br>
  Use the hosted cloud, or run this app on your own server.
</p>

<p align="center">
  <a href="https://www.uplytics.space"><strong>Open the cloud →</strong></a>
  &nbsp;·&nbsp;
  <a href="https://www.uplytics.space/demo">Live demo</a>
  &nbsp;·&nbsp;
  <a href="https://www.uplytics.space/pricing">Cloud pricing</a>
  &nbsp;·&nbsp;
  <a href="LICENSE">License</a>
</p>

The same product ships two ways.

| | **Uplitycs Cloud** | **This repo** |
|---|---|---|
| Where it runs | [uplytics.space](https://www.uplytics.space) | Your server |
| You manage | The script tag | Postgres, the app, and mail |
| Websites | Included with your plan | Unlimited |
| Uptime URLs | Included with your plan | Unlimited |
| Teams and billing | On the cloud | No |
| Database | Hosted for you | One Postgres database |
| Best when | You want it running today | You want the data on your machine |
| License | Cloud terms on the site | Your own sites. A competing product is outside the license |

**Cloud.** Create an account at [uplytics.space](https://www.uplytics.space), add a site, and paste one script tag. There is nothing to install. The [demo](https://www.uplytics.space/demo) is a read-only dashboard you can open before you sign up. Plans and limits are on the [pricing page](https://www.uplytics.space/pricing).

**This repo.** Run it for your own sites. One Postgres database holds accounts, page views, hourly charts, and uptime. Websites and uptime URLs are not capped. The scheduler runs inside the Node process.

The license is [PolyForm Perimeter 1.0.0](LICENSE). You can use, change, and self-host the app for your own sites. You cannot offer it to other people as an analytics or uptime product. That includes a hosted service, a library, or a free substitute for Uplitycs. Uplitycs Cloud at [uplytics.space](https://www.uplytics.space) is the hosted product.

Both count page views with a script under 1kb gzip. The script does not set an analytics cookie and does not keep a profile of each visitor. Each site can publish a status page.

## Clone and run

You need Node.js 20 or newer. Docker is used only to start Postgres. If Postgres is already running on `localhost:5432` with the user in `.env.example`, Docker is skipped.

```bash
git clone https://github.com/thecxsmic/open-uplytics.git
cd open-uplytics
npm install
npm run setup
npm run dev
```

`npm run setup` writes `.env`, fills `AUTH_SECRET` and `CRON_SECRET`, starts Postgres, creates the tables, and loads the sample dashboard. It is safe to run again. Add `-- --no-demo` to skip the sample data.

Open http://localhost:3000. You land on sign-in. The first account gets a workspace. Add a site, paste the script from its settings, and open that site. The first accepted visit marks it verified and starts uptime checks. http://localhost:3000/demo is the sample dashboard, with no account.

`/demo` is sample traffic. It is read-only until you create your own site. Opening it fills any missing sample hours, and the hourly rollup does the same. `npm run db:demo` rebuilds the sample from scratch.

The script tag looks like this. `APP_URL` is the origin of the app you just started.

```html
<script defer data-site="YOUR_SITE_ID" src="http://localhost:3000/uplitycs.js"></script>
```

On the cloud, the same tag points at Uplitycs instead:

```html
<script defer data-site="YOUR_SITE_ID" src="https://cdn.uplytics.space/uplitycs.js"></script>
```

## What you get in this repo

- Page views, visitors, live visitors, and breakdowns for pages, referrers, countries, devices, browsers, and campaigns
- Custom events with `window.uplitycs.track("signup", { source: "docs" })`
- As many websites as you want, and as many uptime URLs and alert addresses as you want on each site
- A public status page for every site
- Email and password sign-in, an authenticator app, and optional Google sign-in
- A built-in scheduler for health checks (every 10 minutes), the hourly rollup, and the daily purge

Uptime mail and password reset use Resend when `RESEND_API_KEY` is set. Without it, those messages are skipped and the rest of the app still runs.

## Cron

On a long-running server (`npm run dev` or `npm start`) the jobs start with the app. Set `CRON_INTERNAL=0` only if an outside scheduler should be the only trigger.

On Vercel the in-process timer does not run. `vercel.json` registers Vercel Cron instead. Read [docs/cron.md](docs/cron.md) before you deploy there. The Hobby plan, hostname redirects, and the 10-second function limit each break cron in a specific way, and that page lists the fix for each one.

Check the last run:

```bash
curl -H "X-Cron-Secret: $CRON_SECRET" http://localhost:3000/api/cron
```

## Docs

| Guide | What it covers |
|---|---|
| [Install the script](docs/install.md) | The tag, allowed domains, custom events |
| [Uptime](docs/uptime.md) | URLs, alert email, status pages |
| [Configuration](docs/configuration.md) | Environment variables and Postgres |
| [Cron](docs/cron.md) | Built-in scheduler, outside callers, and Vercel |

## Scripts

| Command | |
|---|---|
| `npm run dev` | App and built-in scheduler |
| `npm run db:push` | Create the Postgres tables. Safe to run again. |
| `npm run db:demo` | Load the sample dashboard at `/demo` |
| `npm run build` | Production build. The tracker must stay under 1kb gzip. |
| `npm start` | Production server, scheduler included |
| `npm run check:env` | Confirm the required environment variables and the database |
| `npm run test:api` | Hit the API. Pass `-- --start` to boot the dev server first. |
