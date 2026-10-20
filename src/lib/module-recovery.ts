/** A stale document can reference hashed assets removed by a newer deployment. */
export function isModuleLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /error loading dynamically imported module|failed to fetch dynamically imported module|importing a module script failed|loading chunk .+ failed/i.test(message);
}

export function reloadForModuleError(error: unknown): boolean {
  if (!isModuleLoadError(error) || typeof window === "undefined") return false;
  const key = `module-recovery:${window.location.pathname}`;
  try {
    const last = Number(window.sessionStorage.getItem(key));
    if (last && Date.now() - last < 60_000) return false;
    window.sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Without a durable reload guard, show the manual retry instead of looping.
    return false;
  }
  window.location.reload();
  return true;
}