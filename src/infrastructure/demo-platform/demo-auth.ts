import { hashDemoPassword, makeDemoAccount, projectDemoIdentity, type DemoAccount, type CustomerIdentity } from "@/core/domain/customer-auth";
import { signInSchema, signUpSchema } from "@/core/domain/customer-auth-validation";
const KEY = "resolveiq-demo-auth-v1";
interface AuthState { accounts: DemoAccount[]; sessionId: string | null; mode: "cloud" | "demo" }
function read(): AuthState {
  if (typeof window === "undefined") return { accounts: [], sessionId: null, mode: "cloud" };
  try { const value = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as AuthState | null; if (value && (value.mode === "cloud" || value.mode === "demo") && (value.sessionId === null || typeof value.sessionId === "string") && Array.isArray(value.accounts) && value.accounts.every((a) => a && typeof a.id === "string" && a.id.startsWith("demo:") && typeof a.name === "string" && typeof a.email === "string" && typeof a.salt === "string" && /^[a-f0-9]{64}$/.test(a.passwordHash))) return value; } catch { /* reset invalid data */ }
  return { accounts: [], sessionId: null, mode: "cloud" };
}
function save(value: AuthState) {
  if (typeof window === "undefined") throw Error("Demo sign-in is only available in this browser.");
  window.localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("resolveiq-auth"));
}
async function withAuthLock<T>(save: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) throw Error("Use a current browser for demo sign-in.");
  return navigator.locks.request("resolveiq-demo-auth", save);
}
export function readDemoAuth(): { mode: "cloud" | "demo"; user: CustomerIdentity | null } {
  const data = read(); const account = data.accounts.find((a) => a.id === data.sessionId);
  return { mode: data.mode, user: account ? projectDemoIdentity(account) : null };
}
export function setAuthMode(mode: "cloud" | "demo") { save({ ...read(), mode }); }
export async function demoSignUp(input: { name: string; email: string; password: string; confirmPassword: string }) {
  return withAuthLock(async () => {
  const parsed = signUpSchema.parse(input); const data = read();
  if (data.accounts.some((a) => a.email === parsed.email)) throw Error("This demo email already has an account. Please log in.");
  const account = await makeDemoAccount(parsed.name, parsed.email, parsed.password);
  const latest = read();
  if (latest.accounts.some((a) => a.email === account.email)) throw Error("This demo email already has an account. Please log in.");
  save({ accounts: [...latest.accounts, account], sessionId: account.id, mode: "demo" });
  return projectDemoIdentity(account);
  });
}
export async function demoLogIn(input: { email: string; password: string }) {
  const parsed = signInSchema.parse(input); const data = read(); const account = data.accounts.find((a) => a.email === parsed.email);
  if (!account || await hashDemoPassword(parsed.password, account.salt) !== account.passwordHash) throw Error("Could not log in. Check your demo email and password.");
  save({ ...read(), sessionId: account.id, mode: "demo" }); return projectDemoIdentity(account);
}
export function demoLogOut() { save({ ...read(), sessionId: null }); }