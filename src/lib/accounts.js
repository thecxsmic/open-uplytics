import { tquery, texecute, row, logActivity } from "@/lib/db";
import { id } from "@/lib/ids";
import { slugify } from "@/lib/utils";

export function publicAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    email: account.email || "",
    name: account.name || "",
    totpEnabled: Boolean(account.totp_enabled),
    passwordSet: Boolean(account.password_hash),
  };
}

export async function getAccount(userId) {
  if (!userId) return null;
  return row(await tquery("SELECT * FROM accounts WHERE id = ?", [userId]));
}

export async function findAccountByGoogle(sub) {
  const id = String(sub || "").trim();
  if (!id) return null;
  return row(await tquery("SELECT * FROM accounts WHERE google_sub = ?", [id]));
}

export async function findAccountByEmail(email) {
  const needle = normalizeEmail(email);
  if (!needle) return null;
  return row(await tquery("SELECT * FROM accounts WHERE email = ?", [needle]));
}

export function normalizeEmail(email) {
  const value = String(email || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 200) return "";
  return value;
}

export async function getAccounts(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  const out = {};
  if (!ids.length) return out;
  const marks = ids.map(() => "?").join(", ");
  const rows = await tquery(
    `SELECT id, email, name, totp_enabled FROM accounts WHERE id IN (${marks})`,
    ids,
  );
  for (const account of rows) out[account.id] = publicAccount(account);
  for (const userId of ids) {
    if (!out[userId]) out[userId] = { id: userId, email: "", name: "", totpEnabled: false };
  }
  return out;
}

export async function ensureDefaultWorkspace(userId, nameHint) {
  if (!userId) return null;
  const existing = row(
    await tquery("SELECT id FROM workspaces WHERE owner_id = ? LIMIT 1", [userId]),
  );
  if (existing) return existing.id;

  let name = nameHint;
  if (!name) {
    const account = await getAccount(userId);
    name = account?.name;
  }
  const now = Date.now();
  name = (name || "My").slice(0, 80);
  const wsId = id("ws");
  let slug = slugify(name || "workspace");
  const clash = row(await tquery("SELECT id FROM workspaces WHERE slug = ?", [slug]));
  if (clash) slug = `${slug}-${wsId.slice(-6)}`;
  await texecute(
    `INSERT INTO workspaces (id, name, slug, owner_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [wsId, `${name}'s workspace`, slug, userId, now],
  );
  await logActivity(wsId, userId, "workspace.created", { name });
  return wsId;
}
