/** Simulated credentials only. SHA-256 is not a production password KDF. */
export interface DemoAccount { id: string; name: string; email: string; salt: string; passwordHash: string }
export interface CustomerIdentity { id: string; name: string; email: string }
export async function hashDemoPassword(password: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function makeDemoAccount(name: string, email: string, password: string): Promise<DemoAccount> {
  const salt = crypto.randomUUID();
  return { id: `demo:${crypto.randomUUID()}`, name: name.trim(), email: email.trim().toLowerCase(), salt, passwordHash: await hashDemoPassword(password, salt) };
}
export function projectDemoIdentity(account: DemoAccount): CustomerIdentity {
  return { id: account.id, name: account.name, email: account.email };
}