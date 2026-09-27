import { lookup } from "dns/promises";
import { isIP } from "net";

function isPrivateIp(ip) {
  if (!ip) return true;
  const v = ip.toLowerCase();
  if (v === "127.0.0.1" || v === "::1" || v === "0.0.0.0") return true;
  if (v.startsWith("10.")) return true;
  if (v.startsWith("192.168.")) return true;
  if (v.startsWith("169.254.")) return true;
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
  const m = v.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

export async function assertPublicHttpUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed");
  }
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local")) {
    throw new Error("Private hosts are blocked");
  }
  if (isIP(host) && isPrivateIp(host)) {
    throw new Error("Private IPs are blocked");
  }
  const resolved = await lookup(host, { all: true });
  if (!resolved.length || resolved.some((r) => isPrivateIp(r.address))) {
    throw new Error("URL resolves to a private address");
  }
  return url.toString();
}
