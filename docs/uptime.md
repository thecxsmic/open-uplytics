# Uptime checks

Each site can watch any number of URLs and notify any number of email addresses. Add them when you create the site, or later in site settings.

Checks run only after the site is verified. The built-in scheduler runs them every 10 minutes on a long-running server. On Vercel, Vercel Cron calls the same job. See [cron.md](cron.md). A response from 200 to 399 counts as up.

Mail goes out only when a URL changes between up and down. Set `RESEND_API_KEY` and `RESEND_FROM` or those messages are skipped.

Each site with public status on has a status page at `/status/{slug}`. The slug is on the site record. Visitors see the URLs you monitor and about 90 days of downtime history.

Finished downtime rows older than 3 months are deleted by the daily cron.
