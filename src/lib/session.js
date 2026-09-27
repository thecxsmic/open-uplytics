import { ensureDefaultWorkspace, publicAccount } from "@/lib/accounts";
import { readAccount } from "@/lib/auth";

function unauthorized() {
  const err = new Error("Unauthorized");
  err.status = 401;
  throw err;
}

export async function requireUser() {
  const account = await readAccount();
  if (!account) unauthorized();
  await ensureDefaultWorkspace(account.id, account.name);
  return { id: account.id };
}

export async function requireUserProfile() {
  const account = await readAccount();
  if (!account) unauthorized();
  await ensureDefaultWorkspace(account.id, account.name);
  return publicAccount(account);
}

export async function optionalUser() {
  const account = await readAccount();
  if (!account) return null;
  await ensureDefaultWorkspace(account.id, account.name);
  return publicAccount(account);
}
