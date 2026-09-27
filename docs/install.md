# Install the script

Create an account, open a website, and add a site with the domain you want to measure. Settings shows a script tag:

```html
<script defer data-site="YOUR_SITE_ID" src="https://your-host/uplitycs.js"></script>
```

Paste it before `</head>` on every page you want to count. `src` is this app’s origin plus `/uplitycs.js`. The script posts visits to `/api/collect` on that same origin.

The first accepted visit from an allowed domain sets the site to verified. Until then the dashboard shows Waiting, and uptime checks stay off.

Allowed domains default to the domain you entered. Add more in site settings, separated by commas. Local development skips the origin check unless you turn it off. Set `COLLECT_SKIP_ORIGIN=1` to skip it for every site.

Custom events:

```js
window.uplitycs.track("signup", { source: "docs" });
```

Counts are page views and visitors. The script does not set an analytics cookie and does not keep a profile of each person.
