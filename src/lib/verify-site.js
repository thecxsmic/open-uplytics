import { resolveTxt } from "dns/promises";

function hostnameOf(domain) {
  return String(domain)
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    .toLowerCase();
}

async function fetchHome(domain) {
  const host = hostnameOf(domain);
  const urls = [`https://${host}`, `http://${host}`];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "Uplitycs-Verify/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok || res.status < 500) return await res.text();
    } catch {
      /* try next */
    }
  }
  return "";
}

export async function verifySite({ domain, siteId, verificationToken }) {
  const html = await fetchHome(domain);
  const metaOk =
    html.includes(`uplitycs-site-verification`) &&
    (html.includes(verificationToken) || html.includes(siteId));
  const scriptOk =
    /uplitycs\.js/i.test(html) &&
    (html.includes(`data-site="${siteId}"`) ||
      html.includes(`data-site='${siteId}'`));

  let dnsOk = false;
  try {
    const host = hostnameOf(domain);
    const records = await resolveTxt(host);
    const flat = records.flat().join(" ");
    dnsOk =
      flat.includes(`uplitycs-verification=${verificationToken}`) ||
      flat.includes(`uplitycs-verification=${siteId}`);
  } catch {
    dnsOk = false;
  }

  return {
    ok: Boolean(metaOk || scriptOk || dnsOk),
    methods: { meta: Boolean(metaOk), script: Boolean(scriptOk), dns: dnsOk },
  };
}
